'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMovieCache } from '../context/MovieCacheContext';
import { supabase } from '../lib/supabaseClient';
import MovieCard from '../components/MovieCard';
import MovieInfoSlider from '../components/MovieInfoSlider';
import Link from 'next/link';
import Image from 'next/image';
import { IoArrowBack, IoBookmark, IoSearch, IoPlayCircle, IoCheckmarkCircle } from 'react-icons/io5';
import Header from '../components/Header';
import MovieSearch from '../components/MovieSearch';

export default function WatchlistPage() {
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const { user, loading, validateSession } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();
    
    // Use global cache
    const { 
        isDataFresh, 
        isDataStale, 
        updateCache, 
        getCachedData, 
        isCacheLoading,
        clearCache 
    } = useMovieCache();
    
    // Get cached data
    const savedMovies = getCachedData('watchlist');
    const loadingSavedMovies = isCacheLoading('watchlist');

    // Transform saved movie data to match MovieCard expected format
    const transformSavedMovieToCardFormat = (savedMovie) => {
        const movieId = savedMovie.movies.movie_id;
        
        return {
            imdbID: movieId && movieId.startsWith('tt') ? movieId : "N/A",
            tmdbID: movieId && !movieId.startsWith('tt') ? movieId : "N/A",
            Title: savedMovie.movies.title,
            Poster: savedMovie.movies.poster,
            Year: savedMovie.movies.year,
            Type: savedMovie.movies.type || "movie",
            imdbRating: savedMovie.movies.rating || "N/A",
            ratingSource: savedMovie.movies.rating_source || "N/A",
            Plot: savedMovie.movies.description || "N/A",
            watchedDate: savedMovie.watched_date || null
        };
    };

    // Smart fetch with global caching
    const fetchWatchlistMovies = useCallback(async (forceRefresh = false, showLoading = true) => {
        if (!user) return;
        
        // If data is fresh and not forcing refresh, skip API call
        if (!forceRefresh && isDataFresh('watchlist')) {
            console.log('📦 Using cached watchlist data - no API call needed');
            return;
        }
        
        // If data is stale but acceptable, show cached data immediately and fetch in background
        if (!forceRefresh && !isDataFresh('watchlist') && !isDataStale('watchlist') && savedMovies.length > 0) {
            console.log('🔄 Data is stale but acceptable - showing cached data while fetching fresh data');
        } else if (showLoading) {
            updateCache('watchlist', null, true);
        }
        
        try {
            const { data: userMoviesData, error: userMoviesError } = await supabase
                .from('user_movies')
                .select(`
                    id,
                    status,
                    watched_date,
                    updated_at,
                    created_at,
                    movies (
                        id,
                        movie_id,
                        title,
                        poster,
                        year,
                        rating,
                        rating_source,
                        type,
                        description
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'wishlist')
                .order('updated_at', { ascending: false });
                
            if (userMoviesError) throw userMoviesError;
            
            // Update global cache
            updateCache('watchlist', userMoviesData || [], false);
            
            console.log(`✅ Watchlist data fetched successfully (${userMoviesData?.length || 0} movies)`);
        } catch (error) {
            console.error('Error fetching watchlist movies:', error);
            showError('Failed to load your watchlist. Please try again.');
            updateCache('watchlist', null, false);
        }
    }, [user, showError, isDataFresh, isDataStale, savedMovies.length, updateCache]);

    // Move movie from wishlist to watched
    const moveWishlistToWatched = async (movieId, movieData, watchedDate = null) => {
        try {
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const watchedDateToUse = watchedDate || new Date().toISOString();
            
            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.email,
                    movieData: movieData,
                    status: 'watched',
                    watchedDate: watchedDateToUse
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to move to watched: ${response.status}`);
            }

            await fetchWatchlistMovies(true, false);
            clearCache('watchlist'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to watched list!`);
            
        } catch (error) {
            console.error('Error moving movie from wishlist to watched:', error);
            showError('Failed to move movie to watched. Please try again.');
        }
    };

    // Move movie from wishlist to watching
    const moveWishlistToWatching = async (movieId, movieData) => {
        try {
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: session.user.id,
                    userEmail: session.user.email,
                    movieData: movieData,
                    status: 'currently_watching'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to move to watching: ${response.status}`);
            }

            await fetchWatchlistMovies(true, false);
            clearCache('watchlist'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to currently watching!`);
            
        } catch (error) {
            console.error('Error moving movie to watching:', error);
            showError('Failed to move movie to watching. Please try again.');
        }
    };

    // Remove from wishlist
    const removeFromWishlist = async (movieId, movieData) => {
        try {
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const response = await fetch(`/api/movies?userId=${user.id}&movieId=${movieId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to remove movie: ${response.status}`);
            }

            setSavedMovies(prevMovies => 
                prevMovies.filter(movie => movie.movies.id !== movieId)
            );

            showSuccess(`"${movieData.Title}" removed from your watchlist!`);
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsSliderOpen(true);
    };

    const handleSearchStateChange = (isActive) => {
        setIsSearchActive(isActive);
    };


    useEffect(() => {
        if (user && !loading) {
            // Only fetch if we don't have cached data or if data is stale
            if (savedMovies.length === 0 || isDataStale('watchlist')) {
                fetchWatchlistMovies();
            }
        }
    }, [user, loading, savedMovies.length, isDataStale, fetchWatchlistMovies]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-4 pb-8">
                <Header 
                    currentPage="watchlist" 
                    showSearch={false}
                />

                {/* Search Component - Show on both desktop and mobile */}
                <MovieSearch 
                    savedMovies={savedMovies} 
                    fetchSavedMovies={() => {
                        clearCache('watchlist');
                        fetchWatchlistMovies(true, false);
                    }}
                    setSavedMovies={() => {}} // Not needed with global cache
                    onSearchStateChange={handleSearchStateChange}
                    user={user}
                    onMovieClick={handleMovieClick}
                />

                {/* Page Header */}
                <div className="mt-8 mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <IoBookmark className="w-7 h-7 text-purple-600" />
                        My Watchlist
                    </h1>
                    <p className="text-gray-600 mt-2">Movies and shows you want to watch</p>
                </div>

                {/* Content */}
                {loadingSavedMovies ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading your watchlist...</p>
                    </div>
                ) : savedMovies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                        {savedMovies.map(item => (
                            <MovieCard
                                key={item.id}
                                movie={transformSavedMovieToCardFormat(item)}
                                onHover={() => null}
                                onLeave={() => null}
                                onClickWatched={(watchedDate) => moveWishlistToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                onClickWatching={() => moveWishlistToWatching(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onClickWishlist={() => removeFromWishlist(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onRemoveWatched={() => null}
                                watched={false}
                                wishlist={true}
                                cardType="wishlist"
                                onClick={() => handleMovieClick(transformSavedMovieToCardFormat(item))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-6">
                            <IoBookmark className="w-20 h-20 text-gray-300 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            Your watchlist is empty
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            Start adding movies and TV shows you want to watch to build your personal watchlist.
                        </p>
                        <Link 
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <IoSearch className="w-5 h-5" />
                            Search Movies
                        </Link>
                    </div>
                )}
            </div>

            {/* Movie Info Slider */}
            <MovieInfoSlider
                isOpen={isSliderOpen}
                onClose={() => setIsSliderOpen(false)}
                movie={selectedMovie}
                onClickWatched={async (watchedDate) => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWishlistToWatched(movieItem.movies.id, selectedMovie, watchedDate);
                        }
                    }
                }}
                onClickWatching={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWishlistToWatching(movieItem.movies.id, selectedMovie);
                        }
                    }
                }}
                onClickWishlist={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await removeFromWishlist(movieItem.movies.id, selectedMovie);
                        }
                    }
                }}
                watched={false}
                wishlist={true}
                cardType="wishlist"
            />
        </div>
    );
}
