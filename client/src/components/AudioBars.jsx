// src/components/AudioBars.jsx

import React, { useEffect, useRef } from "react";

const AudioBars = ({ streamUrl, active }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const initAudio = async () => {
      try {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = streamUrl;
        audio.load();

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 128;
        analyzer.smoothingTimeConstant = 0.6;

        const sourceNode = audioContext.createMediaElementSource(audio);
        sourceNode.connect(analyzer);
        analyzer.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;

        await audio.play();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [streamUrl, active]);

  useEffect(() => {
    if (!active || !canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const previousHeights = new Array(bufferLength).fill(0);

    const draw = () => {
      if (!active) return;

      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#001f3f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      const baseY = canvas.height;
      const stdDev = 0.4; // Controls the spread of the Gaussian curve
      const halfBufferLength = Math.floor(bufferLength / 2);

      for (let i = 0; i < bufferLength; i++) {
        // Calculate the normalized position across the entire graph
        const normalizedPosition = (i - (bufferLength - 1) / 2) / ((bufferLength - 1) / 2);

        // Apply Gaussian scaling to create the bell shape
        const gaussianFactor = Math.exp(-Math.pow(normalizedPosition / stdDev, 2) / 2);

        // Combine mirrored frequencies for symmetry
        const combinedData = (dataArray[i] + dataArray[bufferLength - i - 1]) / 2;

        // Scale the bar height with increased scaling factor
        const targetHeight = (combinedData / 255) * canvas.height * 1.9 * gaussianFactor;

        // Smooth transition between frames
        previousHeights[i] = previousHeights[i] * 0.7 + targetHeight * 0.3;
        const barHeight = previousHeights[i];

        // Center bars symmetrically around the middle of the canvas
        const x = canvas.width / 2 + (i - halfBufferLength) * barWidth;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
        gradient.addColorStop(0, "#FF0000"); // Red at the top
        gradient.addColorStop(0.5, "#FFA500"); // Orange in the middle
        gradient.addColorStop(1, "#00FFFF"); // Cyan at the bottom

        ctx.fillStyle = gradient;
        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
      }
    };

    draw();

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
