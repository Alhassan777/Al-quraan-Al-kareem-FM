"use client";

import React, { useEffect, useRef, useState } from "react";

function RadioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [status, setStatus] = useState("Ready");

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    // Set up the AudioContext + MediaRecorder as soon as the component mounts
    async function setup() {
      try {
        // 1) Create an AudioContext
        const audioContext = new AudioContext();

        // 2) Use createMediaElementSource to capture the audio element's output
        const source = audioContext.createMediaElementSource(audioRef.current);

        // 3) Create a destination node (a "virtual microphone" for the recorder)
        const destination = audioContext.createMediaStreamDestination();

        // 4) Connect source -> destination
        source.connect(destination);

        // 5) Create a MediaRecorder from that destination stream
        const recorder = new MediaRecorder(destination.stream, {
          mimeType: "audio/webm; codecs=opus",
        });

        // Fires each time data is made available
        recorder.ondataavailable = (event) => {
          // Only save non-empty chunks
          if (event.data && event.data.size > 0) {
            setRecordedChunks((prev) => [...prev, event.data]);
          }
        };

        // Fires once recording has fully stopped
        recorder.onstop = () => {
          // Combine all chunks into a single Blob
          if (recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: recorder.mimeType });
            setRecordingBlob(blob);
            setStatus("Recording complete — ready to download");
          }
        };

        mediaRecorderRef.current = recorder;
        setStatus("Recording system ready");
      } catch (error) {
        console.error("Error setting up recording:", error);
        setStatus(`Error: ${error.message}`);
      }
    }

    setup();

    // Cleanup (optional): If you want to shut down the audio context on unmount
    return () => {
      // Could close the audio context or stop tracks here if desired
      // audioContext.close();  // or track.stop() calls
    };
  }, [recordedChunks]);

  // Start recording
  const handleStart = () => {
    if (!mediaRecorderRef.current) {
      setStatus("MediaRecorder not ready yet");
      return;
    }
    setRecordedChunks([]);
    setRecordingBlob(null);
    setIsRecording(true);
    mediaRecorderRef.current.start(500); // collect data every 500ms
    setStatus("Recording...");
  };

  // Stop recording
  const handleStop = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setStatus("Stopping recorder...");
  };

  // Download recorded audio
  const handleDownload = () => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "radio_capture.webm"; // file name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus("Downloaded recording!");
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h2>Radio Recorder</h2>
      <p>Status: {status}</p>

      {/* 
        The <audio> element is pointed to the radio stream. 
        'crossOrigin="anonymous"' can help if the stream is from another domain.
      */}
      <audio
        ref={audioRef}
        src="https://n10.radiojar.com/8s5u5tpdtwzuv.mp3"
        controls
        crossOrigin="anonymous"
        onError={(e) => {
          console.error("Audio error:", e);
          setStatus(
            `Stream error: ${e.target.error?.message || "Unknown error"}`
          );
        }}
      />

      {/* Recording buttons */}
      <div style={{ marginTop: 16 }}>
        {isRecording ? (
          <button onClick={handleStop}>Stop Recording</button>
        ) : (
          <button onClick={handleStart}>Start Recording</button>
        )}
      </div>

      {/* If a recording is available, show a download button and playback preview */}
      {recordingBlob && (
        <div style={{ marginTop: 20 }}>
          <audio controls src={URL.createObjectURL(recordingBlob)} />
          <br />
          <button onClick={handleDownload} style={{ marginTop: 8 }}>
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
}

export default RadioRecorder;
