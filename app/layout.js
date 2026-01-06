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
  title: {
    default: "Filmy Diary - Track & Share Your Movie Journey",
    template: "%s | Filmy Diary"
  },
  description: "Track movies you've watched, create watchlists, and share your film journey with friends. Your personal movie diary with social features.",
  keywords: ["movie diary", "film tracker", "watchlist", "movie journal", "film reviews", "movie ratings", "social movie app", "track movies"],
  authors: [{ name: "Akash Yadav" }],
  creator: "Filmy Diary",
  publisher: "Mithila Digital Labs",
  applicationName: "Mithila Digital Labs",
  metadataBase: new URL('https://filmy-diary.netlify.app'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: {
      default: "Filmy Diary - Track & Share Your Movie Journey",
      template: "%s | Filmy Diary"
    },
    description: "Track movies you've watched, create watchlists, and share your film journey with friends. Your personal movie diary with social features.",
    siteName: "Filmy Diary",
    url: "https://filmy-diary.netlify.app",
    type: "website",
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: "Filmy Diary - Track and share your movie journey"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "Filmy Diary - Track & Share Your Movie Journey",
      template: "%s | Filmy Diary"
    },
    description: "Track movies you've watched, create watchlists, and share your film journey with friends. Your personal movie diary with social features.",
    images: [{
      url: '/twitter-image.png',
      alt: "Filmy Diary - Track and share your movie journey"
    }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  }
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
