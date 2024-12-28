"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, StopCircle } from "lucide-react";

const Player = () => {
  // ----------------------------------
  //           STATE
  // ----------------------------------
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to play");
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [volume, setVolume] = useState(1);
  const [recordingDuration, setRecordingDuration] = useState(10);
  const [isConverting, setIsConverting] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // For blinking streaming icon
  const [streamingBlink, setStreamingBlink] = useState(false);

  // For flip animation on recording icon
  const [recordingFlip, setRecordingFlip] = useState(false);

  // ----------------------------------
  //           REFS
  // ----------------------------------
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // Replace with your actual stream URL(s)
  const streamUrls = ["http://localhost:3001/proxyStream"];

  // ----------------------------------
  //   EFFECTS: AUDIO INIT
  // ----------------------------------
  useEffect(() => {
    if (typeof window.lamejs === "undefined") {
      setStatus("Warning: lamejs not loaded. MP3 conversion will not work.");
    }

    const initializeAudio = async () => {
      if (!audioRef.current) {
        setStatus("Audio element not ready.");
        return;
      }

      try {
        // Set up audio context if not already done
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Create media element source if not already done
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(audioCtxRef.current.destination);
        }

        // Create a MediaStreamDestination for recording
        if (!destinationNodeRef.current) {
          destinationNodeRef.current = audioCtxRef.current.createMediaStreamDestination();
          sourceNodeRef.current.connect(destinationNodeRef.current);
        }

        // Create and configure MediaRecorder if not already done
        if (!mediaRecorderRef.current) {
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

          const recorder = new MediaRecorder(destinationNodeRef.current.stream, {
            mimeType,
            bitsPerSecond: 128000,
          });

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              setRecordedChunks((chunks) => [...chunks, event.data]);
            }
          };

          mediaRecorderRef.current = recorder;
        }

        setStatus("Recording system initialized.");
      } catch (error) {
        console.error("Error initializing audio:", error);
        setStatus(`Error initializing audio: ${error.message}`);
      }
    };

    initializeAudio();

    // Cleanup
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ----------------------------------
  //   EFFECT: BLINKING (STREAMING)
  // ----------------------------------
  useEffect(() => {
    let intervalId;

    if (isLive) {
      // Toggle streamingBlink every 500 ms to blink
      intervalId = setInterval(() => {
        setStreamingBlink((prev) => !prev);
      }, 500);
    } else {
      // If streaming is off, ensure blink is false
      setStreamingBlink(false);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLive]);

  // ----------------------------------
  //   EFFECT: FLIP ANIMATION (REC)
  // ----------------------------------
  useEffect(() => {
    // Trigger flip animation whenever isRecording changes
    setRecordingFlip(true);

    const timer = setTimeout(() => {
      setRecordingFlip(false);
    }, 300); // match the duration of flip animation in CSS

    return () => clearTimeout(timer);
  }, [isRecording]);

  // ----------------------------------
  //   DERIVED IMAGE PATHS
  // ----------------------------------
  // 1) Streaming image: if isLive => blink between On/Off, else always Off
  const streamingSrc = isLive
    ? streamingBlink
      ? "Streaming On.png"
      : "Streaming Off.png"
    : "Streaming Off.png";

  // 2) Recording image: if isRecording => "On", else "Off"
  const recordingSrc = isRecording ? "Recording On.png" : "Recording Off.png";

  // ----------------------------------
  //   HANDLERS
  // ----------------------------------
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const togglePlayPause = async () => {
    try {
      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
        setStatus("Playback paused");
        setIsPlaying(false);
        setIsLive(false);
      } else {
        audioRef.current.src = streamUrls[0];
        await audioRef.current.play();
        setStatus("Playing stream");
        setIsPlaying(true);
        setIsLive(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setStatus(`Playback error: ${error.message}`);
    }
  };

  // Start or stop recording
  const toggleRecording = () => {
    if (!mediaRecorderRef.current) {
      setStatus("Recording system not ready.");
      return;
    }

    if (isRecording) {
      // Stop current recording
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimeoutRef.current);
      setIsRecording(false);
      setStatus("Recording stopped.");

      // Process the recorded chunks after a brief delay
      setTimeout(() => {
        if (recordedChunks.length > 0) {
          const webmBlob = new Blob(recordedChunks, {
            type: mediaRecorderRef.current.mimeType,
          });
          processRecording(webmBlob);
          setRecordedChunks([]);
        }
      }, 100);
    } else {
      // Start a new recording
      setRecordedChunks([]);
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setStatus("Recording...");

      // Automatically stop after recordingDuration seconds
      recordingTimeoutRef.current = setTimeout(() => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setStatus("Recording stopped after time limit.");

        // Process the recorded chunks after a brief delay
        setTimeout(() => {
          if (recordedChunks.length > 0) {
            const webmBlob = new Blob(recordedChunks, {
              type: mediaRecorderRef.current.mimeType,
            });
            processRecording(webmBlob);
            setRecordedChunks([]);
          }
        }, 200);
      }, recordingDuration * 1000);
    }
  };

  // ----------------------------------
  // CONVERSION LOGIC (WEBM -> MP3)
  // ----------------------------------
  const processRecording = async (webmBlob) => {
    setIsConverting(true);
    setStatus("Converting to MP3...");

    try {
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      const mp3Blob = await convertToMp3(audioBuffer);

      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `recording_${timestamp}.mp3`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("Recording downloaded as MP3.");
    } catch (error) {
      console.error("Conversion error:", error);
      setStatus("Error converting to MP3. Downloading original format.");

      // Download the original WEBM if MP3 conversion fails
      const url = URL.createObjectURL(webmBlob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `recording_${timestamp}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsConverting(false);
    }
  };

  const convertToMp3 = async (audioBuffer) => {
    if (typeof window.lamejs === "undefined") {
      throw new Error("lamejs not loaded");
    }

    const channelData = audioBuffer.getChannelData(0);
    const mp3Encoder = new window.lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
    const sampleBlockSize = 1152;
    const mp3Data = [];

    for (let i = 0; i < channelData.length; i += sampleBlockSize) {
      const sampleChunk = channelData.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(convertFloat32ToInt16(sampleChunk));
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const end = mp3Encoder.flush();
    if (end.length > 0) {
      mp3Data.push(end);
    }

    return new Blob(mp3Data, { type: "audio/mp3" });
  };

  // Helper to convert from Float32 to Int16
  const convertFloat32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  // ----------------------------------
  //         RENDER
  // ----------------------------------
  return (
    <div className="bg-[#1a2b47] w-full min-h-screen flex flex-col items-center justify-between py-6 px-4">
      {/* Inline CSS for flip animation */}
      <style jsx>{`
        .flip-animation {
          animation: flip 0.3s forwards;
        }
        @keyframes flip {
          0% {
            transform: rotateY(0);
          }
          50% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }
      `}</style>

      {/* Header / Logo */}
      <div className="flex flex-col items-center mt-4">
        <img
          src="/logo.png"
          alt="Station Logo"
          className="w-32 h-32 object-contain mb-4"
        />

        <div className="text-center mb-6">
          <p className="text-xl text-white mb-1">يتم الآن عرض برنامج</p>
          <p className="text-lg text-[#C4A661]">من حدائق الايمان</p>
        </div>

        {/* Playback & Recording Controls */}
        <div className="flex items-center justify-center space-x-10">
          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isPlaying ? (
              <Pause size={28} className="text-white" />
            ) : (
              <Play size={28} className="text-white" />
            )}
          </button>

          {/* Record / Stop */}
          <button
            onClick={toggleRecording}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isRecording ? (
              <StopCircle size={28} className="text-white" />
            ) : (
              <Mic size={28} className="text-white" />
            )}
          </button>
        </div>

        {/* Volume / Recording Duration */}
        <div className="flex flex-col items-center mt-8 space-y-4">
          {/* Volume Slider */}
          <div className="flex items-center space-x-2">
            <label htmlFor="volume" className="text-sm text-white/70">
              Volume
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-40"
            />
          </div>

          {/* Recording Duration Input */}
          <div className="flex items-center space-x-2">
            <label htmlFor="duration" className="text-sm text-white/70">
              Recording Limit (s)
            </label>
            <input
              id="duration"
              type="number"
              min="5"
              max="60"
              value={recordingDuration}
              onChange={(e) => setRecordingDuration(parseInt(e.target.value, 10))}
              className="w-16 text-center text-white bg-white/10 border border-white/20 rounded"
            />
          </div>
        </div>
      </div>

      {/* Indicators & Status Messages */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center mt-6">
        <div className="flex items-center space-x-8 mb-4">
          {/* Recording Indicator (slightly larger icon & extra space) */}
          <div className="flex items-center space-x-3">
            <img
              src={recordingSrc}
              alt="Recording"
              className={`w-6 h-6 ${recordingFlip ? "flip-animation" : ""}`}
            />
            <span className="text-sm text-white/70">REC</span>
          </div>

          {/* Streaming Indicator (blinking; enlarged icon & extra space) */}
          <div className="flex items-center space-x-3">
            <img
              src={streamingSrc}
              alt="Live"
              className="w-6 h-6"
            />
            <span className="text-sm text-white/70">LIVE</span>
          </div>
        </div>

        <div className="text-center text-white/50 text-sm px-4">
          <p>{status}</p>
          {isConverting && <p className="mt-1">Converting... Please wait</p>}
        </div>
      </div>

      {/* Hidden audio element (for playback & recording) */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        className="hidden"
      />
    </div>
  );
};

export default Player;
