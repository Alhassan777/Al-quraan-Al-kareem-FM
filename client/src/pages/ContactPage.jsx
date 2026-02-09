import React from 'react';
import { Helmet } from 'react-helmet';
import ContactForm from "../components/ContactForm.jsx";
import TimezoneDetector from '../components/TimezoneDetector.jsx';
import Reminders from '../components/Reminders.jsx';

export default function ContactPage() {
  return (
    <>
      {/* SEO Meta Tags using Helmet */}
      <Helmet>
        <title>تواصل معنا - إذاعة القرآن الكريم من القاهرة | Contact Us</title>
        <meta 
          name="description" 
          content="تواصل مع إذاعة القرآن الكريم من القاهرة. نرحب بملاحظاتكم واقتراحاتكم لتحسين خدمة البث المباشر. Contact Quran Kareem Radio Cairo." 
        />
        <meta 
          name="keywords" 
          content="تواصل معنا, إذاعة القرآن الكريم, القاهرة, اتصل بنا, ملاحظات, اقتراحات, Contact, Quran Radio" 
        />
        <link rel="canonical" href="https://qurankareemradio.com/contact" />
        
        {/* Open Graph */}
        <meta property="og:title" content="تواصل معنا - إذاعة القرآن الكريم من القاهرة" />
        <meta property="og:description" content="تواصل مع إذاعة القرآن الكريم من القاهرة. نرحب بملاحظاتكم واقتراحاتكم." />
        <meta property="og:url" content="https://qurankareemradio.com/contact" />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:title" content="تواصل معنا - إذاعة القرآن الكريم" />
        <meta name="twitter:description" content="تواصل مع إذاعة القرآن الكريم من القاهرة - نرحب بملاحظاتكم" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "تواصل معنا - إذاعة القرآن الكريم من القاهرة",
            "description": "صفحة التواصل مع إذاعة القرآن الكريم من القاهرة",
            "url": "https://qurankareemradio.com/contact",
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
                  "name": "تواصل معنا",
                  "item": "https://qurankareemradio.com/contact"
                }
              ]
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-[#0A1828] text-[#C4A661] p-6">
        {/* Hidden SEO Content */}
        <div className="sr-only" aria-hidden="true">
          <h1>تواصل مع إذاعة القرآن الكريم من القاهرة</h1>
          <p>نرحب بملاحظاتكم واقتراحاتكم لتحسين خدمة البث المباشر لإذاعة القرآن الكريم.</p>
        </div>

        <Reminders />
        <TimezoneDetector />
        
        <main className="container mx-auto max-w-4xl mt-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-[#C4A661]">
            تواصل معنا
          </h1>
          <p className="text-center text-[#C4A661]/80 mb-6">
            نرحب بملاحظاتكم واقتراحاتكم لتحسين المنصة.
          </p>
          <ContactForm />
        </main>
      </div>
    </>
  );
}
