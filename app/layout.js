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
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        <img
          src="https://m.media-amazon.com/images/M/MV5BMzgzYjM4NTUtOTlhMS00MTJmLTkxZjgtYWY4NjI1ZWRiNGU4XkEyXkFqcGc@._V1_SX300.jpg"
          alt="title"
          className="smoothie absolute object-cover object-top h-full w-full z-1"
        />
        <span className="blur-overlay block absolute h-full w-full"></span>

        {/* ================= Blur with FIlter ================== */}
        {/* <div className="!max-h-[100%] !z-[-1] absolute blur-3xl brightness-50 left-0 opacity-90 overflow-hidden pointer-events-none right-0 top-0">
          <span className=" lazy-load-image-background opacity lazy-load-image-loaded">
            <img width="100%" height="100%" src="https://m.media-amazon.com/images/M/MV5BZDI1NGU2ODAtNzBiNy00MWY5LWIyMGEtZjUxZjUwZmZiNjBlXkEyXkFqcGc@._V1_SX300.jpg"
              className="size-full object-cover object-center !select-none shrink-0 transition-all !duration-1000 opacity-100" />
          </span>
        </div> */}

        {children}
      </body>
    </html>
  );
}
