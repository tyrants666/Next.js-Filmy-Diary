import React, { useState, useEffect } from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave, onClickWatched, onClickWatching, onRemoveWatched, onClickWishlist, onUpdateWatchDate, watched, wishlist, cardType = 'search', onClick }) => {
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
    const [isRemoveWatchedLoading, setIsRemoveWatchedLoading] = useState(false);
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
        
        try {
            // Add minimum loading time to ensure loading state is visible
            const [apiResult] = await Promise.all([
                onClickWatched(null), // null will default to current date in backend
                new Promise(resolve => setTimeout(resolve, 1000)) // Minimum 1 second loading
            ]);
            // Only update local state after successful API call
            // The parent component will handle updating the watched prop
        } catch (error) {
            console.error('Failed to mark as watched:', error);
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
        
        try {
            // Convert selected date to ISO string if provided, otherwise use current date
            const watchedDate = selectedDate ? new Date(selectedDate).toISOString() : null;
            await onClickWatched(watchedDate);
            // Only close date picker after successful API call
            // The parent component will handle updating the watched prop
            setShowDatePicker(false);
        } catch (error) {
            console.error('Failed to mark as watched:', error);
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
        setIsRemoveWatchedLoading(true);
        setOperationError(false);
        
        try {
            // Add minimum loading time to ensure loading state is visible
            const [apiResult] = await Promise.all([
                onRemoveWatched(),
                new Promise(resolve => setTimeout(resolve, 1000)) // Minimum 1 second loading
            ]);
            // The parent component will handle updating the watched prop
        } catch (error) {
            console.error('Failed to remove watched status:', error);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsRemoveWatchedLoading(false);
        }
    };

    const handleWatchingClick = async () => {
        setIsWatchingLoading(true);
        setOperationError(false);
        
        try {
            // Add minimum loading time to ensure loading state is visible
            const [apiResult] = await Promise.all([
                onClickWatching(),
                new Promise(resolve => setTimeout(resolve, 1000)) // Minimum 1 second loading
            ]);
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
        
        try {
            // Add minimum loading time to ensure loading state is visible
            const [apiResult] = await Promise.all([
                onClickWishlist(),
                new Promise(resolve => setTimeout(resolve, 1000)) // Minimum 1 second loading
            ]);
            // Parent component handles all state updates
        } catch (error) {
            console.error('Failed to toggle wishlist:', error);
            setOperationError(true);
            // Clear error after 3 seconds
            setTimeout(() => setOperationError(false), 3000);
        } finally {
            setIsWishlistLoading(false);
        }
    };

    const handleImageError = (e) => {
        const failedUrl = posterAlternatives[currentPosterIndex];
        
        // Try next alternative poster if available
        if (currentPosterIndex < posterAlternatives.length - 1) {
            setCurrentPosterIndex(currentPosterIndex + 1);
            setImageError(false); // Reset error to try the next poster
        } else {
            // Only log error when all alternatives have failed
            console.error(`All poster alternatives failed for "${movie.Title}"`);
            setImageError(true);
        }
    };

    return (
        <div className={`movie-card ${cardType === 'search' ? '' : 'h-full'} gap-2 bg-gray-50 shadow-lg hover:shadow-xl flex flex-col rounded-xl relative min-w-0 shrink-0 grow-0
        basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.3%] max-w-[180px] !select-none transition-all duration-200 ${
            operationError ? 'border-2 border-red-500' : 'border border-gray-200'
        }`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        >
            <div
                className="relative flex align-center !aspect-[1.37/2] cursor-pointer"
                onClick={() => onClick && onClick(movie)}
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
                            <span className="hidden md:inline text-[10px] opacity-75 ml-0.5">
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
                        <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                    </div>
                )}

                {/* Wishlist indicator - always visible when in wishlist */}
                {isWishlist && !isWatched && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white w-5 h-5 rounded-full shadow-2xl flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                        </svg>
                        <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                    </div>
                )}

            </div>

            <div className="px-2 pb-2 flex w-full flex-col h-full">
                <div className="flex text-xs text-gray-700 font-medium justify-between mb-1">
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
                    className="flex w-full text-[.82rem] sm:text-sm font-semibold !line-clamp-2 tracking-wider text-gray-900 hover:text-blue-600 transition-colors flex-grow max-h-[2.5rem] items-start" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {movie.Title}
                </a>
                
                {/* Show watch date for watched movies */}
                {movie.watchedDate && cardType === 'watched' && (
                    <div className="text-xs text-gray-500 mt-auto pt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                         <span>
                             <span className="hidden md:inline"> </span><span className="text-[10px]">
                             {(() => {
                                 const watchDate = new Date(movie.watchedDate);
                                 // Format date as DD/MM/YYYY
                                 const day = watchDate.getDate().toString().padStart(2, '0');
                                 const month = (watchDate.getMonth() + 1).toString().padStart(2, '0');
                                 const year = watchDate.getFullYear();
                                 return `${day}/${month}/${year}`;
                             })()}
                             </span>
                         </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieCard;
