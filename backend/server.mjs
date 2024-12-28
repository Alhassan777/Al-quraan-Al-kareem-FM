import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3001;

// Radio stream URL
const RADIO_STREAM_URL = "https://n10.radiojar.com/8s5u5tpdtwzuv.mp3";

// Basic test route for server health check
app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.send("Server is working!");
});

// Proxy endpoint
app.get("/proxyStream", async (req, res) => {
  console.log("Received request for /proxyStream");
  try {
    console.log(`Attempting to fetch from: ${RADIO_STREAM_URL}`);
    const response = await fetch(RADIO_STREAM_URL);

    if (!response.ok) {
      console.error(`Failed to fetch the radio stream. Status: ${response.status}`);
      res.status(500).send(`Failed to fetch radio stream. Status: ${response.status}`);
      return;
    }

    console.log("Stream fetched successfully. Preparing to pipe the response.");
    
    // Set response headers for CORS and streaming
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");

    // Pipe the stream directly to the response
    response.body.pipe(res);

    console.log("Streaming started.");
  } catch (error) {
    console.error("Error while proxying the stream:", error);
    res.status(500).send("Unable to fetch radio stream.");
  }
});

// Route to serve a static file for debugging
app.get("/testStream", (req, res) => {
  console.log("Serving static MP3 file for debugging.");
  const testFilePath = "./test.mp3";

  // Check if the file exists
  if (!fs.existsSync(testFilePath)) {
    console.error("Static file not found: test.mp3");
    res.status(404).send("Static MP3 file not found.");
    return;
  }

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Content-Type", "audio/mpeg");
  const readStream = fs.createReadStream(testFilePath);

  readStream.on("open", () => {
    console.log("Static MP3 file streaming started.");
    readStream.pipe(res);
  });

  readStream.on("error", (err) => {
    console.error("Error streaming static file:", err);
    res.status(500).send("Error streaming static file.");
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
