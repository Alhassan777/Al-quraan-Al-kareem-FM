// src/App.jsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Player from './components/Player.jsx';
import Status from './components/Status.jsx';
import TimezoneDetector from './components/TimezoneDetector.jsx';
import Reminders from './components/Reminders.jsx';

// Import Page Components
import SchedulePage from './pages/SchedulePage.jsx';
import ContactPage from './pages/ContactPage.jsx';

import './style/global.css';

export default function App() {
  const [statusMessage, setStatusMessage] = useState(" مرحبًا بك في البث المباشر للإذاعة القرآن الكريم من القاهرة 🕌 🌙");
  const [statusType, setStatusType] = useState("default");
  const [volume, setVolume] = useState(80);

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  return (
    <div className="min-h-screen bg-[#0A1828] text-[#C4A661] flex flex-col items-center">
      
      {/* Timezone Detection */}
      <TimezoneDetector />

      {/* Header Component */}
      <Header
        title="Welcome to Quran Kareem Radio"
        subtitle="Your source for live Quranic broadcasts from Cairo 🕌 🌙"
      />
      
      {/* Reminders Component */}
      <Reminders />
      
      {/* Main Content */}
      <main className="w-full max-w-5xl px-4 py-6 space-y-6">
        {/* Status Display */}
        <Status message={statusMessage} type={statusType} />

        {/* Define Routes */}
        <Routes>
          <Route path="/" element={      <Player
          streamUrl="https://n10.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABk-06_7wAAb2D9o5zdb4y4A"
          setStatusMessage={setStatusMessage}
          setStatusType={setStatusType}
          volume={volume}
          onVolumeChange={handleVolumeChange}
        />
} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </main>
    </div>
  );
}
