"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, StopCircle } from "lucide-react";

// ----------------------------------------------------------------
//  VolumeSlider component
// ----------------------------------------------------------------
const VolumeSlider = ({ volume, onVolumeChange }) => {
  const [status, setStatus] = useState("مرحبًا بك! جاهز لتعديل مستوى الصوت.");

  const handleVolumeChange = (e) => {
    const newVolume = Number(e.target.value); // 0–100
    onVolumeChange(newVolume);

    if (newVolume === 0) {
      setStatus("تم كتم الصوت.");
    } else {
      setStatus(`تم تعديل مستوى الصوت إلى ${newVolume}%.`);
    }
  };

  const handleKeyDown = (e) => {
    e.preventDefault();
    const step = 5; // Adjust step as needed
    let newVolume = volume;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        newVolume = Math.min(volume + step, 100);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        newVolume = Math.max(volume - step, 0);
        break;
      default:
        return;
    }

    onVolumeChange(newVolume);
    if (newVolume === 0) {
      setStatus("تم كتم الصوت.");
    } else {
      setStatus(`تم تعديل مستوى الصوت إلى ${newVolume}%.`);
    }
  };

  return (
    <div className="bg-[#112436] p-6 rounded-lg shadow-md text-[#C4A661] w-full max-w-md">
      <input
        dir="ltr"
        type="range"
        min="0"
        max="100"
        step="1"
        value={volume}
        onChange={handleVolumeChange}
        onKeyDown={handleKeyDown}
        className="w-full h-2 bg-[#C4A661]/20 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #C4A661 ${volume}%, rgba(196, 166, 97, 0.2) ${volume}%)`,
        }}
      />
      <div className="status p-3 rounded-md mt-4 text-lg shadow-md bg-[#112436]">
        <p>{status}</p>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------
