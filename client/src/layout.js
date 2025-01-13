import { Noto_Naskh_Arabic } from "@next/font/google";
import Script from "next/script";
import Head from "next/head";
import "../style/global.css";

const notoNaskhArabic = Noto_Naskh_Arabic({
  weight: ["400", "700"],
  subsets: ["arabic"],
  display: "swap",
});

export const metadata = {
  title: "إذاعة القرآن الكريم من القاهرة",
  description: "استمع إلى بث إذاعة القرآن الكريم من القاهرة وتابع البرامج الإسلامية المميزة والتلاوات العذبة.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={notoNaskhArabic.className}>
      <Head>
        {/* Basic Meta Tags */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta
          name="keywords"
          content="إذاعة القرآن الكريم, بث مباشر, كبار القراء, مشاهير القراء, قراء الإذاعة, تلاوات, برامج دينية, قراء مصر, ترتيل القرآن الكريم, قراء القاهرة, تلاوات خاشعة, تعلم التجويد, ختمة القرآن, إذاعة القاهرة"
        />
        <meta name="author" content="إذاعة القرآن الكريم من القاهرة" />

        {/* Open Graph Tags */}
        <meta property="og:title" content="إذاعة القرآن الكريم من القاهرة" />
        <meta
          property="og:description"
          content="استمع إلى بث إذاعة القرآن الكريم من القاهرة وتابع البرامج الإسلامية المميزة والتلاوات العذبة."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://idhaatqurankareem.com" />
        <meta
          property="og:image"
          content="https://idhaatqurankareem.com/images/quran-radio-thumbnail.jpg"
        />
        <meta property="og:locale" content="ar_AR" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="إذاعة القرآن الكريم من القاهرة" />
        <meta
          name="twitter:description"
          content="استمع إلى بث إذاعة القرآن الكريم من القاهرة وتابع البرامج الإسلامية المميزة والتلاوات العذبة."
        />
        <meta
          name="twitter:image"
          content="https://idhaatqurankareem.com/images/quran-radio-thumbnail.jpg"
        />

        {/* Canonical Link */}
        <link rel="canonical" href="https://idhaatqurankareem.com" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "إذاعة القرآن الكريم من القاهرة",
              description:
                "استمع إلى بث إذاعة القرآن الكريم من القاهرة وتابع البرامج الإسلامية المميزة والتلاوات العذبة.",
              url: "https://idhaatqurankareem.com",
              publisher: {
                "@type": "Organization",
                name: "إذاعة القرآن الكريم من القاهرة",
              },
            }),
          }}
        />
      </Head>
      <body className="min-h-screen bg-[#0A1828] text-[#C4A661]">
        {/* External Script */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
