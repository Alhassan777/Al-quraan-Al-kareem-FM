// src/components/AudioBars.jsx

import React, { useEffect, useRef } from "react";

const AudioBars = ({ streamUrl, active, volume = 50 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Audio context, analyzer, and gain node references
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const gainNodeRef = useRef(null);

  // 1) Set up (and tear down) audio ONLY when `streamUrl` or `active` changes
  useEffect(() => {
    if (!active) return;

    const initAudio = async () => {
      try {
        // Create the <audio> element
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = streamUrl;
        audio.load();

        // Create the AudioContext
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create an AnalyserNode
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 128;
        analyzer.smoothingTimeConstant = 0.6;

        // Create a GainNode to handle volume
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume / 100; // set initial volume

        // Create a MediaElementSource from the <audio>
        const sourceNode = audioContext.createMediaElementSource(audio);

        // Connect: source -> gain -> analyzer -> destination
        sourceNode.connect(gainNode);
        gainNode.connect(analyzer);
        analyzer.connect(audioContext.destination);

        // Store references
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        gainNodeRef.current = gainNode;

        // Start playback
        await audio.play();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();

    return () => {
      // Cleanup if `active` changes to false or component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      gainNodeRef.current = null;
      analyzerRef.current = null;
    };
  }, [streamUrl, active]);
  // ^^^^^ Removed `volume` from dependency array

  // 2) Use a separate effect to update the GainNode whenever `volume` changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // 3) Visualization loop
  useEffect(() => {
    if (!active || !canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // For smoothing bar animations
    const previousHeights = new Array(bufferLength).fill(0);

    const draw = () => {
      if (!active) return; // if no longer active, cancel
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#001f3f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      const baseY = canvas.height;
      const stdDev = 0.4; // The width of the Gaussian peak
      const halfBufferLength = Math.floor(bufferLength / 2);

      for (let i = 0; i < bufferLength; i++) {
        // Normalized distance from the canvas center
        const normalizedPosition = (i - (bufferLength - 1) / 2) / ((bufferLength - 1) / 2);

        // Gaussian factor for a bell-curve shape
        const gaussianFactor = Math.exp(-Math.pow(normalizedPosition / stdDev, 2) / 2);

        // Combine mirrored frequencies for symmetry
        const combinedData = (dataArray[i] + dataArray[bufferLength - i - 1]) / 2;

        // Scale bar height
        const targetHeight =
          (combinedData / 255) * canvas.height * 1.9 * gaussianFactor;

        // Smooth transition for the bar height
        previousHeights[i] = previousHeights[i] * 0.7 + targetHeight * 0.3;
        const barHeight = previousHeights[i];

        // Center bars in the canvas
        const x = canvas.width / 2 + (i - halfBufferLength) * barWidth;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
        gradient.addColorStop(0, "#FF0000");  // Red top
        gradient.addColorStop(0.5, "#FFA500"); // Orange middle
        gradient.addColorStop(1, "#00FFFF");  // Cyan bottom

        ctx.fillStyle = gradient;
        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
      }
    };

    draw();

    // Cancel the animation loop if this effect is cleaned up
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  return (
    <div className="p-4 w-full max-w-4xl mx-auto rounded-lg shadow-lg bg-[#001f3f] overflow-hidden">
      <div className="relative w-full h-64">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={1200}
          height={256}
        />
      </div>
    </div>
  );
};

export default AudioBars;
