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
          src="https://m.media-amazon.com/images/M/MV5BZDI1NGU2ODAtNzBiNy00MWY5LWIyMGEtZjUxZjUwZmZiNjBlXkEyXkFqcGc@._V1_SX300.jpg"
          alt="title"
          className="smoothie absolute object-cover h-full w-full z-1"
        />
        <span className="block absolute h-full w-full body-overlay"></span>
        {children}
      </body>
    </html>
  );
}
