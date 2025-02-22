'use client'; // Add this line at the top

import { useState } from 'react';

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
        <div>
            <h1>Movie Search</h1>
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search for a movie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {movies.length > 0 && (
                <div>
                    <h2>Search Results</h2>
                    <ul>
                        {movies.map((movie) => (
                            <li key={movie.imdbID}>
                                <img src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"} alt={movie.Title} style={{ maxWidth: '100px' }} />
                                {movie.Title} ({movie.Year})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}