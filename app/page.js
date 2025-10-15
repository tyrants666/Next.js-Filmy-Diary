'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";

import MovieCard from './components/MovieCard';
import MovieSearch from './components/MovieSearch';
import MovieSlider from './components/MovieSlider';
import MovieInfoSlider from './components/MovieInfoSlider';
import Header from './components/Header';
import TMDBBanner from './components/TMDBBanner';
import GoogleLoginButton from './components/GoogleLoginButton';
import PublicMovieSliders from './components/PublicMovieSliders';
import { IoSettings, IoPlayCircle, IoBookmark, IoCheckmarkCircle, IoHome, IoList, IoEye } from 'react-icons/io5';
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import { useMovieCache } from './context/MovieCacheContext'
import { supabase } from './lib/supabaseClient';

export default function Home() {

    const [savedMovies, setSavedMovies] = useState([]);
    const [loadingSavedMovies, setLoadingSavedMovies] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const { user, loading, signOut, validateSession } = useAuth()
    const { showSuccess, showError } = useToast()
    const { clearCache } = useMovieCache()
    const router = useRouter()

    // Handle search state changes from MovieSearch component
    const handleSearchStateChange = (isActive) => {
        setIsSearchActive(isActive);
    };

    // Handle movie click to open info slider
    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsSliderOpen(true);
    };

    // Centralized functions for adding movies to different lists
    const addToWatched = async (movieData, watchedDate = null) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'watched',
                    watchedDate
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to watched movies`);
            await fetchSavedMovies(true, false);
        } catch (error) {
            console.error('Error adding to watched:', error);
            showError('Failed to add movie to watched list');
        }
    };

    const addToWatching = async (movieData) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'currently_watching'
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to currently watching`);
            await fetchSavedMovies(true, false);
        } catch (error) {
            console.error('Error adding to watching:', error);
            showError('Failed to add movie to watching list');
        }
    };

    const addToWatchlist = async (movieData) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                showError('You need to be logged in to add movies');
                return;
            }

            const response = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: sessionData.session.user.id,
                    userEmail: sessionData.session.user.email,
                    movieData,
                    status: 'wishlist'
                })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to add movie');
            }

            showSuccess(`"${movieData.Title}" added to watchlist`);
            await fetchSavedMovies(true, false);
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            showError('Failed to add movie to watchlist');
        }
    };
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
            
            // Poster validation is now handled automatically by MovieCacheContext.updateCache()
            
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
            
            // Clear global cache for both watching and watched to force refresh
            clearCache('watching');
            clearCache('watched');

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
            
            // Clear global cache for both watching and watchlist to force refresh
            clearCache('watching');
            clearCache('watchlist');

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
            
            // Clear global cache for both watchlist and watching to force refresh
            clearCache('watchlist');
            clearCache('watching');

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
            
            // Clear global cache for both watched and watchlist to force refresh
            clearCache('watched');
            clearCache('watchlist');

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
            
            // Clear global cache for both watched and watching to force refresh
            clearCache('watched');
            clearCache('watching');

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
            Plot: savedMovie.movies.description || "N/A",
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
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">

            <div className='container mx-auto text-black px-4'>
                <Header 
                    currentPage="home" 
                    showSearch={false}
                />
                
                {/* Search Component - Show on both desktop and mobile */}
                    <MovieSearch 
                        savedMovies={savedMovies} 
                        fetchSavedMovies={() => fetchSavedMovies(true, false)}
                        setSavedMovies={setSavedMovies}
                        onSearchStateChange={handleSearchStateChange}
                        user={user}
                        onMovieClick={handleMovieClick}
                    />
                    
                <main className="flex-grow pb-4">
                    {/* ======================================== Saved movies section ======================================== */}
                    
                    {user && (
                        <>
                            {loadingSavedMovies ? (
                                <p className="text-center mt-8">Loading your saved movies...</p>
                            ) : (savedMovies && savedMovies.length > 0) ? (
                        <div className="mt-8">
                            
                            {/* TMDB Banner - Always show regardless of currently watching movies */}
                            <TMDBBanner onMovieClick={handleMovieClick} />
                            
                            {/* Currently watching movies */}
                            {savedMovies.some(item => item.status === 'currently_watching') && (
                                <MovieSlider
                                    title="Currently Watching"
                                    icon={<IoPlayCircle className="w-5 h-5 text-red-500" />}
                                    movies={savedMovies
                                        .filter(item => item.status === 'currently_watching')
                                        .sort((a, b) => {
                                            const dateA = new Date(a.updated_at || a.created_at || 0);
                                            const dateB = new Date(b.updated_at || b.created_at || 0);
                                            return dateB - dateA;
                                        })
                                        .slice(0, 25)
                                        .map(item => ({
                                            ...transformSavedMovieToCardFormat(item),
                                            id: item.id,
                                            watched: false,
                                            wishlist: false
                                        }))
                                    }
                                    seeAllLink={(savedMovies.filter(item => item.status === 'currently_watching').length > 2) ? "/watching" : undefined}
                                    onMovieClick={handleMovieClick}
                                    onClickWatched={(movie, watchedDate) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWatchingToWatched(item.movies.id, movie, watchedDate);
                                    }}
                                    onClickWatching={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) removeWatchingStatus(item.movies.id);
                                    }}
                                    onClickWishlist={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWatchingToWishlist(item.movies.id, movie);
                                    }}
                                    cardType="watching"
                                />
                            )}

                            {/* Watchlist movies - Second */}
                            {savedMovies.some(item => item.status === 'wishlist') && (
                                <MovieSlider
                                    title="Watchlist"
                                    icon={<IoBookmark className="w-5 h-5 text-purple-600" />}
                                    movies={savedMovies
                                        .filter(item => item.status === 'wishlist')
                                        .sort((a, b) => {
                                            const dateA = new Date(a.updated_at || a.created_at || 0);
                                            const dateB = new Date(b.updated_at || b.created_at || 0);
                                            return dateB - dateA;
                                        })
                                        .slice(0, 25)
                                        .map(item => ({
                                            ...transformSavedMovieToCardFormat(item),
                                            id: item.id,
                                            watched: false,
                                            wishlist: true
                                        }))
                                    }
                                    seeAllLink="/watchlist"
                                    onMovieClick={handleMovieClick}
                                    onClickWatched={(movie, watchedDate) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWishlistToWatched(item.movies.id, movie, watchedDate);
                                    }}
                                    onClickWatching={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWishlistToWatching(item.movies.id, movie);
                                    }}
                                    onClickWishlist={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) toggleWishlistStatus(movie);
                                    }}
                                    cardType="wishlist"
                                />
                            )}

                            {/* Watched movies - Third */}
                            {savedMovies.some(item => item.status === 'watched') && (
                                <MovieSlider
                                    title="Watched"
                                    icon={<IoCheckmarkCircle className="w-5 h-5 text-green-600" />}
                                    movies={savedMovies
                                        .filter(item => item.status === 'watched')
                                        .sort((a, b) => {
                                            const dateA = new Date(a.watched_date || 0);
                                            const dateB = new Date(b.watched_date || 0);
                                            return dateB - dateA;
                                        })
                                        .slice(0, 25)
                                        .map(item => ({
                                            ...transformSavedMovieToCardFormat(item),
                                            id: item.id,
                                            watched: true,
                                            wishlist: false
                                        }))
                                    }
                                    seeAllLink="/watched"
                                    onMovieClick={handleMovieClick}
                                    onClickWatching={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWatchedToWatching(item.movies.id, movie);
                                    }}
                                    onClickWishlist={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) moveWatchedToWishlist(item.movies.id, movie);
                                    }}
                                    onRemoveWatched={(movie) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) removeWatchedStatus(item.movies.id);
                                    }}
                                    onUpdateWatchDate={(movie, newWatchedDate) => {
                                        const item = savedMovies.find(saved => saved.movies.movie_id === (movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID));
                                        if (item) updateWatchDate(item.movies.id, newWatchedDate);
                                    }}
                                    cardType="watched"
                                />
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
                    
                    {/* Show movie sliders for non-authenticated users when not searching */}
                    {!user && !isSearchActive && (
                        <PublicMovieSliders onMovieClick={handleMovieClick} />
                    )}
                </main>

            {/* Movie Info Slider */}
            <MovieInfoSlider
                isOpen={isSliderOpen}
                onClose={() => setIsSliderOpen(false)}
                movie={selectedMovie}
                onClickWatched={async (watchedDate) => {
                    if (selectedMovie) {
                        const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                        if (item) {
                            if (item.status === 'wishlist') {
                                await moveWishlistToWatched(item.movies.id, selectedMovie, watchedDate);
                            } else if (item.status === 'currently_watching') {
                                await moveWatchingToWatched(item.movies.id, selectedMovie, watchedDate);
                            }
                        } else {
                            // Movie is not in savedMovies, add it to watched
                            await addToWatched(selectedMovie, watchedDate);
                        }
                    }
                }}
                onUpdateWatchDate={async (newWatchedDate) => {
                    if (selectedMovie) {
                        const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                        if (item && item.status === 'watched') {
                            await updateWatchDate(item.movies.id, newWatchedDate);
                        }
                    }
                }}
                onClickWatching={async () => {
                    if (selectedMovie) {
                        const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                        if (item) {
                            if (item.status === 'wishlist') {
                                await moveWishlistToWatching(item.movies.id, selectedMovie);
                            } else if (item.status === 'watched') {
                                await moveWatchedToWatching(item.movies.id, selectedMovie);
                            } else if (item.status === 'currently_watching') {
                                await removeWatchingStatus(item.movies.id);
                            }
                        } else {
                            // Movie is not in savedMovies, add it to watching
                            await addToWatching(selectedMovie);
                        }
                    }
                }}
                onClickWishlist={async () => {
                    if (selectedMovie) {
                        const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                        if (item) {
                            if (item.status === 'wishlist') {
                                await toggleWishlistStatus(selectedMovie);
                            } else if (item.status === 'watched') {
                                await moveWatchedToWishlist(item.movies.id, selectedMovie);
                            } else if (item.status === 'currently_watching') {
                                await moveWatchingToWishlist(item.movies.id, selectedMovie);
                            }
                        } else {
                            // Movie is not in savedMovies, add it to wishlist
                            await addToWatchlist(selectedMovie);
                        }
                    }
                }}
                onRemoveWatched={async () => {
                    if (selectedMovie) {
                        const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                        if (item && item.status === 'watched') {
                            await removeWatchedStatus(item.movies.id);
                        }
                    }
                }}
                onActionComplete={() => {
                    // Close the slider immediately after action is completed
                    setIsSliderOpen(false);
                }}
                watched={selectedMovie ? savedMovies.some(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID) && saved.status === 'watched') : false}
                wishlist={selectedMovie ? savedMovies.some(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID) && saved.status === 'wishlist') : false}
                cardType={selectedMovie ? (() => {
                    const item = savedMovies.find(saved => saved.movies.movie_id === (selectedMovie.imdbID !== "N/A" ? selectedMovie.imdbID : selectedMovie.tmdbID));
                    return item ? (item.status === 'currently_watching' ? 'watching' : item.status) : 'search';
                })() : 'search'}
            />
            </div>
        </div>
    );
}