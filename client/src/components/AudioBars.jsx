// src/components/AudioBars.jsx

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

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

  useImperativeHandle(ref, () => ({
    async resumeContextIfSuspended() {
      if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        try {
          await audioContextRef.current.resume();
          if (audioRef.current?.paused) {
            await audioRef.current.play();
          }
        } catch (err) {
          console.error("Error resuming audio context:", err);
        }
      }
    },
  }));

  useEffect(() => {
    if (!active) return;

    const initAudio = async () => {
      try {
        const audioElement = new Audio(streamUrl);
        audioElement.crossOrigin = "anonymous";
        // We do not want the user to hear this stream
        // so we can do either audioElement.muted = true; 
        // or remove the connection to destination as shown below.

        audioRef.current = audioElement;
        audioElement.load();

        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();

        const mobile = isMobileDevice();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = mobile ? 64 : 128;
        analyzer.smoothingTimeConstant = mobile ? 0.7 : 0.6;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume / 100; 

        const sourceNode = audioContext.createMediaElementSource(audioElement);
        sourceNode.connect(gainNode);
        gainNode.connect(analyzer);
        // We DO NOT connect analyzer to destination. 
        // That means no audible output from this stream.
        // analyzer.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        gainNodeRef.current = gainNode;

        await audioElement.play();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();

    return () => {
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

  // Update GainNode volume if you like (though it’s not actually audible)
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (!active || !canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const previousHeights = new Array(bufferLength).fill(0);

    const dpr = window.devicePixelRatio || 1;
    const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!active) return;
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.fillStyle = "#001f3f";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const barWidth = cssWidth / bufferLength;
      const baseY = cssHeight;
      const stdDev = 0.4;
      const halfBufferLength = Math.floor(bufferLength / 2);

      for (let i = 0; i < bufferLength; i++) {
        const normalizedPosition =
          (i - (bufferLength - 1) / 2) / ((bufferLength - 1) / 2);
        const gaussianFactor = Math.exp(
          -Math.pow(normalizedPosition / stdDev, 2) / 2
        );
        const combinedData =
          (dataArray[i] + dataArray[bufferLength - i - 1]) / 2;
        const targetHeight =
          (combinedData / 255) * cssHeight * 1.9 * gaussianFactor;

        previousHeights[i] = previousHeights[i] * 0.7 + targetHeight * 0.3;
        const barHeight = previousHeights[i];

        const x = cssWidth / 2 + (i - halfBufferLength) * barWidth;

        const gradient = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
        gradient.addColorStop(0, "#FF0000");
        gradient.addColorStop(0.5, "#FFA500");
        gradient.addColorStop(1, "#00FFFF");

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
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
});

export default AudioBars;
