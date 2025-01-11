import React from 'react';
import ContactForm from "../components/ContactForm.jsx";
import Header from "../components/Header.jsx";
import TimezoneDetector from '../components/TimezoneDetector.jsx'; // Ensure correct import path
import Reminders from '../components/Reminders.jsx';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0A1828] text-[#C4A661] p-6">
      {/* Include Header Component */}
      <Header />
      <Reminders />
      <TimezoneDetector />  
      <div className="container mx-auto max-w-4xl mt-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#C4A661]">
          تواصل معنا
        </h1>
        <p className="text-center text-[#C4A661]/80 mb-6">
          نرحب بملاحظاتكم واقتراحاتكم لتحسين المنصة.
        </p>
        <ContactForm />
      </div>
    </div>
  );
}
