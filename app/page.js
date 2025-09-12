'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";

import MovieSearch from './components/MovieSearch';
import MovieCard from './components/MovieCard';
import GoogleLoginButton from './components/GoogleLoginButton';
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
    const [isSearchActive, setIsSearchActive] = useState(false);
    const { user, loading, signOut, validateSession } = useAuth()
    const { showSuccess, showError } = useToast()
    const router = useRouter()

    // Handle search state changes from MovieSearch component
    const handleSearchStateChange = (isActive) => {
        setIsSearchActive(isActive);
    };

    // Cache configuration - like big companies do
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const STALE_WHILE_REVALIDATE_DURATION = 10 * 60 * 1000; // 10 minutes stale-while-revalidate

    // Check if data is fresh (within cache duration)
    const isDataFresh = useCallback(() => {
        if (!lastFetchTime) return false;
        return Date.now() - lastFetchTime < CACHE_DURATION;
    }, [lastFetchTime, CACHE_DURATION]);

    // Check if data is stale but acceptable (stale-while-revalidate)
    const isDataStale = useCallback(() => {
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > STALE_WHILE_REVALIDATE_DURATION;
    }, [lastFetchTime, STALE_WHILE_REVALIDATE_DURATION]);

    // Smart fetch with caching - like Netflix, YouTube, etc.
    const fetchSavedMovies = useCallback(async (forceRefresh = false, showLoading = true) => {
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
                        type
                    )
                `)
                .eq('user_id', user.id)
                .order('id', { ascending: false });
                
            if (userMoviesError) throw userMoviesError;
            
            // Currently watching movies are now included in userMoviesData with status='currently_watching'
            // No need for separate watching table fetch
            let combinedData = userMoviesData || [];
            
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
    }, [user, isDataFresh, isDataStale, isInitialLoad, showError]);

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

            console.log('Removing watched movie via API, movieId:', movieId);

            // Use the API endpoint to delete the movie (this will also update the counter)
            const response = await fetch(`/api/movies?userId=${user.id}&movieId=${movieId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to remove movie: ${response.status} - ${errorText}`);
            }

            // Only update UI after successful API operation
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

            console.log('Removing watching movie via API, movieId:', movieId);

            // Use the API endpoint to delete the movie (this will also update the counter)
            const response = await fetch(`/api/movies?userId=${user.id}&movieId=${movieId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to remove movie: ${response.status} - ${errorText}`);
            }

            // Only update UI after successful API operation
            setSavedMovies(prevMovies => 
                prevMovies.filter(movie => 
                    !(movie.status === 'currently_watching' && movie.movies.id === movieId)
                )
            );

            showSuccess('Removed from your currently watching list!');
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
            
            console.log('Moving watching to watched using API, movieId:', movieId);

            // Use the API endpoint to ensure consistency with user_email and movie_name
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
                throw new Error(`Failed to move to watched: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // Counter is now handled by the API - no need to manually update it here
            // Only update UI after successful API operation
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
                        userEmail: user.email,
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
                    userEmail: user.email,
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

    // Move movie from watching to wishlist
    const moveWatchingToWishlist = async (movieId, movieData) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Moving watching to wishlist using API, movieId:', movieId);

            // Use the API endpoint to ensure consistency
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
                throw new Error(`Failed to move to wishlist: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // Counter is now handled by the API - no need to manually update it here
            // Only update UI after successful API operation
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to watchlist!`);
            console.log('Successfully moved watching to wishlist');
            
        } catch (error) {
            console.error('Error moving movie to wishlist:', error);
            showError('Failed to move movie to wishlist. Please try again.');
        }
    };

    // Move movie from wishlist to watching
    const moveWishlistToWatching = async (movieId, movieData) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Moving wishlist to watching using API, movieId:', movieId);

            // Use the API endpoint to ensure consistency
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
                throw new Error(`Failed to move to watching: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // Counter is now handled by the API - no need to manually update it here
            // Only update UI after successful API operation
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to currently watching!`);
            console.log('Successfully moved wishlist to watching');
            
        } catch (error) {
            console.error('Error moving movie to watching:', error);
            showError('Failed to move movie to watching. Please try again.');
        }
    };

    // Move movie from watched to wishlist
    const moveWatchedToWishlist = async (movieId, movieData) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Moving watched to wishlist using API, movieId:', movieId);

            // Use the API endpoint to ensure consistency
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
                throw new Error(`Failed to move to wishlist: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // Counter is now handled by the API - no need to manually update it here
            // Only update UI after successful API operation
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to watchlist!`);
            console.log('Successfully moved watched to wishlist');
            
        } catch (error) {
            console.error('Error moving movie to wishlist:', error);
            showError('Failed to move movie to wishlist. Please try again.');
        }
    };

    // Move movie from watched to watching
    const moveWatchedToWatching = async (movieId, movieData) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            console.log('Moving watched to watching using API, movieId:', movieId);

            // Use the API endpoint to ensure consistency
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
                throw new Error(`Failed to move to watching: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            // Counter is now handled by the API - no need to manually update it here
            // Only update UI after successful API operation
            await fetchSavedMovies(true, false);

            showSuccess(`"${movieData.Title}" moved to currently watching!`);
            console.log('Successfully moved watched to watching');
            
        } catch (error) {
            console.error('Error moving movie to watching:', error);
            showError('Failed to move movie to watching. Please try again.');
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
            Type: savedMovie.movies.type || "movie", // Use the type from database, fallback to "movie"
            imdbRating: savedMovie.movies.rating || "N/A",
            ratingSource: savedMovie.movies.rating_source || "N/A",
            watchedDate: savedMovie.watched_date || null
        };
    };


    // Smart initial load and user change handling
    useEffect(() => {
        if (user && isInitialLoad) {
            // Only fetch on initial load or user change, not on every re-render
            fetchSavedMovies(false, true);
        }
    }, [user, loading, router, isInitialLoad, fetchSavedMovies]);


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
    }, [user, isDataStale, fetchSavedMovies]);

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
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <Image 
                    src="/images/babu-rao-stickers.png" 
                    alt="Babu Rao" 
                    width={240} 
                    height={250} 
                    className='mb-2'
                    priority
                />
                <p className='text-center text-md px-4 text-gray-800'>Please wait while Mr Babu Rao fixes his dhoti...
                    <svg className="animate-spin h-4 w-4 inline-block text-gray-600 ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
            </div>
        );
    }

    // Remove the authentication check - allow all users to see the page

    return (
        <div className="min-h-screen flex flex-col bg-white">

            <div className='container mx-auto text-black'>
                <header className="py-4 m-4 mb-0 rounded-xl text-center flex justify-between items-center">
                    <Image
                        src="/images/logo.png"
                        alt="Filmy Diary Logo"
                        width={100}
                        height={100}
                        priority
                    />
                    <div className="flex items-center gap-2 sm:gap-4">
                        {user ? (
                            // Authenticated user header
                            <>
                                <span className="hidden sm:block">{user.user_metadata?.name?.split(' ')[0] || user.email}</span>
                                <button 
                                    onClick={() => router.push('/settings')}
                                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-black transition-colors"
                                    title="Settings"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
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
                                            window.location.reload();
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
                            </>
                        ) : (
                            // Non-authenticated user header - Google Login button
                            <GoogleLoginButton />
                        )}
                    </div>
                </header>
                <main className="flex-grow p-4">
                    {/* Search section - Always visible */}
                    <MovieSearch 
                        savedMovies={savedMovies} 
                        fetchSavedMovies={() => fetchSavedMovies(true, false)}
                        setSavedMovies={setSavedMovies}
                        onSearchStateChange={handleSearchStateChange}
                        user={user}
                    />
                    
                    {/* ======================================== Saved movies section ======================================== */}
                    {/* ======================================== Saved movies section ======================================== */}
                    
                    {user && (
                        <>
                            {loadingSavedMovies ? (
                                <p className="text-center mt-8">Loading your saved movies...</p>
                            ) : (savedMovies && savedMovies.length > 0) ? (
                        <div className="mt-8">
                            
                            {/* Currently watching movies - First */}
                            {savedMovies.some(item => item.status === 'currently_watching') && (
                                <div className="mb-10">
                                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
                                            <polygon points="5,3 19,12 5,21"></polygon>
                                        </svg>
                                        Currently Watching
                                    </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'currently_watching')
                                            .sort((a, b) => {
                                                // Sort by updated_at (latest first) - this updates when status changes
                                                const dateA = new Date(a.updated_at || a.created_at || 0);
                                                const dateB = new Date(b.updated_at || b.created_at || 0);
                                                return dateB - dateA;
                                            })
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={(watchedDate) => moveWatchingToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                                    onClickWatching={() => removeWatchingStatus(item.movies.id)}
                                                    onClickWishlist={() => moveWatchingToWishlist(item.movies.id, transformSavedMovieToCardFormat(item))}
                                                    onRemoveWatched={() => null}
                                                    watched={false}
                                                    cardType="watching"
                                                />
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Watchlist movies - Second */}
                            {savedMovies.some(item => item.status === 'wishlist') && (
                                <div className="mb-10">
                                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                        </svg>
                                        Watchlist
                                    
                                    </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'wishlist')
                                            .sort((a, b) => {
                                                // Sort by updated_at (latest first) - this updates when status changes
                                                const dateA = new Date(a.updated_at || a.created_at || 0);
                                                const dateB = new Date(b.updated_at || b.created_at || 0);
                                                return dateB - dateA;
                                            })
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={(watchedDate) => moveWishlistToWatched(item.movies.id, transformSavedMovieToCardFormat(item), watchedDate)}
                                                    onClickWatching={() => moveWishlistToWatching(item.movies.id, transformSavedMovieToCardFormat(item))}
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

                            {/* Watched movies - Third */}
                            {savedMovies.some(item => item.status === 'watched') && (
                                <div className="mb-10">
                                     <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-green-600 font-bold">
                                             <polyline points="20,6 9,17 4,12"></polyline>
                                         </svg>
                                         Watched
                                     </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'watched')
                                            .sort((a, b) => {
                                                // Sort by watched_date (latest first)
                                                const dateA = new Date(a.watched_date || 0);
                                                const dateB = new Date(b.watched_date || 0);
                                                return dateB - dateA;
                                            })
                                            .map(item => (
                                                <MovieCard
                                                    key={item.id}
                                                    movie={transformSavedMovieToCardFormat(item)}
                                                    onHover={() => null}
                                                    onLeave={() => null}
                                                    onClickWatched={() => null}
                                                    onClickWatching={() => moveWatchedToWatching(item.movies.id, transformSavedMovieToCardFormat(item))}
                                                    onClickWishlist={() => moveWatchedToWishlist(item.movies.id, transformSavedMovieToCardFormat(item))}
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
                            </div>
                            ) : !isSearchActive ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    {/* Cute movie character SVG */}
                                    <div className="mb-6">
                                        <svg width="120" height="120" viewBox="0 0 200 200" className="text-gray-400">
                                            {/* Movie reel body */}
                                            <circle cx="100" cy="100" r="80" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2"/>
                                            <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="2"/>
                                            <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="2"/>
                                            <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" strokeWidth="2"/>
                                            
                                            {/* Film holes */}
                                            <circle cx="70" cy="70" r="4" fill="currentColor"/>
                                            <circle cx="130" cy="70" r="4" fill="currentColor"/>
                                            <circle cx="70" cy="130" r="4" fill="currentColor"/>
                                            <circle cx="130" cy="130" r="4" fill="currentColor"/>
                                            <circle cx="100" cy="60" r="4" fill="currentColor"/>
                                            <circle cx="100" cy="140" r="4" fill="currentColor"/>
                                            <circle cx="60" cy="100" r="4" fill="currentColor"/>
                                            <circle cx="140" cy="100" r="4" fill="currentColor"/>
                                            
                                            {/* Cute face */}
                                            <circle cx="85" cy="85" r="3" fill="currentColor"/> {/* Left eye */}
                                            <circle cx="115" cy="85" r="3" fill="currentColor"/> {/* Right eye */}
                                            <path d="M 90 110 Q 100 120 110 110" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/> {/* Smile */}
                                            
                                            {/* Film strip coming out */}
                                            <rect x="180" y="95" width="15" height="10" fill="currentColor" opacity="0.3"/>
                                            <rect x="185" y="90" width="5" height="20" fill="currentColor" opacity="0.5"/>
                                            <rect x="190" y="85" width="8" height="30" fill="currentColor" opacity="0.3"/>
                                        </svg>
                                    </div>
                                    
                                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                                        Ready to discover movies?
                                    </h3>
                                    <p className="text-gray-500 max-w-md">
                                        Search for your favorite movies and TV series and start building your personal entertainment diary!
                                    </p>
                                </div>
                            ) : null}
                        </>
                    )}
                    
                    {/* Show welcome message for non-authenticated users when not searching */}
                    {!user && !isSearchActive && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            {/* Cute movie character SVG */}
                            <div className="mb-6">
                                
                                {/* <Image
                                    src="/images/search-monster1.png"
                                    alt="Search Monster"
                                    width={250}
                                    height={350}
                                    className="mx-auto"
                                    priority
                                /> */}
                            </div>
                            
                            <h3 className="text-xl font-semibold text-gray-600 mb-4">
                                Welcome to Filmy Diary!
                            </h3>
                            
                            {/* Getting Started Instructions */}
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mb-3 text-sm">
                                <h4 className="font-medium text-gray-700 mb-3">How to get started:</h4>
                                <div className="space-y-2 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></span>
                                        <span className="text-gray-600">Search for your favorite movies and TV series</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></span>
                                        <span className="text-gray-600">Sign in with Google to save them</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Movie Lists Instructions */}
                            <div className="bg-gray-50 rounded-lg p-4 max-w-md mb-3 text-sm">
                                <h4 className="font-medium text-gray-700 mb-3">How to use your movie lists:</h4>
                                <div className="space-y-2 text-left">
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600 flex-shrink-0">
                                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                                        </svg>
                                        <span className="text-gray-600">Add movies to <strong>Watchlist</strong> for later</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 flex-shrink-0">
                                            <polygon points="5,3 19,12 5,21"></polygon>
                                        </svg>
                                        <span className="text-gray-600">Move to <strong>Currently Watching</strong> when you start</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600 flex-shrink-0">
                                            <polyline points="20,6 9,17 4,12"></polyline>
                                        </svg>
                                        <span className="text-gray-600">Mark as <strong>Watched</strong> when finished</span>
                                    </div>
                                </div>
                            </div>
                            
                            <GoogleLoginButton />
                            
                            {/* Upcoming Features */}
                            <div className="bg-blue-50 rounded-lg p-4 max-w-md mt-[100px] text-sm border border-blue-100">
                                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                                    </svg>
                                    Coming Soon:
                                </h4>
                                <div className="space-y-2 text-left">
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 flex-shrink-0">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        <span className="text-blue-700">Follow friends to see what they're watching</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 flex-shrink-0">
                                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                            <polyline points="16,6 12,2 8,6"></polyline>
                                            <line x1="12" y1="2" x2="12" y2="15"></line>
                                        </svg>
                                        <span className="text-blue-700">Share your favorite movie lists with others</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <div className='text-center w-full flex justify-center pt-6' style={{ marginBottom: '-8px' }}>
                <Image 
                    src="/images/search-monster.png" 
                    // src="/images/pokemon.gif" 
                    alt="Pokemon" 
                    width={100} 
                    height={100} 
                    priority
                />
            </div>
        </div>
    );
}