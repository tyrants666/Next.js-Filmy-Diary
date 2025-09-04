import React, { useState, useEffect } from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave, onClickWatched, onClickWatching, onRemoveWatched, watched, cardType = 'search' }) => {
    const [isWatched, setIsWatched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setIsWatched(watched);
    }, [watched]);

    useEffect(() => {
        setImageError(false); // Reset image error when movie changes
    }, [movie.Poster]);

    const handleWatchedClick = async () => {
        setIsLoading(true);
        try {
            await onClickWatched();
            setIsWatched(true);
        } catch (error) {
            console.error('Failed to mark as watched:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveWatched = async () => {
        setIsLoading(true);
        try {
            await onRemoveWatched();
            setIsWatched(false);
        } catch (error) {
            console.error('Failed to remove watched status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="gap-2 bg-gray-50 border border-gray-200 shadow-lg hover:shadow-xl flex flex-col rounded-xl relative group min-w-0 shrink-0 grow-0
        basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none transition-all duration-200"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        >
            <a
                // href="#"
                className="relative flex align-center !aspect-[1.37/2]"
            >
                { movie.Poster !== 'N/A' && !imageError ? (
                    <span className="relative h-full w-full flex items-center">
                        <Image
                            src={movie.Poster}
                            alt={movie.Title}
                            fill
                            className="object-cover !select-none rounded-xl"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={true}
                            onError={handleImageError}
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

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="flex flex-col gap-2 px-3">
                        {cardType === 'search' && !isWatched && (
                            <>
                                <button
                                    onClick={handleWatchedClick}
                                    disabled={isLoading}
                                    className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Loading
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20,6 9,17 4,12"></polyline>
                                            </svg>
                                            Watched
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClickWatching}
                                    className="bg-indigo-700/90 hover:bg-indigo-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="5,3 19,12 5,21"></polygon>
                                    </svg>
                                    Watching
                                </button>
                            </>
                        )}
                        
                        {cardType === 'search' && isWatched && (
                            <button
                                onClick={handleRemoveWatched}
                                disabled={isLoading}
                                className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                        </svg>
                                        Removing
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                                    disabled={isLoading}
                                    className="bg-green-700/90 hover:bg-green-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Moving...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20,6 9,17 4,12"></polyline>
                                            </svg>
                                            Watched
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClickWatching}
                                    disabled={isLoading}
                                    className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Remove
                                </button>
                            </>
                        )}

                        {cardType === 'watched' && (
                            <button
                                onClick={handleRemoveWatched}
                                disabled={isLoading}
                                className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                        </svg>
                                        Removing
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Remove
                                    </>
                                )}
                            </button>
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
                                ? `https://www.themoviedb.org/movie/${movie.tmdbID}`
                                : `https://www.google.com/search?q=${encodeURIComponent(movie.Title + " movie")}`
                    } 
                    className="flex w-full text-[.82rem] sm:text-sm font-semibold !line-clamp-2 tracking-wider text-gray-900 hover:text-blue-600 transition-colors" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {movie.Title}
                </a>
            </div>
        </div>
    );
};

export default MovieCard;
