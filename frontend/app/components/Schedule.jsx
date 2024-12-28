"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/schedule'); // Replace with your Flask backend URL
        if (!response.ok) {
          throw new Error('Failed to fetch schedule data');
        }
        const data = await response.json();
        setSchedule(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  if (loading) {
    return <div className="text-center text-[#C4A661]">Loading schedule...</div>;
  }
  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A1828] text-[#C4A661] px-4 py-6">
      {/* Header */}
      <header className="bg-[#112436] p-6 rounded-lg shadow-md text-center mb-6">
        <h1 className="text-3xl font-bold">جدول البرامج اليومي</h1>
        <p className="text-lg mt-2">تعرف على مواعيد برامج إذاعة القرآن الكريم</p>
      </header>

      {/* Schedule List */}
      <ul className="max-w-4xl mx-auto space-y-6">
        {schedule.map((program, index) => (
          <li
            key={index}
            className="bg-[#1B2A3D] p-4 rounded-lg shadow-lg hover:bg-[#243A52] transition"
          >
            <h2 className="text-2xl font-semibold">{program.program_name}</h2>
            <p className="mt-2">
              <strong>وقت البدء:</strong> {program.start_time}
            </p>
            <p>
              <strong>وقت الانتهاء:</strong> {program.end_time}
            </p>
            <p className="mt-2">{program.description}</p>
          </li>
        ))}
      </ul>

      {/* Back to Home */}
      <div className="text-center mt-8">
        {/* Use "href" for Next.js links */}
        <Link
          href="/"
          className="text-[#C4A661] underline hover:text-[#E3B862] transition"
        >
          الرجوع إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
};

export default Schedule;
