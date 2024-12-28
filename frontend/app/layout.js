
import { Noto_Naskh_Arabic } from "@next/font/google";
import Script from 'next/script';
import '../style/global.css';

const notoNaskhArabic = Noto_Naskh_Arabic({
  weight: ["400", "700"],
  subsets: ["arabic"],
  display: "swap",
});

export const metadata = {
  title: "اذاعة القرآن الكريم",
  description: "استمع إلى بث القرآن الكريم والبرامج الإسلامية.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={notoNaskhArabic.className}>
      <body className="min-h-screen bg-[#0A1828] text-[#C4A661]">
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}