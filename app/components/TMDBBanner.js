'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const TMDBBanner = () => {
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const [backdropImages, setBackdropImages] = useState([]);

    // Get latest released movies from TMDB
    useEffect(() => {
        const fetchLatestMovies = async () => {
            try {
                const response = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&page=1`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    const backdrops = [];
                    
                    // Take first 5 movies with backdrop images
                    for (const movie of data.results.slice(0, 10)) {
                        if (movie.backdrop_path) {
                            backdrops.push({
                                url: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
                                title: movie.title,
                                year: new Date(movie.release_date).getFullYear(),
                                overview: movie.overview
                            });
                            
                            if (backdrops.length >= 5) break;
                        }
                    }
                    
                    setBackdropImages(backdrops);
                }
            } catch (error) {
                console.error('Failed to fetch latest movies:', error);
            }
        };

        fetchLatestMovies();
    }, []);

    // Auto-rotate banners every 5 seconds
    useEffect(() => {
        if (backdropImages.length > 1) {
            const interval = setInterval(() => {
                setCurrentMovieIndex((prev) => (prev + 1) % backdropImages.length);
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [backdropImages.length]);

    if (!backdropImages.length) return null;

    const currentBackdrop = backdropImages[currentMovieIndex];
    
    // Safety check to prevent undefined url error
    if (!currentBackdrop || !currentBackdrop.url) {
        console.error('Invalid backdrop data:', currentBackdrop);
        return null;
    }

    return (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden mb-8 shadow-lg group">
            {/* Background Image */}
            <Image
                src={currentBackdrop.url}
                alt={`${currentBackdrop.title} backdrop`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
            />
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 animate-pulse"></div>
            </div>
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center p-6 md:p-8">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: '#8BC34A'}}></div>
                        <span className="text-sm font-medium tracking-wider uppercase" style={{color: '#8BC34A'}}>Latest Releases</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                        {currentBackdrop.title}
                    </h2>
                    <p className="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md">
                        ({currentBackdrop.year})
                    </p>
                    <p className="text-sm md:text-base text-white/80 mb-4 drop-shadow-md line-clamp-3 max-w-lg">
                        {currentBackdrop.overview}
                    </p>
                    <div className="flex items-center gap-4 text-sm md:text-base text-white/80">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span>Now in theaters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                            </svg>
                            <span>{backdropImages.length} {backdropImages.length === 1 ? 'movie' : 'movies'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Navigation Dots */}
            {backdropImages.length > 1 && (
                <div className="absolute bottom-4 right-6 flex gap-2">
                    {backdropImages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentMovieIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentMovieIndex 
                                    ? 'scale-125' 
                                    : 'hover:scale-110'
                            }`}
                            style={{
                                backgroundColor: index === currentMovieIndex ? '#8BC34A' : 'rgba(139, 195, 74, 0.5)'
                            }}
                        />
                    ))}
                </div>
            )}
            
            {/* Floating Elements */}
            <div className="absolute top-4 right-4 opacity-20">
                <div className="w-16 h-16 border border-white/30 rounded-full animate-spin" style={{animationDuration: '20s'}}></div>
            </div>
            <div className="absolute bottom-4 left-4 opacity-20">
                <div className="w-12 h-12 border border-white/30 rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};

export default TMDBBanner;
