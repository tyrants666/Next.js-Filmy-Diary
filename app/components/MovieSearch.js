'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import MovieCard from './MovieCard';

export default function MovieSearch({ savedMovies = [], fetchSavedMovies, setSavedMovies }) {
    const { showSuccess, showError, showInfo } = useToast();
    const { validateSession } = useAuth();

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

    // Create a Set of watched movie IDs for O(1) lookup
    const [wishlistMovies, setWishlistMovies] = useState(new Set());
    
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
                    setMovies(transformedMovies);
                } else {
                    // Filter out any duplicates before appending
                    const existingIds = new Set(movies.map(m => m.imdbID));
                    const newMovies = transformedMovies.filter(movie => !existingIds.has(movie.imdbID));
                    setMovies(prevMovies => [...prevMovies, ...newMovies]);
                }
                
                // Update total results count
                setTotalResults(data.total_results);
                
                // Check if there are more pages
                setHasMorePages(page < data.total_pages);
                
            } else {
                setError('No movies found');
                setHasMorePages(false);
            }


        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err); 
            setHasMorePages(false);
        } finally {
            setLoadingMovie(false);
        }
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


    
    // Add movie to user's list
    const addMovieToList = async (movie, status, watchedDate = null) => {
        try {
            // Validate session first
            const session = await validateSession();
            
            if (!session) {
                showError('Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            // Check if movie already exists in any status for this user
            const movieIdToCheck = movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID;
            const existingMovie = savedMovies.find(savedMovie => 
                savedMovie.movies.movie_id === movieIdToCheck
            );

            if (existingMovie && existingMovie.status !== status) {
                // Movie exists in a different status, ask user if they want to move it
                const confirmMove = window.confirm(
                    `"${movie.Title}" is already in your ${existingMovie.status} list. Do you want to move it to ${status}?`
                );
                if (!confirmMove) {
                    return;
                }
            } else if (existingMovie && existingMovie.status === status) {
                showError(`"${movie.Title}" is already in your ${status} list!`);
                return;
            }

            if (status === 'watching') {
                // Handle watching status directly with Supabase to avoid RLS issues
                // First check if movie exists in DB (try IMDB ID first, then TMDB ID as fallback)
                let { data: existingMovie } = await supabase
                    .from('movies')
                    .select('id')
                    .eq('movie_id', movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)
                    .maybeSingle();
                    
                let movieId;
                
                if (existingMovie) {
                    movieId = existingMovie.id;
                } else {
                    // Add the movie to the movies table
                    const { data: newMovie, error: movieError } = await supabase
                        .from('movies')
                        .insert({
                            movie_id: movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID,
                            title: movie.Title,
                            poster: movie.Poster,
                            year: movie.Year,
                            rating: movie.imdbRating || "N/A",
                            rating_source: movie.ratingSource || "N/A"
                        })
                        .select('id')
                        .single();
                        
                    if (movieError) {
                        throw movieError;
                    }
                    
                    movieId = newMovie.id;
                }

                // Remove any existing watching movie (only one can be watched at a time)
                await supabase
                    .from('watching')
                    .delete()
                    .eq('user_id', session.user.id);

                // Insert new watching movie with the exact structure that works
                const { error: watchingError } = await supabase
                    .from('watching')
                    .upsert({
                        user_id: session.user.id,
                        user_email: session.user.email,
                        movie_id: movieId,
                        movie_imdb_id: movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID,
                        movie_name: movie.Title
                    }, {
                        onConflict: 'user_id'
                    });
                    
                if (watchingError) {
                    console.error('Watching table error:', watchingError);
                    throw watchingError;
                }
            } else {
                // Use the API endpoint for other statuses (watched, wishlist)
                const response = await fetch('/api/movies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: session.user.id,
                        userEmail: session.user.email,
                        movieData: movie,
                        status: status,
                        watchedDate: watchedDate
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to add movie: ${response.status} - ${errorText}`);
                }
            }

            // Success! Refresh the saved movies list to get the updated state
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }

            // Show appropriate success message
            let actionText = status === 'watching' ? 'Now watching' : 
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

            // Delete the movie from user_movies using the correct movie_id (primary key)
            const { error: deleteError } = await supabase
                .from('user_movies')
                .delete()
                .eq('user_id', sessionData.session.user.id)
                .eq('movie_id', movieData.id)
                .eq('status', 'watched');

            if (deleteError) {
                throw deleteError;
            }

            // Update saved_movies count in profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('saved_movies')
                .eq('id', sessionData.session.user.id)
                .single();

            if (profile !== null) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        saved_movies: Math.max(0, (profile.saved_movies || 0) - 1)
                    })
                    .eq('id', sessionData.session.user.id);

                if (updateError) {
                    console.error('Error updating saved_movies count:', updateError);
                }
            }

            // Update the watchedMovies set
            setWatchedMovies(prev => {
                const newSet = new Set(prev);
                newSet.delete(movieIdToFind);
                return newSet;
            });

            // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                console.log('Refreshing saved movies list after removal...');
                await fetchSavedMovies();
            }

            // Refresh the current search results to ensure UI is in sync
            console.log('Refreshing search results after removal...');
            await fetchMovies(currentPage);

            showSuccess(`Removed "${movie.Title}" from your watched list!`);
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
            // Re-throw the error so MovieCard can handle the state properly
            throw error;
        }
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
                // Update local state optimistically
                setWishlistMovies(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(movieId);
                    return newSet;
                });

                // Update parent state optimistically
                if (setSavedMovies) {
                    setSavedMovies(prevMovies => 
                        prevMovies.filter(movie => 
                            !(movie.status === 'wishlist' && movie.movies.movie_id === movieId)
                        )
                    );
                }

                // Remove from database
                const { error: deleteError } = await supabase
                    .from('user_movies')
                    .delete()
                    .eq('user_id', sessionData.session.user.id)
                    .eq('movie_imdb_id', movieId)
                    .eq('status', 'wishlist');

                if (deleteError) {
                    throw deleteError;
                }

                showSuccess(`"${movie.Title}" removed from your watchlist!`);
            } else {
                // Update local state optimistically first
                setWishlistMovies(prev => {
                    const newSet = new Set(prev);
                    newSet.add(movieId);
                    return newSet;
                });

                // Update parent state optimistically
                if (setSavedMovies) {
                    const newWatchlistMovie = {
                        id: Date.now(), // Temporary ID
                        status: 'wishlist',
                        movies: {
                            id: Date.now(), // Temporary ID
                            movie_id: movieId,
                            title: movie.Title,
                            poster: movie.Poster,
                            year: movie.Year,
                            rating: movie.imdbRating,
                            rating_source: movie.ratingSource
                        }
                    };
                    setSavedMovies(prevMovies => [...prevMovies, newWatchlistMovie]);
                }

                // Add to database
                await addMovieToList(movie, 'wishlist');
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
            <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder="Search for movies and TV series..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-100 outline-none p-2 px-4 pr-10 border border-gray-300 rounded-lg w-full placeholder-gray-500 text-black"
                    />
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
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear search"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    )}
                </div>
                {/* <select
                    value={moviesPerPage}
                    onChange={handleMoviesPerPageChange}
                    className="bg-white/[.08] outline-none p-2 px-4 border-none rounded-lg text-gray-300"
                >
                    <option value="9">9 per page</option>
                    <option value="18">18 per page</option>
                    <option value="30">30 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                </select> */}
                <button type="submit" className="bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="text-black"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
                    </svg>
                </button>
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
                        <h3 className="gap-[7px] text-lg mb-2 flex">
                            <div className="flex items-center gap-2  text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="12" r="3" className="fill-gray-400"/>
                                </svg>
                                {/* <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                                    <polyline points="17 2 12 7 7 2"/>
                                    <line x1="7" y1="12" x2="17" y2="12"/>
                                    <line x1="7" y1="15" x2="17" y2="15"/>
                                    <line x1="7" y1="18" x2="17" y2="18"/>
                                </svg> */}
                            </div>
                            {savedMovies.filter(m => m.status === 'watching').length > 0 ? (
                                savedMovies.filter(m => m.status === 'watching').map((movie, index) => (
                                    <span key={movie.id} className="text-sm">
                                        {movie.movies.title}
                                        {index < savedMovies.filter(m => m.status === 'watching').length - 1 && ', '}
                                    </span>
                                ))
                            ) : (
                                <span className='text-sm text-gray-500'>No movies currently watching</span>
                            )}
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
                                onClickWatched={(watchedDate) => addMovieToList(movie, 'watched', watchedDate)}
                                onClickWatching={() => addMovieToList(movie, 'watching')}
                                onClickWishlist={() => toggleWishlistStatus(movie)}
                                onRemoveWatched={() => removeWatchedStatus(movie)}
                                watched={watchedMovies.has(movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)}
                                wishlist={wishlistMovies.has(movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)}
                                cardType="search"
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
        </div>
    );
}