import React, { useState, useEffect } from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave, onClickWatched, onClickWatching, onRemoveWatched, watched }) => {
    const [isWatched, setIsWatched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsWatched(watched);
    }, [watched]);

    const handleWatchedClick = async () => {
        setIsLoading(true);
        try {
            await onClickWatched();
            setIsWatched(true);
        } catch (error) {
            console.error('Failed to mark as watched:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveWatched = async () => {
        setIsLoading(true);
        try {
            await onRemoveWatched();
            setIsWatched(false);
        } catch (error) {
            console.error('Failed to remove watched status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="gap-2 bg-gray-50 border border-gray-200 shadow-lg hover:shadow-xl flex flex-col rounded-xl relative group min-w-0 shrink-0 grow-0
        basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none transition-all duration-200"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        >
            <a
                // href="#"
                className="relative flex align-center !aspect-[1.37/2]"
            >
                { movie.Poster !== 'N/A' ? (
                    <span className="relative h-full w-full flex items-center">
                        <Image
                            src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                            alt={movie.Title}
                            fill
                            className="object-cover !select-none rounded-xl"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={true}
                        />
                    </span>
                ) : (
                    <span className=" bg-white/10 rounded-xl relative h-full w-full flex items-center">
                        <p className="px-2 text-sm text-center w-full">Poster Not<br/> Available</p>
                    </span>
                )}

                {/* Status indicator for watched movies - always visible */}
                {isWatched && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white w-5 h-5 rounded-full shadow-2xl flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    </div>
                )}

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div className="flex flex-col gap-2 px-3">
                        {!isWatched ? (
                            <>
                                <button
                                    onClick={handleWatchedClick}
                                    disabled={isLoading}
                                    className="bg-slate-700/90 hover:bg-slate-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                            </svg>
                                            Loading
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20,6 9,17 4,12"></polyline>
                                            </svg>
                                            Watched
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={onClickWatching}
                                    className="bg-indigo-700/90 hover:bg-indigo-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 font-medium text-xs backdrop-blur-sm border border-white/20"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="5,3 19,12 5,21"></polygon>
                                    </svg>
                                    Watching
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleRemoveWatched}
                                disabled={isLoading}
                                className="bg-red-700/90 hover:bg-red-600/90 text-white px-3 py-1.5 rounded-lg shadow-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 font-medium text-xs backdrop-blur-sm border border-white/20"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                        </svg>
                                        Removing
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Remove
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </a>

            <div className="px-2 pb-2 flex w-full flex-col gap-1">
                <div className="flex text-xs text-gray-700 font-medium justify-between">
                    <span className="uppercase bg-gray-100 px-2 py-0.5 rounded-full">{movie.Type}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{movie.Year.replace(/\D/g, '')}</span>
                </div>
                <a href={`https://www.themoviedb.org/movie/${movie.imdbID}`} className="flex w-full text-[.82rem] sm:text-sm font-semibold !line-clamp-2 tracking-wider text-gray-900 hover:text-blue-600 transition-colors" target="_blank" rel="noopener noreferrer">
                    {movie.Title}
                </a>
            </div>
        </div>
    );
};

export default MovieCard;
