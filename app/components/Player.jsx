import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, StopCircle } from "lucide-react";
import WaveSurfer from "wavesurfer.js";

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready to play");
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [volume, setVolume] = useState(1);
  const [recordingDuration, setRecordingDuration] = useState(10); // Default 10 seconds
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const waveSurferRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  const streamUrls = ["http://localhost:3001/proxyStream"];

  useEffect(() => {
    // Check if lamejs is loaded
    if (typeof window.lamejs === "undefined") {
      setStatus("Warning: lamejs not loaded. MP3 conversion will not work.");
    }

    const initializeAudio = async () => {
      if (!audioRef.current) {
        setStatus("Audio element not ready.");
        return;
      }

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(audioCtxRef.current.destination);
        }

        if (!destinationNodeRef.current) {
          destinationNodeRef.current = audioCtxRef.current.createMediaStreamDestination();
          sourceNodeRef.current.connect(destinationNodeRef.current);
        }

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

    if (!waveSurferRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#C4A661",
        progressColor: "#D4B671",
      });
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
      }
    };
  }, []);

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
      } else {
        audioRef.current.src = streamUrls[0];
        await audioRef.current.play();
        waveSurferRef.current.load(audioRef.current.src);
        setStatus("Playing stream");
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setStatus(`Playback error: ${error.message}`);
    }
  };

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

  const convertFloat32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };

  const toggleRecording = () => {
    if (!mediaRecorderRef.current) {
      setStatus("Recording system not ready.");
      return;
    }

    if (isRecording) {
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
      setRecordedChunks([]);
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setStatus("Recording...");

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
        }, 200); // Increased delay for reliable processing
      }, recordingDuration * 1000);
    }
  };

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <div
      className={`p-6 rounded-lg shadow-md ${
        isDarkMode ? "bg-[#112436] text-[#C4A661]" : "bg-white text-black"
      }`}
    >
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" className="w-full mb-4" />

      <div className="flex flex-col items-center space-y-6">
        <div className="flex space-x-4">
          <button
            onClick={togglePlayPause}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-[#C4A661] hover:bg-[#D4B671] text-[#0A1828]"
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </button>
          <button
            onClick={toggleRecording}
            className={`w-16 h-16 flex items-center justify-center rounded-full ${
              isRecording ? "bg-red-500" : "bg-[#C4A661] hover:bg-[#D4B671]"
            } text-[#0A1828]`}
          >
            {isRecording ? <StopCircle size={32} /> : <Mic size={32} />}
          </button>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <label htmlFor="volume">Volume</label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-32"
          />
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <label htmlFor="duration">Recording Limit (s)</label>
          <input
            id="duration"
            type="number"
            min="5"
            max="60"
            value={recordingDuration}
            onChange={(e) => setRecordingDuration(parseInt(e.target.value, 10))}
            className="w-20 text-center"
          />
        </div>

        <div id="waveform" className="mt-4"></div>

        <button
          onClick={toggleTheme}
          className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Toggle {isDarkMode ? "Light" : "Dark"} Mode
        </button>

        <div className="text-center">
          <p>{status}</p>
          {isConverting && <p className="mt-2">Converting... Please wait</p>}
        </div>
      </div>
    </div>
  );
};

export default Player;
