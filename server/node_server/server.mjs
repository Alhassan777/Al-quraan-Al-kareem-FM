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

// Resolve current file/directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const environment = process.env.ENVIRONMENT || "development";
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────────────────────────────────────────
// CORS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const FRONTEND_URLS =
  environment === "production"
    ? [process.env.FRONTEND_PROD_URL] // e.g., "https://yourdomain.com"
    : [process.env.FRONTEND_DEV_URL || "http://localhost:5173"];

app.use(
  cors({
    origin: FRONTEND_URLS,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id"],
  })
);

// **Optional**: Explicitly handle `OPTIONS` for all routes
app.options("*", cors());

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Cookie userID: ${req.cookies.userID}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// SESSION HANDLING
// ─────────────────────────────────────────────────────────────────────────────
const activeSessions = new Map();

// Ensure each request has a userID in cookies or headers
app.use((req, res, next) => {
  let userID = req.cookies.userID;

  // Fallback to 'x-user-id' header if no cookie
  if (!userID && req.headers["x-user-id"]) {
    userID = req.headers["x-user-id"];
  }

  // Generate if still missing
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

// Helper: get or create user session object
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
// RECORDINGS DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────
const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// START RECORDING
// ─────────────────────────────────────────────────────────────────────────────
app.post("/start-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Starting recording for user: ${userID}`);

  const userSession = getOrCreateUserSession(userID);
  const { recordSession } = userSession;

  // If there's already a recording, kill it
  if (recordSession.ffmpegProcess) {
    console.log(`Cleaning up old recording for user ${userID}...`);
    recordSession.ffmpegProcess.kill("SIGTERM");
  }

  const timestamp = Date.now();
  const filePath = path.join(recordingsDir, `${userID}_${timestamp}.mp3`);

  try {
    // Spin up FFmpeg
    const ffmpegProcess = ffmpeg(process.env.STREAM_URL)
      .inputOptions(["-y", "-re"]) // overwrite, read at native rate
      .outputOptions(["-acodec", "libmp3lame", "-ab", "128k", "-ac", "2", "-ar", "44100"])
      .on("start", (cmd) => {
        console.log(`FFmpeg started with command: ${cmd}`);
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`FFmpeg error for user ${userID}:`, err.message);
        console.error("FFmpeg stderr:", stderr);
        // Clean up on error
        recordSession.ffmpegProcess = null;
        recordSession.filePath = null;
        recordSession.startTime = null;
      })
      .on("end", () => {
        console.log(`Recording ended for user ${userID}`);
      });

    // Save the file
    ffmpegProcess.save(filePath);

    // Update session
    recordSession.ffmpegProcess = ffmpegProcess;
    recordSession.filePath = filePath;
    recordSession.startTime = timestamp;

    console.log(`Recording started => ${filePath}`);
    res.status(200).json({
      message: "Recording started successfully",
      filename: path.basename(filePath),
    });
  } catch (error) {
    console.error(`Error starting recording:`, error);
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

    // Minimum 1s
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
    }

    // Kill FFmpeg
    ffmpegProcess.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // allow final write

    if (!fs.existsSync(filePath)) {
      throw new Error("Recording file not found");
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Recording file is empty");
    }

    // Reset record session
    recordSession.ffmpegProcess = null;
    recordSession.filePath = null;
    recordSession.startTime = null;

    console.log(`Sending file to client: ${filePath} (${stats.size} bytes)`);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err.message);
        return;
      }
      // Delete after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Error deleting file: ${unlinkErr.message}`);
        } else {
          console.log(`Deleted recording file: ${filePath}`);
        }
      });
    });
  } catch (error) {
    console.error(`Error stopping recording for user ${userID}:`, error);
    // Reset record session on error
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
// (Toggles streamSession.isActive, actual audio is proxied at /stream.)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/stream/start-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Starting stream for user: ${userID}`);

  const userSession = getOrCreateUserSession(userID);
  const { streamSession } = userSession;

  if (streamSession.isActive) {
    console.log(`Stream already active for user ${userID}`);
    return res.status(200).json({
      success: true,
      message: "Stream already active.",
    });
  }

  streamSession.isActive = true;
  console.log(`Stream started for user ${userID}`);
  res.status(200).json({
    success: true,
    message: "Stream started successfully.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STOP STREAM
// ─────────────────────────────────────────────────────────────────────────────
app.post("/stop-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Stopping stream for user: ${userID}`);

  const userSession = activeSessions.get(userID);
  if (!userSession || !userSession.streamSession.isActive) {
    console.log(`No active stream session for user ${userID}`);
    return res.status(400).json({
      success: false,
      message: "No active stream session found.",
    });
  }

  userSession.streamSession.isActive = false;
  console.log(`Stream stopped for user ${userID}`);
  res.status(200).json({
    success: true,
    message: "Stream stopped successfully.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/status", (req, res) => {
  const userID = req.userID;
  const userSession = activeSessions.get(userID);

  const isRecording = !!(
    userSession?.recordSession && userSession.recordSession.ffmpegProcess
  );
  const isStreaming = !!(
    userSession?.streamSession && userSession.streamSession.isActive
  );

  res.json({
    status: "running",
    userID,
    isRecording,
    isStreaming,
    activeSessionsCount: activeSessions.size,
    streamUrl: `${req.protocol}://${req.get("host")}/stream`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STREAM ENDPOINT (Proxy live audio to bypass CORS)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/stream", async (req, res) => {
  const fallback = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";
  const targetStreamUrl = process.env.STREAM_URL || fallback;

  console.log(`Proxying stream from: ${targetStreamUrl}`);

  try {
    const response = await axios.get(targetStreamUrl, {
      responseType: "stream",
      timeout: 10000, // e.g., 10s timeout
    });

    // Set headers
    res.setHeader("Content-Type", response.headers["content-type"] || "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe the remote audio directly to the client
    response.data.pipe(res);

    response.data.on("end", () => {
      console.log("Upstream stream ended.");
      res.end();
    });

    response.data.on("error", (err) => {
      console.error("Error in upstream data:", err);
      res.status(500).send("Error in streaming data");
    });
  } catch (err) {
    console.error("Error fetching remote stream:", err.message);
    res.status(500).send("Failed to fetch and stream audio");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Accepting requests from:`, FRONTEND_URLS);
});
