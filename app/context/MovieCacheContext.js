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

    // Update cache for a specific list
    const updateCache = useCallback((listType, data, isLoading = false) => {
        setGlobalCache(prev => ({
            ...prev,
            [listType]: {
                data: data || prev[listType].data,
                lastFetchTime: Date.now(),
                isLoading
            }
        }));
    }, []);

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

    const value = {
        globalCache,
        isDataFresh,
        isDataStale,
        updateCache,
        getCachedData,
        isCacheLoading,
        clearCache,
        clearAllCache,
        CACHE_DURATION,
        STALE_WHILE_REVALIDATE_DURATION
    };

    return (
        <MovieCacheContext.Provider value={value}>
            {children}
        </MovieCacheContext.Provider>
    );
};
