'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import BackBlur from './components/BackBlur';
import MovieSearch from './components/MovieSearch';
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabaseClient';

export default function Home() {
    const [backgroundImage, setBackgroundImage] = useState('http://localhost:3000/_next/image?url=https%3A%2F%2Fm.media-amazon.com%2Fimages%2FM%2FMV5BMWM1YmJmYWMtMDM1Ni00ZGM2LTkxODYtOTU1ZjA4MTFkMDM1XkEyXkFqcGc%40._V1_SX300.jpg&w=640&q=75');
    const [savedMovies, setSavedMovies] = useState([]);
    const [loadingSavedMovies, setLoadingSavedMovies] = useState(false);
    const { user, loading, signOut } = useAuth()
    const router = useRouter()

    // Fetch user's saved movies
    const fetchSavedMovies = async () => {
        if (!user) return;
        
        setLoadingSavedMovies(true);
        try {
            const { data, error } = await supabase
                .from('user_movies')
                .select(`
                    id,
                    status,
                    movies (
                        id,
                        movie_id,
                        title,
                        poster,
                        year
                    )
                `)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            // Update the savedMovies state
            setSavedMovies(data || []);
            
            // Force a re-render of the MovieSearch component
            // const event = new Event('savedMoviesUpdated');
            // window.dispatchEvent(event);
            
        } catch (error) {
            console.error('Error fetching saved movies:', error);
        } finally {
            setLoadingSavedMovies(false);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        } else if (user) {
            fetchSavedMovies();
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className="min-h-screen flex flex-col items-center justify-center">
            <Image 
                src="/images/babu-rao-stickers.png" 
                alt="Babu Rao" 
                width={240} 
                height={250} 
                className='mb-2'
                priority
            />
                <p className='text-center text-md px-4'>Please wait while Mr Babu Rao fixes his dhoti...
                    <svg className="animate-spin h-4 w-4 inline-block text-white ms-2 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </p>
        </div>
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen flex flex-col relative z-3">
            <BackBlur backgroundImage={backgroundImage}/>

            <div className='container mx-auto'>
                <header className="py-4 m-4 mb-0 rounded-xl text-center flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Filmy Diary</h1>
                    <div className="flex items-center gap-4">
                        <span>{user.user_metadata?.name?.split(' ')[0] || user.email}</span>
                        <button onClick={signOut} className="bg-white/[.08] hover:bg-white/[.18] py-2 px-4 rounded-lg">
                            Sign Out
                        </button>
                    </div>
                </header>
                <main className="flex-grow p-4">
                    {/* Search section */}
                    <MovieSearch 
                        onBackgroundChange={setBackgroundImage} 
                        savedMovies={savedMovies} 
                        fetchSavedMovies={fetchSavedMovies}
                    />
                    
                    {/* ======================================== Saved movies section ======================================== */}
                    {/* ======================================== Saved movies section ======================================== */}
                    
                    {loadingSavedMovies ? (
                        <p className="text-center mt-8">Loading your saved movies...</p>
                    ) : savedMovies.length > 0 ? (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4">Your Movie Collections</h2>
                            
                            {/* Watched movies */}
                            {savedMovies.some(item => item.status === 'watched') && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2">Watched Movies</h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'watched')
                                            .map(item => (
                                                <div 
                                                    key={item.id}
                                                    className="relative overflow-hidden rounded-xl"
                                                    onMouseEnter={() => setBackgroundImage(item.movies.poster)}
                                                >
                                                    <div className="w-32 h-48 rounded-md overflow-hidden">
                                                        <img 
                                                            src={item.movies.poster} 
                                                            alt={item.movies.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="absolute top-0 right-0 bg-green-600 text-white text-xs px-1 rounded-bl">
                                                        Watched
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            
                            {/* Currently watching movies */}
                            {savedMovies.some(item => item.status === 'watching') && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2">Currently Watching</h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {savedMovies
                                            .filter(item => item.status === 'watching')
                                            .map(item => (
                                                <div 
                                                    key={item.id}
                                                    className="relative overflow-hidden rounded-xl"
                                                    onMouseEnter={() => setBackgroundImage(item.movies.poster)}
                                                >
                                                    <div className="w-32 h-48 rounded-md overflow-hidden">
                                                        <img 
                                                            src={item.movies.poster} 
                                                            alt={item.movies.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-1 rounded-bl">
                                                        Watching
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center mt-8 p-6 bg-white/[.08] rounded-lg">
                            <p>You haven&apos;t saved any movies yet.</p>
                            <p className="mt-2 text-gray-400">Search for movies and add them to your collection!</p>
                        </div>
                    )}
                </main>
            </div>

            <div className='text-center w-full flex justify-center mb-[-10px]'>
                <Image 
                    src="/images/pokemon.gif" 
                    alt="Pokemon" 
                    width={100} 
                    height={100} 
                    priority
                />
            </div>

            <footer className="bg-card p-4 text-center">
                <ol className='mb-5'>
                    <li><strong>💌 Change Logs</strong></li>
                    <li>🔐 Added Google authentication</li>
                    <li>💾 Save movies to your personal collection</li>
                    <li>🎬 Organize movies as Watched or Currently Watching</li>
                </ol>
                {/* <div className="flex justify-center gap-6 flex-wrap">
                    <a
                        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                        href="/home"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
                        Next.JS Home
                    </a>
                </div> */}
            </footer>
        </div>
    );
}