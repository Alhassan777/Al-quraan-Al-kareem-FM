// src/components/VolumeSlider.jsx

import React, { useState } from "react";

const VolumeSlider = ({ volume, onVolumeChange }) => {

  const handleVolumeChange = (e) => {
    const newVolume = Number(e.target.value); // 0–100
    onVolumeChange(newVolume);
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
      setStatus("Volume Muted.");
    } else {
      setStatus(`Volume set to ${newVolume}%.`);
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

export default VolumeSlider;
