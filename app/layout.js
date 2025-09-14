import { Geist, Geist_Mono } from "next/font/google";
import { Jost } from 'next/font/google';
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Footer from './components/Footer'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
});


export const metadata = {
  title: "Filmy Diary",
  description: "Keep a fun movie diary and easily share your watch list with friends and family!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jost.variable} relative antialiased flex flex-col min-h-screen`}
      >
        <AuthProvider>
          <ToastProvider>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
