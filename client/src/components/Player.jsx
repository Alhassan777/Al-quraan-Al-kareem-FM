// src/components/Player.jsx

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Play, Pause, Mic, StopCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import AudioBars from "./AudioBars";
import VolumeSlider from "./VolumeSlider";

const VolumeSliderComponent = VolumeSlider;

// Utility to persist user IDs
const getUserId = () => {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = `user_${uuidv4()}`;
    localStorage.setItem("userId", userId);
  }
  return userId;
};

// Simple mobile detection
const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const Player = () => {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("جاهز للتشغيل");

  const [volume, setVolume] = useState(50); // 0–100
  const [recordingDuration, setRecordingDuration] = useState(10);
  const [recordingUnit, setRecordingUnit] = useState("seconds");

  const [streamingBlink, setStreamingBlink] = useState(false);
  const [recordingFlip, setRecordingFlip] = useState(false);

  const recordingTimeoutRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Identify mobile vs. desktop once
  const isMobile = isMobileDevice();

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Persist user ID
  const userId = useRef(getUserId());

  // ─────────────────────────────────────────────────────────────────────────
  // URLs and config
  // ─────────────────────────────────────────────────────────────────────────
  const backendUrl =
    import.meta.env.VITE_TESTING_MODE === "TRUE"
      ? import.meta.env.VITE_NODE_DEV_URL
      : import.meta.env.VITE_NODE_PROD_URL;

  const fallbackStreamUrl = import.meta.env.VITE_FALLBACK_STREAM_URL;
  const mainStreamUrl = import.meta.env.VITE_MAIN_STREAM_URL;

  // For waveform (desktop-only)
  const [waveformStreamUrl, setWaveformStreamUrl] = useState(fallbackStreamUrl);
  const [visualizationActive, setVisualizationActive] = useState(false);

  // Ref to <AudioBars> (desktop-only)
  const audioBarsRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Main audio element for stable playback
  // ─────────────────────────────────────────────────────────────────────────
  const mainAudioRef = useRef(null);

  useEffect(() => {
    if (mainAudioRef.current) {
      mainAudioRef.current.src = mainStreamUrl;
      mainAudioRef.current.volume = volume / 100;
    }
  }, [mainStreamUrl]);

  // Update main audio volume when `volume` changes
  useEffect(() => {
    if (mainAudioRef.current) {
      mainAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch the Node server stream URL (desktop-only)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // If mobile, don't fetch waveform stream or set up Node stream
    if (isMobile) return;

    const fetchStreamUrl = async () => {
      try {
        const response = await axios.get(`${backendUrl}/status`);
        if (response.data && response.data.streamUrl) {
          setWaveformStreamUrl(response.data.streamUrl);
        } else {
          console.warn("Stream URL not available from backend. Using fallback.");
        }
      } catch (error) {
        console.error("Error fetching stream URL:", error);
        setStatus("تعذر جلب رابط البث (للموجات). سيتم استخدام الرابط الاحتياطي.");
      }
    };
    fetchStreamUrl();
  }, [backendUrl, isMobile]);

  // ─────────────────────────────────────────────────────────────────────────
  // Blink effect for streaming
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setStreamingBlink((prev) => !prev);
      }, 500);
    } else {
      setStreamingBlink(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Flip animation for recording icon
  useEffect(() => {
    if (isRecording) {
      setRecordingFlip(true);
      const timer = setTimeout(() => setRecordingFlip(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  // ─────────────────────────────────────────────────────────────────────────
  // PLAY/PAUSE Logic
  // ─────────────────────────────────────────────────────────────────────────
  const togglePlayPause = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isPlaying) {
        // Stop any Node-based waveform (desktop only)
        if (!isMobile) {
          try {
            await axios.post(`${backendUrl}/stop-stream`, {
              userId: userId.current,
            });
          } catch (stopErr) {
            console.error("Failed to stop stream on server:", stopErr);
          }
          setVisualizationActive(false);
          setStatus("تم إيقاف العرض المرئي");
        }

        // Pause main audio
        if (mainAudioRef.current) {
          mainAudioRef.current.pause();
        }

        setIsPlaying(false);
      } else {
        // If desktop, handle waveform
        if (!isMobile) {
          // Resume iOS AudioContext if needed, though on desktop it won't matter
          if (audioBarsRef.current?.resumeContextIfSuspended) {
            await audioBarsRef.current.resumeContextIfSuspended();
          }

          // Start stream on server (for waveform only)
          const response = await axios.post(`${backendUrl}/stream/start-stream`, {
            userId: userId.current,
          });
          if (response.data && response.data.success) {
            setVisualizationActive(true);
            setStatus("تم بدء العرض المرئي");
          } else {
            throw new Error("فشل بدء العرض المرئي");
          }
        }

        // Play main audio
        if (mainAudioRef.current) {
          await mainAudioRef.current.play();
        }

        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Visualization error:", error);
      setStatus(`خطأ: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RECORDING Logic (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${backendUrl}/start-recording`,
        {},
        {
          withCredentials: true,
          headers: {
            "X-User-ID": userId.current,
          },
        }
      );
      setStatus(response.data.message || "تم بدء التسجيل");
      setIsRecording(true);

      if (recordingUnit !== "manual") {
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
        let totalSecs = 0;
        switch (recordingUnit) {
          case "seconds":
            totalSecs = recordingDuration;
            break;
          case "minutes":
            totalSecs = recordingDuration * 60;
            break;
          case "hours":
            totalSecs = recordingDuration * 3600;
            break;
          default:
            totalSecs = 0;
        }

        if (totalSecs > 0) {
          recordingTimeoutRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              stopRecording();
            }
          }, totalSecs * 1000);
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setStatus(`خطأ في بدء التسجيل: ${errorMsg}`);
      setIsRecording(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post(
        `${backendUrl}/stop-recording`,
        {},
        {
          withCredentials: true,
          responseType: "blob",
          headers: {
            "X-User-ID": userId.current,
          },
        }
      );

      if (!response.data || response.data.size === 0) {
        throw new Error("لم يتم استلام أي بيانات تسجيل");
      }

      setStatus("تم إيقاف التسجيل وجاهز للتنزيل");
      setIsRecording(false);

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      // Download the recorded file
      const blob = new Blob([response.data], { type: "audio/mpeg" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `recording_${new Date().toISOString()}.mp3`;

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setStatus(`خطأ في إيقاف التسجيل: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (mainAudioRef.current) {
        mainAudioRef.current.pause();
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#1a2b47] w-full min-h-screen flex flex-col items-center py-6 px-4">
      <style>
        {`
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
        `}
      </style>

      {/* Hidden main audio element */}
      <audio 
        ref={mainAudioRef}
        controls={false}
        autoPlay={false}
        style={{ display: "none" }} 
      />

      {/* Logo / Title */}
      <div className="flex flex-col items-center mt-4">
        <img
          src="/logo.png"
          alt="شعار المحطة"
          className="w-32 h-32 object-contain mb-4"
        />
      </div>

      {/* Waveform Visualization (Desktop Only) */}
      <div className="w-full max-w-md mt-2">
        {(!isMobile && isPlaying) ? (
          <AudioBars
            ref={audioBarsRef}
            streamUrl={waveformStreamUrl}
            active={visualizationActive}
            volume={volume}
          />
        ) : (
          <div className="w-full h-80 bg-[#001f3f] rounded-lg flex items-center justify-center">
            <p className="text-white/50">
              {isMobile
                ? "موجات الصوت غير متاحة على الجوال"
                : "اضغط تشغيل لرؤية الموجات"}
            </p>
          </div>
        )}
      </div>

      {/* Playback & Recording Controls */}
      <div className="flex items-center justify-center space-x-10 mt-6 relative">
        {/* Play / Pause Button */}
        <div className="relative group">
          <button
            onClick={togglePlayPause}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
              isPlaying
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-green-500 hover:bg-green-600"
            }`}
            disabled={isProcessing}
          >
            {isPlaying ? (
              <Pause size={28} className="text-white" />
            ) : (
              <Play size={28} className="text-white" />
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isPlaying ? "إيقاف التشغيل" : "تشغيل الصوت"}
          </div>
        </div>

        {/* Record / Stop Button */}
        <div className="relative group">
          <button
            onClick={toggleRecording}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors ${
              isRecording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-white/10 hover:bg-white/20"
            }`}
            disabled={isProcessing}
          >
            {isRecording ? (
              <StopCircle size={28} className="text-white" />
            ) : (
              <Mic size={28} className="text-white" />
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}
          </div>
        </div>
      </div>

      {/* Volume Slider & Recording Duration */}
      <div className="flex flex-col items-center mt-8 space-y-6 w-full">
        <div className="w-full max-w-md bg-[#112436] p-4 rounded shadow-md">
          {/* Volume */}
          <div className="mb-5">
            <label className="block text-white/70 text-center mb-2">
              مستوى الصوت: {volume}
            </label>
            <VolumeSliderComponent
              volume={volume}
              onVolumeChange={(newVolume) => {
                setVolume(newVolume);
              }}
            />
          </div>

          {/* Recording Duration & Unit */}
          <hr className="border-t border-white/20 my-4" />
          <div className="flex flex-col items-center">
            <label className="text-sm text-white/70 mb-2">مدة التسجيل</label>
            <div className="flex items-center space-x-2">
              {recordingUnit !== "manual" && (
                <input
                  type="number"
                  min="1"
                  value={recordingDuration}
                  onChange={(e) =>
                    setRecordingDuration(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-16 text-center text-white bg-white/10 border border-white/20 rounded"
                  disabled={isRecording}
                />
              )}
              <select
                value={recordingUnit}
                onChange={(e) => setRecordingUnit(e.target.value)}
                className="text-white bg-white/10 border border-white/20 rounded px-2"
                disabled={isRecording}
              >
                <option value="manual">يدوي</option>
                <option value="seconds">ثوانٍ</option>
                <option value="minutes">دقائق</option>
                <option value="hours">ساعات</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators & Status */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center mt-6">
        <div className="flex items-center space-x-8 mb-4">
          {/* Recording Indicator */}
          <div className="flex items-center space-x-3">
            <img
              src={isRecording ? "/Recording On.png" : "/Recording Off.png"}
              alt="Recording"
              className={`w-6 h-6 ${recordingFlip ? "flip-animation" : ""}`}
            />
            <span className="text-sm text-white/70">تسجيل</span>
          </div>

          {/* Streaming Indicator */}
          <div className="flex items-center space-x-3">
            <img
              src={
                isPlaying
                  ? streamingBlink
                    ? "/Streaming On.png"
                    : "/Streaming Off.png"
                  : "/Streaming Off.png"
              }
              alt="Live"
              className="w-6 h-6"
            />
            <span className="text-sm text-white/70">بث مباشر</span>
          </div>
        </div>
        <div className="text-center text-white/50 text-sm px-4">
          <p>{status}</p>
        </div>
      </div>
    </div>
  );
};

export default Player;
