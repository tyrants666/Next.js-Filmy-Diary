'use client'; // Add this line at the top

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from 'next/link';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('marvel');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);


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
                } else {
                    // If searching by IMDb ID, the result is a single movie object, not an array
                    setMovies([data]);
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

    //This is This is a temporaryuse effect to show the initial result for hello search on page load
    useEffect(() => {
      handleSearch(); // Run handleSearch when the component mounts
    }, []); // Empty dependency array means this runs only once

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-gray-800 text-white p-4 text-center">
                <h1 className="text-2xl font-bold">Want to be with you for ♾. 🔎 your Movie</h1>
            </header>
            <main className="flex-grow p-4">
                <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search for a movie (title or IMDb ID)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="p-2 border rounded w-full"
                    />
                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Search
                    </button>
                </form>

                {loading && <p className="text-center">Loading...</p>}
                {error && <p className="text-red-500 text-center">{error}</p>}

                {movies.length > 0 && (
                    <div className="mt-4">
                        <h2 className="text-xl font-semibold mb-2">Search Results</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {movies.map((movie) => (
                                <div key={movie.imdbID} className="border rounded p-4">
                                    <img
                                        src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                                        alt={movie.Title}
                                        className="max-w-full h-auto mb-2"
                                    />
                                    <div className="font-semibold">{movie.Title} ({movie.Year})</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <footer className="bg-gray-800 text-white p-4 text-center">
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