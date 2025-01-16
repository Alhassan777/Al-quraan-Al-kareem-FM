// src/components/AudioBars.jsx

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

const AudioBars = forwardRef(({ streamUrl, active, volume = 50 }, ref) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Refs for audio context, analyzer, gain node, and the <audio> element
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // 1) Imperative Handle for iOS Resume
  // ─────────────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /** Called by parent (in user gesture) to force-resume the context on iOS */
    async resumeContextIfSuspended() {
      if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        try {
          await audioContextRef.current.resume();
          // Also explicitly call `play()` on the audio element
          if (audioRef.current?.paused) {
            await audioRef.current.play();
          }
        } catch (err) {
          console.error("Error resuming audio context:", err);
        }
      }
    },
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // 2) Set up (and tear down) audio when `streamUrl` or `active` changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const initAudio = async () => {
      try {
        // Create the <audio> element
        const audio = new Audio();
        audioRef.current = audio;
        audio.crossOrigin = "anonymous";
        audio.src = streamUrl;
        audio.load();

        // Create the AudioContext
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Create an AnalyserNode
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 128;
        analyzer.smoothingTimeConstant = 0.6;

        // Create a GainNode to handle volume
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume / 100; // initial volume

        // Create a MediaElementSource from <audio>
        const sourceNode = audioContext.createMediaElementSource(audio);
        sourceNode.connect(gainNode);
        gainNode.connect(analyzer);
        analyzer.connect(audioContext.destination);

        // Store references
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        gainNodeRef.current = gainNode;

        // Start playback (desktop usually works here, mobile iOS
        // might require a resume inside user gesture)
        await audio.play();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();

    return () => {
      // Cleanup if `active` changes to false or component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
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

  // ─────────────────────────────────────────────────────────────────────────
  // 3) Update GainNode volume whenever `volume` changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4) Visualization loop
  // ─────────────────────────────────────────────────────────────────────────
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

      // Clear canvas
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
        const normalizedPosition =
          (i - (bufferLength - 1) / 2) / ((bufferLength - 1) / 2);

        // Gaussian factor for a bell-curve shape
        const gaussianFactor = Math.exp(
          -Math.pow(normalizedPosition / stdDev, 2) / 2
        );

        // Combine mirrored frequencies for symmetry
        const combinedData =
          (dataArray[i] + dataArray[bufferLength - i - 1]) / 2;

        // Scale bar height
        const targetHeight =
          (combinedData / 255) * canvas.height * 1.9 * gaussianFactor;

        // Smooth transition for the bar height
        previousHeights[i] = previousHeights[i] * 0.7 + targetHeight * 0.3;
        const barHeight = previousHeights[i];

        // Center bars
        const x = canvas.width / 2 + (i - halfBufferLength) * barWidth;

        // Create gradient
        const gradient = ctx.createLinearGradient(
          0,
          baseY - barHeight,
          0,
          baseY
        );
        gradient.addColorStop(0, "#FF0000"); // Red top
        gradient.addColorStop(0.5, "#FFA500"); // Orange
        gradient.addColorStop(1, "#00FFFF"); // Cyan bottom

        ctx.fillStyle = gradient;
        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
      }
    };

    draw();

    // Cancel the animation loop if effect cleans up
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
});

export default AudioBars;
