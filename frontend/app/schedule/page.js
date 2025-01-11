"use client";

import React from 'react';
import Header from '../components/Header';
import Schedule from '../components/Schedule';
import TimezoneDetector from '../components/TimezoneDetector.jsx'; // Ensure correct import path
import Reminders from '../components/Reminders.jsx';

const SchedulePage = () => {
  return (
    <div className="min-h-screen bg-[#0A1828] text-[#C4A661]">
      {/* Timezone Detector */}
      <TimezoneDetector />

      {/* Header Component */}
      <Header
        subtitle="جدول البرامج"
      />
      <Reminders 
      />
      {/* Schedule Component */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Schedule />
      </main>
    </div>
  );
};

export default SchedulePage;
