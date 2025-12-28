'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoPeople, IoClose, IoSparkles, IoHeart, IoFilm, IoArrowForward, IoStar } from 'react-icons/io5';

const MODAL_STORAGE_KEY = 'filmy_diary_community_modal_seen';

export default function CommunityWelcomeModal({ userId }) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!userId) return;
        
        // Check if user has seen this modal before
        const seenKey = `${MODAL_STORAGE_KEY}_${userId}`;
        const hasSeen = localStorage.getItem(seenKey);
        
        if (!hasSeen) {
            // Small delay to let the page load first
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [userId]);

    const handleClose = () => {
        if (userId) {
            localStorage.setItem(`${MODAL_STORAGE_KEY}_${userId}`, 'true');
        }
        setIsOpen(false);
    };

    const handleGoToCommunity = () => {
        handleClose();
        router.push('/community');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-md"
                onClick={handleClose}
                style={{ animation: 'fadeIn 0.3s ease-out' }}
            />
            
            {/* Modal */}
            <div 
                className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
                style={{ animation: 'slideUp 0.4s ease-out' }}
            >
                {/* Gradient Background - Full modal */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-1">
                    <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-[22px] overflow-hidden">
                        
                        {/* Close Button */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-all z-10"
                        >
                            <IoClose className="w-5 h-5" />
                        </button>

                        {/* Floating Decorations */}
                        <div className="absolute top-8 left-8 text-white/30 animate-bounce" style={{ animationDuration: '3s' }}>
                            <IoStar className="w-6 h-6" />
                        </div>
                        <div className="absolute top-16 right-12 text-yellow-300/40 animate-pulse">
                            <IoSparkles className="w-5 h-5" />
                        </div>
                        <div className="absolute bottom-32 left-6 text-pink-300/30 animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
                            <IoHeart className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-40 right-8 text-white/20 animate-pulse" style={{ animationDelay: '1s' }}>
                            <IoFilm className="w-7 h-7" />
                        </div>

                        {/* Content */}
                        <div className="px-6 pt-10 pb-8 text-center relative">
                            
                            {/* Animated Icon Container */}
                            <div className="relative mb-5">
                                <div className="w-24 h-24 mx-auto relative">
                                    {/* Outer ring animation */}
                                    <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                                    {/* Inner circle */}
                                    <div className="absolute inset-2 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                                        <IoPeople className="w-12 h-12 text-white drop-shadow-lg" />
                                    </div>
                                </div>
                            </div>

                            {/* Title with emoji */}
                            <div className="mb-2">
                                <span className="text-4xl">🎉</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                                New Feature!
                            </h2>
                            <h3 className="text-lg font-semibold text-white/90 mb-4">
                                Connect with Your Friends
                            </h3>
                            
                            <p className="text-white/80 text-sm leading-relaxed mb-6 px-2">
                                Add friends and discover what they&apos;re watching! 
                                Share your movie journey together 🍿
                            </p>

                            {/* Feature Pills */}
                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-colors">
                                    <IoPeople className="w-4 h-4" />
                                    Add Friends
                                </span>
                                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-colors">
                                    <IoFilm className="w-4 h-4" />
                                    See Their Lists
                                </span>
                                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium flex items-center gap-2 hover:bg-white/30 transition-colors">
                                    <IoSparkles className="w-4 h-4" />
                                    Get Inspired
                                </span>
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleGoToCommunity}
                                className="w-full py-4 bg-white hover:bg-gray-50 text-purple-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span>Explore Community</span>
                                <IoArrowForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            {/* Skip link */}
                            <button
                                onClick={handleClose}
                                className="mt-4 text-white/60 hover:text-white text-sm font-medium transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(40px) scale(0.9);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}
