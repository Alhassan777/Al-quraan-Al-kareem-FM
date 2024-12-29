"use client";

import React, { useState, useEffect } from "react";
import { FaYoutube } from "react-icons/fa";

export default function Schedule() {
  const [activeTab, setActiveTab] = useState("sheikhs");
  const [sheikhPrograms, setSheikhPrograms] = useState([]);
  const [programSchedule, setProgramSchedule] = useState([]); // For جدول البرامج
  const [loadingSheikhs, setLoadingSheikhs] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true); // Loading state for جدول البرامج
  const [errorSheikhs, setErrorSheikhs] = useState(null);
  const [errorPrograms, setErrorPrograms] = useState(null); // Error state for جدول البرامج
  const [searchQuery, setSearchQuery] = useState(""); // Search query state

  useEffect(() => {
    fetchSheikhPrograms();
    fetchProgramSchedule();
  }, []);

  const fetchSheikhPrograms = async (searchQuery = "") => {
    try {
      setLoadingSheikhs(true);
      setErrorSheikhs(null);

      const url = searchQuery
        ? `http://127.0.0.1:5000/api/playlists?q=${encodeURIComponent(searchQuery)}`
        : "http://127.0.0.1:5000/api/playlists/";

      const response = await fetch(url); // Backend endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch sheikh programs");
      }
      const data = await response.json();
      setSheikhPrograms(data);
    } catch (err) {
      setErrorSheikhs("خطأ في تحميل قاعدة بيانات تلاوات الشيوخ");
      console.error(err);
    } finally {
      setLoadingSheikhs(false);
    }
  };

  const fetchProgramSchedule = async () => {
    try {
      setLoadingPrograms(true);
      setErrorPrograms(null);

      const response = await fetch("http://127.0.0.1:5000/api/program-schedule/"); // Replace with actual API
      if (!response.ok) {
        throw new Error("Failed to fetch program schedule");
      }
      const data = await response.json();
      setProgramSchedule(data);
    } catch (err) {
      setErrorPrograms("خطأ في تحميل جدول البرامج");
      console.error(err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Filter the reciters based on the search query
  const filteredSheikhPrograms = sheikhPrograms.filter((item) =>
    item.reciter.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Tab Buttons */}
        <div className="flex mb-6">
          <button
            className={`px-4 py-3 text-lg font-semibold flex-1 transition-all ${
              activeTab === "sheikhs" ? "text-white" : "text-gray-600"
            }`}
            style={{
              backgroundColor: activeTab === "sheikhs" ? "#007BFF" : "#f6d080",
            }}
            onClick={() => setActiveTab("sheikhs")}
          >
            تلاوات وبرامج الشيوخ
          </button>
          <button
            className={`px-4 py-3 text-lg font-semibold flex-1 transition-all ${
              activeTab === "programs" ? "text-white" : "text-gray-600"
            }`}
            style={{
              backgroundColor: activeTab === "programs" ? "#007BFF" : "#f6d080",
            }}
            onClick={() => setActiveTab("programs")}
          >
            جدول البرامج
          </button>
        </div>

        {/* Sheikh Programs Table */}
        {activeTab === "sheikhs" && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="ابحث باسم الشيخ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div style={{ backgroundColor: "#E0F7FA" }} className="rounded-lg p-4">
              {errorSheikhs && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {errorSheikhs}
                </div>
              )}
              {loadingSheikhs ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
                </div>
              ) : filteredSheikhPrograms.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  لا توجد بيانات مطابقة للبحث
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        <th className="border px-4 py-3 text-center">الشيخ</th>
                        <th className="border px-4 py-3 text-center">لينك اليوتيوب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSheikhPrograms.map((item, index) => (
                        <tr
                          key={index}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-100"
                          } hover:bg-gray-200`}
                        >
                          <td
                            className="border px-4 py-2 font-semibold"
                            style={{
                              color: index % 2 === 0 ? "#0056b3" : "#4a90e2",
                            }}
                          >
                            {item.reciter}
                          </td>
                          <td className="border px-4 py-2 text-center">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-700 hover:text-blue-500"
                            >
                              <FaYoutube
                                size={20}
                                className="inline-block text-red-600"
                              />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Program Schedule Table */}
        {activeTab === "programs" && (
          <div style={{ backgroundColor: "#E0F7FA" }} className="rounded-lg p-4">
            {errorPrograms && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {errorPrograms}
              </div>
            )}
            {loadingPrograms ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
              </div>
            ) : programSchedule.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                لا توجد بيانات متاحة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="border px-4 py-3 text-center">البرنامج</th>
                      <th className="border px-4 py-3 text-center">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programSchedule.map((item, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-100"
                        } hover:bg-gray-200`}
                      >
                        <td className="border px-4 py-2 font-semibold">{item.program}</td>
                        <td className="border px-4 py-2 text-center">{item.time}</td>
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
