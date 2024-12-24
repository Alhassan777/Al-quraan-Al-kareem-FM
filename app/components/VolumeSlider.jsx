"use client";

import React, { useState } from 'react';

const VolumeSlider = () => {
  const [volume, setVolume] = useState(80);
  const [status, setStatus] = useState("مرحبًا بك! جاهز لتعديل مستوى الصوت.");

  // Volume change handler
  const handleVolumeChange = (e) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);

    if (newVolume === 0) {
      setStatus("تم كتم الصوت.");
    } else {
      setStatus(`تم تعديل مستوى الصوت إلى ${newVolume}%.`);
    }
  };

  return (
    <div className="bg-[#112436] p-6 rounded-lg shadow-md text-[#C4A661]">
      {/* Volume Control */}
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={handleVolumeChange}
        className="w-full max-w-md h-2 bg-[#C4A661]/20 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #C4A661 ${volume}%, rgba(196, 166, 97, 0.2) ${volume}%)`
        }}
      />

      {/* Status Display */}
      <div className="status p-3 rounded-md mt-4 text-lg shadow-md bg-[#112436]">
        <p>{status}</p>
      </div>
    </div>
  );
};

export default VolumeSlider;
