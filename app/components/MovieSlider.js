'use client';

import { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import MovieCard from './MovieCard';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward, IoChevronForwardOutline } from 'react-icons/io5';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

// Removed dynamic style injection to prevent flickering
// Swiper arrows are now hidden via CSS classes in the component

const MovieSlider = ({ 
    title, 
    movies, 
    icon, 
    seeAllLink,
    onMovieClick,
    onClickWatched,
    onClickWatching,
    onClickWishlist,
    onRemoveWatched,
    onUpdateWatchDate,
    cardType = 'search'
}) => {
    const [isBeginning, setIsBeginning] = useState(true);
    const [isEnd, setIsEnd] = useState(false);
    const swiperRef = useRef(null);

    const handleSlideChange = (swiper) => {
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    };

    const slidePrev = () => {
        if (swiperRef.current) {
            swiperRef.current.slidePrev();
        }
    };

    const slideNext = () => {
        if (swiperRef.current) {
            swiperRef.current.slideNext();
        }
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="mb-0 md:mb-2 relative group overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                    {icon}
                    {title}
                    <span className="text-sm text-gray-500 font-normal">({movies.length})</span>
                </h3>
                {seeAllLink && (
                    <Link 
                        href={seeAllLink}
                        className="text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors flex items-center gap-1"
                    >
                        See All
                        <IoChevronForwardOutline className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Slider Container with white fade */}
            <div className="relative -mx-4 md:mx-0 overflow-hidden">
                {/* White fade overlay on the right - hidden on mobile */}
                <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-white to-transparent pointer-events-none z-20 hidden md:block"></div>
                {/* Navigation Arrows - Only show on desktop if there are enough cards */}
                {movies.length > 3 && (
                    <>
                        <button
                            onClick={slidePrev}
                            className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
                                isBeginning ? 'opacity-0 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            disabled={isBeginning}
                        >
                            <IoChevronBack className="w-5 h-5 text-gray-700" />
                        </button>

                        <button
                            onClick={slideNext}
                            className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full items-center justify-center transition-all duration-200 ${
                                isEnd ? 'opacity-0 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            disabled={isEnd}
                        >
                            <IoChevronForward className="w-5 h-5 text-gray-700" />
                        </button>
                    </>
                )}

                {/* Swiper */}
                <Swiper
                    modules={[Navigation, FreeMode]}
                    spaceBetween={12}
                    slidesPerView="auto"
                    freeMode={true}
                    watchSlidesProgress={true}
                    navigation={false}
                    touchEventsTarget="container"
                    simulateTouch={true}
                    grabCursor={true}
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                        handleSlideChange(swiper);
                    }}
                    onSlideChange={handleSlideChange}
                    breakpoints={{
                        320: {
                            spaceBetween: 8,
                            slidesOffsetBefore: 16,
                            slidesOffsetAfter: 16,
                            freeMode: {
                                enabled: true,
                                momentum: true,
                                momentumRatio: 1,
                                momentumVelocityRatio: 1,
                            },
                        },
                        640: {
                            spaceBetween: 12,
                            slidesOffsetBefore: 0,
                            slidesOffsetAfter: 0,
                        },
                        1024: {
                            spaceBetween: 16,
                            slidesOffsetBefore: 0,
                            slidesOffsetAfter: 0,
                        },
                    }}
                    className="!overflow-hidden !cursor-grab active:!cursor-grabbing"
                    style={{ willChange: 'transform' }}
                >
                    {movies.map((movie, index) => {
                        // Build a stable unique key avoiding 'N/A'
                        const keyParts = [];
                        if (movie.imdbID && movie.imdbID !== 'N/A') keyParts.push(movie.imdbID);
                        if (movie.tmdbID && movie.tmdbID !== 'N/A') keyParts.push(movie.tmdbID);
                        if (movie.id !== undefined && movie.id !== null) keyParts.push(String(movie.id));
                        if (keyParts.length === 0) keyParts.push(movie.Title || 'untitled', movie.Year || '', String(index));
                        const slideKey = keyParts.join('-');
                        return (
                        <SwiperSlide key={slideKey} className="!w-auto">
                            <div className="w-[140px] sm:w-[160px] lg:w-[180px] relative">
                                <MovieCard
                                    movie={movie}
                                    onHover={() => null}
                                    onLeave={() => null}
                                    onClickWatched={onClickWatched}
                                    onClickWatching={onClickWatching}
                                    onClickWishlist={onClickWishlist}
                                    onRemoveWatched={onRemoveWatched}
                                    onUpdateWatchDate={onUpdateWatchDate}
                                    watched={movie.watched}
                                    wishlist={movie.wishlist}
                                    cardType={cardType}
                                    onClick={() => onMovieClick && onMovieClick(movie)}
                                />
                            </div>
                        </SwiperSlide>
                    )})}
                </Swiper>
            </div>
        </div>
    );
};

export default MovieSlider;
