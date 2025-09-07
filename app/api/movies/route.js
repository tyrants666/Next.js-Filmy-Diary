import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

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
            .eq('user_id', userId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { userId, movieData, status, watchedDate, userEmail } = body

        if (!userId || !movieData || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Determine the correct movie ID to use (prefer imdbID, fallback to tmdbID)
        const movieIdToUse = movieData.imdbID !== "N/A" ? movieData.imdbID : movieData.tmdbID;
        
        if (!movieIdToUse) {
            return NextResponse.json({ error: 'No valid movie ID found' }, { status: 400 })
        }

        // Check if movie exists in movies table
        const { data: existingMovie } = await supabase
            .from('movies')
            .select('id')
            .eq('movie_id', movieIdToUse)
            .single()

        let movieId

        if (existingMovie) {
            movieId = existingMovie.id
        } else {
            // Add new movie to movies table
            const { data: newMovie, error: movieError } = await supabase
                .from('movies')
                .insert({
                    movie_id: movieIdToUse,
                    title: movieData.Title,
                    poster: movieData.Poster,
                    year: movieData.Year,
                    rating: movieData.imdbRating || movieData.rating,
                    rating_source: movieData.ratingSource || 'IMDB',
                    type: movieData.Type || 'movie'
                })
                .select('id')
                .single()

            if (movieError) {
                return NextResponse.json({ error: movieError.message }, { status: 500 })
            }

            movieId = newMovie.id
        }

        // Handle different status transitions properly
        // All statuses (watched, wishlist, watching) now use user_movies table
        
        // For all statuses (watched, wishlist, watching), use user_movies table

        // Prepare the upsert data
        const upsertData = {
            user_id: userId,
            movie_id: movieId,
            status: status
        }

        // Add watched_date if status is watched
        if (status === 'watched' && watchedDate) {
            upsertData.watched_date = watchedDate
        } else if (status === 'watched') {
            upsertData.watched_date = new Date().toISOString()
        }

        // Upsert to user_movies (this will update status if movie already exists for user)
        const { data: userMovie, error: userMovieError } = await supabase
            .from('user_movies')
            .upsert(upsertData, {
                onConflict: 'user_id,movie_id'
            })

        if (userMovieError) {
            return NextResponse.json({ error: userMovieError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: userMovie })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const movieId = searchParams.get('movieId')

        if (!userId || !movieId) {
            return NextResponse.json({ error: 'User ID and Movie ID are required' }, { status: 400 })
        }

        // Remove from user's list
        const { error: deleteError } = await supabase
            .from('user_movies')
            .delete()
            .eq('user_id', userId)
            .eq('movie_id', movieId)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}