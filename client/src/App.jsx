import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Player from './components/Player.jsx';
import Status from './components/Status.jsx';
import TimezoneDetector from './components/TimezoneDetector.jsx';
import Reminders from './components/Reminders.jsx';

import { Helmet } from 'react-helmet';

import './style/global.css';

const SchedulePage = lazy(() => import('./pages/SchedulePage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));

export default function App() {
  const [statusMessage, setStatusMessage] = useState(
    "مرحبًا بك في البث المباشر للإذاعة القرآن الكريم من القاهرة 🕌 🌙"
  );
  const [statusType, setStatusType] = useState("default");
  const [volume, setVolume] = useState(80);

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  // Add Google Analytics Tag
  useEffect(() => {
    const script1 = document.createElement('script');
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-83PCDBHL22';
    script1.async = true;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-83PCDBHL22');
    `;
    document.head.appendChild(script2);

    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  return (
    <>
      <Helmet>
        {/* SEO Meta Tags */}
        <title>إذاعة القرآن الكريم من القاهرة - بث مباشر</title>
        <meta
          name="description"
          content="استمع الآن إلى البث المباشر للإذاعة القرآن الكريم من القاهرة. يتميز الموقع بمشغل مخصص، جدول يومي للبرامج، وقوائم تشغيل كاملة للقراء."
        />
        <meta
          name="keywords"
          content="إذاعة القرآن الكريم, بث مباشر, القرآن الكريم, الإذاعة من القاهرة, جدول البرامج, تلاوات كاملة, قوائم تشغيل, تذكيرات إسلامية"
        />
        <meta name="author" content="إذاعة القرآن الكريم" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Open Graph */}
        <meta property="og:title" content="إذاعة القرآن الكريم من القاهرة - بث مباشر" />
        <meta
          property="og:description"
          content="استمع إلى التلاوات والبرامج الدينية من إذاعة القرآن الكريم. بث مباشر على مدار الساعة."
        />
        <meta property="og:image" content="https://qurankareemradio.com/website-thumbnail.png" />
        <meta property="og:url" content="https://qurankareemradio.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="إذاعة القرآن الكريم من القاهرة - بث مباشر" />
        <meta
          name="twitter:description"
          content="استمع إلى إذاعة القرآن الكريم من القاهرة مباشرة واستمتع ببرامج دينية وتلاوات قرآنية رائعة."
        />
        <meta name="twitter:image" content="https://qurankareemradio.com/website-thumbnail.png" />
      </Helmet>

      <div className="min-h-screen bg-[#0A1828] text-[#C4A661] flex flex-col items-center">
        {/* Hidden SEO Content */}
        <div className="sr-only" aria-hidden="true">
          إذاعة القرآن الكريم من القاهرة تقدم بثًا مباشرًا على مدار الساعة. استمتع بميزات مثل مشغل مباشر، جدول برامج يومي، قوائم تشغيل للتلاوات، وتذكيرات إسلامية.
        </div>

        {/* Components */}
        <TimezoneDetector />
        <Header />
        <Reminders />

        <main className="w-full max-w-5xl px-4 py-6 space-y-6">
          {/* Status Display */}
          <Status message={statusMessage} type={statusType} />

          {/* Define Routes */}
          <Routes>
            <Route
              path="/"
              element={
                <Player
                  streamUrl={import.meta.env.VITE_STREAM_URL}
                  setStatusMessage={setStatusMessage}
                  setStatusType={setStatusType}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                />
              }
            />
            <Route
              path="/schedule"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <SchedulePage />
                </Suspense>
              }
            />
            <Route
              path="/contact"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ContactPage />
                </Suspense>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}
