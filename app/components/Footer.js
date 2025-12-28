'use client';

import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
            <div className="container mx-auto px-4 py-6">
                {/* Main Footer Content */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Left Section - App Info */}
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                            <Image
                                src="/images/logo.png"
                                alt="Filmy Diary Logo"
                                width={32}
                                height={32}
                                className="rounded"
                            />
                            <span className="font-semibold text-gray-800">Filmy Diary</span>
                        </div>
                        <p className="text-sm text-gray-600">
                            Your personal movie diary
                        </p>
                    </div>

                    {/* Center Section - TMDB Attribution */}
                    <div className="text-center hidden">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">Powered by</span>
                            <div className="flex items-center gap-1">
                                {/* TMDB Logo - You'll need to add the official TMDB logo */}
                                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                                    TMDB
                                </div>
                                <span className="text-xs text-gray-500">&</span>
                                <div className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                                    OMDB
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 max-w-xs">
                            This product uses the TMDB API but is not endorsed or certified by TMDB.
                        </p>
                    </div>

                    {/* Right Section - Developer Info */}
                    <div className="text-center md:text-right">
                        <p className="text-sm text-gray-600 mb-1">
                            Made with ❤️ by
                        </p>
                        <a 
                            // href="" 
                            href="https://www.instagram.com/akashxolotl" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            Akash Yadav
                        </a>
                    </div>
                </div>

                {/* Bottom Section - Links and Copyright */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* Copyright */}
                        <div className="text-xs text-gray-500">
                            © {new Date().getFullYear()} Filmy Diary. All rights reserved.
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
}
