'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import MovieCard from './MovieCard';

export default function MovieSearch({ savedMovies = [], fetchSavedMovies }) {
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
    const [searchTerm, setSearchTerm] = useState('Roma');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loadingMovie, setLoadingMovie] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMorePages, setHasMorePages] = useState(false);
    const [moviesPerPage, setMoviesPerPage] = useState(18);
    const [watchedMovies, setWatchedMovies] = useState(new Set());

    // Create a Set of watched movie IDs for O(1) lookup
    useEffect(() => {
        const watchedSet = new Set(
            savedMovies
                .filter(item => item.status === 'watched')
                .map(item => item.movies.movie_id)
        );
        setWatchedMovies(watchedSet);
    }, [savedMovies]);

    const fetchMovies = async (page = 1) => {
        setLoadingMovie(true);
        setError(null);

        try {
            if (!searchTerm.trim()) {
                setError('Please enter a search term.');
                setLoadingMovie(false);
                return;
            }

            const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
            const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
            
            // TMDB search endpoint
            const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchTerm)}&page=${page}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Transform TMDB data to match OMDB structure
                let transformedMovies = data.results.map(movie => {
                    const tmdbPosterUrl = movie.poster_path ? `${baseImageUrl}${movie.poster_path}` : "N/A";
                    
                    console.log(`TMDB Movie: ${movie.title} - Poster Path: ${movie.poster_path} - Full URL: ${tmdbPosterUrl}`);
                    
                    return {
                        tmdbID: movie.id.toString(), // Store TMDB ID separately
                        imdbID: "N/A", // Will be populated from OMDB if available
                        Title: movie.title,
                        Poster: validatePosterUrl(tmdbPosterUrl, "TMDB"),
                        Year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "N/A",
                        Type: "movie", // TMDB search/movie always returns movies
                        imdbRating: "N/A", // Default rating
                        tmdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A", // TMDB rating as fallback
                        ratingSource: "N/A", // Track which source provided the rating
                        posterSource: movie.poster_path ? "TMDB" : "None"
                    };
                });

                // Fetch OMDB data for posters and ratings
                const omdbApiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
                
                if (omdbApiKey) {
                    const omdbPromises = transformedMovies.map(async (movie) => {
                        try {
                            const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(movie.Title)}&y=${movie.Year}&type=movie`;
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
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            
            // First check if movie exists in DB (try IMDB ID first, then TMDB ID as fallback)
            let { data: existingMovie } = await supabase
                .from('movies')
                .select('id')
                .eq('movie_id', movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)
                .maybeSingle(); // Use maybeSingle() to handle cases where movie doesn't exist yet
                
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
                    .single(); // Keep .single() here as INSERT should always return exactly 1 row
                    
                if (movieError) {
                    throw movieError;
                }
                
                movieId = newMovie.id;
            }
            
            if (status === 'watching') {
                // For watching status, use the new watching table with unique constraint
                console.log('Attempting to add to watching table:', {
                    user_id: session.user.id,
                    movie_id: movieId,
                    movie_name: movie.Title
                });
                
                const { data: watchingData, error: watchingError } = await supabase
                    .from('watching')
                    .upsert({
                        user_id: session.user.id,
                        user_email: session.user.email,
                        movie_id: movieId,
                        movie_imdb_id: movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID,
                        movie_name: movie.Title
                    }, {
                        onConflict: 'user_id'
                    })
                    .select();
                    
                if (watchingError) {
                    console.error('Watching table error:', watchingError);
                    throw watchingError;
                }
                
                console.log('Successfully added to watching table:', watchingData);
                showSuccess(`Now watching "${movie.Title}"!`);
            } else {
                // For other statuses (like watched), use the regular user_movies table
                const upsertData = {
                    user_id: session.user.id,
                    user_email: session.user.email,
                    movie_id: movieId,
                    movie_imdb_id: movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID,
                    movie_name: movie.Title,
                    status
                };

                // Add watched_date if status is 'watched'
                if (status === 'watched') {
                    upsertData.watched_date = watchedDate || new Date().toISOString();
                }

                const { error: listError } = await supabase
                    .from('user_movies')
                    .upsert(upsertData);
                    
                if (listError) {
                    throw listError;
                }

                // Update saved_movies count in profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('saved_movies')
                    .eq('id', session.user.id)
                    .single();

                if (profile !== null) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            saved_movies: (profile.saved_movies || 0) + 1
                        })
                        .eq('id', session.user.id);

                    if (updateError) {
                        console.error('Error updating saved_movies count:', updateError);
                    }
                }
                
                showSuccess(`Added "${movie.Title}" to your ${status.replace('_', ' ')} list!`);
            }

             // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }
            
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

            // Delete the movie from user_movies
            const { error: deleteError } = await supabase
                .from('user_movies')
                .delete()
                .eq('user_id', sessionData.session.user.id)
                .eq('movie_imdb_id', movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)
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
                newSet.delete(movie.imdbID);
                return newSet;
            });

            // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }

            // Refresh the current search results to ensure UI is in sync
            await fetchMovies(currentPage);

            showSuccess(`Removed "${movie.Title}" from your watched list!`);
            
                 } catch (error) {
             console.error('Error removing movie:', error);
             showError('Failed to remove movie. Please try again.');
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

    // This effect runs the initial search when component mounts
    useEffect(() => {
        // Reset to page 1 when performing initial search
        setCurrentPage(1);
        setMovies([]);
        fetchMovies(1);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                <input
                    type="text"
                    placeholder="Search for a movie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 outline-none p-2 px-4 border border-gray-300 rounded-lg w-full placeholder-gray-500 text-black"
                />
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

            {loadingMovie && currentPage === 1 && <p className="text-center">Loading...</p>}
            {error && <p className="text-center">{error}</p>}

            {movies.length > 0 && ( 
                <div className="mt-4">
                    {/* ======================================== Search results section ======================================== */}
                    {/* ======================================== Search results section ======================================== */}

                    <div className="flex justify-between items-center">
                        <h3 className="text-lg mb-2">
                            Search Results <small className='text-gray-600'>{totalResults > 0 ? `(${movies.length} of ${totalResults})` : ''}</small>
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
                                onRemoveWatched={() => removeWatchedStatus(movie)}
                                watched={watchedMovies.has(movie.imdbID !== "N/A" ? movie.imdbID : movie.tmdbID)}
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