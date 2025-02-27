import { Geist, Geist_Mono } from "next/font/google";
import { Jost } from 'next/font/google';
import { Poppins } from 'next/font/google';
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

const poppins = Poppins({
  subsets: ['latin'], // Or other relevant subsets
  variable: '--font-poppins', // Optional: for CSS variables
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] 
});

export const metadata = {
  title: "Filmy Diary",
  description: "A Savelist diary of your watched movies to share with your friends and families.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} relative antialiased`}
      >
        <div className="blur-3xl absolute h-full w-full">
          <img
            src="https://m.media-amazon.com/images/M/MV5BMzgzYjM4NTUtOTlhMS00MTJmLTkxZjgtYWY4NjI1ZWRiNGU4XkEyXkFqcGc@._V1_SX300.jpg"
            alt="title"
            className="smoothie object-cover object-top h-full w-full"
          />
          <span className="blur-overlay block absolute h-full w-full z-1 top-0 left-0"></span>
        </div>

        {children}
      </body>
    </html>
  );
}
