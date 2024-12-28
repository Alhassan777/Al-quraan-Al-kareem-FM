"use client";

import React, { useState, useEffect } from 'react';

export default function ScheduleSwitcher() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailySchedule, setDailySchedule] = useState([]);
  const [sheikhPrograms, setSheikhPrograms] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDailySchedule();
    const intervalId = setInterval(fetchDailySchedule, 3600000); // Refresh every hour
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchSheikhPrograms();
  }, []);

  const fetchDailySchedule = async () => {
    try {
      setLoadingDaily(true);
      setError(null);
      const response = await fetch('/api/daily-schedule');
      if (!response.ok) {
        throw new Error('Failed to fetch daily schedule');
      }
      const data = await response.json();
      setDailySchedule(data);
    } catch (err) {
      setError('خطأ في تحميل الجدول اليومي');
      console.error(err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchSheikhPrograms = async () => {
    try {
      const response = await fetch('/api/sheikh-programs');
      if (!response.ok) {
        throw new Error('Failed to fetch sheikh programs');
      }
      const data = await response.json();
      setSheikhPrograms(data);
    } catch (err) {
      setError('خطأ في تحميل برامج الشيوخ');
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-md p-6">
        {/* Tab Buttons */}
        <div className="flex mb-6 border-b border-blue-200">
          <button
            className={`px-4 py-3 text-lg font-semibold flex-1 focus:outline-none transition-all ${
              activeTab === 'daily'
                ? 'text-blue-700 border-b-4 border-blue-700'
                : 'text-gray-600 hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('daily')}
          >
            جدول الاذاعة اليومي
          </button>
          <button
            className={`px-4 py-3 text-lg font-semibold flex-1 focus:outline-none transition-all ${
              activeTab === 'sheikhs'
                ? 'text-blue-700 border-b-4 border-blue-700'
                : 'text-gray-600 hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('sheikhs')}
          >
            تلاوات وبرامج الشيوخ
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Daily Schedule Table */}
        {activeTab === 'daily' && (
          <div>
            {loadingDaily ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
              </div>
            ) : dailySchedule.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                لا توجد بيانات متاحة حالياً
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-blue-200 text-blue-900">
                      <th className="border px-4 py-3">الوقت</th>
                      <th className="border px-4 py-3">الشيخ</th>
                      <th className="border px-4 py-3">التلاوة/البرنامج</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySchedule.map((item, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                        } hover:bg-blue-100`}
                      >
                        <td className="border px-4 py-2">{item.time}</td>
                        <td className="border px-4 py-2">{item.sheikh}</td>
                        <td className="border px-4 py-2">{item.program}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sheikh Programs Table */}
        {activeTab === 'sheikhs' && (
          <div>
            {sheikhPrograms.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                لا توجد بيانات متاحة حالياً
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-blue-200 text-blue-900">
                      <th className="border px-4 py-3">الشيخ</th>
                      <th className="border px-4 py-3">لينك اليوتيوب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheikhPrograms.map((item, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                        } hover:bg-blue-100`}
                      >
                        <td className="border px-4 py-2">{item.sheikh}</td>
                        <td className="border px-4 py-2">
                          <a
                            href={item.youtubeLink}
                            className="text-blue-600 hover:text-blue-800 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            رابط القناة
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
