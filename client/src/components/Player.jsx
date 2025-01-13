// Player.jsx

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, StopCircle } from "lucide-react";
import axios from "axios"; // Ensure axios is installed: npm install axios

// ----------------------------------------------------------------
//  VolumeSlider component
// ----------------------------------------------------------------
const VolumeSlider = ({ volume, onVolumeChange }) => {
  const [status, setStatus] = useState("تعديل مستوي الصوت");

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
//  RecordingsList component
// ----------------------------------------------------------------
const RecordingsList = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecordings = async () => {
    try {
      const response = await axios.get("http://localhost:3001/recordings");
      setRecordings(response.data.recordings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <p className="text-white">Loading recordings...</p>;
  if (error)
    return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="bg-[#112436] p-4 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-[#C4A661] text-lg mb-2">Available Recordings</h2>
      {recordings.length === 0 ? (
        <p className="text-white">No recordings available.</p>
      ) : (
        <ul>
          {recordings.map((rec) => (
            <li key={rec.name} className="flex justify-between items-center mb-2">
              <span className="text-white">{rec.name.replace(".mp3", "")}</span>
              <a
                href={rec.url}
                download
                className="text-[#C4A661] hover:underline"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
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
  const [volume, setVolume] = useState(1); // Normalized volume (0–1)

  // Recording duration and unit
  const [recordingDuration, setRecordingDuration] = useState(10);
  const [recordingUnit, setRecordingUnit] = useState("seconds"); 
  // "seconds" | "minutes" | "hours" | "manual"

  // Visual indicators
  const [streamingBlink, setStreamingBlink] = useState(false);
  const [recordingFlip, setRecordingFlip] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  // The direct streaming URL
  const streamUrl = "https://n10.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABk-06_7wAAb2D9o5zdb4y4A";

  // ----------------------------------
  //   EFFECT: Blinking (Streaming)
  // ----------------------------------
  useEffect(() => {
    let intervalId;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setStreamingBlink((prev) => !prev);
      }, 500);
    } else {
      setStreamingBlink(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);

  // ----------------------------------
  //   EFFECT: Flip Animation (REC)
  // ----------------------------------
  useEffect(() => {
    if (isRecording) {
      setRecordingFlip(true);
      const timer = setTimeout(() => {
        setRecordingFlip(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  // ----------------------------------
  //   DERIVED IMAGE PATHS
  // ----------------------------------
  const streamingSrc = isPlaying
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
      if (!audioRef.current) return;

      if (isPlaying) {
        // Pause
        audioRef.current.pause();
        setStatus("Playback paused");
        setIsPlaying(false);
      } else {
        // Set the stream URL and ensure audio element reloads
        audioRef.current.src = streamUrl;
        audioRef.current.load();

        // Now try playing
        await audioRef.current.play();
        audioRef.current.volume = volume;
        
        setStatus("Playing stream");
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setStatus(`Playback error: ${error.message}`);
    }
  };

  // Start/stop recording via server
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      try {
        await axios.post('http://localhost:3001/stop-recording');
        setStatus("Recording stopped.");
        setIsRecording(false);
        clearTimeout(recordingTimeoutRef.current);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setStatus(`Error stopping recording: ${error.message}`);
      }
    } else {
      // Start recording
      try {
        await axios.post('http://localhost:3001/start-recording');
        setStatus("Recording started.");
        setIsRecording(true);

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
          recordingTimeoutRef.current = setTimeout(async () => {
            try {
              await axios.post('http://localhost:3001/stop-recording');
              setStatus("Recording stopped after time limit.");
              setIsRecording(false);
            } catch (error) {
              console.error("Error stopping recording after timeout:", error);
              setStatus(`Error stopping recording: ${error.message}`);
            }
          }, totalDuration * 1000);
        }
      } catch (error) {
        console.error("Error starting recording:", error);
        setStatus(`Error starting recording: ${error.message}`);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

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
            <label className="text-sm text-white/70 mb-2">اختيار مدة التسجيل</label>
            
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
                <option value="seconds">ثواني</option>
                <option value="minutes">دقائق</option>
                <option value="hours">ساعات</option>
                <option value="manual">يدويًا</option>
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
        </div>
      </div>

      {/* Recordings List */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center mt-6">
        <RecordingsList />
      </div>

      {/* Hidden audio element (for playback) */}
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
