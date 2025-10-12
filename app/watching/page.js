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
import { IoArrowBack, IoPlayCircle, IoSearch, IoBookmark, IoCheckmarkCircle } from 'react-icons/io5';
import Header from '../components/Header';
import MovieSearch from '../components/MovieSearch';

export default function WatchingPage() {
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
    const savedMovies = getCachedData('watching');
    const loadingSavedMovies = isCacheLoading('watching');

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
    const fetchWatchingMovies = useCallback(async (forceRefresh = false, showLoading = true) => {
        if (!user) return;
        
        // If data is fresh and not forcing refresh, skip API call
        if (!forceRefresh && isDataFresh('watching')) {
            console.log('📦 Using cached watching data - no API call needed');
            return;
        }
        
        // If data is stale but acceptable, show cached data immediately and fetch in background
        if (!forceRefresh && !isDataFresh('watching') && !isDataStale('watching') && savedMovies.length > 0) {
            console.log('🔄 Data is stale but acceptable - showing cached data while fetching fresh data');
        } else if (showLoading) {
            updateCache('watching', null, true);
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
                    movies!user_movies_movie_id_fkey (
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
                .eq('status', 'currently_watching')
                .order('updated_at', { ascending: false });
                
            if (userMoviesError) throw userMoviesError;
            
            // Update global cache with poster validation
            await updateCache('watching', userMoviesData || [], false);
            
            console.log(`✅ Watching data fetched successfully (${userMoviesData?.length || 0} movies)`);
        } catch (error) {
            console.error('Error fetching watching movies:', error);
            showError('Failed to load your currently watching list. Please try again.');
            updateCache('watching', null, false);
        }
    }, [user, showError, isDataFresh, isDataStale, savedMovies.length, updateCache]);

    // Move movie from watching to watched
    const moveWatchingToWatched = async (movieId, movieData, watchedDate = null) => {
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
                    userId: session.user.id,
                    userEmail: session.user.email,
                    movieData: movieData,
                    status: 'watched',
                    watchedDate: watchedDateToUse
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to move to watched: ${response.status}`);
            }

            await fetchWatchingMovies(true, false);
            clearCache('watching'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to watched list!`);
            
        } catch (error) {
            console.error('Error moving movie to watched:', error);
            showError('Failed to move movie to watched. Please try again.');
        }
    };

    // Move movie from watching to wishlist
    const moveWatchingToWishlist = async (movieId, movieData) => {
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
                    status: 'wishlist'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to move to wishlist: ${response.status}`);
            }

            await fetchWatchingMovies(true, false);
            clearCache('watching'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to watchlist!`);
            
        } catch (error) {
            console.error('Error moving movie to wishlist:', error);
            showError('Failed to move movie to wishlist. Please try again.');
        }
    };

    // Remove from watching
    const removeWatchingStatus = async (movieId, movieData) => {
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

            showSuccess(`"${movieData.Title}" removed from currently watching!`);
            
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
            if (savedMovies.length === 0 || isDataStale('watching')) {
                fetchWatchingMovies();
            }
        }
    }, [user, loading, savedMovies.length, isDataStale, fetchWatchingMovies]);

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
                    currentPage="watching" 
                    showSearch={false}
                />

                {/* Search Component - Show on both desktop and mobile */}
                <MovieSearch 
                    savedMovies={savedMovies} 
                    fetchSavedMovies={() => {
                        clearCache('watching');
                        fetchWatchingMovies(true, false);
                    }}
                    setSavedMovies={() => {}} // Not needed with global cache
                    onSearchStateChange={handleSearchStateChange}
                    user={user}
                    onMovieClick={handleMovieClick}
                />

                {/* Page Header */}
                <div className="mt-8 mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <IoPlayCircle className="w-7 h-7 text-red-500" />
                        Currently Watching
                    </h1>
                    <p className="text-gray-600 mt-2">Movies and shows you&apos;re currently watching</p>
                </div>

                {/* Content */}
                {loadingSavedMovies ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading your currently watching list...</p>
                    </div>
                ) : savedMovies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                        {savedMovies.map(item => (
                            <MovieCard
                                key={item.id}
                                movie={transformSavedMovieToCardFormat(item)}
                                onHover={() => null}
                                onLeave={() => null}
                                onClickWatched={(watchedDate) => moveWatchingToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                onClickWatching={() => removeWatchingStatus(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onClickWishlist={() => moveWatchingToWishlist(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onRemoveWatched={() => null}
                                watched={false}
                                wishlist={false}
                                cardType="watching"
                                onClick={() => handleMovieClick(transformSavedMovieToCardFormat(item))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-6">
                            <IoPlayCircle className="w-20 h-20 text-gray-300 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            Nothing currently watching
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            Add movies and TV shows you&apos;re currently watching to keep track of your progress.
                        </p>
                        <Link 
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
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
                onActionComplete={() => {
                    // Refresh the data after any action
                    fetchWatchingMovies(true, false);
                }}
                onClickWatched={async (watchedDate) => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWatchingToWatched(movieItem.movies.id, selectedMovie, watchedDate);
                        }
                    }
                }}
                onClickWatching={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await removeWatchingStatus(movieItem.movies.id, selectedMovie);
                        }
                    }
                }}
                onClickWishlist={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWatchingToWishlist(movieItem.movies.id, selectedMovie);
                        }
                    }
                }}
                watched={false}
                wishlist={false}
                cardType="watching"
            />
        </div>
    );
}
