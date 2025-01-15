/**************************************
 * backend/server.mjs (hardcoded origins)
 **************************************/

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

// ESM fixups for __filename / __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**************************************
 * ENV + PORT
 **************************************/
const environment = process.env.ENVIRONMENT || "development";
const PORT = process.env.PORT || 3001;

/**************************************
 * TRUST PROXIES
 **************************************/
app.set("trust proxy", true); // Required for correct IP + protocol behind proxies

/**************************************
 * HARDCODED CORS CONFIG
 **************************************/
const ALLOWED_ORIGINS = [
  // Add all domains you want to allow — including local dev if needed
  "http://localhost:5173",
  "https://qurannfm.netlify.app",
  "https://qurankareemradio.com",
  "https://www.qurankareemradio.com",
];

// 1) CORS MIDDLEWARE FIRST
app.use(
  cors({
    origin: (origin, callback) => {
      // If no Origin header (e.g. same-site or server-to-server), allow it
      if (!origin) {
        return callback(null, true);
      }
      // Check against ALLOWED_ORIGINS
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.error("CORS blocked origin:", origin);
      return callback(new Error(`CORS Not Allowed for origin: ${origin}`), false);
    },
    credentials: true,
    // Expanded allowed methods
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // Expanded allowed headers
    allowedHeaders: ["Content-Type", "x-user-id", "Origin", "Authorization"],
    // Explicitly expose certain headers (optional example)
    exposedHeaders: ["Content-Length", "Content-Type", "X-Request-Id"],
    // Preflight request handling
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// 2) REMOVE app.options("*", cors())
// (Claude recommended removing it to avoid conflicts)

// Debug: show environment + allowed origins
console.log("Environment:", environment);
console.log("HARDCODED ALLOWED_ORIGINS:", ALLOWED_ORIGINS);

// 3) TEMPORARY LOGGING FOR RAILWAY TROUBLESHOOTING
app.use((req, res, next) => {
  console.log("Incoming request:", {
    method: req.method,
    origin: req.headers.origin,
    path: req.path,
  });
  next();
});

/**************************************
 * MIDDLEWARE (BODY PARSER / COOKIE PARSER)
 **************************************/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// (Optional) Additional debug: log incoming requests
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Env: ${environment}`);
  console.log("Headers:", req.headers);
  next();
});

/**************************************
 * SESSION HANDLING
 **************************************/
const activeSessions = new Map();

/**
 * If a userID doesn't exist in a cookie or x-user-id header,
 * generate one and set it as httpOnly cookie.
 */
app.use((req, res, next) => {
  let userID = req.cookies.userID;

  // Fallback: check x-user-id header
  if (!userID && req.headers["x-user-id"]) {
    userID = req.headers["x-user-id"];
  }

  // Generate a new userID if still missing
  if (!userID) {
    userID = uuidv4();
    res.cookie("userID", userID, {
      httpOnly: true,
      secure: environment === "production", // only HTTPS in production
      sameSite: environment === "production" ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  req.userID = userID;
  next();
});

/**
 * Helper function to get or create a session object for each userID.
 */
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

/**************************************
 * RECORDINGS DIRECTORY
 **************************************/
const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
  console.log(`Created recordings directory at: ${recordingsDir}`);
}

/**************************************
 * START RECORDING
 **************************************/
app.post("/start-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Starting recording for user: ${userID}`);

  const userSession = getOrCreateUserSession(userID);
  const { recordSession } = userSession;

  // If there's already a recording in progress, kill it
  if (recordSession.ffmpegProcess) {
    console.log(`Found existing recording for user ${userID}, cleaning up...`);
    recordSession.ffmpegProcess.kill("SIGTERM");
  }

  const timestamp = Date.now();
  const filePath = path.join(recordingsDir, `${userID}_${timestamp}.mp3`);

  try {
    // Use STREAM_URL from environment or fallback
    const streamUrl = process.env.STREAM_URL;
    if (!streamUrl) {
      throw new Error("No STREAM_URL defined in environment");
    }

    // Spin up FFmpeg
    const ffmpegProcess = ffmpeg(streamUrl)
      .inputOptions(["-y", "-re"]) // Overwrite, read input in real-time
      .outputOptions(["-acodec", "libmp3lame", "-ab", "128k", "-ac", "2", "-ar", "44100"])
      .on("start", (cmd) => {
        console.log(`FFmpeg started with command: ${cmd}`);
      })
      .on("error", (err, stdout, stderr) => {
        console.error(`FFmpeg error for user ${userID}: ${err.message}`);
        console.error("FFmpeg stderr:", stderr);
        // Reset record session
        recordSession.ffmpegProcess = null;
        recordSession.filePath = null;
        recordSession.startTime = null;
      })
      .on("end", () => {
        console.log(`Recording ended for user ${userID}`);
      });

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
    console.error(`Error starting recording for user ${userID}:`, error);
    res.status(500).json({
      message: "Failed to start recording",
      error: error.message,
    });
  }
});

/**************************************
 * STOP RECORDING
 **************************************/
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

    // Enforce minimum 1 second recording
    const elapsed = Date.now() - startTime;
    if (elapsed < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
    }

    // Kill the FFmpeg process
    ffmpegProcess.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait to finalize file

    if (!fs.existsSync(filePath)) {
      throw new Error("Recording file not found");
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Recording file is empty");
    }

    // Reset the record session
    recordSession.ffmpegProcess = null;
    recordSession.filePath = null;
    recordSession.startTime = null;

    console.log(`Sending file to client: ${filePath} (${stats.size} bytes)`);

    // Send the recorded MP3 to client, then delete it
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file: ${err.message}`);
        return;
      }
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

/**************************************
 * START STREAM
 **************************************/
app.post("/stream/start-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Starting stream for user: ${userID}`);

  const userSession = getOrCreateUserSession(userID);
  const { streamSession } = userSession;

  if (streamSession.isActive) {
    console.log(`Stream is already active for user ${userID}`);
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

/**************************************
 * STOP STREAM
 **************************************/
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

  userSession.streamSession.isActive = false;
  console.log(`Stream stopped for user ${userID}`);
  res.status(200).json({
    success: true,
    message: "Stream stopped successfully.",
  });
});

/**************************************
 * STATUS
 **************************************/
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
    environment,
    userID,
    isRecording,
    isStreaming,
    activeSessionsCount: activeSessions.size,
    streamUrl: `${req.protocol}://${req.get("host")}/stream`,
  });
});

/**************************************
 * STREAM ENDPOINT (Proxy live audio)
 **************************************/
app.get("/stream", async (req, res) => {
  const fallback = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";
  const targetStreamUrl = process.env.STREAM_URL || fallback;
  console.log(`Proxying stream from: ${targetStreamUrl}`);

  try {
    const response = await axios.get(targetStreamUrl, {
      responseType: "stream",
      timeout: 10000, // 10s
    });

    // Pass along relevant headers
    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "audio/mpeg"
    );
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe data to client
    response.data.pipe(res);

    response.data.on("end", () => {
      console.log("Upstream audio stream ended.");
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

/**************************************
 * START SERVER
 **************************************/
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${environment}`);
  console.log("HARDCODED ALLOWED_ORIGINS:", ALLOWED_ORIGINS);
});
