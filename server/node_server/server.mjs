// backend/server.js

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const environment = process.env.ENVIRONMENT || "development";
const PORT = process.env.PORT || 3001;

// CORS origins
const FRONTEND_URLS =
  environment === "production"
    ? [process.env.FRONTEND_PROD_URL]
    : [process.env.FRONTEND_DEV_URL, "http://localhost:5173"];

// Audio stream URL
const streamUrl = process.env.STREAM_URL;

// Recording directory
const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

app.use(
  cors({
    origin: FRONTEND_URLS,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"], // <--- add OPTIONS here
    allowedHeaders: ["Content-Type", "x-user-id"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────────
// SESSION TRACKING
// We'll store for each userID a session object with two sub-objects:
//
//   {
//     streamSession: {
//       isActive: boolean,
//       /* Additional properties if needed */
//     },
//     recordSession: {
//       ffmpegProcess: ChildProcess or null,
//       filePath: string,
//       startTime: number
//       /* Other relevant info */
//     }
//   }
//
// ─────────────────────────────────────────────────────────────────────────────
const activeSessions = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Cookie userID: ${req.cookies.userID}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// USER SESSION MIDDLEWARE
// Ensure each request has a userID assigned via cookie or header
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  let userID = req.cookies.userID;

  // Fallback: check for userID in headers
  if (!userID && req.headers["x-user-id"]) {
    userID = req.headers["x-user-id"];
  }

  // If still not found, generate a new one
  if (!userID) {
    userID = uuidv4();
    res.cookie("userID", userID, {
      httpOnly: true,
      secure: environment === "production",
      sameSite: environment === "production" ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  req.userID = userID;
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Get or Create Session for the user
// ─────────────────────────────────────────────────────────────────────────────
function getOrCreateUserSession(userID) {
  if (!activeSessions.has(userID)) {
    activeSessions.set(userID, {
      streamSession: {
        isActive: false,
      },
      recordSession: {
        ffmpegProcess: null,
        filePath: null,
        startTime: null,
      },
    });
  }
  return activeSessions.get(userID);
}

// ─────────────────────────────────────────────────────────────────────────────
// START RECORDING
// ─────────────────────────────────────────────────────────────────────────────
app.post("/start-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Starting recording for user: ${userID}`);

  // Get/create the user's session
  const userSession = getOrCreateUserSession(userID);
  const { recordSession } = userSession;

  // If there's an existing ffmpeg process, kill it (clean up old recording)
  if (recordSession.ffmpegProcess) {
    console.log(`Found existing recording for user ${userID}, cleaning up...`);
    recordSession.ffmpegProcess.kill("SIGTERM");
  }

  const timestamp = Date.now();
  const filePath = path.resolve(recordingsDir, `${userID}_${timestamp}.mp3`);

  try {
    // Spin up FFmpeg
    const ffmpegProcess = ffmpeg(streamUrl)
      .inputOptions([
        "-y", // overwrite output
        "-re", // read input at native frame rate
      ])
      .outputOptions(["-acodec", "libmp3lame", "-ab", "128k", "-ac", "2", "-ar", "44100"])
      .on("start", (cmd) => {
        console.log(`FFmpeg started with command: ${cmd}`);
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`FFmpeg error for user ${userID}:`, err.message);
        console.error("FFmpeg stderr:", stderr);

        // Clean up the recordSession if error
        recordSession.ffmpegProcess = null;
        recordSession.filePath = null;
        recordSession.startTime = null;
      })
      .on("end", () => {
        console.log(`Recording ended for user ${userID}`);
      });

    ffmpegProcess.save(filePath);

    // Store new info in the recordSession sub-object
    recordSession.ffmpegProcess = ffmpegProcess;
    recordSession.filePath = filePath;
    recordSession.startTime = Date.now();

    console.log(`Recording started for user ${userID} at ${filePath}`);
    res.status(200).json({
      message: "Recording started successfully",
      filename: path.basename(filePath),
    });
  } catch (error) {
    console.error(`Error starting recording for user ${userID}:`, error);
    res.status(500).json({
      message: "Failed to start recording",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STOP RECORDING
// ─────────────────────────────────────────────────────────────────────────────
app.post("/stop-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Stopping recording for user: ${userID}`);

  const userSession = activeSessions.get(userID);
  if (!userSession) {
    return res.status(400).json({
      message: "No session found for user",
      userID,
    });
  }

  const { recordSession } = userSession;
  if (!recordSession.ffmpegProcess) {
    return res.status(400).json({
      message: "No active recording session found",
      userID,
    });
  }

  try {
    const { ffmpegProcess, filePath, startTime } = recordSession;

    // Ensure minimum 1-second recording
    const recordingDuration = Date.now() - startTime;
    if (recordingDuration < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - recordingDuration));
    }

    // Kill FFmpeg
    ffmpegProcess.kill("SIGTERM");

    // Small delay to allow final write
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check file
    if (!fs.existsSync(filePath)) {
      throw new Error("Recording file not found");
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Recording file is empty");
    }

    console.log(`Sending file to client: ${filePath} (${stats.size} bytes)`);

    // Reset the recordSession data (but leave streamSession alone!)
    recordSession.ffmpegProcess = null;
    recordSession.filePath = null;
    recordSession.startTime = null;

    // Send file for download
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file: ${err.message}`);
        return;
      }
      // Delete the file after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Error deleting file: ${unlinkErr.message}`);
        } else {
          console.log(`File deleted from server: ${filePath}`);
        }
      });
    });
  } catch (error) {
    console.error(`Error stopping recording for user ${userID}:`, error);
    // Reset the recordSession on error, but do NOT remove entire user session
    userSession.recordSession = {
      ffmpegProcess: null,
      filePath: null,
      startTime: null,
    };

    res.status(500).json({
      message: "Failed to stop recording",
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START STREAM
// (Currently just sets isActive; real audio is proxied at /stream always.)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/stream/start-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Starting stream for user: ${userID}`);

  const userSession = getOrCreateUserSession(userID);
  const { streamSession } = userSession;

  // If already streaming, do nothing or re-init if you have some custom logic
  if (streamSession.isActive) {
    console.log(`Stream is already active for user ${userID}.`);
    return res.status(200).json({
      success: true,
      message: "Stream already active.",
    });
  }

  // Otherwise, set it active
  streamSession.isActive = true;
  console.log(`Stream started for user ${userID}`);
  res.status(200).json({
    success: true,
    message: "Stream started successfully.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STOP STREAM
// (Stops the "streamActive" flag; does not remove the entire user session.)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/stop-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Stopping stream for user: ${userID}`);

  const userSession = activeSessions.get(userID);
  if (!userSession || !userSession.streamSession.isActive) {
    console.log(`No active stream session found for user ${userID}`);
    return res.status(400).json({
      success: false,
      message: "No active stream session found.",
    });
  }

  // Implement any real logic if you re-stream at the server
  userSession.streamSession.isActive = false;

  console.log(`Stream stopped for user ${userID}`);
  res.status(200).json({
    success: true,
    message: "Stream stopped successfully.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS
// Returns session status plus the proxied /stream URL
// ─────────────────────────────────────────────────────────────────────────────
app.get("/status", (req, res) => {
  const userID = req.userID;
  const userSession = activeSessions.get(userID);

  // We only mark "isRecording" if recordSession exists with an ffmpegProcess
  const isRecording = !!(
    userSession?.recordSession && userSession.recordSession.ffmpegProcess
  );

  // We only mark "isStreaming" if streamSession exists and isActive
  const isStreaming = !!(userSession?.streamSession && userSession.streamSession.isActive);

  res.json({
    status: "running",
    userID,
    isRecording,
    isStreaming,
    activeSessionsCount: activeSessions.size,
    streamUrl: `${req.protocol}://${req.get("host")}/stream`, // same old proxy endpoint
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STREAM ENDPOINT (Proxy for live audio, to bypass CORS)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/stream", async (req, res) => {
  const targetStreamUrl =
    process.env.STREAM_URL || "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";

  try {
    console.log(`Proxying stream from: ${targetStreamUrl}`);
    const response = await axios.get(targetStreamUrl, { responseType: "stream" });

    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe the remote audio data to the response
    response.data.pipe(res);

    response.data.on("end", () => {
      console.log("Stream ended.");
      res.end();
    });

    response.data.on("error", (err) => {
      console.error("Error in streamed data:", err);
      res.status(500).send("Error in streaming data");
    });
  } catch (err) {
    console.error("Error fetching stream:", err.message);
    res.status(500).send("Failed to fetch and stream audio");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Accepting requests from: ${FRONTEND_URLS}`);
});
