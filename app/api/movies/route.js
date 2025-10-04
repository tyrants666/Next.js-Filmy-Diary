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

        // Debug: Log the incoming data
        console.log('API received request body:', {
            userId: userId,
            userEmail: userEmail,
            movieTitle: movieData?.Title,
            status: status
        });

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
            console.log('Movie already exists, using existing ID:', movieId)
            
            // Update the existing movie's type if it's different (in case it was saved incorrectly before)
            const { error: updateError } = await supabase
                .from('movies')
                .update({
                    type: movieData.Type || 'movie'
                })
                .eq('id', movieId);
                
            if (updateError) {
                console.error('Error updating movie type:', updateError);
            } else {
                console.log('Updated existing movie type to:', movieData.Type || 'movie');
            }
        } else {
            // Add new movie to movies table
            const insertData = {
                movie_id: movieIdToUse,
                title: movieData.Title,
                poster: movieData.Poster,
                year: movieData.Year,
                rating: movieData.imdbRating || movieData.rating,
                rating_source: movieData.ratingSource || 'IMDB',
                type: movieData.Type || 'movie'
            };
            
            console.log('Inserting movie with data:', insertData);
            
            const { data: newMovie, error: movieError } = await supabase
                .from('movies')
                .insert(insertData)
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
            user_email: userEmail || 'unknown@example.com',
            movie_id: movieId,
            movie_imdb_id: movieData.imdbID !== "N/A" ? movieData.imdbID : null,
            movie_name: movieData.Title,
            status: status,
            updated_at: new Date().toISOString() // Explicitly set updated_at for proper sorting
        }

        // Add watched_date if status is watched
        if (status === 'watched' && watchedDate) {
            upsertData.watched_date = watchedDate
        } else if (status === 'watched') {
            upsertData.watched_date = new Date().toISOString()
        }

        // Check if this is a new movie for the user (for counter update)
        const { data: existingUserMovie } = await supabase
            .from('user_movies')
            .select('id, status')
            .eq('user_id', userId)
            .eq('movie_id', movieId)
            .single()

        const isNewMovie = !existingUserMovie;
        const isStatusChange = existingUserMovie && existingUserMovie.status !== status;

        console.log('Movie operation:', {
            isNewMovie,
            isStatusChange,
            existingStatus: existingUserMovie?.status,
            newStatus: status
        });

        // Debug: Log the upsert data before inserting
        console.log('About to insert upsertData:', {
            user_id: upsertData.user_id,
            user_email: upsertData.user_email,
            movie_name: upsertData.movie_name,
            status: upsertData.status
        });

        // Upsert to user_movies (this will update status if movie already exists for user)
        const { data: userMovie, error: userMovieError } = await supabase
            .from('user_movies')
            .upsert(upsertData, {
                onConflict: 'user_id,movie_id'
            })

        if (userMovieError) {
            return NextResponse.json({ error: userMovieError.message }, { status: 500 })
        }

        // Update saved_movies count in profiles table only if this is a new movie
        // Status changes (e.g., watching -> watched) should NOT change the counter
        if (isNewMovie) {
            console.log('Incrementing counter for new movie');
            const { data: profile } = await supabase
                .from('profiles')
                .select('saved_movies')
                .eq('id', userId)
                .single();

            if (profile !== null) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        saved_movies: (profile.saved_movies || 0) + 1
                    })
                    .eq('id', userId);

                if (updateError) {
                    console.error('Error updating saved_movies count:', updateError);
                }
            }
        } else if (isStatusChange) {
            console.log('Status change detected - counter remains unchanged');
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

        // Update saved_movies count in profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('saved_movies')
            .eq('id', userId)
            .single();

        if (profile !== null) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    saved_movies: Math.max(0, (profile.saved_movies || 0) - 1)
                })
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating saved_movies count:', updateError);
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}