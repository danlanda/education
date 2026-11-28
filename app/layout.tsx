import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'שׁוֹמְרֵי הַזְּמַן',
  description: 'משחק קריאה, כתיבה וחשבון בתוך סיפור הרפתקאות',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'שומרי הזמן', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#140f33',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Rubik:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@700;900&family=Noto+Sans+Hebrew:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* המשחק התעדכן בזמן שהדף היה פתוח? קובץ ישן לא נטען → טוענים מחדש לבד (פעם בדקה לכל היותר) */}
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener('error',function(e){var m=String((e&&e.message)||'');if(/Loading chunk|ChunkLoadError|Loading CSS chunk/.test(m)){try{var k='autoReloadAt',l=+(sessionStorage.getItem(k)||0);if(Date.now()-l>60000){sessionStorage.setItem(k,Date.now());location.reload();}}catch(x){}}});window.addEventListener('unhandledrejection',function(e){var m=String((e&&e.reason&&(e.reason.name+' '+e.reason.message))||'');if(/ChunkLoadError|Loading chunk/.test(m)){try{var k='autoReloadAt',l=+(sessionStorage.getItem(k)||0);if(Date.now()-l>60000){sessionStorage.setItem(k,Date.now());location.reload();}}catch(x){}}});` }} />
        {children}
      </body>
    </html>
  );
}
