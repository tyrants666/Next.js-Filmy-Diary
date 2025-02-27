import React from "react";

const MovieCard = ({ movie, onHover, onLeave }) => {
    return (
        <a
            href={`https://www.imdb.com/title/${movie.imdbID}/`}
            className="shadow-custom !aspect-[1.45/2] bg-white/10 flex flex-col hover:scale-105 rounded-xl overflow-hidden smoothie relative group min-w-0 shrink-0 grow-0 
                     basis-[31.7%] sm:basis-[18.4%] lg:basis-[13.24%] xl:basis-[11.65%] 2xl:basis-[10.4%] max-w-[180px] !select-none"
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <span className="h-full w-full">
                <img
                    src={movie.Poster !== "N/A" ? movie.Poster : "/placeholder.png"}
                    alt={movie.Title}
                    className="h-full w-full object-cover !select-none shrink-0 undefined rounded-xl overflow-hidden"
                />
            </span>
        </a>
    );
};

export default MovieCard;
