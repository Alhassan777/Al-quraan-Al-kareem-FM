"use client";

import React, { useState, useEffect } from "react";
import { FaYoutube } from "react-icons/fa";
import io from "socket.io-client"; // Import Socket.IO client

export default function Schedule() {
  const [activeTab, setActiveTab] = useState("sheikhs"); // "sheikhs" or "programs"
  const [sheikhPrograms, setSheikhPrograms] = useState([]);
  const [programSchedule, setProgramSchedule] = useState([]);
  const [loadingSheikhs, setLoadingSheikhs] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [errorSheikhs, setErrorSheikhs] = useState(null);
  const [errorPrograms, setErrorPrograms] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [socket, setSocket] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(null); // New state for the schedule date

  useEffect(() => {
    fetchSheikhPrograms();
    fetchProgramSchedule();

    // Initialize Socket.IO client with WebSocket transport
    const newSocket = io("http://127.0.0.1:5000", {
      transports: ["websocket"], // Force WebSocket transport
    });
    setSocket(newSocket);

    newSocket.on("new_schedule", (data) => {
      console.log("New schedule received:", data);
      alert(`تم إضافة جدول جديد لـ ${data.schedule_date}!`);
      setProgramSchedule((prevSchedule) => [...prevSchedule, ...data.final_schedule]);
      setScheduleDate(data.schedule_date); // Update schedule date on new data
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchSheikhPrograms = async (search = "") => {
    try {
      setLoadingSheikhs(true);
      setErrorSheikhs(null);
      const url = search
        ? `http://127.0.0.1:5000/api/playlists/?q=${encodeURIComponent(search)}`
        : "http://127.0.0.1:5000/api/playlists/";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch sheikh programs");
      const data = await response.json();
      setSheikhPrograms(data);
    } catch (err) {
      setErrorSheikhs("خطأ في تحميل قاعدة بيانات تلاوات الشيوخ");
      console.error("Error fetching sheikh programs:", err);
    } finally {
      setLoadingSheikhs(false);
    }
  };

  const fetchProgramSchedule = async () => {
    try {
      setLoadingPrograms(true);
      setErrorPrograms(null);
      const response = await fetch("http://127.0.0.1:5000/api/schedule/all");
      if (!response.ok) throw new Error("Failed to fetch program schedule");
      const data = await response.json();
      setProgramSchedule(data.data);
      if (data.data.length > 0) setScheduleDate(data.data[0].schedule_date); // Set the schedule date
    } catch (err) {
      setErrorPrograms("خطأ في تحميل جدول البرامج");
      console.error("Error fetching program schedule:", err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const filteredSheikhPrograms = sheikhPrograms.filter((item) =>
    item.reciter.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6">
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
                          <td className="border px-4 py-2 font-semibold text-blue-700">
                            {item.reciter}
                          </td>
                          <td className="border px-4 py-2 text-center">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex justify-center items-center text-red-600 hover:text-red-400"
                            >
                              <FaYoutube size={24} />
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
              <div className="text-center py-8 text-gray-600">لا توجد بيانات متاحة</div>
            ) : (
              <>
                {scheduleDate && (
                  <div className="text-center text-lg font-bold mb-4">
                    جدول اليوم: {scheduleDate}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        <th className="border px-4 py-3 text-center">القارئ</th>
                        <th className="border px-4 py-3 text-center">السورة</th>
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
                          <td className="border px-4 py-2 font-semibold text-green-700">
                            {item.reciter}
                          </td>
                          <td className="border px-4 py-2 text-blue-700">{item.surah}</td>
                          <td className="border px-4 py-2 text-red-700 text-center">
                            {item.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
