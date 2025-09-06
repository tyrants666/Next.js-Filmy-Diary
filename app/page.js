'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

import MovieSearch from './components/MovieSearch';
import MovieCard from './components/MovieCard';
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import { supabase } from './lib/supabaseClient';

export default function Home() {

    const [savedMovies, setSavedMovies] = useState([]);
    const [loadingSavedMovies, setLoadingSavedMovies] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [userManuallyClosedSearch, setUserManuallyClosedSearch] = useState(false);
    const { user, loading, signOut, validateSession } = useAuth()
    const { showSuccess, showError } = useToast()
    const router = useRouter()

    // Cache configuration - like big companies do
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const STALE_WHILE_REVALIDATE_DURATION = 10 * 60 * 1000; // 10 minutes stale-while-revalidate

    // Check if data is fresh (within cache duration)
    const isDataFresh = () => {
        if (!lastFetchTime) return false;
        return Date.now() - lastFetchTime < CACHE_DURATION;
    };

    // Check if data is stale but acceptable (stale-while-revalidate)
    const isDataStale = () => {
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > STALE_WHILE_REVALIDATE_DURATION;
    };

    // Smart fetch with caching - like Netflix, YouTube, etc.
    const fetchSavedMovies = async (forceRefresh = false, showLoading = true) => {
        if (!user) return;
        
        // If data is fresh and not forcing refresh, skip API call
        if (!forceRefresh && isDataFresh()) {
            console.log('📦 Using cached data - no API call needed');
            return;
        }

        // If data is stale but acceptable, fetch in background without loading state
        const shouldShowLoading = showLoading && (isInitialLoad || isDataStale());
        
        if (shouldShowLoading) {
            setLoadingSavedMovies(true);
        }
        try {
            // Fetch regular saved movies (watched, etc.)
            const { data: userMoviesData, error: userMoviesError } = await supabase
                .from('user_movies')
                .select(`
                    id,
                    status,
                    watched_date,
                    movies (
                        id,
                        movie_id,
                        title,
                        poster,
                        year,
                        rating,
                        rating_source
                    )
                `)
                .eq('user_id', user.id);
                
            if (userMoviesError) throw userMoviesError;
            
            // Fetch currently watching movie from the watching table
            const { data: watchingData, error: watchingError } = await supabase
                .from('watching')
                .select(`
                    id,
                    movies (
                        id,
                        movie_id,
                        title,
                        poster,
                        year,
                        rating,
                        rating_source
                    )
                `)
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 or 1 rows
            
            console.log('Watching data fetch result:', { watchingData, watchingError });
            
            // Combine the data - add watching movie if it exists
            let combinedData = userMoviesData || [];
            
            if (watchingData && !watchingError) {
                // Add the watching movie to the combined data
                combinedData.push({
                    id: watchingData.id,
                    status: 'watching',
                    movies: watchingData.movies
                });
                console.log('Added watching movie to combined data:', watchingData);
            } else if (watchingError) {
                console.error('Error fetching watching data:', watchingError);
            }
            
            // Debug: Check for duplicates in fetched data and remove them
            const wishlistMovies = combinedData.filter(item => item.status === 'wishlist');
            const wishlistTitles = wishlistMovies.map(item => item.movies.title);
            const duplicateTitles = wishlistTitles.filter((title, index) => wishlistTitles.indexOf(title) !== index);
            
            if (duplicateTitles.length > 0) {
                console.warn('Duplicate movies found in wishlist:', duplicateTitles);
                console.log('Full wishlist data:', wishlistMovies);
                
                // Remove duplicates by keeping only the first occurrence of each movie_id
                const seenMovieIds = new Set();
                combinedData = combinedData.filter(item => {
                    if (item.status === 'wishlist') {
                        const movieId = item.movies.movie_id;
                        if (seenMovieIds.has(movieId)) {
                            console.log('Removing duplicate:', item.movies.title, movieId);
                            return false; // Remove duplicate
                        }
                        seenMovieIds.add(movieId);
                    }
                    return true; // Keep non-wishlist items and first occurrence of wishlist items
                });
                
                console.log('Cleaned duplicates. New wishlist count:', 
                    combinedData.filter(item => item.status === 'wishlist').length);
            }

            // Update the savedMovies state
            setSavedMovies(combinedData);
            setLastFetchTime(Date.now());
            setIsInitialLoad(false);
            
            if (!shouldShowLoading) {
                console.log('🔄 Background refresh completed');
            }
            
        } catch (error) {
            console.error('Error fetching saved movies:', error);
            showError('Failed to load your saved movies. Please try again.');
        } finally {
            setLoadingSavedMovies(false);
        }
    };

    // Remove movie from watched list
    const removeWatchedStatus = async (movieId) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Removing watched movie from database first, movieId:', movieId);

            // Delete the movie from user_movies first - NO optimistic update
            const { error: deleteError } = await supabase
                .from('user_movies')
                .delete()
                .eq('user_id', user.id)
                .eq('movie_id', movieId)
                .eq('status', 'watched');

            if (deleteError) {
                console.error('Delete error:', deleteError);
                throw deleteError;
            }

            // Update saved_movies count in profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('saved_movies')
                .eq('id', user.id)
                .single();

            if (profile !== null) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        saved_movies: Math.max(0, (profile.saved_movies || 0) - 1)
                    })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Error updating saved_movies count:', updateError);
                }
            }

            // Only update UI after successful database operation
            setSavedMovies(prevMovies => 
                prevMovies.filter(movie => 
                    !(movie.status === 'watched' && movie.movies.id === movieId)
                )
            );

            showSuccess('Movie removed from your watched list!');
            console.log('Successfully removed watched movie');
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    // Remove movie from watching list
    const removeWatchingStatus = async (movieId) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Removing watching movie from database first, movieId:', movieId);

            // Delete the movie from watching table first - NO optimistic update
            const { error: deleteError } = await supabase
                .from('watching')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Delete error:', deleteError);
                throw deleteError;
            }

            // Only update UI after successful database operation
            setSavedMovies(prevMovies => 
                prevMovies.filter(movie => 
                    !(movie.status === 'watching' && movie.movies.id === movieId)
                )
            );

            showSuccess('Movie removed from your watching list!');
            console.log('Successfully removed watching movie');
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    // Move movie from watching to watched
    const moveWatchingToWatched = async (movieId, movieData, watchedDate = null) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const watchedDateToUse = watchedDate || new Date().toISOString();
            
            console.log('Moving watching to watched in database first, movieId:', movieId);

            // Remove from watching table first - NO optimistic update
            const { error: removeWatchingError } = await supabase
                .from('watching')
                .delete()
                .eq('user_id', user.id);

            if (removeWatchingError) {
                console.error('Remove watching error:', removeWatchingError);
                throw removeWatchingError;
            }

            // Add to watched in user_movies table with watched date
            const { error: addWatchedError } = await supabase
                .from('user_movies')
                .upsert({
                    user_id: user.id,
                    user_email: user.email,
                    movie_id: movieId,
                    movie_imdb_id: movieData.imdbID,
                    movie_name: movieData.Title,
                    status: 'watched',
                    watched_date: watchedDateToUse
                }, {
                    onConflict: 'user_id,movie_id'
                });

            if (addWatchedError) {
                console.error('Add watched error:', addWatchedError);
                throw addWatchedError;
            }

            // Update saved_movies count in profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('saved_movies')
                .eq('id', user.id)
                .single();

            if (profile !== null) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        saved_movies: (profile.saved_movies || 0) + 1
                    })
                    .eq('id', user.id);

                if (updateError) {
                    console.error('Error updating saved_movies count:', updateError);
                }
            }

            // Only update UI after all database operations succeed
            // Refresh data from database to get correct structure
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to watched list!`);
            console.log('Successfully moved watching to watched');
            
        } catch (error) {
            console.error('Error moving movie to watched:', error);
            showError('Failed to move movie to watched. Please try again.');
        }
    };

    // Add or remove movie from wishlist
    const toggleWishlistStatus = async (movieData) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            // Check if movie is already in wishlist
            // Compare with both imdbID and tmdbID to handle both cases
            const movieIdToCompare = movieData.imdbID !== "N/A" ? movieData.imdbID : movieData.tmdbID;
            const existingWishlistMovie = savedMovies.find(movie => 
                movie.status === 'wishlist' && movie.movies.movie_id === movieIdToCompare
            );
            
            // Additional check by title to catch edge cases
            const existingByTitle = savedMovies.find(movie => 
                movie.status === 'wishlist' && movie.movies.title.toLowerCase() === movieData.Title.toLowerCase()
            );

            console.log('Toggling wishlist for:', {
                movieData,
                movieIdToCompare,
                existingWishlistMovie: existingWishlistMovie ? 'found' : 'not found',
                existingByTitle: existingByTitle ? 'found' : 'not found',
                savedMoviesCount: savedMovies.filter(m => m.status === 'wishlist').length
            });

            const movieToRemove = existingWishlistMovie || existingByTitle;
            if (movieToRemove) {
                // Remove from wishlist - NO optimistic update, wait for database success
                console.log('Removing from database first, movieId:', movieToRemove.movies.id);
                
                // Delete from database first
                const response = await fetch(`/api/movies?userId=${user.id}&movieId=${movieToRemove.movies.id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Delete failed:', response.status, errorText);
                    throw new Error(`Failed to remove from watchlist: ${response.status}`);
                }

                // Only update UI after successful database operation
                setSavedMovies(prevMovies => 
                    prevMovies.filter(movie => 
                        !(movie.status === 'wishlist' && movie.movies.movie_id === movieIdToCompare)
                    )
                );

                showSuccess(`"${movieData.Title}" removed from your watchlist!`);
                console.log('Successfully removed from wishlist');
            } else {
                // Add to wishlist - NO optimistic update, wait for database success
                console.log('Adding to database first');
                
                // Add to database first
                const response = await fetch('/api/movies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        movieData: movieData,
                        status: 'wishlist'
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Add failed:', response.status, errorText);
                    throw new Error(`Failed to add to watchlist: ${response.status}`);
                }

                // Only update UI after successful database operation
                // Refresh data from database to get the correct IDs
                await fetchSavedMovies(true, false);

                showSuccess(`"${movieData.Title}" added to your watchlist!`);
                console.log('Successfully added to wishlist');
            }
            
        } catch (error) {
            console.error('Error toggling wishlist status:', error);
            showError('Failed to update watchlist. Please try again.');
        }
    };

    // Update watch date for existing watched movie
    const updateWatchDate = async (movieId, newWatchedDate) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            // Ensure proper date format - if newWatchedDate is provided, it should be an ISO string
            const watchedDateToUse = newWatchedDate || new Date().toISOString();
            
            console.log('Original date:', newWatchedDate);
            console.log('Date to use:', watchedDateToUse);

            // Optimistically update local state first
            setSavedMovies(prevMovies => 
                prevMovies.map(movie => 
                    movie.status === 'watched' && movie.movies.id === movieId
                        ? { ...movie, watched_date: watchedDateToUse }
                        : movie
                )
            );

            // Update the watched date in the database
            // Note: movieId here is the primary key from movies table (movies.id)
            // But user_movies.movie_id is a foreign key that references movies.id
            console.log('Updating watch date:', {
                user_id: user.id,
                movie_id: movieId, // This should be movies.id (primary key)
                watched_date: watchedDateToUse,
                status: 'watched'
            });

            const { data: updateData, error: updateError } = await supabase
                .from('user_movies')
                .update({ watched_date: watchedDateToUse })
                .eq('user_id', user.id)
                .eq('movie_id', movieId) // movieId is movies.id (primary key)
                .eq('status', 'watched')
                .select();

            console.log('Update result:', { updateData, updateError });

            if (updateError) {
                console.error('Database update error:', updateError);
                // Revert optimistic update on error
                await fetchSavedMovies(true, false);
                throw updateError;
            }

            if (!updateData || updateData.length === 0) {
                console.warn('No rows were updated. Checking if record exists...');
                
                // Let's check if the record exists at all
                const { data: existingRecord, error: checkError } = await supabase
                    .from('user_movies')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('movie_id', movieId)
                    .eq('status', 'watched');
                
                console.log('Existing record check:', { existingRecord, checkError });
                
                if (!existingRecord || existingRecord.length === 0) {
                    showError('Movie not found in watched list. Please refresh and try again.');
                } else {
                    showError('Failed to update watch date. Please try again.');
                }
                
                await fetchSavedMovies(true, false);
                return;
            }

            showSuccess('Watch date updated successfully!');
            
            // Refresh the saved movies to ensure UI is in sync with database
            await fetchSavedMovies(true, false);
            
        } catch (error) {
            console.error('Error updating watch date:', error);
            showError('Failed to update watch date. Please try again.');
        }
    };

    // Move movie from wishlist to watched
    const moveWishlistToWatched = async (movieId, movieData, watchedDate = null) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            const watchedDateToUse = watchedDate || new Date().toISOString();
            
            console.log('Moving wishlist to watched in database first, movieId:', movieId);

            // Update status in database first - NO optimistic update
            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    movieData: movieData,
                    status: 'watched',
                    watchedDate: watchedDateToUse
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Move to watched failed:', response.status, errorText);
                throw new Error(`Failed to move to watched: ${response.status}`);
            }

            // Only update UI after successful database operation
            // Refresh data from database to get correct structure
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to watched list!`);
            console.log('Successfully moved wishlist to watched');
            
        } catch (error) {
            console.error('Error moving movie from wishlist to watched:', error);
            showError('Failed to move movie to watched. Please try again.');
        }
    };

    // Transform saved movie data to match MovieCard expected format
    const transformSavedMovieToCardFormat = (savedMovie) => {
        const movieId = savedMovie.movies.movie_id;
        
        return {
            // Check if movie_id is an IMDb ID (starts with 'tt') or TMDb ID (numeric)
            imdbID: movieId && movieId.startsWith('tt') ? movieId : "N/A",
            tmdbID: movieId && !movieId.startsWith('tt') ? movieId : "N/A",
            Title: savedMovie.movies.title,
            Poster: savedMovie.movies.poster,
            Year: savedMovie.movies.year,
            Type: "movie",
            imdbRating: savedMovie.movies.rating || "N/A",
            ratingSource: savedMovie.movies.rating_source || "N/A"
        };
    };


    // Smart initial load and user change handling
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        } else if (user && isInitialLoad) {
            // Only fetch on initial load or user change, not on every re-render
            fetchSavedMovies(false, true);
        }
    }, [user, loading, router]);

    // Auto-toggle search when user has no movies
    useEffect(() => {
        if (!loadingSavedMovies && !isInitialLoad) {
            // If user has no saved movies and hasn't manually closed search, automatically show it
            if (savedMovies.length === 0 && !userManuallyClosedSearch) {
                setShowSearch(true);
            }
            // If user adds their first movie, reset the manual close flag
            if (savedMovies.length > 0 && userManuallyClosedSearch) {
                setUserManuallyClosedSearch(false);
            }
        }
    }, [savedMovies.length, loadingSavedMovies, isInitialLoad, userManuallyClosedSearch]);

    // Professional window focus management - like Gmail, Slack, etc.
    useEffect(() => {
        if (!user) return;

        const handleVisibilityChange = () => {
            // Only refresh if page becomes visible and data is stale
            if (!document.hidden && isDataStale()) {
                console.log('🔄 Page became visible with stale data - refreshing in background');
                fetchSavedMovies(false, false); // Background refresh without loading state
            }
        };

        const handleFocus = () => {
            // Only refresh if data is very stale (more than 10 minutes)
            if (isDataStale()) {
                console.log('🔄 Window focused with stale data - refreshing in background');
                fetchSavedMovies(false, false); // Background refresh without loading state
            }
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user]);

    // Periodic session validation (every 5 minutes)
    useEffect(() => {
        if (!user) return;

        const sessionCheckInterval = setInterval(async () => {
            console.log('Performing periodic session check...');
            const session = await validateSession();
            
            if (!session) {
                console.warn('Session expired during periodic check');
                showError('Your session has expired. Redirecting to login...');
                setTimeout(() => router.push('/login'), 2000);
                clearInterval(sessionCheckInterval);
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(sessionCheckInterval);
    }, [user, validateSession, router, showError]);

    if (loading) {
        return <div className="min-h-screen flex flex-col items-center justify-center">
            <Image 
                src="/images/babu-rao-stickers.png" 
                alt="Babu Rao" 
                width={240} 
                height={250} 
                className='mb-2'
                priority
            />
                <p className='text-center text-md px-4'>Please wait while Mr Babu Rao fixes his dhoti...
                    <svg className="animate-spin h-4 w-4 inline-block text-white ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
        </div>
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">

            <div className='container mx-auto text-black'>
                <header className="py-4 m-4 mb-0 rounded-xl text-center flex justify-between items-center">
                    {/* <h1 className="text-2xl font-bold">Filmy Diary</h1> */}
                    <Image
                        src="/images/logo.png"
                        alt="Pokemon"
                        width={100}
                        height={100}
                        priority
                    />
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="hidden sm:block">{user.user_metadata?.name?.split(' ')[0] || user.email}</span>
                        <button 
                            onClick={() => {
                                const newShowSearch = !showSearch;
                                setShowSearch(newShowSearch);
                                // If user is closing search and has no movies, mark as manually closed
                                if (!newShowSearch && savedMovies.length === 0) {
                                    setUserManuallyClosedSearch(true);
                                }
                            }}
                            className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-black transition-colors"
                            title={showSearch ? 'Hide Search' : 'Show Search'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                        <button 
                            onClick={async () => {
                                if (isSigningOut) return; // Prevent double clicks
                                
                                setIsSigningOut(true);
                                try {
                                    await signOut();
                                } catch (error) {
                                    console.error('Sign out button error:', error);
                                    // Force redirect even if signOut fails
                                    window.location.href = '/login';
                                } finally {
                                    setIsSigningOut(false);
                                }
                            }} 
                            disabled={isSigningOut}
                            className={`p-2 rounded-lg transition-colors ${
                                isSigningOut 
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                    : 'bg-gray-200 hover:bg-gray-300 text-black'
                            }`}
                            title={isSigningOut ? 'Signing Out...' : 'Sign Out'}
                        >
                            {isSigningOut ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                            )}
                        </button>
                    </div>
                </header>
                <main className="flex-grow p-4">
                    {/* Search section */}
                    {showSearch && (
                        <MovieSearch 
                            savedMovies={savedMovies} 
                            fetchSavedMovies={() => fetchSavedMovies(false, false)}
                            setSavedMovies={setSavedMovies}
                        />
                    )}
                    
                    {/* ======================================== Saved movies section ======================================== */}
                    {/* ======================================== Saved movies section ======================================== */}
                    
                    
                    {loadingSavedMovies ? (
                        <p className="text-center mt-8">Loading your saved movies...</p>
                    ) : savedMovies.length > 0 ? (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4">Your Movie Collections</h2>
                            
                            {/* Watched movies */}
                            {savedMovies.some(item => item.status === 'watched') && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2">Watched Movies</h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'watched')
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={() => null}
                                                    onClickWatching={() => null}
                                                    onRemoveWatched={() => removeWatchedStatus(item.movies.id)}
                                                    onUpdateWatchDate={(newWatchedDate) => updateWatchDate(item.movies.id, newWatchedDate)}
                                                    watched={true}
                                                    cardType="watched"
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            
                            {/* Currently watching movies */}
                            {savedMovies.some(item => item.status === 'watching') && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2">Currently Watching</h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'watching')
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={(watchedDate) => moveWatchingToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                                    onClickWatching={() => removeWatchingStatus(item.movies.id)}
                                                    onRemoveWatched={() => null}
                                                    watched={false}
                                                    cardType="watching"
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

            {/* Watchlist movies */}
            {savedMovies.some(item => item.status === 'wishlist') && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                        </svg>
                                        Watchlist
                                    </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'wishlist')
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={(watchedDate) => moveWishlistToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                                    onClickWatching={() => null}
                                                    onClickWishlist={() => toggleWishlistStatus(transformSavedMovieToCardFormat(item))}
                                                    onRemoveWatched={() => null}
                                                    watched={false}
                                                    wishlist={true}
                                                    cardType="wishlist"
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center mt-8 p-6 bg-gray-100 rounded-lg border border-gray-300">
                            <p>You haven&apos;t saved any movies yet.</p>
                            <p className="mt-2 text-gray-600">Search for movies and add them to your collection!</p>
                        </div>
                    )}
                </main>
            </div>

            <div className='text-center w-full flex justify-center pt-6' style={{ marginBottom: '-8px' }}>
                <Image 
                    src="/images/pokemon.gif" 
                    alt="Pokemon" 
                    width={100} 
                    height={100} 
                    priority
                />
            </div>
        </div>
    );
}