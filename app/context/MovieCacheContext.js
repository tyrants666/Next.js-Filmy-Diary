'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const MovieCacheContext = createContext();

export const useMovieCache = () => {
    const context = useContext(MovieCacheContext);
    if (!context) {
        throw new Error('useMovieCache must be used within a MovieCacheProvider');
    }
    return context;
};

export const MovieCacheProvider = ({ children }) => {
    // Global cache state for all movie lists
    const [globalCache, setGlobalCache] = useState({
        watchlist: {
            data: [],
            lastFetchTime: null,
            isLoading: false
        },
        watching: {
            data: [],
            lastFetchTime: null,
            isLoading: false
        },
        watched: {
            data: [],
            lastFetchTime: null,
            isLoading: false
        }
    });

    // Cache configuration
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const STALE_WHILE_REVALIDATE_DURATION = 2 * 60 * 1000; // 2 minutes

    // Check if data is fresh (within cache duration)
    const isDataFresh = useCallback((listType) => {
        const cache = globalCache[listType];
        if (!cache.lastFetchTime) return false;
        return Date.now() - cache.lastFetchTime < CACHE_DURATION;
    }, [globalCache, CACHE_DURATION]);

    // Check if data is stale but acceptable (stale-while-revalidate)
    const isDataStale = useCallback((listType) => {
        const cache = globalCache[listType];
        if (!cache.lastFetchTime) return true;
        return Date.now() - cache.lastFetchTime > STALE_WHILE_REVALIDATE_DURATION;
    }, [globalCache, STALE_WHILE_REVALIDATE_DURATION]);

    // Validate and cache poster URL for a movie
    const validateAndCachePoster = useCallback(async (movie) => {
        // If already has a valid cached poster, return it
        if (movie.cachedPosterUrl && movie.posterTimestamp && 
            Date.now() - movie.posterTimestamp < CACHE_DURATION) {
            return movie.cachedPosterUrl;
        }

        // Get poster alternatives
        const alternatives = [];
        if (movie.Poster && movie.Poster !== "N/A") alternatives.push(movie.Poster);
        if (movie.poster && movie.poster !== "N/A") alternatives.push(movie.poster);
        
        // Try TMDB alternatives if it's a TMDB poster
        if (movie.Poster && movie.Poster.includes('image.tmdb.org')) {
            const posterPath = movie.Poster.split('/').pop();
            const tmdbBaseUrl = 'https://image.tmdb.org/t/p';
            alternatives.push(
                `${tmdbBaseUrl}/w500/${posterPath}`,
                `${tmdbBaseUrl}/w342/${posterPath}`,
                `${tmdbBaseUrl}/w185/${posterPath}`
            );
        }

        // Try IMDB alternatives
        const imdbId = movie.imdbID || movie.movie_id;
        if (imdbId && imdbId.startsWith('tt')) {
            alternatives.push(
                `https://m.media-amazon.com/images/M/${imdbId}.jpg`,
                `https://ia.media-imdb.com/images/M/${imdbId}._V1_SX300.jpg`
            );
        }

        // Test each URL to find a working one
        for (const url of alternatives) {
            try {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(url);
                    img.onerror = () => reject();
                    img.src = url;
                });
                return url; // Return first working URL
            } catch {
                continue; // Try next URL
            }
        }
        
        return null; // No working poster found
    }, []);

    // Update cache for a specific list with poster validation
    const updateCache = useCallback(async (listType, data, isLoading = false) => {
        let enhancedData = data;
        
        // If we have data, enhance it with validated poster URLs
        if (data && Array.isArray(data) && !isLoading) {
            enhancedData = await Promise.all(
                data.map(async (item) => {
                    // For saved movies, the movie data is in item.movies
                    const movieData = item.movies || item;
                    
                    // Skip if already has recent cached poster
                    if (movieData.cachedPosterUrl && movieData.posterTimestamp && 
                        Date.now() - movieData.posterTimestamp < CACHE_DURATION) {
                        return item;
                    }

                    try {
                        const validPosterUrl = await validateAndCachePoster(movieData);
                        
                        if (item.movies) {
                            // For saved movies structure
                            return {
                                ...item,
                                movies: {
                                    ...item.movies,
                                    cachedPosterUrl: validPosterUrl,
                                    posterTimestamp: Date.now()
                                }
                            };
                        } else {
                            // For direct movie objects (search results)
                            return {
                                ...item,
                                cachedPosterUrl: validPosterUrl,
                                posterTimestamp: Date.now()
                            };
                        }
                    } catch (error) {
                        console.log(`Failed to validate poster for ${movieData.title || movieData.Title}`);
                        return item;
                    }
                })
            );
        }

        setGlobalCache(prev => ({
            ...prev,
            [listType]: {
                data: enhancedData || prev[listType].data,
                lastFetchTime: Date.now(),
                isLoading
            }
        }));
    }, [validateAndCachePoster]);

    // Get cached data for a specific list
    const getCachedData = useCallback((listType) => {
        return globalCache[listType]?.data || [];
    }, [globalCache]);

    // Check if cache is loading for a specific list
    const isCacheLoading = useCallback((listType) => {
        return globalCache[listType]?.isLoading || false;
    }, [globalCache]);

    // Clear cache for a specific list (useful when adding/removing movies)
    const clearCache = useCallback((listType) => {
        setGlobalCache(prev => ({
            ...prev,
            [listType]: {
                data: [],
                lastFetchTime: null,
                isLoading: false
            }
        }));
    }, []);

    // Clear all cache
    const clearAllCache = useCallback(() => {
        setGlobalCache({
            watchlist: {
                data: [],
                lastFetchTime: null,
                isLoading: false
            },
            watching: {
                data: [],
                lastFetchTime: null,
                isLoading: false
            },
            watched: {
                data: [],
                lastFetchTime: null,
                isLoading: false
            }
        });
    }, []);

    // Cache search results with poster validation
    const cacheSearchResults = useCallback(async (movies) => {
        if (!Array.isArray(movies)) return movies;
        
        const enhancedMovies = await Promise.all(
            movies.map(async (movie) => {
                // Skip if already has recent cached poster
                if (movie.cachedPosterUrl && movie.posterTimestamp && 
                    Date.now() - movie.posterTimestamp < CACHE_DURATION) {
                    return movie;
                }

                try {
                    const validPosterUrl = await validateAndCachePoster(movie);
                    return {
                        ...movie,
                        cachedPosterUrl: validPosterUrl,
                        posterTimestamp: Date.now()
                    };
                } catch (error) {
                    console.log(`Failed to validate poster for ${movie.Title}`);
                    return movie;
                }
            })
        );
        
        return enhancedMovies;
    }, [validateAndCachePoster]);

    // Get poster URL for a movie (from cache or validate)
    const getPosterUrl = useCallback(async (movie) => {
        const movieData = movie.movies || movie;
        
        // Return cached poster if valid
        if (movieData.cachedPosterUrl && movieData.posterTimestamp && 
            Date.now() - movieData.posterTimestamp < CACHE_DURATION) {
            return movieData.cachedPosterUrl;
        }
        
        // Validate and return new poster URL
        return await validateAndCachePoster(movieData);
    }, [validateAndCachePoster]);

    const value = {
        globalCache,
        isDataFresh,
        isDataStale,
        updateCache,
        getCachedData,
        isCacheLoading,
        clearCache,
        clearAllCache,
        cacheSearchResults,
        getPosterUrl,
        validateAndCachePoster,
        CACHE_DURATION,
        STALE_WHILE_REVALIDATE_DURATION
    };

    return (
        <MovieCacheContext.Provider value={value}>
            {children}
        </MovieCacheContext.Provider>
    );
};
