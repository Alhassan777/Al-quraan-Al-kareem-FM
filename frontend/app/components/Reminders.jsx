"use client";

import React, { useState, useEffect } from "react";

const Reminders = () => {
  const [day, setDay] = useState("");
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    // Determine the current day of the week
    const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
    setDay(currentDay);
  }, []);

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
  };

  // Define reminders based on the day
  const reminders = {
    Friday: {
      title: "تذكير بقراءة سورة الكهف",
      message: (
        <>
          <p style={{ marginBottom: "10px" }}>لا تنسى قراءة سورة الكهف اليوم! فهي نورٌ بين الجمعتين.</p>
          <p style={{ marginBottom: "10px" }}>
            <strong>قال رسول الله صلى الله عليه وسلم:</strong>
            <br />
            "من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين".
          </p>
          <p style={{ marginBottom: "0" }}>
            "من حفظ عشر آيات من أول سورة الكهف عصم من الدجال".
          </p>
        </>
      ),
    },
    Monday: {
      title: "تذكير بصيام الإثنين",
      message: (
        <>
          <p style={{ marginBottom: "10px" }}>اليوم الإثنين! هل فكرت في الصيام؟</p>
          <p style={{ marginBottom: "0" }}>
            <strong>قال رسول الله صلى الله عليه وسلم:</strong>
            <br />
            "تعرض الأعمال يوم الإثنين والخميس فأحب أن يعرض عملي وأنا صائم".
          </p>
        </>
      ),
    },
    Thursday: {
      title: "تذكير بصيام الخميس",
      message: (
        <>
          <p style={{ marginBottom: "10px" }}>اليوم الخميس! فرصة عظيمة للصيام.</p>
          <p style={{ marginBottom: "0" }}>
            <strong>قال رسول الله صلى الله عليه وسلم:</strong>
            <br />
            "تعرض الأعمال يوم الإثنين والخميس فأحب أن يعرض عملي وأنا صائم".
          </p>
        </>
      ),
    },
  };

  const todayReminder = reminders[day];

  return (
    showPopup &&
    todayReminder && (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          backgroundColor: "#fffbe6",
          border: "1px solid #ffc107",
          borderRadius: "10px",
          padding: "20px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          maxWidth: "350px",
          zIndex: 1000,
          lineHeight: "1.6",
        }}
      >
        <button
          onClick={closePopup}
          style={{
            position: "absolute",
            top: "3px",
            right: "3px",
            background: "none",
            fontSize: "14px",
            fontWeight: "bold",
            color: "#000000",
            cursor: "pointer",
          }}
        >
          &times;
        </button>
        <h3 style={{ color: "#d9534f", marginBottom: "25px", fontSize: "18px", paddingTop: "20px" }}>{todayReminder.title}</h3>
        <div style={{ color: "#5a5a5a", fontSize: "16px" }}>{todayReminder.message}</div>
      </div>
    )
  );
};

export default Reminders;
