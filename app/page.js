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
    const { user, loading, signOut } = useAuth()
    const { showSuccess, showError } = useToast()
    const router = useRouter()

    // Fetch user's saved movies
    const fetchSavedMovies = async () => {
        if (!user) return;
        
        setLoadingSavedMovies(true);
        try {
            // Fetch regular saved movies (watched, etc.)
            const { data: userMoviesData, error: userMoviesError } = await supabase
                .from('user_movies')
                .select(`
                    id,
                    status,
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
            
            // Update the savedMovies state
            setSavedMovies(combinedData);
            
        } catch (error) {
            console.error('Error fetching saved movies:', error);
        } finally {
            setLoadingSavedMovies(false);
        }
    };

    // Remove movie from watched list
    const removeWatchedStatus = async (movieId) => {
        try {
            if (!user) {
                showError('You need to be logged in to remove movies');
                return;
            }

            // Delete the movie from user_movies
            const { error: deleteError } = await supabase
                .from('user_movies')
                .delete()
                .eq('user_id', user.id)
                .eq('movie_id', movieId)
                .eq('status', 'watched');

            if (deleteError) {
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

            // Refresh the saved movies list
            await fetchSavedMovies();

            showSuccess('Movie removed from your watched list!');
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    // Remove movie from watching list
    const removeWatchingStatus = async (movieId) => {
        try {
            if (!user) {
                showError('You need to be logged in to remove movies');
                return;
            }

            // Delete the movie from watching table
            const { error: deleteError } = await supabase
                .from('watching')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                throw deleteError;
            }

            // Refresh the saved movies list
            await fetchSavedMovies();

            showSuccess('Movie removed from your watching list!');
            
        } catch (error) {
            console.error('Error removing movie:', error);
            showError('Failed to remove movie. Please try again.');
        }
    };

    // Move movie from watching to watched
    const moveWatchingToWatched = async (movieId, movieData) => {
        try {
            if (!user) {
                showError('You need to be logged in to update movies');
                return;
            }

            // Remove from watching table
            const { error: removeWatchingError } = await supabase
                .from('watching')
                .delete()
                .eq('user_id', user.id);

            if (removeWatchingError) {
                throw removeWatchingError;
            }

            // Add to watched in user_movies table
            const { error: addWatchedError } = await supabase
                .from('user_movies')
                .upsert({
                    user_id: user.id,
                    user_email: user.email,
                    movie_id: movieId,
                    movie_imdb_id: movieData.imdbID,
                    movie_name: movieData.Title,
                    status: 'watched'
                });

            if (addWatchedError) {
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

            // Refresh the saved movies list
            await fetchSavedMovies();

            showSuccess(`"${movieData.Title}" moved to watched list!`);
            
        } catch (error) {
            console.error('Error moving movie to watched:', error);
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

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        } else if (user) {
            fetchSavedMovies();
        }
    }, [user, loading, router]);

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
                    <h1 className="text-2xl font-bold">Filmy Diary</h1>
                    <div className="flex items-center gap-4">
                        <span>{user.user_metadata?.name?.split(' ')[0] || user.email}</span>
                        <button onClick={signOut} className="bg-gray-200 hover:bg-gray-300 text-black py-2 px-4 rounded-lg">
                            Sign Out
                        </button>
                    </div>
                </header>
                <main className="flex-grow p-4">
                    {/* Search section */}
                    <MovieSearch 
                        savedMovies={savedMovies} 
                        fetchSavedMovies={fetchSavedMovies}
                    />
                    
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
                                                    onClickWatched={() => moveWatchingToWatched(item.movies.id, transformSavedMovieToCardFormat(item))}
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
                        </div>
                    ) : (
                        <div className="text-center mt-8 p-6 bg-gray-100 rounded-lg border border-gray-300">
                            <p>You haven&apos;t saved any movies yet.</p>
                            <p className="mt-2 text-gray-600">Search for movies and add them to your collection!</p>
                        </div>
                    )}
                </main>
            </div>

            <div className='text-center w-full flex justify-center py-6'>
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