//  Player component
// ----------------------------------------------------------------
const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to play");
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [volume, setVolume] = useState(1); // Normalized volume (0–1)

  // --------------------------------------
  //  NEW: Duration + Unit for recording
  // --------------------------------------
  const [recordingDuration, setRecordingDuration] = useState(10);
  const [recordingUnit, setRecordingUnit] = useState("seconds"); 
  // "seconds" | "minutes" | "hours" | "manual"

  const [isConverting, setIsConverting] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Visual indicators
  const [streamingBlink, setStreamingBlink] = useState(false);
  const [recordingFlip, setRecordingFlip] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // The URL to your proxied or direct stream
  const streamUrls = ["http://localhost:3001/proxyStream"];

  // ----------------------------------
  //   EFFECT: Initialize Audio
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
        // Create or resume an AudioContext
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Create media element source
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(audioCtxRef.current.destination);
        }

        // Create a MediaStreamDestination for recording
        if (!destinationNodeRef.current) {
          destinationNodeRef.current = audioCtxRef.current.createMediaStreamDestination();
          sourceNodeRef.current.connect(destinationNodeRef.current);
        }

        // Create a MediaRecorder
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
              setRecordedChunks((prev) => [...prev, event.data]);
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

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch((err) => {
          console.error("Error closing audio context:", err);
        });
      }
    };
  }, []);

  // ----------------------------------
  //   EFFECT: Blinking (Streaming)
  // ----------------------------------
  useEffect(() => {
    let intervalId;
    if (isLive) {
      intervalId = setInterval(() => {
        setStreamingBlink((prev) => !prev);
      }, 500);
    } else {
      setStreamingBlink(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLive]);

  // ----------------------------------
  //   EFFECT: Flip Animation (REC)
  // ----------------------------------
  useEffect(() => {
    setRecordingFlip(true);
    const timer = setTimeout(() => {
      setRecordingFlip(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isRecording]);

  // ----------------------------------
  //   DERIVED IMAGE PATHS
  // ----------------------------------
  const streamingSrc = isLive
    ? streamingBlink
      ? "Streaming On.png"
      : "Streaming Off.png"
    : "Streaming Off.png";
  const recordingSrc = isRecording ? "Recording On.png" : "Recording Off.png";

  // ----------------------------------
  //   HANDLERS
  // ----------------------------------
  const togglePlayPause = async () => {
    try {
      if (!audioRef.current || !audioCtxRef.current) return;

      if (isPlaying) {
        // Pause
        audioRef.current.pause();
        setStatus("Playback paused");
        setIsPlaying(false);
        setIsLive(false);
      } else {
        // Set the stream URL and ensure audio element reloads
        audioRef.current.src = streamUrls[0];
        audioRef.current.load();

        // IMPORTANT: Resume AudioContext (in case it’s suspended)
        await audioCtxRef.current.resume();

        // Now try playing
        await audioRef.current.play();
        audioRef.current.volume = volume;
        
        setStatus("Playing stream");
        setIsPlaying(true);
        setIsLive(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setStatus(`Playback error: ${error.message}`);
    }
  };

  // Start/stop recording
  const toggleRecording = () => {
    if (!mediaRecorderRef.current) {
      setStatus("Recording system not ready.");
      return;
    }

    if (isRecording) {
      // Stop existing recording
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimeoutRef.current);
      setIsRecording(false);
      setStatus("Recording stopped.");

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
      mediaRecorderRef.current.start(1000); // timeslice=1000ms
      setIsRecording(true);
      setStatus("Recording...");

      // Compute total recording time based on unit
      let totalDuration = 0;
      if (recordingUnit === "seconds") {
        totalDuration = recordingDuration;
      } else if (recordingUnit === "minutes") {
        totalDuration = recordingDuration * 60;
      } else if (recordingUnit === "hours") {
        totalDuration = recordingDuration * 3600;
      } 
      // If "manual", totalDuration will remain 0 => no auto stop

      if (totalDuration > 0) {
        recordingTimeoutRef.current = setTimeout(() => {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setStatus("Recording stopped after time limit.");

          setTimeout(() => {
            if (recordedChunks.length > 0) {
              const webmBlob = new Blob(recordedChunks, {
                type: mediaRecorderRef.current.mimeType,
              });
              processRecording(webmBlob);
              setRecordedChunks([]);
            }
          }, 200);
        }, totalDuration * 1000);
      }
    }
  };

  // ----------------------------------
  //   CONVERSION (WEBM -> MP3)
  // ----------------------------------
  const processRecording = async (webmBlob) => {
    setIsConverting(true);
    setStatus("Converting to MP3...");

    try {
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);

      // Convert to MP3 (requires lamejs)
      const mp3Blob = await convertToMp3(audioBuffer);
      downloadBlob(mp3Blob, "mp3");
      setStatus("Recording downloaded as MP3.");
    } catch (error) {
      console.error("Conversion error:", error);
      setStatus("Error converting to MP3. Downloading original WEBM.");
      downloadBlob(webmBlob, "webm");
    } finally {
      setIsConverting(false);
    }
  };

  const convertToMp3 = async (audioBuffer) => {
    if (typeof window.lamejs === "undefined") {
      throw new Error("lamejs not loaded");
    }

    const channelData = audioBuffer.getChannelData(0); // mono
    const sampleRate = audioBuffer.sampleRate;

    const mp3Encoder = new window.lamejs.Mp3Encoder(1, sampleRate, 128);
    const sampleBlockSize = 1152;
    const mp3Data = [];

    let i = 0;
    while (i < channelData.length) {
      const sampleChunk = channelData.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(float32ToInt16(sampleChunk));
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      i += sampleBlockSize;
    }

    const end = mp3Encoder.flush();
    if (end.length > 0) {
      mp3Data.push(end);
    }

    return new Blob(mp3Data, { type: "audio/mp3" });
  };

  const float32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  const downloadBlob = (blob, extension) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `recording_${timestamp}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------
  //         RENDER
  // ----------------------------------
  return (
    <div className="bg-[#1a2b47] w-full min-h-screen flex flex-col items-center justify-between py-6 px-4">
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

        {/* Volume Slider & Recording Duration */}
        <div className="flex flex-col items-center mt-8 space-y-6 w-full">
          <VolumeSlider
            volume={Math.round(volume * 100)}
            onVolumeChange={(newVolume) => {
              const normalized = newVolume / 100;
              setVolume(normalized);
              if (audioRef.current) {
                audioRef.current.volume = normalized;
              }
            }}
          />

          {/* --------------------------------------------- */}
          {/*     Recording Duration / Manual Stop Picker    */}
          {/* --------------------------------------------- */}
          <div className="flex flex-col items-center bg-[#112436] p-4 rounded shadow-md">
            <label className="text-sm text-white/70 mb-2">Recording Limit</label>
            
            <div className="flex items-center space-x-2">
              {/* Numeric input for the duration */}
              <input
                type="number"
                min="1"
                value={recordingDuration}
                onChange={(e) => setRecordingDuration(parseInt(e.target.value, 10))}
                className="w-16 text-center text-white bg-white/10 border border-white/20 rounded"
                disabled={recordingUnit === "manual"}
              />

              {/* Dropdown to choose unit */}
              <select
                value={recordingUnit}
                onChange={(e) => setRecordingUnit(e.target.value)}
                className="text-white bg-white/10 border border-white/20 rounded px-2"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators & Status Messages */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center mt-6">
        <div className="flex items-center space-x-8 mb-4">
          {/* Recording Indicator */}
          <div className="flex items-center space-x-3">
            <img
              src={recordingSrc}
              alt="Recording"
              className={`w-6 h-6 ${recordingFlip ? "flip-animation" : ""}`}
            />
            <span className="text-sm text-white/70">REC</span>
          </div>

          {/* Streaming Indicator */}
          <div className="flex items-center space-x-3">
            <img src={streamingSrc} alt="Live" className="w-6 h-6" />
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
        type="audio/mpeg"
        className="hidden"
      />
    </div>
  );
};

export default Player;
