'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import PublicMovieSliders from '../components/PublicMovieSliders';
import MovieInfoSlider from '../components/MovieInfoSlider';
import MovieSearch from '../components/MovieSearch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';
import { IoCompass } from 'react-icons/io5';

export default function ExplorePage() {
    const { user, loading } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);

    // Handle movie click to open info slider
    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsSliderOpen(true);
    };

    // Handle search state changes from MovieSearch component
    const handleSearchStateChange = (isActive) => {
        setIsSearchActive(isActive);
    };

    // Add movie to watched list
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
        } catch (error) {
            console.error('Error adding to watched:', error);
            showError('Failed to add movie to watched list');
        }
    };

    // Add movie to watching list
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
        } catch (error) {
            console.error('Error adding to watching:', error);
            showError('Failed to add movie to watching list');
        }
    };

    // Add movie to watchlist
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
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            showError('Failed to add movie to watchlist');
        }
    };

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

    // Redirect to home if not logged in
    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
            <div className='container mx-auto text-black px-4'>
                <Header currentPage="explore" showSearch={false} />
                
                {/* Search Component - Above heading */}
                <MovieSearch 
                    savedMovies={[]} 
                    fetchSavedMovies={() => {}}
                    setSavedMovies={() => {}}
                    onSearchStateChange={handleSearchStateChange}
                    user={user}
                    onMovieClick={handleMovieClick}
                />
                
                <main className="flex-grow pb-4">
                    <div className="mb-6 mt-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <IoCompass className="w-8 h-8 text-blue-600" />
                            Explore Movies
                        </h1>
                        <p className="text-gray-600 mt-2">Discover popular movies from around the world</p>
                    </div>

                    {/* Show sliders only when not searching */}
                    {!isSearchActive && (
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
                            await addToWatched(selectedMovie, watchedDate);
                        }
                    }}
                    onClickWatching={async () => {
                        if (selectedMovie) {
                            await addToWatching(selectedMovie);
                        }
                    }}
                    onClickWishlist={async () => {
                        if (selectedMovie) {
                            await addToWatchlist(selectedMovie);
                        }
                    }}
                    onActionComplete={() => {
                        setIsSliderOpen(false);
                    }}
                    watched={false}
                    wishlist={false}
                    cardType="public"
                />
            </div>
        </div>
    );
}
