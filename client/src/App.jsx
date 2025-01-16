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
  const [statusMessage, setStatusMessage] = useState(
    "مرحبًا بك في البث المباشر للإذاعة القرآن الكريم من القاهرة 🕌 🌙"
  );
  const [statusType, setStatusType] = useState("default");
  const [volume, setVolume] = useState(80);

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>إذاعة القرآن الكريم من القاهرة - بث مباشر</title>
        <meta
          name="description"
          content="استمع الآن إلى البث المباشر للإذاعة القرآن الكريم من القاهرة. يتميز الموقع بمشغل مخصص، جدول يومي للبرامج، وقوائم تشغيل كاملة للقراء."
        />
        <meta
          name="keywords"
          content="إذاعة القرآن الكريم, بث مباشر, القرآن الكريم, الإذاعة من القاهرة, جدول البرامج, تلاوات كاملة, قوائم تشغيل, تذكيرات إسلامية"
        />
        <meta name="author" content="اسمك أو اسم المشروع" />
      </head>

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "إذاعة القرآن الكريم من القاهرة",
          "url": "https://qurankareemradio.com",
          "description": "البث المباشر للإذاعة القرآن الكريم من القاهرة مع ميزات مثل الجدول الزمني اليومي وقوائم تشغيل التلاوات الكاملة.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://qurankareemradio.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </script>

      {/* Main Page Content */}
      <div className="min-h-screen bg-[#0A1828] text-[#C4A661] flex flex-col items-center">
        {/* Hidden SEO Content */}
        <div className="sr-only" aria-hidden="true">
          إذاعة القرآن الكريم من القاهرة تقدم لك بثًا مباشرًا على مدار الساعة. استمتع بميزات مثل مشغل مباشر، جدول برامج يومي، قوائم تشغيل تلاوات القرآن الكريم الكاملة، وتذكيرات إسلامية. استمع لتلاوات أبرز القراء مثل الشيخ عبد الباسط والشيخ المنشاوي وغيرهم.
        </div>

        {/* Timezone Detection */}
        <TimezoneDetector />

        {/* Header Component */}
        <Header />

        {/* Reminders Component */}
        <Reminders />

        {/* Main Content */}
        <main className="w-full max-w-5xl px-4 py-6 space-y-6">
          {/* Status Display */}
          <Status message={statusMessage} type={statusType} />

          {/* Define Routes */}
          <Routes>
            <Route
              path="/"
              element={
                <Player
                  streamUrl="https://n10.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABk-06_7wAAb2D9o5zdb4y4A"
                  setStatusMessage={setStatusMessage}
                  setStatusType={setStatusType}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                />
              }
            />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
