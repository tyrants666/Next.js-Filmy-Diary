'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const MovieInfoSlider = ({ isOpen, onClose, movie, onClickWatched, onClickWatching, onClickWishlist, onRemoveWatched, onUpdateWatchDate, watched, wishlist, cardType = 'search', onActionComplete }) => {
    
    const [isVisible, setIsVisible] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [loadingStates, setLoadingStates] = useState({
        watched: false,
        watching: false,
        wishlist: false,
        remove: false
    });
    // Compute client-only today string once to avoid SSR/client mismatch
    const [todayStr, setTodayStr] = useState('');

    // Generate alternative poster URLs for fallback
    const getPosterAlternatives = () => {
        const alternatives = [];
        
        if (movie?.Poster && movie.Poster !== "N/A") {
            alternatives.push(movie.Poster);
        }
        
        // If primary poster is TMDB, try different TMDB poster sizes
        if (movie?.Poster && movie.Poster.includes('image.tmdb.org')) {
            const posterPath = movie.Poster.split('/').pop();
            const tmdbBaseUrl = 'https://image.tmdb.org/t/p';
            alternatives.push(
                `${tmdbBaseUrl}/w500/${posterPath}`,
                `${tmdbBaseUrl}/w342/${posterPath}`,
                `${tmdbBaseUrl}/w185/${posterPath}`,
                `${tmdbBaseUrl}/original/${posterPath}`
            );
        }
        
        // If we have IMDB ID, try direct IMDB poster URLs as final fallback
        if (movie?.imdbID && movie.imdbID.startsWith('tt')) {
            alternatives.push(
                `https://m.media-amazon.com/images/M/${movie.imdbID}.jpg`,
                `https://ia.media-imdb.com/images/M/${movie.imdbID}._V1_SX300.jpg`,
                `https://ia.media-imdb.com/images/M/${movie.imdbID}._V1_.jpg`
            );
        }
        
        return alternatives;
    };

    const posterAlternatives = movie ? getPosterAlternatives() : [];

    // Helper functions for loading states
    const setLoading = (action, loading) => {
        setLoadingStates(prev => ({ ...prev, [action]: loading }));
    };

    const handleAction = async (action, actionFunction) => {
        setLoading(action, true);
        try {
            await actionFunction();
            if (onActionComplete) onActionComplete();
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setLoading(action, false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
            // Set default date to movie's watched date or today
            if (movie?.watchedDate) {
                const date = new Date(movie.watchedDate);
                setSelectedDate(date.toISOString().split('T')[0]);
            } else {
                // avoid SSR-time usage; compute on client
                const now = new Date();
                setSelectedDate(now.toISOString().split('T')[0]);
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            setShowDatePicker(false);
            return () => clearTimeout(timer);
        }
        
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, movie?.watchedDate]);

    // Set today string on mount (client-only) to use in max attributes
    useEffect(() => {
        const now = new Date();
        setTodayStr(now.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleImageError = () => {
        if (currentPosterIndex < posterAlternatives.length - 1) {
            setCurrentPosterIndex(currentPosterIndex + 1);
            setImageError(false);
        } else {
            setImageError(true);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex transition-all duration-200 ${
            isOpen ? '' : 'pointer-events-none'
        }`}>
            {/* Clickable Backdrop - closes on tap/click */}
            <div 
                className={`absolute inset-0 transition-opacity duration-200 ${
                    isOpen ? 'bg-transparent backdrop-blur-[10px] md:backdrop-blur-none' : 'bg-transparent'
                }`}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />
            
            {/* Slider Content */}
            <div className={`fixed bottom-0 md:top-0 right-0 h-[90vh] backdrop-blur-[45px] md:h-full w-full md:w-[500px] lg:w-[370px] shadow-xl shadow-black/60 transform transition-transform duration-500 overflow-hidden rounded-t-3xl md:rounded-none ${
                isOpen ? 'translate-y-0 md:translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'
            }`}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col h-full">
                    {/* TMDB Backdrop - 50% height */}
                    <div className="w-full relative h-1/2">
                        <div className="w-full h-full relative">
                            {posterAlternatives.length > 0 && !imageError ? (
                                <Image
                                    src={posterAlternatives[currentPosterIndex]}
                                    alt={movie?.Title || 'Movie Poster'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 40vw"
                                    onError={handleImageError}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-lg flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zM5 7v11h14V7H5zm3 3a1 1 0 112 0v5a1 1 0 11-2 0V10zm4 0a1 1 0 112 0v5a1 1 0 11-2 0V10z"/>
                                            </svg>
                                        </div>
                                        <p className="text-gray-600 font-medium">No Image Available</p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                        </div>
                    </div>

                    {/* Movie Details - 50% height */}
                    <div className="flex-1 backdrop-blur-[45px] h-1/2 p-6 overflow-y-auto">
                        {/* Title and Year */}
                        <div className="mb-4">
                            {/* Clickable Title */}
                            {movie?.imdbID && movie.imdbID !== "N/A" && movie.imdbID.startsWith('tt') ? (
                                <a
                                    href={`https://www.imdb.com/title/${movie.imdbID}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 hover:text-gray-600 transition-colors inline-block cursor-pointer"
                                >
                                    {movie?.Title}
                                </a>
                            ) : movie?.tmdbID && movie.tmdbID !== "N/A" ? (
                                <a
                                    href={movie.Type === 'series' 
                                        ? `https://www.themoviedb.org/tv/${movie.tmdbID}`
                                        : `https://www.themoviedb.org/movie/${movie.tmdbID}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 hover:text-gray-600 transition-colors inline-block cursor-pointer"
                                >
                                    {movie?.Title}
                                </a>
                            ) : (
                                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                    {movie?.Title}
                                </h2>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                <span className="bg-gray-100 px-2 py-1 rounded-full font-medium text-xs">
                                    {movie?.Year?.replace(/\D/g, '')}
                                </span>
                                <span className="bg-gray-100 px-2 py-1 rounded-full font-medium capitalize text-xs">
                                    {movie?.Type}
                                </span>
                                {/* Clickable Rating */}
                                {movie?.imdbRating && movie.imdbRating !== "N/A" && (
                                    <>
                                        {movie.ratingSource === "IMDB" && movie?.imdbID && movie.imdbID !== "N/A" && movie.imdbID.startsWith('tt') ? (
                                            <a
                                                href={`https://www.imdb.com/title/${movie.imdbID}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-white font-medium hover:opacity-80 transition-opacity cursor-pointer bg-yellow-500 text-xs`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                                <span>{movie.imdbRating}</span>
                                                <span className="text-xs opacity-75">IMDb</span>
                                            </a>
                                        ) : movie.ratingSource === "TMDB" && movie?.tmdbID && movie.tmdbID !== "N/A" ? (
                                            <a
                                                href={movie.Type === 'series' 
                                                    ? `https://www.themoviedb.org/tv/${movie.tmdbID}`
                                                    : `https://www.themoviedb.org/movie/${movie.tmdbID}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-white font-medium hover:opacity-80 transition-opacity cursor-pointer bg-blue-500 text-xs`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                                <span>{movie.imdbRating}</span>
                                                <span className="text-xs opacity-75">TMDB</span>
                                            </a>
                                        ) : (
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-white font-medium text-xs ${
                                                movie.ratingSource === "IMDB" 
                                                    ? "bg-yellow-500" 
                                                    : movie.ratingSource === "TMDB" 
                                                        ? "bg-blue-500" 
                                                        : "bg-gray-500"
                                            }`}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                                <span>{movie.imdbRating}</span>
                                                {movie.ratingSource && movie.ratingSource !== "N/A" && (
                                                    <span className="text-xs opacity-75">
                                                        {movie.ratingSource === "IMDB" ? "IMDb" : movie.ratingSource}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Movie Description */}
                        {movie?.Plot && movie.Plot !== "N/A" && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Plot</h3>
                                <p className="text-sm text-gray-900 leading-relaxed line-clamp-4">
                                    {movie.Plot}
                                </p>
                            </div>
                        )}

                        {/* Watch Date for watched movies */}
                        {movie?.watchedDate && watched && (
                            <div className="mb-3 text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span>Watched on:</span>
                                <span>
                                    {(() => {
                                        const watchDate = new Date(movie.watchedDate);
                                        const day = watchDate.getDate().toString().padStart(2, '0');
                                        const month = (watchDate.getMonth() + 1).toString().padStart(2, '0');
                                        const year = watchDate.getFullYear();
                                        return `${day}/${month}/${year}`;
                                    })()}
                                </span>
                            </div>
                        )}

                        {/* External Links */}
                        <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                                {movie?.imdbID && movie.imdbID !== "N/A" && movie.imdbID.startsWith('tt') && (
                                    <a
                                        href={`https://www.imdb.com/title/${movie.imdbID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs transition-colors font-medium"
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM12 6.5a1 1 0 00-1 1v9a1 1 0 002 0v-9a1 1 0 00-1-1z"/>
                                        </svg>
                                        IMDb
                                    </a>
                                )}
                                {movie?.tmdbID && movie.tmdbID !== "N/A" && (
                                    <a
                                        href={movie.Type === 'series' 
                                            ? `https://www.themoviedb.org/tv/${movie.tmdbID}`
                                            : `https://www.themoviedb.org/movie/${movie.tmdbID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors font-medium"
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        TMDB
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons - Show all buttons for search results */}
                        <div className="border-t pt-6">
                            <div className="space-y-3">
                                {/* Edit Date Button - Only show if movie is in watched list */}
                                {watched && (
                                    <>
                                        <button
                                            onClick={() => setShowDatePicker(!showDatePicker)}
                                            disabled={loadingStates.watched}
                                            className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                                loadingStates.watched ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            {showDatePicker ? 'Cancel' : 'Edit Date'}
                                        </button>
                                        
                                        {/* Date Picker */}
                                        {showDatePicker && (
                                            <div className="p-4 bg-black/10 backdrop-blur-md rounded-lg space-y-3 border border-black/10">
                                                <label className="block text-sm font-medium text-gray-900">
                                                    Select Watched Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={(e) => setSelectedDate(e.target.value)}
                                                        max={todayStr || undefined}
                                                        className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    />
                                                    {/* Display format hint */}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Selected: {selectedDate ? (() => {
                                                            const date = new Date(selectedDate);
                                                            const day = date.getDate().toString().padStart(2, '0');
                                                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                            const year = date.getFullYear();
                                                            return `${day}/${month}/${year}`;
                                                        })() : 'No date selected'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        setLoadingStates(prev => ({ ...prev, watched: true }));
                                                        try {
                                                            if (onUpdateWatchDate) {
                                                                await onUpdateWatchDate(new Date(selectedDate).toISOString());
                                                            } else if (onClickWatched) {
                                                                await onClickWatched(new Date(selectedDate).toISOString());
                                                            }
                                                            setShowDatePicker(false);
                                                            if (onActionComplete) onActionComplete();
                                                        } catch (error) {
                                                            console.error('Failed to update date:', error);
                                                        } finally {
                                                            setLoadingStates(prev => ({ ...prev, watched: false }));
                                                        }
                                                    }}
                                                    disabled={loadingStates.watched}
                                                    className="w-full px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50"
                                                >
                                                    {loadingStates.watched ? 'Updating...' : 'Update Date'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Watched Date Button - Show for search results (non-watched cards) */}
                                {!watched && onClickWatched && cardType === 'search' && (
                                    <>
                                        <button
                                            onClick={() => setShowDatePicker(!showDatePicker)}
                                            disabled={loadingStates.watched}
                                            className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                                loadingStates.watched ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            {showDatePicker ? 'Cancel' : 'Watched'}
                                        </button>
                                        
                                        {/* Date Picker for Search Results */}
                                        {showDatePicker && (
                                            <div className="p-4 bg-black/10 backdrop-blur-md rounded-lg space-y-3 border border-black/10">
                                                <label className="block text-sm font-medium text-gray-900">
                                                    Select Watched Date
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={(e) => setSelectedDate(e.target.value)}
                                                        max={todayStr || undefined}
                                                        className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    />
                                                    {/* Display format hint */}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Selected: {selectedDate ? (() => {
                                                            const date = new Date(selectedDate);
                                                            const day = date.getDate().toString().padStart(2, '0');
                                                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                            const year = date.getFullYear();
                                                            return `${day}/${month}/${year}`;
                                                        })() : 'No date selected'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        setLoadingStates(prev => ({ ...prev, watched: true }));
                                                        try {
                                                            if (onClickWatched) {
                                                                await onClickWatched(new Date(selectedDate).toISOString());
                                                            }
                                                            setShowDatePicker(false);
                                                            if (onActionComplete) onActionComplete();
                                                        } catch (error) {
                                                            console.error('Failed to add to watched:', error);
                                                        } finally {
                                                            setLoadingStates(prev => ({ ...prev, watched: false }));
                                                        }
                                                    }}
                                                    disabled={loadingStates.watched}
                                                    className="w-full px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50"
                                                >
                                                    {loadingStates.watched ? 'Adding...' : 'Add to Watched'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Regular Watched Button - Show for non-search results */}
                                {!watched && onClickWatched && cardType !== 'search' && (
                                    <button
                                        onClick={() => handleAction('watched', () => onClickWatched && onClickWatched(null))}
                                        disabled={loadingStates.watched}
                                        className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                            loadingStates.watched ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {loadingStates.watched ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <polyline points="20,6 9,17 4,12"></polyline>
                                            </svg>
                                        )}
                                        {loadingStates.watched ? 'Marking...' : 'Watched'}
                                    </button>
                                )}

                                {/* Watching Button - Show for all cards */}
                                {onClickWatching && (
                                    <button
                                        onClick={() => handleAction('watching', () => onClickWatching && onClickWatching())}
                                        disabled={loadingStates.watching}
                                        className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                            loadingStates.watching ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {loadingStates.watching ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <polygon points="5,3 19,12 5,21"></polygon>
                                            </svg>
                                        )}
                                        {loadingStates.watching ? 'Updating...' : 'Watching'}
                                    </button>
                                )}

                                {/* Watchlist Button - Show for all cards */}
                                {onClickWishlist && (
                                    <button
                                        onClick={() => handleAction('wishlist', () => onClickWishlist && onClickWishlist())}
                                        disabled={loadingStates.wishlist}
                                        className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                            loadingStates.wishlist ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {loadingStates.wishlist ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                            </svg>
                                        )}
                                        {loadingStates.wishlist ? 'Updating...' : 'Watchlist'}
                                    </button>
                                )}

                                {/* Remove Button - Only show for movies already in a list */}
                                {(watched || cardType === 'watching' || cardType === 'wishlist') && (
                                    <button
                                        onClick={() => handleAction('remove', async () => {
                                            if (watched && onRemoveWatched) {
                                                await onRemoveWatched();
                                            } else if (cardType === 'watching' && onClickWatching) {
                                                await onClickWatching();
                                            } else if (cardType === 'wishlist' && onClickWishlist) {
                                                await onClickWishlist();
                                            }
                                        })}
                                        disabled={loadingStates.remove}
                                        className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-black/10 backdrop-blur-md hover:bg-black/20 border border-black/10 text-black rounded-lg transition-all duration-300 font-medium ${
                                            loadingStates.remove ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {loadingStates.remove ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        )}
                                        {loadingStates.remove ? 'Removing...' : 'Remove'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieInfoSlider;
