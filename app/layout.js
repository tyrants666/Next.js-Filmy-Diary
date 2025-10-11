import { Geist, Geist_Mono } from "next/font/google";
import { Jost } from 'next/font/google';
// import { Poppins } from 'next/font/google';
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { MovieCacheProvider } from './context/MovieCacheContext'
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

// const poppins = Poppins({
//   subsets: ['latin'], // Or other relevant subsets
//   variable: '--font-poppins', // Optional: for CSS variables
//   weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] 
// });

export const metadata = {
  title: "Filmy Diary",
  description: "Keep a fun movie diary and easily share your watch list with friends and family!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} relative antialiased flex flex-col min-h-screen`}
      >
        <AuthProvider>
          <ToastProvider>
            <MovieCacheProvider>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </MovieCacheProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
