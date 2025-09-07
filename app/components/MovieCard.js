import React, { useState, useEffect } from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave, onClickWatched, onClickWatching, onRemoveWatched, onClickWishlist, onUpdateWatchDate, watched, wishlist, cardType = 'search' }) => {
    // Add custom styles for date input icon
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .date-input-custom::-webkit-calendar-picker-indicator {
                filter: invert(1) brightness(1.2);
                cursor: pointer;
                opacity: 0.8;
            }
            .date-input-custom::-webkit-calendar-picker-indicator:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);
    const [isWatched, setIsWatched] = useState(false);
    const [isWatchedLoading, setIsWatchedLoading] = useState(false);
    const [isWatchingLoading, setIsWatchingLoading] = useState(false);
    const [isWishlistLoading, setIsWishlistLoading] = useState(false);
    const [isWishlist, setIsWishlist] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
    const [operationError, setOperationError] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    
    // Generate alternative poster URLs for fallback (TMDB priority)
    const getPosterAlternatives = () => {
        const alternatives = [];
        
        // Primary poster (should be TMDB if available)
        if (movie.Poster && movie.Poster !== "N/A") {
            alternatives.push(movie.Poster);
        }
        
        // If primary poster is TMDB, try different TMDB poster sizes
        if (movie.Poster && movie.Poster.includes('image.tmdb.org')) {
            const posterPath = movie.Poster.split('/').pop(); // Extract poster filename
            const tmdbBaseUrl = 'https://image.tmdb.org/t/p';
            alternatives.push(
                `${tmdbBaseUrl}/w500/${posterPath}`,
                `${tmdbBaseUrl}/w342/${posterPath}`,
                `${tmdbBaseUrl}/w185/${posterPath}`,
                `${tmdbBaseUrl}/original/${posterPath}`
            );
        }
        
        // If we have IMDB ID, try direct IMDB poster URLs as final fallback
        if (movie.imdbID && movie.imdbID.startsWith('tt')) {
            alternatives.push(
                `https://m.media-amazon.com/images/M/${movie.imdbID}.jpg`,
                `https://ia.media-imdb.com/images/M/${movie.imdbID}._V1_SX300.jpg`,
                `https://ia.media-imdb.com/images/M/${movie.imdbID}._V1_.jpg`
            );
        }
        
        return alternatives;
    };
    
    const posterAlternatives = getPosterAlternatives();

    useEffect(() => {
        setIsWatched(watched);
    }, [watched]);

    useEffect(() => {
        setIsWishlist(wishlist);
    }, [wishlist]);

    useEffect(() => {
        setImageError(false); // Reset image error when movie changes
    }, [movie.Poster]);

    const handleWatchedClick = async () => {
        setIsWatchedLoading(true);
        setOperationError(false);
        const originalWatchedState = isWatched;
        
        try {
            // Use current date for quick watched action
            await onClickWatched(null); // null will default to current date in backend
            setIsWatched(true);
        } catch (error) {
            console.error('Failed to mark as watched:', error);
            setIsWatched(originalWatchedState);
            setOperationError(true);
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchedLoading(false);
        }
    };

    const handleCalendarClick = () => {
        setShowDatePicker(true);
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    };

    const handleDateSubmit = async () => {
        setIsWatchedLoading(true);
        setOperationError(false);
        const originalWatchedState = isWatched;
        
        try {
            // Convert selected date to ISO string if provided, otherwise use current date
            const watchedDate = selectedDate ? new Date(selectedDate).toISOString() : null;
            await onClickWatched(watchedDate);
            // Only set as watched if the operation succeeds
            setIsWatched(true);
            setShowDatePicker(false);
        } catch (error) {
            console.error('Failed to mark as watched:', error);
            // Restore the original state if operation fails
            setIsWatched(originalWatchedState);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchedLoading(false);
        }
    };

    const handleDateCancel = () => {
        setShowDatePicker(false);
        setSelectedDate('');
    };

    const handleEditDateClick = () => {
        setShowDatePicker(true);
        // Set default date to today for editing
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
    };

    const handleEditDateSubmit = async () => {
        setIsWatchedLoading(true);
        setOperationError(false);
        
        try {
            // Convert selected date to ISO string if provided
            const watchedDate = selectedDate ? new Date(selectedDate).toISOString() : null;
            if (onUpdateWatchDate) {
                await onUpdateWatchDate(watchedDate);
            }
            setShowDatePicker(false);
        } catch (error) {
            console.error('Failed to update watch date:', error);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchedLoading(false);
        }
    };

    const handleRemoveWatched = async () => {
        setIsWatchedLoading(true);
        setOperationError(false);
        const originalWatchedState = isWatched;
        
        try {
            await onRemoveWatched();
            // Only set as unwatched if the operation succeeds
            setIsWatched(false);
        } catch (error) {
            console.error('Failed to remove watched status:', error);
            // Restore the original state if operation fails
            setIsWatched(originalWatchedState);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchedLoading(false);
        }
    };

    const handleWatchingClick = async () => {
        setIsWatchingLoading(true);
        setOperationError(false);
        
        try {
            await onClickWatching();
        } catch (error) {
            console.error('Failed to add to watching:', error);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchingLoading(false);
        }
    };

    const handleRemoveWatching = async () => {
        setIsWatchingLoading(true);
        setOperationError(false);
        
        try {
            await onClickWatching(); // This should be the remove function
        } catch (error) {
            console.error('Failed to remove from watching:', error);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWatchingLoading(false);
        }
    };

    const handleWishlistClick = async () => {
        setIsWishlistLoading(true);
        setOperationError(false);
        const originalWishlistState = isWishlist;
        
        try {
            await onClickWishlist();
            // Toggle wishlist state optimistically
            setIsWishlist(!originalWishlistState);
        } catch (error) {
            console.error('Failed to toggle wishlist:', error);
            // Restore the original state if operation fails
            setIsWishlist(originalWishlistState);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWishlistLoading(false);
        }
    };

    const handleImageError = (e) => {
        const failedUrl = posterAlternatives[currentPosterIndex];
        console.error(`Failed to load poster for "${movie.Title}":`, failedUrl, e);
        
        // Try next alternative poster if available
        if (currentPosterIndex < posterAlternatives.length - 1) {
            console.log(`Trying alternative poster ${currentPosterIndex + 1} for "${movie.Title}"`);
            setCurrentPosterIndex(currentPosterIndex + 1);
            setImageError(false); // Reset error to try the next poster
        } else {
            console.log(`All poster alternatives failed for "${movie.Title}"`);
            setImageError(true);
        }
    };

    return (
        <div className={`gap-2 bg-gray-50 shadow-lg hover:shadow-xl flex flex-col rounded-xl relative group min-w-0 shrink-0 grow-0
        basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none transition-all duration-200 ${
            operationError ? 'border-2 border-red-500' : 'border border-gray-200'
        }`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        >
            <a
                // href="#"
                className="relative flex align-center !aspect-[1.37/2]"
            >
                { posterAlternatives.length > 0 && !imageError ? (
                    <span className="relative h-full w-full flex items-center">
                        <Image
                            src={posterAlternatives[currentPosterIndex]}
                            alt={movie.Title}
                            fill
                            className="object-cover !select-none rounded-xl"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={true}
                            onError={handleImageError}
                            placeholder="blur"
                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                    </span>
                ) : (
                    <span className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl relative h-full w-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zM5 7v11h14V7H5zm3 3a1 1 0 112 0v5a1 1 0 11-2 0V10zm4 0a1 1 0 112 0v5a1 1 0 11-2 0V10z"/>
                                </svg>
                            </div>
                            <p className="px-2 text-xs text-gray-600 font-medium">No Poster<br/>Available</p>
                        </div>
                    </span>
                )}

                {/* Rating Badge */}
                {movie.imdbRating && movie.imdbRating !== "N/A" && (
                    <div className={`absolute top-2 left-2 text-white px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 text-xs font-bold ${
                        movie.ratingSource === "IMDB" 
                            ? "bg-yellow-500" 
                            : movie.ratingSource === "TMDB" 
                                ? "bg-blue-500" 
                                : "bg-gray-500"
                    }`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>{movie.imdbRating}</span>
                        {movie.ratingSource && movie.ratingSource !== "N/A" && (
                            <span className="text-[10px] opacity-75 ml-0.5">
                                {movie.ratingSource === "IMDB" ? "IMDb" : movie.ratingSource}
                            </span>
                        )}
                    </div>
                )}

                {/* Status indicator for watched movies - always visible */}
                {isWatched && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white w-5 h-5 rounded-full shadow-2xl flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    </div>
                )}

                {/* Wishlist indicator - always visible when in wishlist */}
                {isWishlist && !isWatched && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white w-5 h-5 rounded-full shadow-2xl flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                        </svg>
                        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    </div>
                )}

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="flex flex-col gap-2 px-3">
                        {cardType === 'search' && !isWatched && (
                            <>
                                {!showDatePicker && (
                                    <>
                                        <button
                                            onClick={handleWatchedClick}
                                            disabled={isWatchedLoading}
                                            className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                        >
                                            {isWatchedLoading ? (
                                                <>
                                                    <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                                    </svg>
                                                    Loading
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="20,6 9,17 4,12"></polyline>
                                                    </svg>
                                                    Watched
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCalendarClick}
                                            disabled={isWatchedLoading}
                                            className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                        >
                                            <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            Watch Date
                                        </button>
                                        <button
                                            onClick={handleWatchingClick}
                                            disabled={isWatchingLoading}
                                            className="bg-indigo-700/90 hover:bg-indigo-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                        >
                                            {isWatchingLoading ? (
                                                <>
                                                    <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                                    </svg>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polygon points="5,3 19,12 5,21"></polygon>
                                                    </svg>
                                                    Watching
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleWishlistClick}
                                            disabled={isWishlistLoading}
                                            className={`${isWishlist ? 'bg-purple-600/90 hover:bg-purple-500/90' : 'bg-purple-700/90 hover:bg-purple-600/90'} text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20`}
                                        >
                                            {isWishlistLoading ? (
                                                <>
                                                    <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                                    </svg>
                                                    {isWishlist ? 'Removing...' : 'Adding...'}
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill={isWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                                    </svg>
                                                    {isWishlist ? 'In Watchlist' : 'Watchlist'}
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                                
                                {/* Inline date picker */}
                                {showDatePicker && (
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full p-1 px-2 border border-white/30 rounded-lg text-white bg-transparent backdrop-blur-sm focus:outline-none focus:border-white/50 focus:bg-white/5 hover:border-white/40 transition-all duration-200 date-input-custom"
                                            style={{ 
                                                fontSize: '12px',
                                                colorScheme: 'dark'
                                            }}
                                            max={new Date().toISOString().split('T')[0]}
                                            autoFocus
                                        />
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                onClick={handleDateSubmit}
                                                disabled={isWatchedLoading}
                                                className="bg-transparent hover:bg-white/10 text-green-400 hover:text-green-300 p-1 rounded disabled:opacity-50 transition-colors flex items-center justify-center"
                                                title="Accept"
                                            >
                                                <svg className="hidden sm:block" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="20,6 9,17 4,12"></polyline>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={handleDateCancel}
                                                disabled={isWatchedLoading}
                                                className="bg-transparent hover:bg-white/10 text-red-400 hover:text-red-300 p-1 rounded disabled:opacity-50 transition-colors flex items-center justify-center"
                                                title="Cancel"
                                            >
                                                <svg className="hidden sm:block" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {cardType === 'search' && isWatched && !showDatePicker && (
                            <button
                                onClick={handleRemoveWatched}
                                disabled={isWatchedLoading}
                                                className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                            >
                                {isWatchedLoading ? (
                                    <>
                                        <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                        </svg>
                                        Removing
                                    </>
                                ) : (
                                    <>
                                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                        Remove
                                    </>
                                )}
                            </button>
                        )}

                        {cardType === 'watching' && (
                            <>
                                <button
                                    onClick={handleWatchedClick}
                                    disabled={isWatchedLoading}
                                    className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isWatchedLoading ? (
                                        <>
                                            <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Moving...
                                        </>
                                    ) : (
                                        <>
                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="20,6 9,17 4,12"></polyline>
                                    </svg>
                                            Watched
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleRemoveWatching}
                                    disabled={isWatchingLoading}
                                                className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isWatchingLoading ? (
                                        <>
                                            <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                            Remove
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {cardType === 'watched' && !showDatePicker && (
                            <>
                                <button
                                    onClick={handleEditDateClick}
                                    disabled={isWatchedLoading}
                                    className="bg-blue-700/90 hover:bg-blue-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Edit Date
                                </button>
                                <button
                                    onClick={handleRemoveWatched}
                                    disabled={isWatchedLoading}
                                    className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isWatchedLoading ? (
                                        <>
                                            <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Removing
                                        </>
                                    ) : (
                                        <>
                                            <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                            Remove
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {/* Date picker for watched cards */}
                        {cardType === 'watched' && showDatePicker && (
                            <div className="flex flex-col gap-1">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full p-1 px-2 border border-white/30 rounded-lg text-white bg-transparent backdrop-blur-sm focus:outline-none focus:border-white/50 focus:bg-white/5 hover:border-white/40 transition-all duration-200 date-input-custom"
                                    style={{ 
                                        fontSize: '12px',
                                        colorScheme: 'dark'
                                    }}
                                    max={new Date().toISOString().split('T')[0]}
                                    autoFocus
                                />
                                <div className="flex gap-1 justify-center">
                                    <button
                                        onClick={handleEditDateSubmit}
                                        disabled={isWatchedLoading}
                                        className="bg-transparent hover:bg-white/10 text-green-400 hover:text-green-300 p-1 rounded disabled:opacity-50 transition-colors flex items-center justify-center"
                                        title="Update Date"
                                    >
                                        <svg className="hidden sm:block" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleDateCancel}
                                        disabled={isWatchedLoading}
                                        className="bg-transparent hover:bg-white/10 text-red-400 hover:text-red-300 p-1 rounded disabled:opacity-50 transition-colors flex items-center justify-center"
                                        title="Cancel"
                                    >
                                        <svg className="hidden sm:block" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {cardType === 'wishlist' && (
                            <>
                                <button
                                    onClick={handleWatchedClick}
                                    disabled={isWatchedLoading}
                                    className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isWatchedLoading ? (
                                        <>
                                            <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Moving...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20,6 9,17 4,12"></polyline>
                                            </svg>
                                            Watched
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleWishlistClick}
                                    disabled={isWishlistLoading}
                                    className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isWishlistLoading ? (
                                        <>
                                            <svg className="animate-spin hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Removing...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="hidden sm:block" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                            Remove
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </a>

            <div className="px-2 pb-2 flex w-full flex-col gap-1">
                <div className="flex text-xs text-gray-700 font-medium justify-between">
                    <span className="uppercase bg-gray-100 py-0.5 rounded-full">{movie.Type}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{movie.Year.replace(/\D/g, '')}</span>
                </div>
                <a 
                    href={
                        movie.imdbID && movie.imdbID !== "N/A" && movie.imdbID.startsWith('tt') 
                            ? `https://www.imdb.com/title/${movie.imdbID}` 
                            : movie.tmdbID && movie.tmdbID !== "N/A"
                                ? movie.Type === 'series' 
                                    ? `https://www.themoviedb.org/tv/${movie.tmdbID}`
                                    : `https://www.themoviedb.org/movie/${movie.tmdbID}`
                                : `https://www.google.com/search?q=${encodeURIComponent(movie.Title + " " + (movie.Type || "movie"))}`
                    } 
                    className="flex w-full text-[.82rem] sm:text-sm font-semibold !line-clamp-2 tracking-wider text-gray-900 hover:text-blue-600 transition-colors" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {movie.Title}
                </a>
                
                {/* Show watch date for watched movies */}
                {movie.watchedDate && cardType === 'watched' && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>
                            {(() => {
                                const watchDate = new Date(movie.watchedDate);
                                const today = new Date();
                                const diffTime = today - watchDate;
                                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays === 0) return 'Watched today';
                                if (diffDays === 1) return 'Watched yesterday';
                                if (diffDays < 7) return `Watched ${diffDays} days ago`;
                                return `Watched ${watchDate.toLocaleDateString()}`;
                            })()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieCard;
