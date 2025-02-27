'use client'; // Add this line at the top

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from 'next/link';

export default function Home() {
    const [searchTerm, setSearchTerm] = useState('hello');
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
        <div className="min-h-screen flex flex-col relative z-3">
            <div className='container mx-auto'>
                <header className="p-4 m-4 mb-0 rounded-xl text-center">
                    <h1 className="text-2xl">Take care 👧</h1>
                </header>
                <main className="flex-grow p-4">
                    <form onSubmit={handleSearch} className="mb-4 flex space-x-2">
                        <input
                            type="text"
                            placeholder="Search for a movie (title or IMDb ID)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className=" bg-white/[.08] text-sm outline-none p-2 px-4 border-none rounded-lg w-full"
                        />
                        <button type="submit" className="bg-gray-800/60 hover:bg-gray-700/60 py-2 px-4 rounded-lg">
                            Search
                        </button>
                    </form>

                    {loading && <p className="text-center">Loading...</p>}
                    {error && <p className="text-red-500 text-center">{error}</p>}

                    {movies.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-lg mb-2">Search Results</h3>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                                {movies.map((movie) => (
                                <a key={movie.imdbID} href={`https://www.imdb.com/title/${movie.imdbID}/`} target='_blank' 
                                        className='shadow-custom flex flex-col hover:scale-105 rounded-xl overflow-hidden smoothie relative group min-w-0 shrink-0 grow-0 
                                        basis-[31.5%] sm:basis-[18.4%] lg:basis-[13.2%] xl:basis-[11.6%] 2xl:basis-[10.4%] max-w-[180px] !select-none'>
                                        <span className=''>
                                            <img
                                                src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                                                alt={movie.Title}
                                                className="!select-none shrink-0 undefined rounded-xl overflow-hidden"
                                            />
                                        </span>
                                        {/* <div className="text-sm mt-1">
                                            <p>{movie.Title} ({movie.Year})</p>
                                        </div> */}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <footer className="bg-card p-4 text-center">
              <ol className='mb-5'>
                <li><strong>💌 Change Logs</strong></li>
                <li>✨ height fix</li>
                <li>✨ Added new fonts</li>
                <li>🐭 Now On movie click opens IMDB page</li>
                <li></li>
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