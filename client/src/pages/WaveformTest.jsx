import React, { useState, useEffect } from "react";
import AudioWaveform from "../components/AudioBars";
import axios from "axios";

const WaveformTest = () => {
  const backendBaseUrl = "http://localhost:3001"; // Correct backend base URL
  const defaultStreamUrl = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";
  const [streamUrl, setStreamUrl] = useState(defaultStreamUrl); // Default stream URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreamStatus = async () => {
      try {
        const response = await axios.get(`${backendBaseUrl}/status`);
        if (response.data && response.data.streamUrl) {
          setStreamUrl(response.data.streamUrl);
        } else {
          console.warn("Stream URL not available from backend. Using default.");
        }
      } catch (err) {
        console.error("Error fetching stream status:", err);
        setError("Failed to load stream URL. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStreamStatus();
  }, [backendBaseUrl]);

  // Render loading or error states
  if (loading) {
    return <p>Loading stream...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Audio Waveform Test</h1>
      <AudioWaveform streamUrl={streamUrl} />
    </div>
  );
};

export default WaveformTest;
