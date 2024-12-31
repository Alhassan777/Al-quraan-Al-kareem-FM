"use client";

import React, { useState, useEffect } from "react";
import { FaYoutube } from "react-icons/fa";
import io from "socket.io-client"; // Import Socket.IO client

export default function Schedule() {
  // State Variables
  const [activeTab, setActiveTab] = useState("sheikhs"); // "sheikhs" or "programs"
  const [sheikhPrograms, setSheikhPrograms] = useState([]); // Stores sheikh programs
  const [programSchedule, setProgramSchedule] = useState([]); // Stores program schedule
  const [loadingSheikhs, setLoadingSheikhs] = useState(true); // Loading state for sheikh programs
  const [loadingPrograms, setLoadingPrograms] = useState(true); // Loading state for program schedule
  const [errorSheikhs, setErrorSheikhs] = useState(null); // Error state for sheikh programs
  const [errorPrograms, setErrorPrograms] = useState(null); // Error state for program schedule
  const [searchQuery, setSearchQuery] = useState(""); // Search query for sheikh programs

  // Socket.IO instance
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Fetch sheikh programs and program schedule on component mount
    fetchSheikhPrograms();
    fetchProgramSchedule();

    // Initialize Socket.IO client
    const newSocket = io("http://127.0.0.1:5000"); // Replace with your backend URL if different
    setSocket(newSocket);

    // Listen for 'new_schedule' events from the backend
    newSocket.on("new_schedule", (data) => {
      console.log("New schedule received:", data);
      // Optional: Display a notification to the user (replace with a better UI notification in production)
      alert(`تم إضافة جدول جديد لـ ${data.schedule_date}!`);

      // Update the programSchedule state with the new data
      setProgramSchedule((prevSchedule) => [...prevSchedule, ...data.final_schedule]);
    });

    // Handle connection errors
    newSocket.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err);
    });

    // Cleanup the socket connection when the component unmounts
    return () => {
      newSocket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  /**
   * Fetches sheikh programs (playlists) from the backend via HTTP GET request.
   * Supports optional search query to filter by reciter name.
   */
  const fetchSheikhPrograms = async (search = "") => {
    try {
      setLoadingSheikhs(true);
      setErrorSheikhs(null);

      // Construct the API URL based on the search query
      const url = search
        ? `http://127.0.0.1:5000/api/playlists/?q=${encodeURIComponent(search)}`
        : "http://127.0.0.1:5000/api/playlists/";

      const response = await fetch(url); // HTTP GET request to fetch playlists
      if (!response.ok) {
        throw new Error("Failed to fetch sheikh programs");
      }

      const data = await response.json(); // Expected to be an array of playlists
      setSheikhPrograms(data); // Update state with fetched playlists
    } catch (err) {
      setErrorSheikhs("خطأ في تحميل قاعدة بيانات تلاوات الشيوخ"); // Arabic for "Error loading sheikh programs database"
      console.error("Error fetching sheikh programs:", err);
    } finally {
      setLoadingSheikhs(false);
    }
  };

  /**
   * Fetches the program schedule from the backend via HTTP GET request.
   * Initially loads all schedules, and subsequent updates are handled via WebSockets.
   */
  const fetchProgramSchedule = async () => {
    try {
      setLoadingPrograms(true);
      setErrorPrograms(null);

      const response = await fetch("http://127.0.0.1:5000/api/schedule/all"); // Corrected API endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch program schedule");
      }

      const data = await response.json(); // Expected to have a 'data' key with schedule entries
      setProgramSchedule(data.data); // Update state with fetched schedule entries
    } catch (err) {
      setErrorPrograms("خطأ في تحميل جدول البرامج"); // Arabic for "Error loading program schedule"
      console.error("Error fetching program schedule:", err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  /**
   * Filters the sheikh programs based on the search query.
   * Performs a case-insensitive match on the reciter's name.
   */
  const filteredSheikhPrograms = sheikhPrograms.filter((item) =>
    item.reciter.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Tab Buttons */}
        <div className="flex mb-6">
          {/* Sheikh Programs Tab */}
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

          {/* Program Schedule Tab */}
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

        {/* Sheikh Programs Section */}
        {activeTab === "sheikhs" && (
          <>
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="ابحث باسم الشيخ..." // Arabic for "Search by sheikh's name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sheikh Programs Table */}
            <div style={{ backgroundColor: "#E0F7FA" }} className="rounded-lg p-4">
              {/* Error Message */}
              {errorSheikhs && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {errorSheikhs}
                </div>
              )}

              {/* Loading Indicator */}
              {loadingSheikhs ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
                </div>
              ) : filteredSheikhPrograms.length === 0 ? (
                /* No Data Message */
                <div className="text-center py-8 text-gray-600">
                  لا توجد بيانات مطابقة للبحث {/* Arabic for "No matching data found" */}
                </div>
              ) : (
                /* Playlists Table */
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
                          {/* Sheikh Name */}
                          <td
                            className="border px-4 py-2 font-semibold"
                            style={{
                              color: index % 2 === 0 ? "#0056b3" : "#4a90e2",
                            }}
                          >
                            {item.reciter}
                          </td>

                          {/* YouTube Link */}
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

        {/* Program Schedule Section */}
        {activeTab === "programs" && (
          <div style={{ backgroundColor: "#E0F7FA" }} className="rounded-lg p-4">
            {/* Error Message */}
            {errorPrograms && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {errorPrograms}
              </div>
            )}

            {/* Loading Indicator */}
            {loadingPrograms ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
              </div>
            ) : programSchedule.length === 0 ? (
              /* No Data Message */
              <div className="text-center py-8 text-gray-600">
                لا توجد بيانات متاحة {/* Arabic for "No data available" */}
              </div>
            ) : (
              /* Program Schedule Table */
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
                        {/* Reciter */}
                        <td className="border px-4 py-2 font-semibold">{item.reciter}</td>

                        {/* Surah */}
                        <td className="border px-4 py-2">{item.surah}</td>

                        {/* Time */}
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
