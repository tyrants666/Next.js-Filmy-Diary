'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

const TMDBBanner = ({ onMovieClick }) => {
    const [backdropImages, setBackdropImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const swiperRef = useRef(null);
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
    const [autoplayDelay, setAutoplayDelay] = useState(5000);

    // Get latest released movies from TMDB with full details
    useEffect(() => {
        const fetchLatestMovies = async () => {
            try {
                const response = await fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&page=1`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    const cards = data.results
                        .filter(movie => movie.poster_path) // card needs a poster
                        .slice(0, 19) // show up to 19 as requested
                        .map(movie => ({
                            tmdbID: movie.id.toString(),
                            imdbID: "N/A",
                            Title: movie.title,
                            Year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "N/A",
                            Type: "movie",
                            Poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                            Plot: movie.overview || "N/A",
                            imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",
                            ratingSource: "TMDB",
                            backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : `https://image.tmdb.org/t/p/w780${movie.poster_path}`
                        }));
                    setBackdropImages(cards);
                }
            } catch (error) {
                console.error('Failed to fetch latest movies:', error);
            }
        };

        fetchLatestMovies();
    }, []);

    // Load autoplay preferences from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedEnabled = localStorage.getItem('bannerAutoplayEnabled');
        const storedDelay = localStorage.getItem('bannerAutoplayDelayMs');
        if (storedEnabled !== null) {
            setAutoplayEnabled(storedEnabled === 'true');
        }
        if (storedDelay !== null) {
            const parsed = parseInt(storedDelay, 10);
            if (!isNaN(parsed)) {
                const clamped = Math.min(20000, Math.max(1000, parsed));
                setAutoplayDelay(clamped);
            }
        }
    }, []);

    if (!backdropImages.length) return null;

    const handleBannerClick = (movie) => {
        if (onMovieClick) {
            onMovieClick(movie);
        }
    };

    return (
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden mb-8 md:mb-10 shadow-lg">
            <Swiper
                modules={[Autoplay]}
                autoplay={autoplayEnabled ? {
                    delay: autoplayDelay,
                    disableOnInteraction: false,
                } : false}
                loop={backdropImages.length > 1}
                className="w-full h-full"
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => {
                    // realIndex is stable when loop is enabled
                    const idx = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex || 0;
                    setCurrentIndex(idx);
                }}
            >
                {backdropImages.map((movie, index) => (
                    <SwiperSlide key={index}>
                        <div 
                            className="relative w-full h-full cursor-pointer"
                            onClick={() => handleBannerClick(movie)}
                        >
                            {/* Background Image */}
                            <Image
                                src={movie.backdrop}
                                alt={`${movie.Title} backdrop`}
                                fill
                                className="object-cover"
                                priority={index === 0}
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
                                    <div className="flex items-center gap-2 text-white/80 text-sm md:text-base  mb-3">
                                        {/* <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#fff' }}></div> */}
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        <span>Latest Release</span>
                                    </div>
                                    <h2 className="text-xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg w-full max-w-[85%] overflow-hidden text-ellipsis md:max-w-full md:whitespace-normal md:overflow-visible md:text-clip">
                                        {movie.Title}
                                    </h2>
                                    <p className="text-lg md:text-xl text-white/90 mb-4 drop-shadow-md hidden md:block">
                                        ({movie.Year})
                                    </p>
                                    {movie.Plot && movie.Plot !== 'N/A' && (
                                        <p className="text-sm md:text-base text-white/80 mb-4 drop-shadow-md line-clamp-3 max-w-lg">
                                            {movie.Plot}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm md:text-base text-white/80">
                                        
                                        {movie.imdbRating !== "N/A" && (
                                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                                <span>{movie.imdbRating}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                            </svg>
                                            <span>{currentIndex + 1}/{backdropImages.length} {backdropImages.length === 1 ? 'movie' : 'movies'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Floating Elements */}
                            <div className="absolute top-4 right-4 opacity-20">
                                <div className="w-16 h-16 border border-white/30 rounded-full animate-spin" style={{animationDuration: '20s'}}></div>
                            </div>
                            <div className="absolute bottom-4 left-4 opacity-20">
                                <div className="w-12 h-12 border border-white/30 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};

export default TMDBBanner;
