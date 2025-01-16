"use client";

import React from 'react';
import Schedule from '../components/Schedule.jsx';
import TimezoneDetector from '../components/TimezoneDetector.jsx';
import Reminders from '../components/Reminders.jsx';

const SchedulePage = () => {
  return (
    <>
      {/* Meta Tags for SEO */}
      <head>
        <meta 
          name="description" 
          content="اكتشف قاعدة بيانات شاملة لجميع قراء إذاعة القرآن الكريم من القاهرة. تصفح قوائم تشغيل لتلاواتهم الكاملة للقرآن الكريم، مع مواعيد وبرامج يومية مخصصة." 
        />
        <meta 
          name="keywords" 
          content="إذاعة القرآن الكريم, القاهرة, تلاوات كاملة, قاعدة بيانات القراء, قوائم تشغيل القرآن, برامج إسلامية, أوقات الصلاة, القرآن الكريم" 
        />
        <meta name="author" content="اسمك أو اسم المشروع" />
      </head>

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "قوائم تشغيل قراء القرآن الكريم",
          "description": "قاعدة بيانات شاملة لجميع قراء إذاعة القرآن الكريم من القاهرة، مع قوائم تشغيل لتلاواتهم الكاملة.",
          "itemListElement": [
            {
              "@type": "MusicGroup",
              "name": "الشيخ عبد الباسط عبد الصمد",
              "url": "/playlists/abdul-basit",
              "sameAs": "https://qurankareemradio.com/reciters/abdul-basit",
            },
            {
              "@type": "MusicGroup",
              "name": "الشيخ محمد صديق المنشاوي",
              "url": "/playlists/al-minshawi",
              "sameAs": "https://qurankareemradio.com/reciters/al-minshawi",
            }
          ]
        })}
      </script>

      {/* Page Content */}
      <div className="min-h-screen bg-[#0A1828] text-[#C4A661]">
        {/* Hidden SEO Content */}
        <div className="sr-only" aria-hidden="true">
          تصفح قاعدة بيانات شاملة لجميع قراء إذاعة القرآن الكريم من القاهرة. احصل على قوائم تشغيل لتلاوات القرآن الكريم الكاملة، مع جدول يومي مخصص للتوقيت المحلي الخاص بك. استمتع بميزات مثل تسجيل التلاوات وتذكيرات إسلامية لتحسين عاداتك اليومية.
        </div>

        {/* Timezone Detector */}
        <TimezoneDetector />

        {/* Reminders */}
        <Reminders />

        {/* Schedule Component */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          <Schedule />
        </main>
      </div>
    </>
  );
};

export default SchedulePage;
