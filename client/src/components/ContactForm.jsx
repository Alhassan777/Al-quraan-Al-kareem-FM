"use client";

import React, { useState } from "react";
import emailjs from "emailjs-com";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    from_name: "", // Updated key to match the EmailJS template
    from_email: "", // Updated key to match the EmailJS template
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ success: "", error: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ success: "", error: "" });

    // Load EmailJS credentials from environment variables
    const serviceID = import.meta.env.VITE_PUBLIC_EMAILJS_SERVICE_ID;
    const templateID = import.meta.env.VITE_PUBLIC_EMAILJS_TEMPLATE_ID;
    const userID = import.meta.env.VITE_PUBLIC_EMAILJS_USER_ID;

    if (!serviceID || !templateID || !userID) {
      setFeedback({ error: "لم يتم إعداد إعدادات البريد الإلكتروني بشكل صحيح." });
      setIsSubmitting(false);
      return;
    }

    try {
      await emailjs.send(serviceID, templateID, formData, userID);
      setFeedback({ success: "تم إرسال الرسالة بنجاح! شكرًا لملاحظاتك." });
      setFormData({ from_name: "", from_email: "", subject: "", message: "" });
    } catch (error) {
      setFeedback({ error: "فشل في إرسال الرسالة. حاول مرة أخرى." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center text-[#0A1828] mb-6">تواصل معنا</h1>

      {/* Feedback Messages */}
      {feedback.success && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-4">
          {feedback.success}
        </div>
      )}
      {feedback.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
          {feedback.error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name Field */}
        <div className="mb-4">
          <label htmlFor="from_name" className="block text-gray-700 mb-2">
            الاسم
          </label>
          <input
            type="text"
            id="from_name"
            name="from_name"
            value={formData.from_name}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label htmlFor="from_email" className="block text-gray-700 mb-2">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            id="from_email"
            name="from_email"
            value={formData.from_email}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
            placeholder="example@email.com"
          />
        </div>

        {/* Subject Field */}
        <div className="mb-4">
          <label htmlFor="subject" className="block text-gray-700 mb-2">
            الموضوع
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded-lg"
            placeholder="اكتب الموضوع هنا"
          />
        </div>

        {/* Message Field */}
        <div className="mb-4">
          <label htmlFor="message" className="block text-gray-700 mb-2">
            الرسالة
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows="5"
            className="w-full p-3 border rounded-lg"
            placeholder="اكتب ملاحظاتك أو اقتراحاتك هنا"
          ></textarea>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 text-white font-bold rounded-lg transition ${
            isSubmitting ? "bg-gray-400" : "bg-[#0A1828] hover:bg-[#1B2A3D]"
          }`}
        >
          {isSubmitting ? "جارٍ الإرسال..." : "إرسال"}
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
