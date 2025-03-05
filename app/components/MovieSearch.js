'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import MovieCard from './MovieCard';

export default function MovieSearch({ onBackgroundChange }) {
    const [searchTerm, setSearchTerm] = useState('dragon');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loadingMovie, setLoadingMovie] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMorePages, setHasMorePages] = useState(false);

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
                apiUrl += `&s=${encodeURIComponent(searchTerm)}&page=${page}`;
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
        const nextPage = currentPage + 1;
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
            
            alert(`Added "${movie.Title}" to your ${status.replace('_', ' ')} list!`);
            
        } catch (error) {
            console.error('Error saving movie:', error);
            alert('Failed to save movie. Please try again.');
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
                    <h3 className="text-lg mb-2">
                        Search Results <small className='text-gray-400'>{totalResults > 0 ? `(${movies.length} of ${totalResults})` : ''}</small>
                    </h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                        {movies.map((movie) => (
                                <MovieCard
                                    key={movie.imdbID}
                                    movie={movie}
                                    onHover={() => handleMovieHover(movie.Poster)}
                                    onLeave={() => null}
                                    onClickWatched={() => addMovieToList(movie, 'watched')}
                                    onClickWatching={() => addMovieToList(movie, 'watching')}
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