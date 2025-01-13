// backend/server.js

import express from "express";
import axios from 'axios';
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
const FRONTEND_URLS = environment === "production"
  ? [process.env.FRONTEND_PROD_URL]
  : [process.env.FRONTEND_DEV_URL, "http://localhost:5173"];
const streamUrl = process.env.STREAM_URL;
const recordingsDir = path.resolve(process.env.RECORDINGS_DIR || "recordings");

// Ensure recordings directory exists
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Middleware setup with extended CORS options
app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-user-id"],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session tracking map
const activeSessions = new Map();

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Cookie userID: ${req.cookies.userID}`);
  next();
});

// User session middleware with more robust ID handling
app.use((req, res, next) => {
  let userID = req.cookies.userID;
  
  // Check for userID in headers as fallback
  if (!userID && req.headers['x-user-id']) {
    userID = req.headers['x-user-id'];
  }
  
  if (!userID) {
    userID = uuidv4();
    res.cookie('userID', userID, {
      httpOnly: true,
      secure: environment === "production",
      sameSite: environment === "production" ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  req.userID = userID;
  next();
});

// Start Recording Endpoint
app.post("/start-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Starting recording for user: ${userID}`);

  if (activeSessions.has(userID)) {
    console.log(`Found existing session for user ${userID}, cleaning up...`);
    const existingSession = activeSessions.get(userID);
    if (existingSession.ffmpegProcess) {
      existingSession.ffmpegProcess.kill('SIGTERM');
    }
    activeSessions.delete(userID);
  }

  const timestamp = Date.now();
  const filePath = path.resolve(recordingsDir, `${userID}_${timestamp}.mp3`);

  try {
    const ffmpegProcess = ffmpeg(streamUrl)
      .inputOptions([
        '-y', // Overwrite output files without asking
        '-re' // Read input at native frame rate
      ])
      .outputOptions([
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-ac', '2',
        '-ar', '44100'
      ])
      .on('start', (cmd) => {
        console.log(`FFmpeg started with command: ${cmd}`);
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`FFmpeg error for user ${userID}:`, err.message);
        console.error('FFmpeg stderr:', stderr);
        activeSessions.delete(userID);
      })
      .on('end', () => {
        console.log(`Recording ended for user ${userID}`);
      });

    // Start the recording
    ffmpegProcess.save(filePath);

    // Store session info
    activeSessions.set(userID, {
      ffmpegProcess,
      filePath,
      startTime: Date.now()
    });

    console.log(`Recording started for user ${userID} at ${filePath}`);
    res.status(200).json({
      message: "Recording started successfully",
      filename: path.basename(filePath)
    });

  } catch (error) {
    console.error(`Error starting recording for user ${userID}:`, error);
    res.status(500).json({ 
      message: "Failed to start recording",
      error: error.message
    });
  }
});

// STOP RECORDING ENDPOINT 

app.post("/stop-recording", async (req, res) => {
  const userID = req.userID;
  console.log(`Stopping recording for user: ${userID}`);
  
  const session = activeSessions.get(userID);
  if (!session) {
    return res.status(400).json({
      message: "No active recording session found",
      userID: userID,
      activeSessions: Array.from(activeSessions.keys()),
    });
  }

  try {
    const { ffmpegProcess, filePath, startTime } = session;

    // Ensure minimum 1 second recording
    const recordingDuration = Date.now() - startTime;
    if (recordingDuration < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - recordingDuration));
    }

    // Kill FFmpeg
    ffmpegProcess.kill("SIGTERM");

    // Give the process a moment to finish writing the file
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check that file exists and is non-empty
    if (!fs.existsSync(filePath)) {
      throw new Error("Recording file not found");
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("Recording file is empty");
    }

    console.log(`Sending file to client: ${filePath} (${stats.size} bytes)`);

    // Remove the active session before sending
    activeSessions.delete(userID);

    // Send file for download, then delete
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`Error sending file: ${err.message}`);
        return;
      }

      // Automatically remove the file from the server after sending
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
    res.status(500).json({
      message: "Failed to stop recording",
      error: error.message,
    });
    
    // Remove session on error to avoid leftover state
    activeSessions.delete(userID);
  }
});


// Start Stream Endpoint
app.post("/stream/start-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Starting stream for user: ${userID}`);

  if (activeSessions.has(userID)) {
    console.log(`Found existing stream session for user ${userID}, cleaning up...`);
    const existingSession = activeSessions.get(userID);
    if (existingSession.streamActive) {
      // If you have a stream process, terminate it here
      // existingSession.streamProcess.kill('SIGTERM');
    }
    activeSessions.delete(userID);
  }

  try {
    // Implement any logic needed to start the stream visualization
    // For now, we'll assume the stream is always available via /stream

    activeSessions.set(userID, {
      streamActive: true,
      startTime: Date.now()
    });

    console.log(`Stream started for user ${userID}`);
    res.status(200).json({
      success: true,
      message: "Stream started successfully."
    });
  } catch (error) {
    console.error(`Error starting stream for user ${userID}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to start stream.",
      error: error.message
    });
  }
});

// Stop Stream Endpoint
app.post("/stop-stream", (req, res) => {
  const userID = req.userID;
  console.log(`Stopping stream for user: ${userID}`);

  const session = activeSessions.get(userID);

  if (!session || !session.streamActive) {
    console.log(`No active stream session found for user ${userID}`);
    return res.status(400).json({
      success: false,
      message: "No active stream session found."
    });
  }

  try {
    // Implement any logic needed to stop the stream visualization
    // For example, terminating a stream process or releasing resources

    activeSessions.delete(userID);

    console.log(`Stream stopped for user ${userID}`);
    res.status(200).json({
      success: true,
      message: "Stream stopped successfully."
    });
  } catch (error) {
    console.error(`Error stopping stream for user ${userID}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to stop stream.",
      error: error.message
    });
  }
});

// Status Endpoint
app.get("/status", (req, res) => {
  const userID = req.userID;
  const isRecording = activeSessions.has(userID) && activeSessions.get(userID).ffmpegProcess;
  const isStreaming = activeSessions.has(userID) && activeSessions.get(userID).streamActive;

  res.json({
    status: "running",
    userID: userID,
    isRecording: isRecording,
    isStreaming: isStreaming,
    activeSessionsCount: activeSessions.size,
    streamUrl: `${req.protocol}://${req.get('host')}/stream`, // Updated to point to /stream
  });
});

// Stream Endpoint
app.get("/stream", async (req, res) => {
  const targetStreamUrl = process.env.STREAM_URL || "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";
  
  try {
    console.log(`Proxying stream from: ${targetStreamUrl}`);

    // Fetch the stream using axios
    const response = await axios.get(targetStreamUrl, { responseType: "stream" });

    // Set appropriate headers for the stream
    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe the audio stream directly to the client
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Accepting requests from: ${FRONTEND_URLS}`);
});
