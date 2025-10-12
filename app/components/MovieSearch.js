'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useMovieCache } from '../context/MovieCacheContext';
import MovieCard from './MovieCard';
import ConfirmationModal from './ConfirmationModal';
import LoginModal from './LoginModal';

export default function MovieSearch({ savedMovies = [], fetchSavedMovies, setSavedMovies, onSearchStateChange, user, onMovieClick }) {
    const { showSuccess, showError, showInfo } = useToast();
    const { validateSession } = useAuth();
    const { cacheSearchResults } = useMovieCache();

    // Function to validate and fix poster URLs
    const validatePosterUrl = (url, source = "Unknown") => {
        if (!url || url === "N/A" || url === "") {
            return "N/A";
        }
        
        // Check if it's a valid URL
        try {
            const validUrl = new URL(url);
            console.log(`Valid ${source} poster URL:`, validUrl.href);
            return validUrl.href;
        } catch (error) {
            console.warn(`Invalid ${source} poster URL:`, url, error);
            return "N/A";
        }
    };

    // Function to generate alternative IMDB poster URLs
    const getIMDBPosterAlternatives = (imdbID) => {
        if (!imdbID || !imdbID.startsWith('tt')) {
            return [];
        }
        
        return [
            `https://m.media-amazon.com/images/M/${imdbID}.jpg`,
            `https://ia.media-imdb.com/images/M/${imdbID}._V1_SX300.jpg`,
            `https://ia.media-imdb.com/images/M/${imdbID}._V1_SY300.jpg`,
            `https://ia.media-imdb.com/images/M/${imdbID}._V1_.jpg`
        ];
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loadingMovie, setLoadingMovie] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMorePages, setHasMorePages] = useState(false);
    const [moviesPerPage, setMoviesPerPage] = useState(18);
    const [watchedMovies, setWatchedMovies] = useState(new Set());
    const [wishlistMovies, setWishlistMovies] = useState(new Set());

    // Update local state when savedMovies changes
    useEffect(() => {
        if (savedMovies && Array.isArray(savedMovies)) {
            const watchedSet = new Set();
            const wishlistSet = new Set();
            
            savedMovies.forEach(item => {
                const movieId = item.movies.movie_id;
                if (item.status === 'watched') {
                    watchedSet.add(movieId);
                } else if (item.status === 'wishlist') {
                    wishlistSet.add(movieId);
                }
            });
            
            setWatchedMovies(watchedSet);
            setWishlistMovies(wishlistSet);
        }
    }, [savedMovies]);

    // Modal state for confirmation
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({
        movie: null,
        newStatus: null,
        existingStatus: null,
        watchedDate: null
    });
    const [isMovingMovie, setIsMovingMovie] = useState(false);

    // Login modal state
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginModalMovieTitle, setLoginModalMovieTitle] = useState('');

    // Notify parent about search state changes
    useEffect(() => {
        if (onSearchStateChange) {
            const isSearchActive = searchTerm.length > 0 || movies.length > 0 || loadingMovie;
            onSearchStateChange(isSearchActive);
        }
    }, [searchTerm, movies.length, loadingMovie, onSearchStateChange]);
    
    useEffect(() => {
        const watchedSet = new Set(
            savedMovies
                .filter(item => item.status === 'watched')
                .map(item => item.movies.movie_id)
        );
        setWatchedMovies(watchedSet);

        const wishlistSet = new Set(
            savedMovies
                .filter(item => item.status === 'wishlist')
                .map(item => item.movies.movie_id)
        );
        setWishlistMovies(wishlistSet);
    }, [savedMovies]);

    const fetchMovies = async (page = 1) => {
        setLoadingMovie(true);
        setError(null);

        try {
            if (!searchTerm.trim()) {
                // Don't show error, just return to show the cute figure
                setLoadingMovie(false);
                return;
            }

            const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
            const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
            
            // TMDB multi-search endpoint to search both movies and TV series
            const apiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}&page=${page}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Filter out person results and only keep movies and TV series
                const filteredResults = data.results.filter(item => 
                    item.media_type === 'movie' || item.media_type === 'tv'
                );

                // Transform TMDB data to match OMDB structure
                let transformedMovies = filteredResults.map(item => {
                    const tmdbPosterUrl = item.poster_path ? `${baseImageUrl}${item.poster_path}` : "N/A";
                    
                    // Handle different field names for movies vs TV series
                    const title = item.media_type === 'movie' ? item.title : item.name;
                    const releaseDate = item.media_type === 'movie' ? item.release_date : item.first_air_date;
                    const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : "N/A";
                    const type = item.media_type === 'movie' ? "movie" : "series";
                    
                    console.log(`TMDB ${type}: ${title} - Poster Path: ${item.poster_path} - Full URL: ${tmdbPosterUrl}`);
                    
                    return {
                        tmdbID: item.id.toString(), // Store TMDB ID separately
                        imdbID: "N/A", // Will be populated from OMDB if available
                        Title: title,
                        Poster: validatePosterUrl(tmdbPosterUrl, "TMDB"),
                        Year: year,
                        Type: type, // Now can be "movie" or "series"
                        Plot: item.overview || "N/A", // Add plot/overview from TMDB
                        imdbRating: "N/A", // Default rating
                        tmdbRating: item.vote_average ? item.vote_average.toFixed(1) : "N/A", // TMDB rating as fallback
                        ratingSource: "N/A", // Track which source provided the rating
                        posterSource: item.poster_path ? "TMDB" : "None",
                        mediaType: item.media_type // Keep original media type for reference
                    };
                });

                // Fetch OMDB data for posters and ratings
                const omdbApiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
                
                if (omdbApiKey) {
                    const omdbPromises = transformedMovies.map(async (movie) => {
                        try {
                            // Use appropriate OMDB type parameter based on media type
                            const omdbType = movie.Type === 'series' ? 'series' : 'movie';
                            const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(movie.Title)}&y=${movie.Year}&type=${omdbType}`;
                            const omdbResponse = await fetch(omdbUrl);
                            const omdbData = await omdbResponse.json();
                            
                            if (omdbData.Response === 'True') {
                                // Get actual IMDB ID
                                if (omdbData.imdbID && omdbData.imdbID !== "N/A") {
                                    movie.imdbID = omdbData.imdbID;
                                }
                                
                                // Poster priority: TMDB -> OMDB -> IMDB Alternatives -> None
                                let finalPoster = "N/A";
                                let posterSource = "None";
                                
                                // Try TMDB poster first (most reliable and consistent)
                                if (movie.Poster !== "N/A") {
                                    const validatedTMDBPoster = validatePosterUrl(movie.Poster, "TMDB");
                                    if (validatedTMDBPoster !== "N/A") {
                                        finalPoster = validatedTMDBPoster;
                                        posterSource = "TMDB";
                                    }
                                }
                                
                                // Fallback to OMDB poster if TMDB failed
                                if (finalPoster === "N/A" && omdbData.Poster && omdbData.Poster !== "N/A") {
                                    const validatedOMDBPoster = validatePosterUrl(omdbData.Poster, "OMDB");
                                    if (validatedOMDBPoster !== "N/A") {
                                        finalPoster = validatedOMDBPoster;
                                        posterSource = "OMDB";
                                    }
                                }
                                
                                // Try IMDB direct poster alternatives if both TMDB and OMDB failed
                                if (finalPoster === "N/A" && omdbData.imdbID) {
                                    const imdbAlternatives = getIMDBPosterAlternatives(omdbData.imdbID);
                                    for (const altUrl of imdbAlternatives) {
                                        const validatedAltPoster = validatePosterUrl(altUrl, "IMDB-Alt");
                                        if (validatedAltPoster !== "N/A") {
                                            finalPoster = validatedAltPoster;
                                            posterSource = "IMDB";
                                            break; // Use the first working alternative
                                        }
                                    }
                                }
                                
                                movie.Poster = finalPoster;
                                movie.posterSource = posterSource;
                                
                                console.log(`Final poster for "${movie.Title}": ${posterSource} - ${finalPoster}`);
                                
                                // Priority 1: IMDB rating from OMDB
                                if (omdbData.imdbRating && omdbData.imdbRating !== "N/A") {
                                    movie.imdbRating = omdbData.imdbRating;
                                    movie.ratingSource = "IMDB";
                                }
                                // Priority 2: If no IMDB rating, use TMDB rating
                                else if (movie.tmdbRating !== "N/A") {
                                    movie.imdbRating = movie.tmdbRating;
                                    movie.ratingSource = "TMDB";
                                }
                            } else {
                                // If OMDB fails, fall back to TMDB rating
                                if (movie.tmdbRating !== "N/A") {
                                    movie.imdbRating = movie.tmdbRating;
                                    movie.ratingSource = "TMDB";
                                }
                            }
                        } catch (error) {
                            console.log(`Failed to fetch OMDB data for ${movie.Title}:`, error);
                            // If OMDB call fails, fall back to TMDB rating
                            if (movie.tmdbRating !== "N/A") {
                                movie.imdbRating = movie.tmdbRating;
                                movie.ratingSource = "TMDB";
                            }
                        }
                    });
                    
                    // Wait for all OMDB calls to complete
                    await Promise.all(omdbPromises);
                } else {
                    // If no OMDB API key, use TMDB ratings for all movies
                    transformedMovies.forEach(movie => {
                        if (movie.tmdbRating !== "N/A") {
                            movie.imdbRating = movie.tmdbRating;
                            movie.ratingSource = "TMDB";
                        }
                    });
                }

                // If it's the first page, replace movies, otherwise append
                if (page === 1) {
                    // Limit initial load to moviesPerPage (18 movies)
                    transformedMovies = transformedMovies.slice(0, moviesPerPage);
                    
                    // Cache search results with poster validation
                    cacheSearchResults(transformedMovies).then(enhancedMovies => {
                        setMovies(enhancedMovies);
                        setLoadingMovie(false); // Hide loader only after movies are set
                    }).catch(error => {
                        console.log('Some posters failed to validate:', error);
                        setMovies(transformedMovies); // Fallback to original movies
                        setLoadingMovie(false); // Hide loader only after movies are set
                    });
                } else {
                    // Filter out any duplicates before appending
                    const existingIds = new Set(movies.map(m => m.imdbID));
                    const newMovies = transformedMovies.filter(movie => !existingIds.has(movie.imdbID));
                    
                    // Cache new movies with poster validation
                    if (newMovies.length > 0) {
                        cacheSearchResults(newMovies).then(enhancedNewMovies => {
                            setMovies(prevMovies => [...prevMovies, ...enhancedNewMovies]);
                        }).catch(error => {
                            console.log('Some posters failed to validate:', error);
                            setMovies(prevMovies => [...prevMovies, ...newMovies]); // Fallback
                        });
                    }
                }
                
                // Update total results count
                setTotalResults(data.total_results);
                
                // Check if there are more pages
                setHasMorePages(page < data.total_pages);
                
            } else {
                setError('No movies found');
                setHasMorePages(false);
                setLoadingMovie(false); // Hide loader when no results found
            }


        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err); 
            setHasMorePages(false);
            setLoadingMovie(false); // Hide loader on error
        }
        // Note: setLoadingMovie(false) is now called in the success path after movies are set
    };

    const handleSearch = async (e) => {
        if (e) {
            e.preventDefault();
        }
        
        // Reset to page 1 when performing a new search
        setCurrentPage(1);
        setMovies([]);
        await fetchMovies(1);
    };

    const loadMoreMovies = async () => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        await fetchMovies(nextPage);
    };


    
    // Wrapper functions that check authentication first
    const handleAddToWatchlist = (movie) => {
        if (!user) {
            setLoginModalMovieTitle(movie.Title);
            setShowLoginModal(true);
            return;
        }
        toggleWishlistStatus(movie);
    };

    const handleAddToWatching = (movie) => {
        if (!user) {
            setLoginModalMovieTitle(movie.Title);
            setShowLoginModal(true);
            return;
        }
        addMovieToList(movie, 'currently_watching');
    };

    const handleAddToWatched = (movie, watchedDate) => {
        if (!user) {
            setLoginModalMovieTitle(movie.Title);
            setShowLoginModal(true);
            return;
        }
        addMovieToList(movie, 'watched', watchedDate);
    };

    // Add movie to user's list
    const addMovieToList = async (movie, status, watchedDate = null) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                return;
            }

            // Check if movie already exists in any status for this user
            const movieIdToCheck = movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID;
            const existingMovie = savedMovies.find(savedMovie => 
                savedMovie.movies.movie_id === movieIdToCheck
            );

            if (existingMovie && existingMovie.status !== status) {
                // Movie exists in a different status, show modal to ask user if they want to move it
                const existingStatusText = existingMovie.status === 'currently_watching' ? 'watching' : existingMovie.status;
                const newStatusText = status === 'currently_watching' ? 'watching' : status;
                
                setConfirmModalData({
                    movie: movie,
                    newStatus: status,
                    existingStatus: existingMovie.status,
                    watchedDate: watchedDate
                });
                setShowConfirmModal(true);
                return;
            } else if (existingMovie && existingMovie.status === status) {
                const statusText = status === 'currently_watching' ? 'watching' : status;
                showError(`"${movie.Title}" is already in your ${statusText} list!`);
                return;
            }

            // Debug: Log the data being sent to API
            const requestData = {
                userId: session.user.id,
                userEmail: session.user.email,
                movieData: movie,
                status: status,
                watchedDate: watchedDate
            };
            
            console.log('MovieSearch - Sending to API:', {
                userId: requestData.userId,
                userEmail: requestData.userEmail,
                movieTitle: requestData.movieData.Title,
                status: requestData.status
            });

            // Use the API endpoint for all statuses including watching (now that we use user_movies table)
            const response = await fetch('/api/movies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to add movie: ${response.status} - ${errorText}`);
                }

            // Success! Refresh the saved movies list to get the updated state
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }

            // Show appropriate success message
            let actionText = status === 'currently_watching' ? 'Added to watching list' : 
                           status === 'watched' ? 'Added to watched list' : 
                           'Added to watchlist';
            showSuccess(`${actionText}: "${movie.Title}"!`);
            
                 } catch (error) {
             console.error('Error saving movie:', error);
             showError('Failed to save movie. Please try again.');
             // Re-throw the error so MovieCard can handle the state properly
             throw error;
         }
    };

    // Remove movie from watched list
    const removeWatchedStatus = async (movie) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (!sessionData.session) {
                showError('You need to be logged in to remove movies');
                return;
            }

            // First, find the movie in the movies table to get the correct movie_id
            const movieIdToFind = movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID;
            const { data: movieData, error: findError } = await supabase
                .from('movies')
                .select('id')
                .eq('movie_id', movieIdToFind)
                .single();

            if (findError || !movieData) {
                throw new Error('Movie not found in database');
            }

            // Use the API endpoint to delete the movie (this will also update the counter)
            const response = await fetch(`/api/movies?userId=${sessionData.session.user.id}&movieId=${movieData.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to remove movie: ${response.status} - ${errorText}`);
            }

            // Update the watchedMovies set
            setWatchedMovies(prev => {
                const newSet = new Set(prev);
                newSet.delete(movieIdToFind);
                return newSet;
            });

            // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }

            // No need to refresh search results - the UI will update automatically
            // when the parent state changes and the movie is no longer marked as watched

            showSuccess(`Removed "${movie.Title}" from your watched list!`);
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
            // Re-throw the error so MovieCard can handle the state properly
            throw error;
        }
    };

    // Handle modal confirmation
    const handleConfirmMove = async () => {
        setIsMovingMovie(true);
        try {
            const { movie, newStatus, watchedDate } = confirmModalData;
            await performMovieOperation(movie, newStatus, watchedDate);
        } catch (error) {
            console.error('Error moving movie:', error);
            showError('Failed to move movie. Please try again.');
        } finally {
            setIsMovingMovie(false);
            setShowConfirmModal(false);
            setConfirmModalData({
                movie: null,
                newStatus: null,
                existingStatus: null,
                watchedDate: null
            });
        }
    };

    // Handle modal cancellation
    const handleCancelMove = () => {
        setShowConfirmModal(false);
        setConfirmModalData({
            movie: null,
            newStatus: null,
            existingStatus: null,
            watchedDate: null
        });
    };

    // Perform the actual movie operation (extracted from addMovieToList)
    const performMovieOperation = async (movie, status, watchedDate = null) => {
        // Use the API endpoint for all statuses including watching (now that we use user_movies table)
        const response = await fetch('/api/movies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: (await validateSession()).user.id,
                    userEmail: (await validateSession()).user.email,
                    movieData: movie,
                    status: status,
                    watchedDate: watchedDate
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to add movie: ${response.status} - ${errorText}`);
            }

        // Success! Refresh the saved movies list to get the updated state
        if (fetchSavedMovies) {
            await fetchSavedMovies();
        }

        // Show appropriate success message
        let actionText = status === 'currently_watching' ? 'Added to watching list' : 
                       status === 'watched' ? 'Added to watched list' : 
                       'Added to watchlist';
        showSuccess(`${actionText}: "${movie.Title}"!`);
    };

    // Toggle wishlist status
    const toggleWishlistStatus = async (movie) => {
        const movieId = movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID;
        const isInWishlist = wishlistMovies.has(movieId);
        
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (!sessionData.session) {
                showError('You need to be logged in to manage your watchlist');
                return;
            }

            if (isInWishlist) {
                // Update local state optimistically for immediate UI feedback
                setWishlistMovies(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(movieId);
                    return newSet;
                });

                // First, find the movie in the movies table to get the correct movie_id
                const { data: movieData, error: findError } = await supabase
                    .from('movies')
                    .select('id')
                    .eq('movie_id', movieId)
                    .single();

                if (findError || !movieData) {
                    // Revert optimistic update on error
                    setWishlistMovies(prev => {
                        const newSet = new Set(prev);
                        newSet.add(movieId);
                        return newSet;
                    });
                    throw new Error('Movie not found in database');
                }

                // Use the API endpoint to delete the movie (this will also update the counter)
                const response = await fetch(`/api/movies?userId=${sessionData.session.user.id}&movieId=${movieData.id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    // Revert optimistic update on error
                    setWishlistMovies(prev => {
                        const newSet = new Set(prev);
                        newSet.add(movieId);
                        return newSet;
                    });
                    const errorText = await response.text();
                    throw new Error(`Failed to remove movie: ${response.status} - ${errorText}`);
                }

                // Update parent state after successful database operation
                if (setSavedMovies) {
                    setSavedMovies(prevMovies => 
                        prevMovies.filter(movie => 
                            !(movie.status === 'wishlist' && movie.movies.movie_id === movieId)
                        )
                    );
                }

                showSuccess(`"${movie.Title}" removed from your watchlist!`);
            } else {
                // Update local state optimistically for immediate UI feedback
                setWishlistMovies(prev => {
                    const newSet = new Set(prev);
                    newSet.add(movieId);
                    return newSet;
                });

                try {
                    // Add to database
                    await addMovieToList(movie, 'wishlist');
                    // Note: addMovieToList already handles parent state updates and success messages
                } catch (error) {
                    // Revert optimistic update on error
                    setWishlistMovies(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(movieId);
                        return newSet;
                    });
                    throw error;
                }
            }
            
            // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }
            
        } catch (error) {
            console.error('Error toggling wishlist status:', error);
            showError('Failed to update watchlist. Please try again.');
            
            // Revert optimistic updates on error
            setWishlistMovies(prev => {
                const newSet = new Set(prev);
                if (isInWishlist) {
                    newSet.add(movieId); // Re-add if we tried to remove
                } else {
                    newSet.delete(movieId); // Remove if we tried to add
                }
                return newSet;
            });

            // Revert parent state by refreshing from server
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }
            
            // Re-throw the error so MovieCard can handle the state properly
            throw error;
        }
    };

    //Check back again when you implement per page select
    // const handleMoviesPerPageChange = async (e) => {
    //     const newValue = Number(e.target.value);
    //     setMoviesPerPage(newValue);
    //     setCurrentPage(1);
    //     setMovies([]);
    //     await fetchMovies(1);
    // };

    // Fetch user's watched movies
    const fetchWatchedMovies = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (!sessionData.session) return;

            const { data, error } = await supabase
                .from('user_movies')
                .select('movie_imdb_id')
                .eq('user_id', sessionData.session.user.id)
                .eq('status', 'watched');

            if (error) throw error;

            // Create a Set of watched movie IDs for O(1) lookup
            const watchedSet = new Set(data.map(item => item.movie_imdb_id));
            setWatchedMovies(watchedSet);
        } catch (error) {
            console.error('Error fetching watched movies:', error);
        }
    };

    // Remove initial search - let users search manually

    return (
        <div>
            <form onSubmit={handleSearch} className="mb-4">
                <div className="relative w-full max-w-2xl mx-auto">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.3-4.3"></path>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search for movies and TV series..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-20 py-3 bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-black transition-all duration-200 hover:bg-gray-100 focus:bg-white"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setMovies([]);
                                        setError(null);
                                        setCurrentPage(1);
                                        setTotalResults(0);
                                        setHasMorePages(false);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200"
                                    title="Clear search"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            )}
                            <button
                                type="submit"
                                className="p-2.5 bg-white backdrop-blur-md hover:bg-white/20 border border-black/10 text-black rounded-full transition-colors flex items-center justify-center"
                                disabled={loadingMovie || !searchTerm.trim()}
                                title="Search"
                            >
                                {loadingMovie ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.3-4.3"></path>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {loadingMovie && currentPage === 1 && (
                <div className="flex flex-col items-center justify-center py-12">
                    {/* Attractive loading animation */}
                    <div className="relative mb-4">
                        {/* Outer spinning ring */}
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        {/* Inner pulsing dot */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-gray-600 font-medium">Searching for movies...</p>
                    <p className="text-gray-400 text-sm mt-1">Finding the perfect matches</p>
                </div>
            )}
            {error && <p className="text-center">{error}</p>}


            {movies.length > 0 && ( 
                <div className="mt-4">
                    {/* ======================================== Search results section ======================================== */}
                    {/* ======================================== Search results section ======================================== */}

                    <div className="flex justify-between items-center">
                        <h3 className="text-lg mb-2">
                            Movies & Series <small className='text-gray-600'>{totalResults > 0 ? `(${movies.length} of ${totalResults})` : ''}</small>
                        </h3>
                    </div>

                    {/* ======================================== Movie cards section ======================================== */}
                    {/* ======================================== Movie cards section ======================================== */}

                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                        {movies.map((movie, index) => (
                            <MovieCard
                                key={`${movie.imdbID}-${movie.tmdbID}-${index}`}
                                movie={movie}
                                onHover={() => null}
                                onLeave={() => null}
                                onClickWatched={(watchedDate) => handleAddToWatched(movie, watchedDate)}
                                onClickWatching={() => handleAddToWatching(movie)}
                                onClickWishlist={() => handleAddToWatchlist(movie)}
                                    onRemoveWatched={() => removeWatchedStatus(movie)}
                                    watched={watchedMovies.has(movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)}
                                    wishlist={wishlistMovies.has(movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)}
                                    cardType="search"
                                    onClick={() => onMovieClick && onMovieClick(movie)}
                            />
                        ))}
                    </div>
                    
                    {hasMorePages && (
                        <div className="text-center mt-4 mb-6">
                            <button 
                                onClick={loadMoreMovies} 
                                disabled={loadingMovie}
                                className="bg-gray-200 hover:bg-gray-300 text-black py-2 px-6 rounded-lg"
                            >
                                {loadingMovie ? 'Loading...' : 'Load More Movies'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={handleCancelMove}
                onConfirm={handleConfirmMove}
                title="Move Movie"
                message={
                    confirmModalData.movie 
                        ? `"${confirmModalData.movie.Title}" is already in your ${confirmModalData.existingStatus === 'currently_watching' ? 'watching' : confirmModalData.existingStatus} list. Do you want to move it to ${confirmModalData.newStatus === 'currently_watching' ? 'watching' : confirmModalData.newStatus}?`
                        : ''
                }
                confirmText="Yes, Move It"
                cancelText="Cancel"
                confirmButtonClass="bg-blue-600 hover:bg-blue-700"
                isLoading={isMovingMovie}
            />

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                movieTitle={loginModalMovieTitle}
            />
        </div>
    );
}