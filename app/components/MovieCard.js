import React from "react";
import Image from "next/image";

const MovieCard = ({ movie, onHover, onLeave }) => {
    return (
        <a
            href={`https://www.imdb.com/title/${movie.imdbID}/`}
            className="shadow-custom !aspect-[1.45/2] bg-white/10 flex flex-col hover:scale-105 rounded-xl overflow-hidden smoothie relative group min-w-0 shrink-0 grow-0 
                     basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <span className="h-full w-full flex items-center">
                { movie.Poster !== 'N/A' ? (
                    <Image
                        src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                        alt={movie.Title}
                        fill
                        className="object-cover !select-none rounded-xl"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority={true} // Set to true if optimizing LCP for the first image
                    />
                ) : (
                    <p className="px-2 text-sm text-center w-full">Poster Not<br/> Available</p>
                )}
            </span>
        </a>
    );
};

export default MovieCard;
