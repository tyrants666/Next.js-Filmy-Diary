/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [
            'image.tmdb.org', 
            'm.media-amazon.com', 
            'ia.media-imdb.com',
            'imdb-api.com',
            'assets.fanart.tv',
            'image.tmdb.org',
            'img.omdbapi.com'
        ],
        dangerouslyAllowSVG: false,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
};


export default nextConfig;
