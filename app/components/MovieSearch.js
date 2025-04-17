'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import MovieCard from './MovieCard';

export default function MovieSearch({ onBackgroundChange, savedMovies = [], fetchSavedMovies }) {
    const [searchTerm, setSearchTerm] = useState('dragon');
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

            const apiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;
            let apiUrl = `https://www.omdbapi.com/?apikey=${apiKey}`;

            // Check if the search term looks like an IMDb ID (starts with "tt" followed by numbers)
            if (searchTerm.startsWith('tt') && !isNaN(searchTerm.slice(2))) {
                apiUrl += `&i=${searchTerm}`;
            } else {
                // Calculate how many pages we need to fetch to get the desired number of movies
                const pagesNeeded = Math.ceil(moviesPerPage / 10);
                let allMovies = [];
                let totalResultsCount = 0;
                
                // Fetch all required pages
                for (let i = 0; i < pagesNeeded; i++) {
                    const currentPageUrl = `${apiUrl}&s=${encodeURIComponent(searchTerm)}&page=${page + i}`;
                    const response = await fetch(currentPageUrl);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.Response === 'True' && data.Search) {
                        // Only add movies that aren't already in the list
                        const newMovies = data.Search.filter(movie => 
                            !allMovies.some(existingMovie => existingMovie.imdbID === movie.imdbID)
                        );
                        allMovies = [...allMovies, ...newMovies];
                        
                        // Store total results from first call
                        if (i === 0) {
                            totalResultsCount = parseInt(data.totalResults, 10);
                        }
                        
                        // If we've reached the total results or got enough movies, break
                        if (allMovies.length >= moviesPerPage || allMovies.length >= totalResultsCount) {
                            break;
                        }
                    } else {
                        throw new Error(data.Error || 'Failed to fetch movies');
                    }
                }
                
                // Trim the array to the exact number of movies requested
                allMovies = allMovies.slice(0, moviesPerPage);
                
                // If it's the first page, replace movies, otherwise append
                if (page === 1) {
                    setMovies(allMovies);
                    if (allMovies.length > 0 && allMovies[0].Poster !== "N/A") {
                        onBackgroundChange(allMovies[0].Poster);
                    }
                } else {
                    // Filter out any duplicates before appending
                    const existingIds = new Set(movies.map(m => m.imdbID));
                    const newMovies = allMovies.filter(movie => !existingIds.has(movie.imdbID));
                    setMovies(prevMovies => [...prevMovies, ...newMovies]);
                }
                
                // Update total results count
                setTotalResults(totalResultsCount);
                
                // Check if there are more pages
                const totalPages = Math.ceil(totalResultsCount / 10);
                const currentPageWithOffset = page + (pagesNeeded - 1);
                setHasMorePages(currentPageWithOffset < totalPages);
                
                setLoadingMovie(false);
                return;
            }

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.Response === 'True') {
                if (data.Search) {
                    // If it's the first page, replace movies, otherwise append
                    if (page === 1) {
                        setMovies(data.Search);
                        // Set the first movie's poster as the background if available
                        if (data.Search.length > 0 && data.Search[0].Poster !== "N/A") {
                            // onBackgroundChange(data.Search[0].Poster);
                        }
                    } else {
                        setMovies(prevMovies => [...prevMovies, ...data.Search]);
                    }
                    
                    // Update total results count
                    setTotalResults(parseInt(data.totalResults, 10));
                    
                    // Check if there are more pages
                    const totalPages = Math.ceil(parseInt(data.totalResults, 10) / 10);
                    setHasMorePages(page < totalPages);
                    
                } else {
                    // If searching by IMDb ID, the result is a single movie object, not an array
                    setMovies([data]);
                    if (data.Poster !== "N/A") {
                        onBackgroundChange(data.Poster);
                    }
                    setHasMorePages(false);
                }
            } else {
                setError(data.Error);
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
        const nextPage = currentPage + Math.ceil(moviesPerPage / 10);
        setCurrentPage(nextPage);
        await fetchMovies(nextPage);
    };

    // Handle hover on movie card
    const handleMovieHover = (poster) => {
        if (poster !== "N/A") {
            onBackgroundChange(poster);
        }
    };
    
    // Add movie to user's list
    const addMovieToList = async (movie, status) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            alert('Bugfix watched movie doesnt enters here');
            
            if (!sessionData.session) {
                alert('You need to be logged in to save movies');
                return;
            }
            
            // First check if movie exists in DB
            let { data: existingMovie } = await supabase
                .from('movies')
                .select('id')
                .eq('movie_id', movie.imdbID)
                .single();
                
            let movieId;
            
            if (existingMovie) {
                movieId = existingMovie.id;
            } else {
                // Add the movie to the movies table
                const { data: newMovie, error: movieError } = await supabase
                    .from('movies')
                    .insert({
                        movie_id: movie.imdbID,
                        title: movie.Title,
                        poster: movie.Poster,
                        year: movie.Year
                    })
                    .select('id')
                    .single();
                    
                if (movieError) {
                    throw movieError;
                }
                
                movieId = newMovie.id;
            }
            
            // Add to user's list
            const { error: listError } = await supabase
                .from('user_movies')
                .upsert({
                    user_id: sessionData.session.user.id,
                    user_email: sessionData.session.user.email,
                    movie_id: movieId,
                    movie_imdb_id: movie.imdbID,
                    movie_name: movie.Title,
                    status
                });
                
            if (listError) {
                throw listError;
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
                        saved_movies: (profile.saved_movies || 0) + 1
                    })
                    .eq('id', sessionData.session.user.id);

                if (updateError) {
                    console.error('Error updating saved_movies count:', updateError);
                }
            }

             // Call the callback to refresh the parent's savedMovies list
            if (fetchSavedMovies) {
                await fetchSavedMovies();
            }
            
            alert(`Added "${movie.Title}" to your ${status.replace('_', ' ')} list!`);
            
        } catch (error) {
            console.error('Error saving movie:', error);
            alert('Failed to save movie. Please try again.');
        }
    };

    // Remove movie from watched list
    const removeWatchedStatus = async (movie) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (!sessionData.session) {
                alert('You need to be logged in to remove movies');
                return;
            }

            // Delete the movie from user_movies
            const { error: deleteError } = await supabase
                .from('user_movies')
                .delete()
                .eq('user_id', sessionData.session.user.id)
                .eq('movie_imdb_id', movie.imdbID)
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

            alert(`Removed "${movie.Title}" from your watched list!`);
            
        } catch (error) {
            console.error('Error removing movie:', error);
            alert('Failed to remove movie. Please try again.');
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
        handleSearch();
    }, []);

    return (
        <div>
            <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                <input
                    type="text"
                    placeholder="Search for a movie (title or IMDb ID)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/[.08] outline-none p-2 px-4 border-none rounded-lg w-full placeholder-gray-300"
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
                <button type="submit" className="bg-white/[.08] hover:bg-white/[.18] py-2 px-4 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="text-gray-300"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
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
                            Search Results <small className='text-gray-400'>{totalResults > 0 ? `(${movies.length} of ${totalResults})` : ''}</small>
                        </h3>
                        <h3 className="gap-[7px] text-lg mb-2 flex">
                            <div className="flex items-center gap-2  text-sm">
                                {/* <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="12" r="3" className="fill-gray-400"/>
                                </svg> */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                                    <polyline points="17 2 12 7 7 2"/>
                                    {/* <line x1="7" y1="12" x2="17" y2="12"/>
                                    <line x1="7" y1="15" x2="17" y2="15"/>
                                    <line x1="7" y1="18" x2="17" y2="18"/> */}
                                </svg>
                            </div>
                            <span className='text-sm'>How to Train Your Dragon 2</span>
                            {/* {savedMovies.filter(m => m.status === 'watching').map(movie => (
                                <span key={movie.id} className="text-sm">
                                    {movie.movies.title}
                                </span>
                            ))} */}
                        </h3>
                    </div>

                    {/* ======================================== Movie cards section ======================================== */}
                    {/* ======================================== Movie cards section ======================================== */}

                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                        {movies.map((movie) => (
                            <MovieCard
                                key={movie.imdbID}
                                movie={movie}
                                onHover={() => handleMovieHover(movie.Poster)}
                                onLeave={() => null}
                                onClickWatched={() => addMovieToList(movie, 'watched')}
                                onClickWatching={() => addMovieToList(movie, 'watching')}
                                onRemoveWatched={() => removeWatchedStatus(movie)}
                                watched={watchedMovies.has(movie.imdbID)}
                            />
                        ))}
                    </div>
                    
                    {hasMorePages && (
                        <div className="text-center mt-4 mb-6">
                            <button 
                                onClick={loadMoreMovies} 
                                disabled={loadingMovie}
                                className="bg-white/[.08] hover:bg-white/[.18] py-2 px-6 rounded-lg"
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