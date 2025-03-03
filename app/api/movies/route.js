javascriptCopyimport { NextResponse } from 'next/server'
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
        const { userId, movieData, status } = body

        if (!userId || !movieData || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if movie exists
        const { data: existingMovie } = await supabase
            .from('movies')
            .select('id')
            .eq('movie_id', movieData.imdbID)
            .single()

        let movieId

        if (existingMovie) {
            movieId = existingMovie.id
        } else {
            // Add new movie
            const { data: newMovie, error: movieError } = await supabase
                .from('movies')
                .insert({
                    movie_id: movieData.imdbID,
                    title: movieData.Title,
                    poster: movieData.Poster,
                    year: movieData.Year
                })
                .select('id')
                .single()

            if (movieError) {
                return NextResponse.json({ error: movieError.message }, { status: 500 })
            }

            movieId = newMovie.id
        }

        // Add to user's list
        const { data: userMovie, error: userMovieError } = await supabase
            .from('user_movies')
            .upsert({
                user_id: userId,
                movie_id: movieId,
                status
            })

        if (userMovieError) {
            return NextResponse.json({ error: userMovieError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: userMovie })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}