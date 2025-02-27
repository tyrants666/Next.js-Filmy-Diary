'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import BackBlur from './components/BackBlur';
import MovieCard from './components/MovieCard';
import Link from 'next/link';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('sholay');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState('https://m.media-amazon.com/images/M/MV5BMzgzYjM4NTUtOTlhMS00MTJmLTkxZjgtYWY4NjI1ZWRiNGU4XkEyXkFqcGc@._V1_SX300.jpg');

    const handleSearch = async (e) => {
        if (e) {
            e.preventDefault();
        }
        setLoading(true);
        setError(null);
        setMovies([]);

        try {
            if (!searchTerm.trim()) {
                setError('Please enter a search term.');
                setLoading(false);
                return;
            }

            let apiUrl = `https://www.omdbapi.com/?apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY}`;

            // Check if the search term looks like an IMDb ID (starts with "tt" followed by numbers)
            if (searchTerm.startsWith('tt') && !isNaN(searchTerm.slice(2))) {
                apiUrl += `&i=${searchTerm}`;
            } else {
                apiUrl += `&s=${encodeURIComponent(searchTerm)}`;
            }

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            //Console list of resulted data
            console.log(data);

            if (data.Response === 'True') {
                if (data.Search) {
                    setMovies(data.Search);
                    // Set the first movie's poster as the background if available
                    if (data.Search.length > 0 && data.Search[0].Poster !== "N/A") {
                        setBackgroundImage(data.Search[0].Poster);
                    }
                } else {
                    // If searching by IMDb ID, the result is a single movie object, not an array
                    setMovies([data]);
                    if (data.Poster !== "N/A") {
                        setBackgroundImage(data.Poster);
                    }
                }
            } else {
                setError(data.Error);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Handle hover on movie card
    const handleMovieHover = (poster) => {
        if (poster !== "N/A") {
            setBackgroundImage(poster);
        }
    };

    //This is a temporary use effect to show the initial result for hello search on page load
    useEffect(() => {
        handleSearch(); // Run handleSearch when the component mounts
    }, []); // Empty dependency array means this runs only once

    return (
        <div className="min-h-screen flex flex-col relative z-3">

            <BackBlur backgroundImage={backgroundImage}/>

            <div className='container mx-auto'>
                <header className="p-4 m-4 mb-0 rounded-xl text-center">
                    <h1 className="text-2xl">🌼🌼🌼</h1>
                </header>
                <main className="flex-grow p-4">
                    <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                        <input
                            type="text"
                            placeholder="Search for a movie (title or IMDb ID)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className=" bg-white/[.08] outline-none p-2 px-4 border-none rounded-lg w-full placeholder-gray-300"
                        />
                        <button type="submit" className="bg-white/[.08] hover:bg-white/[.18] py-2 px-4 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className="text-gray-300"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
                            </svg>
                        </button>
                    </form>

                    {loading && <p className="text-center">Loading...</p>}
                    {error && <p className="text-red-500 text-center">{error}</p>}

                    {movies.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-lg mb-2">Search Results</h3>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">

                                {movies.map((movie) => (
                                    <MovieCard
                                        key={movie.imdbID}
                                        movie={movie}
                                        onHover={() => handleMovieHover(movie.Poster)}
                                        onLeave={() => null}
                                    />
                                ))}

                            </div>
                        </div>
                    )}
                </main>
            </div>

            <footer className="bg-card p-4 text-center">
                <ol className='mb-5'>
                    <li><strong>💌 Change Logs</strong></li>
                    <li>🐭 Now On movie click opens IMDB page</li>
                    <li>✨ Background changes based on hovered movie poster</li>
                </ol>
                <div className="flex justify-center gap-6 flex-wrap">
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                        href="/home"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
                        Next.JS Home
                    </a>
                </div>
            </footer>
        </div>
    );
}