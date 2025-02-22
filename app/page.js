'use client'; // Add this line at the top

import { useState } from 'react';
import Image from "next/image";
import Link from 'next/link';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('');
    const [movies, setMovies] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMovies([]);

        try {
            if (!searchTerm.trim()) {
                setError('Please enter a search term.');
                setLoading(false);
                return;
            }

            const response = await fetch(
                `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&apikey=${process.env.NEXT_PUBLIC_OMDB_API_KEY}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.Response === 'True') {
                setMovies(data.Search);
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

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-gray-800 text-white p-4 text-center">
                <h1 className="text-2xl font-bold">Hello Kammo Ji 👀. 🔎 your Movie</h1>
            </header>
            <main className="flex-grow p-4">
                <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search for a movie..."
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
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {movies.map((movie) => (
                                <li key={movie.imdbID} className="border rounded p-4">
                                    <img
                                        src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                                        alt={movie.Title}
                                        className="max-w-full h-auto mb-2"
                                    />
                                    <div className="font-semibold">{movie.Title} ({movie.Year})</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </main>

            <footer className="bg-gray-800 text-white p-4 text-center">
                <div className="flex justify-center gap-6 flex-wrap">
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                        href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
                        Learn
                    </a>
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                        href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image aria-hidden src="/window.svg" alt="Window icon" width={16} height={16} />
                        Examples
                    </a>
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                        href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
                        Go to nextjs.org →
                    </a>
                </div>
            </footer>
        </div>
    );
}