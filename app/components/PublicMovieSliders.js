'use client';

import { useState, useEffect } from 'react';
import MovieSlider from './MovieSlider';
import TMDBBanner from './TMDBBanner';
import { IoTrendingUp, IoFilm, IoStar, IoCalendar, IoFlame } from 'react-icons/io5';

const PublicMovieSliders = ({ onMovieClick }) => {
    const [bollywoodMovies, setBollywoodMovies] = useState([]);
    const [nepaliMovies, setNepaliMovies] = useState([]);
    const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
    const [topRatedMovies, setTopRatedMovies] = useState([]);
    const [upcomingMovies, setUpcomingMovies] = useState([]);
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Transform TMDB movie/TV data to our format
    const transformTMDBMovie = (item) => ({
        tmdbID: item.id.toString(),
        imdbID: "N/A",
        Title: item.title || item.name,
        Year: item.release_date ? new Date(item.release_date).getFullYear().toString() : 
              item.first_air_date ? new Date(item.first_air_date).getFullYear().toString() : "N/A",
        Type: item.media_type || (item.title ? "movie" : "series"),
        Poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "N/A",
        Plot: item.overview || "N/A",
        imdbRating: item.vote_average ? item.vote_average.toFixed(1) : "N/A",
        ratingSource: "TMDB",
        releaseDate: item.release_date || item.first_air_date || "1900-01-01",
    });

    useEffect(() => {
        const fetchAllMovies = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

                // Fetch Bollywood (Indian Hindi content - latest + trending, only released, with posters)
                const today = new Date().toISOString().split('T')[0];
                
                // Fetch latest released Bollywood movies
                const bollywoodLatestResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_original_language=hi&sort_by=release_date.desc&release_date.lte=${today}&page=1`
                );
                const bollywoodLatestData = await bollywoodLatestResponse.json();
                
                // Fetch trending Bollywood movies
                const bollywoodTrendingResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_original_language=hi&sort_by=popularity.desc&release_date.lte=${today}&page=1`
                );
                const bollywoodTrendingData = await bollywoodTrendingResponse.json();
                
                // Combine and deduplicate
                const bollywoodCombined = [
                    ...(bollywoodLatestData.results || []),
                    ...(bollywoodTrendingData.results || [])
                ];
                const uniqueBollywood = Array.from(new Map(bollywoodCombined.map(item => [item.id, item])).values());
                
                const bollywoodTransformed = uniqueBollywood.map(transformTMDBMovie);
                // Filter: only released movies with posters
                const bollywoodFiltered = bollywoodTransformed.filter(movie => 
                    new Date(movie.releaseDate) <= new Date() && movie.Poster !== "N/A"
                );
                setBollywoodMovies(
                    bollywoodFiltered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 25)
                );

                // Fetch Nepali content (only released movies/series, not upcoming)
                const nepaliResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_original_language=ne&sort_by=release_date.desc&release_date.lte=${today}&page=1`
                );
                const nepaliData = await nepaliResponse.json();
                const nepaliTransformed = nepaliData.results?.map(transformTMDBMovie) || [];
                // Filter out any future releases and sort by latest
                const nepaliFiltered = nepaliTransformed.filter(movie => new Date(movie.releaseDate) <= new Date());
                setNepaliMovies(
                    nepaliFiltered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 25)
                );

                // Fetch Now Playing (sorted by latest release date)
                const nowPlayingResponse = await fetch(
                    `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&page=1`
                );
                const nowPlayingData = await nowPlayingResponse.json();
                const nowPlayingTransformed = nowPlayingData.results?.map(transformTMDBMovie) || [];
                setNowPlayingMovies(
                    nowPlayingTransformed.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 25)
                );

                // Fetch Top Rated (movies & TV series - keep TMDB's rating order)
                const topRatedMoviesResponse = await fetch(
                    `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&page=1`
                );
                const topRatedTVResponse = await fetch(
                    `https://api.themoviedb.org/3/tv/top_rated?api_key=${apiKey}&page=1`
                );
                const topRatedMoviesData = await topRatedMoviesResponse.json();
                const topRatedTVData = await topRatedTVResponse.json();
                const combinedTopRated = [
                    ...(topRatedMoviesData.results?.slice(0, 15).map(transformTMDBMovie) || []),
                    ...(topRatedTVData.results?.slice(0, 10).map(transformTMDBMovie) || [])
                ];
                setTopRatedMovies(combinedTopRated);

                // Fetch Upcoming (sorted by latest release date)
                const upcomingResponse = await fetch(
                    `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&page=1`
                );
                const upcomingData = await upcomingResponse.json();
                const upcomingTransformed = upcomingData.results?.map(transformTMDBMovie) || [];
                setUpcomingMovies(
                    upcomingTransformed.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 25)
                );

                // Fetch Trending (movies & TV series, sorted by latest)
                const trendingResponse = await fetch(
                    `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`
                );
                const trendingData = await trendingResponse.json();
                const trendingTransformed = trendingData.results?.map(transformTMDBMovie) || [];
                setTrendingMovies(
                    trendingTransformed.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)).slice(0, 25)
                );

                setLoading(false);
            } catch (error) {
                console.error('Error fetching movies:', error);
                setLoading(false);
            }
        };

        fetchAllMovies();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 mx-auto text-gray-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Loading movies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            {/* Popular Movies Banner */}
            <TMDBBanner onMovieClick={onMovieClick} />

            {/* Trending - First */}
            {trendingMovies.length > 0 && (
                <MovieSlider
                    title="Trending"
                    icon={<IoTrendingUp className="w-5 h-5 text-green-500" />}
                    movies={trendingMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}

            {/* Top Rated */}
            {topRatedMovies.length > 0 && (
                <MovieSlider
                    title="Top Rated"
                    icon={<IoStar className="w-5 h-5 text-yellow-500" />}
                    movies={topRatedMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}

            {/* Bollywood - Third */}
            {bollywoodMovies.length > 0 && (
                <MovieSlider
                    title="Bollywood"
                    icon={<IoFilm className="w-5 h-5 text-orange-500" />}
                    movies={bollywoodMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}

            {/* Nepali - Fourth */}
            {nepaliMovies.length > 0 && (
                <MovieSlider
                    title="Nepali"
                    icon={<IoFilm className="w-5 h-5 text-blue-500" />}
                    movies={nepaliMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}

            {/* Now Playing */}
            {nowPlayingMovies.length > 0 && (
                <MovieSlider
                    title="Now Playing"
                    icon={<IoFlame className="w-5 h-5 text-red-500" />}
                    movies={nowPlayingMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}


            {/* Upcoming */}
            {upcomingMovies.length > 0 && (
                <MovieSlider
                    title="Upcoming"
                    icon={<IoCalendar className="w-5 h-5 text-purple-500" />}
                    movies={upcomingMovies}
                    onMovieClick={onMovieClick}
                    cardType="public"
                />
            )}
        </div>
    );
};

export default PublicMovieSliders;
