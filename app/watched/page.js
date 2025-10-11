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
import { IoArrowBack, IoCheckmarkCircle, IoSearch, IoBookmark, IoPlayCircle } from 'react-icons/io5';
import Header from '../components/Header';
import MovieSearch from '../components/MovieSearch';

export default function WatchedPage() {
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
    const savedMovies = getCachedData('watched');
    const loadingSavedMovies = isCacheLoading('watched');

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
    const fetchWatchedMovies = useCallback(async (forceRefresh = false, showLoading = true) => {
        if (!user) return;
        
        // If data is fresh and not forcing refresh, skip API call
        if (!forceRefresh && isDataFresh('watched')) {
            console.log('📦 Using cached watched data - no API call needed');
            return;
        }
        
        // If data is stale but acceptable, show cached data immediately and fetch in background
        if (!forceRefresh && !isDataFresh('watched') && !isDataStale('watched') && savedMovies.length > 0) {
            console.log('🔄 Data is stale but acceptable - showing cached data while fetching fresh data');
        } else if (showLoading) {
            updateCache('watched', null, true);
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
                .eq('status', 'watched')
                .order('watched_date', { ascending: false });
                
            if (userMoviesError) throw userMoviesError;
            
            // Update global cache with poster validation
            await updateCache('watched', userMoviesData || [], false);
            
            console.log(`✅ Watched data fetched successfully (${userMoviesData?.length || 0} movies)`);
        } catch (error) {
            console.error('Error fetching watched movies:', error);
            showError('Failed to load your watched movies. Please try again.');
            updateCache('watched', null, false);
        }
    }, [user, showError, isDataFresh, isDataStale, savedMovies.length, updateCache]);

    // Remove movie from watched list
    const removeWatchedStatus = async (movieId, movieData) => {
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

            showSuccess(`"${movieData.Title}" removed from your watched list!`);
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    // Move movie from watched to watching
    const moveWatchedToWatching = async (movieId, movieData) => {
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

            await fetchWatchedMovies(true, false);
            clearCache('watched'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to currently watching!`);
            
        } catch (error) {
            console.error('Error moving movie to watching:', error);
            showError('Failed to move movie to watching. Please try again.');
        }
    };

    // Move movie from watched to wishlist
    const moveWatchedToWishlist = async (movieId, movieData) => {
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

            await fetchWatchedMovies(true, false);
            clearCache('watched'); // Clear cache to force refresh
            showSuccess(`"${movieData.Title}" moved to watchlist!`);
            
        } catch (error) {
            console.error('Error moving movie to wishlist:', error);
            showError('Failed to move movie to wishlist. Please try again.');
        }
    };

    // Update watch date for existing watched movie
    const updateWatchDate = async (movieId, newWatchedDate) => {
        try {
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const watchedDateToUse = newWatchedDate || new Date().toISOString();
            
            console.log('Updating watch date:', {
                movieId,
                watchedDateToUse,
                userId: user.id
            });

            const { data: updateData, error: updateError } = await supabase
                .from('user_movies')
                .update({ watched_date: watchedDateToUse })
                .eq('user_id', user.id)
                .eq('movie_id', movieId)
                .eq('status', 'watched')
                .select();

            console.log('Update result:', { updateData, updateError });

            if (updateError) {
                console.error('Update error:', updateError);
                await fetchWatchedMovies(true, false);
                clearCache('watched');
                throw updateError;
            }

            if (!updateData || updateData.length === 0) {
                console.error('No data returned from update');
                showError('Failed to update watch date. Please try again.');
                await fetchWatchedMovies(true, false);
                clearCache('watched');
                return;
            }

            // Success - refresh the data
            await fetchWatchedMovies(true, false);
            clearCache('watched');
            showSuccess('Watch date updated successfully!');
            
        } catch (error) {
            console.error('Error updating watch date:', error);
            showError('Failed to update watch date. Please try again.');
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
            if (savedMovies.length === 0 || isDataStale('watched')) {
                fetchWatchedMovies();
            }
        }
    }, [user, loading, savedMovies.length, isDataStale, fetchWatchedMovies]);

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
                    currentPage="watched" 
                    showSearch={false}
                />

                {/* Search Component - Show on both desktop and mobile */}
                <MovieSearch 
                    savedMovies={savedMovies} 
                    fetchSavedMovies={() => {
                        clearCache('watched');
                        fetchWatchedMovies(true, false);
                    }}
                    setSavedMovies={() => {}} // Not needed with global cache
                    onSearchStateChange={handleSearchStateChange}
                    user={user}
                    onMovieClick={handleMovieClick}
                />

                {/* Page Header */}
                <div className="mt-8 mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <IoCheckmarkCircle className="w-7 h-7 text-green-600" />
                        Watched Movies
                    </h1>
                    <p className="text-gray-600 mt-2">Movies and shows you&apos;ve completed</p>
                </div>

                {/* Content */}
                {loadingSavedMovies ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading your watched movies...</p>
                    </div>
                ) : savedMovies.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                        {savedMovies.map(item => (
                            <MovieCard
                                key={item.id}
                                movie={transformSavedMovieToCardFormat(item)}
                                onHover={() => null}
                                onLeave={() => null}
                                onClickWatched={() => null}
                                onClickWatching={() => moveWatchedToWatching(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onClickWishlist={() => moveWatchedToWishlist(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onRemoveWatched={() => removeWatchedStatus(item.movies.id, transformSavedMovieToCardFormat(item))}
                                onUpdateWatchDate={(newWatchedDate) => updateWatchDate(item.movies.id, newWatchedDate)}
                                watched={true}
                                cardType="watched"
                                onClick={() => handleMovieClick(transformSavedMovieToCardFormat(item))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-6">
                            <IoCheckmarkCircle className="w-20 h-20 text-gray-300 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            No watched movies yet
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                            Start watching movies and mark them as watched to build your viewing history.
                        </p>
                        <Link 
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
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
                            // If movie is in watched list, update the date
                            await updateWatchDate(movieItem.movies.id, watchedDate);
                        } else {
                            // If it's a search result, add to watched
                            const session = await validateSession();
                            if (!session) {
                                showError('Your session has expired. Please log in again.');
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
                                    movieData: selectedMovie,
                                    status: 'watched',
                                    watchedDate: watchedDate || new Date().toISOString()
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`Failed to add to watched: ${response.status}`);
                            }

                            await fetchWatchedMovies(true, false);
                            clearCache('watched');
                            showSuccess(`"${selectedMovie.Title}" added to watched list!`);
                            setIsSliderOpen(false);
                        }
                    }
                }}
                onClickWatching={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWatchedToWatching(movieItem.movies.id, selectedMovie);
                            setIsSliderOpen(false);
                        }
                    }
                }}
                onClickWishlist={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await moveWatchedToWishlist(movieItem.movies.id, selectedMovie);
                            setIsSliderOpen(false);
                        }
                    }
                }}
                onRemoveWatched={async () => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await removeWatchedStatus(movieItem.movies.id, selectedMovie);
                            setIsSliderOpen(false);
                        }
                    }
                }}
                onUpdateWatchDate={async (newWatchedDate) => {
                    if (selectedMovie) {
                        const movieItem = savedMovies.find(item => 
                            transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                        );
                        if (movieItem) {
                            await updateWatchDate(movieItem.movies.id, newWatchedDate);
                        }
                    }
                }}
                watched={selectedMovie ? savedMovies.some(item => 
                    transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                ) : false}
                wishlist={false}
                cardType={selectedMovie && savedMovies.some(item => 
                    transformSavedMovieToCardFormat(item).Title === selectedMovie.Title
                ) ? "watched" : "search"}
            />
        </div>
    );
}
