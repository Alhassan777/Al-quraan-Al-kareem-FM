import React from 'react';
import { Helmet } from 'react-helmet';
import Schedule from '../components/Schedule.jsx';
import TimezoneDetector from '../components/TimezoneDetector.jsx';
import Reminders from '../components/Reminders.jsx';

const SchedulePage = () => {
  return (
    <>
      {/* SEO Meta Tags using Helmet */}
      <Helmet>
        <title>جدول البرامج - إذاعة القرآن الكريم من القاهرة | Schedule</title>
        <meta 
          name="description" 
          content="اكتشف جدول برامج إذاعة القرآن الكريم من القاهرة. تصفح مواعيد التلاوات والبرامج الدينية اليومية مع التوقيت المحلي. Daily Quran Radio Schedule from Cairo." 
        />
        <meta 
          name="keywords" 
          content="جدول البرامج, إذاعة القرآن الكريم, القاهرة, تلاوات, برامج إسلامية, أوقات الصلاة, القرآن الكريم, Quran Schedule, Radio Program" 
        />
        <link rel="canonical" href="https://qurankareemradio.com/schedule" />
        
        {/* Open Graph */}
        <meta property="og:title" content="جدول البرامج - إذاعة القرآن الكريم من القاهرة" />
        <meta property="og:description" content="تصفح جدول برامج إذاعة القرآن الكريم اليومي مع مواعيد التلاوات والبرامج الدينية." />
        <meta property="og:url" content="https://qurankareemradio.com/schedule" />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:title" content="جدول البرامج - إذاعة القرآن الكريم" />
        <meta name="twitter:description" content="جدول برامج إذاعة القرآن الكريم من القاهرة - مواعيد التلاوات والبرامج الدينية" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "جدول البرامج - إذاعة القرآن الكريم من القاهرة",
            "description": "جدول برامج إذاعة القرآن الكريم اليومي مع مواعيد التلاوات والبرامج الدينية",
            "url": "https://qurankareemradio.com/schedule",
            "isPartOf": {
              "@type": "WebSite",
              "name": "إذاعة القرآن الكريم من القاهرة",
              "url": "https://qurankareemradio.com"
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "الرئيسية",
                  "item": "https://qurankareemradio.com/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "جدول البرامج",
                  "item": "https://qurankareemradio.com/schedule"
                }
              ]
            }
          })}
        </script>
      </Helmet>

      {/* Page Content */}
      <div className="min-h-screen bg-[#0A1828] text-[#C4A661]">
        {/* Hidden SEO Content */}
        <div className="sr-only" aria-hidden="true">
          <h1>جدول برامج إذاعة القرآن الكريم من القاهرة</h1>
          <p>تصفح جدول البرامج اليومي لإذاعة القرآن الكريم. احصل على مواعيد التلاوات والبرامج الدينية بالتوقيت المحلي.</p>
        </div>

        {/* Timezone Detector */}
        <TimezoneDetector />

        {/* Reminders */}
        <Reminders />

        {/* Schedule Component */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#C4A661]">
            جدول البرامج اليومي
          </h1>
          <Schedule />
        </main>
      </div>
    </>
  );
};

export default SchedulePage;
