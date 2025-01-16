// src/components/AudioBars.jsx

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

/**
 * Helper function to detect mobile devices.
 * This is a basic check; adjust if needed for your user base.
 */
const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

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
        let audioElement;

        /**
         * 1) If `streamUrl` is a normal URL (e.g. https://example.com/audio.mp3),
         *    just create a new Audio() from that URL.
         *
         * 2) If `streamUrl` is a BLOB URL (e.g. blob:http://localhost:3000/...),
         *    or if you have a Blob object, set the MIME type explicitly if needed.
         */
        if (typeof streamUrl === "string" && streamUrl.startsWith("blob:")) {
          // If it's a blob: URL, we can just use it directly
          audioElement = new Audio(streamUrl);
        } else if (streamUrl instanceof Blob) {
          // If streamUrl is an actual Blob object (e.g. from a recorder),
          // ensure it has a MIME type. Example: { type: "audio/wav" }
          const typedBlob =
            streamUrl.type && streamUrl.type.startsWith("audio/")
              ? streamUrl
              : new Blob([streamUrl], { type: "audio/wav" }); // fallback

          const blobUrl = URL.createObjectURL(typedBlob);
          audioElement = new Audio(blobUrl);
        } else {
          // Normal URL (HTTP/S)
          audioElement = new Audio(streamUrl);
        }

        // Set crossOrigin to "anonymous" for Web Audio analysis (CORS)
        audioElement.crossOrigin = "anonymous";

        // Optionally, listen for any error
        audioElement.onerror = (e) => {
          console.error("Audio element error:", e, audioElement.error);
        };

        // Attach to ref
        audioRef.current = audioElement;
        audioElement.load();

        // Create the AudioContext
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        // Decide on FFT size and smoothing based on device
        const mobile = isMobileDevice();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = mobile ? 64 : 128; // smaller on mobile, bigger on desktop
        analyzer.smoothingTimeConstant = mobile ? 0.7 : 0.6;

        // Create a GainNode to handle volume
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume / 100; // initial volume

        // Create a MediaElementSource from <audio>
        const sourceNode = audioContext.createMediaElementSource(audioElement);
        sourceNode.connect(gainNode);
        gainNode.connect(analyzer);
        analyzer.connect(audioContext.destination);

        // Store references
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        gainNodeRef.current = gainNode;

        // Start playback
        await audioElement.play();
        // On iOS, might still need resumeContextIfSuspended in the same gesture
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

    // Handle device pixel ratio for sharper rendering on high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!active) return; // if no longer active, cancel
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      // Clear the entire drawing surface
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Background
      ctx.fillStyle = "#001f3f";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const barWidth = cssWidth / bufferLength;
      const baseY = cssHeight;
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
          (combinedData / 255) * cssHeight * 1.9 * gaussianFactor;

        // Smooth transition for the bar height
        previousHeights[i] = previousHeights[i] * 0.7 + targetHeight * 0.3;
        const barHeight = previousHeights[i];

        // Center bars
        const x = cssWidth / 2 + (i - halfBufferLength) * barWidth;

        // Create gradient
        const gradient = ctx.createLinearGradient(
          0,
          baseY - barHeight,
          0,
          baseY
        );
        gradient.addColorStop(0, "#FF0000"); // Red
        gradient.addColorStop(0.5, "#FFA500"); // Orange
        gradient.addColorStop(1, "#00FFFF"); // Cyan

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
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
});

export default AudioBars;
