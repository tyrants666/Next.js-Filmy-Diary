import React from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave, onClickWatched, onClickWatching }) => {
    return (
        <div className="gap-2 bg-white/5 shadow-custom  flex flex-col rounded-xl smoothie relative group min-w-0 shrink-0 grow-0
        basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        >
            <a
                href="#"
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
                            priority={true} // Set to true if optimizing LCP for the first image
                        />
                    </span>
                ) : (
                    <span className=" bg-white/10 rounded-xl relative h-full w-full flex items-center">
                        <p className="px-2 text-sm text-center w-full">Poster Not<br/> Available</p>
                    </span>
                )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity flex justify-around">
                <button
                    onClick={onClickWatched}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                    Watched
                </button>
                <button
                    onClick={onClickWatching}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                    Watching
                </button>
            </div>
            </a>


            <a className="px-2 pb-2 flex w-full flex-col gap-1" href="{`https://www.imdb.com/title/${movie.imdbID}/`}">
                <div className="flex text-xs text-gray-300 justify-between">
                    <span className="uppercase">{movie.Type}</span><span>{movie.Year.replace(/\D/g, '')}</span>
                </div>
                <div className="flex w-full text-[.82rem] sm:text-sm font-medium !line-clamp-2 tracking-wider">{movie.Title}</div>
            </a>
        </div>
    );
};

export default MovieCard;
