import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Directory to save recordings
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// In-memory storage for active recordings
let activeRecording = null;

// Endpoint to start recording
app.post('/start-recording', async (req, res) => {
  if (activeRecording) {
    return res.status(400).json({ message: 'Recording is already in progress.' });
  }

  const streamUrl = 'https://n10.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABk-06_7wAAb2D9o5zdb4y4A';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(recordingsDir, `recording_${timestamp}.mp3`);

  try {
    // Fetch the audio stream
    const response = await fetch(streamUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch stream: ${response.statusText}`);
    }

    // Initialize FFmpeg to record and convert to MP3
    const command = ffmpeg(response.body)
      .inputFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .format('mp3')
      .save(outputPath)
      .on('start', () => {
        console.log('Recording started...');
        activeRecording = { command, outputPath };
      })
      .on('error', (err) => {
        console.error('Recording error:', err);
        activeRecording = null;
      })
      .on('end', () => {
        console.log('Recording ended.');
        activeRecording = null;
      });

    res.json({ message: 'Recording started.' });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ message: 'Failed to start recording.', error: error.message });
  }
});

// Endpoint to stop recording
app.post('/stop-recording', (req, res) => {
  if (!activeRecording) {
    return res.status(400).json({ message: 'No active recording to stop.' });
  }

  activeRecording.command.kill('SIGINT');
  activeRecording = null;
  res.json({ message: 'Recording stopped.' });
});

// Endpoint to list recordings
app.get('/recordings', (req, res) => {
  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to list recordings.', error: err.message });
    }

    const recordings = files
      .filter((file) => file.endsWith('.mp3'))
      .map((file) => ({
        name: file,
        url: `http://localhost:${PORT}/recordings/${file}`,
      }));

    res.json({ recordings });
  });
});

// Serve recordings statically
app.use('/recordings', express.static(recordingsDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
