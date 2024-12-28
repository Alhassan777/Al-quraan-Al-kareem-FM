"use client";

import Header from './components/Header.jsx';
import Player from './components/Player.jsx';
import Status from './components/Status.jsx';
import { useState } from 'react';
import '../style/global.css';

export default function Home() {
  const [statusMessage, setStatusMessage] = useState("مرحبًا بك! جاهز لبث إذاعة القرآن الكريم.");
  const [statusType, setStatusType] = useState("default");
  const [volume, setVolume] = useState(80);

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  return (
    <div className="min-h-screen bg-[#0A1828] text-[#C4A661] flex flex-col items-center">
      {/* Header Component */}
      <Header
        subtitle=" إذاعة القرآن الكريم من القاهرة"
      />

      {/* Main Content */}
      <main className="w-full max-w-5xl px-4 py-6 space-y-6">
        {/* Status Display */}
        <Status message={statusMessage} type={statusType} />

        {/* Player Component */}
        <Player
          streamUrl="https://n10.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABk-06_7wAAb2D9o5zdb4y4A"
          setStatusMessage={setStatusMessage}
          setStatusType={setStatusType}
        />
      </main>
    </div>
  );
}
