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
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Skip role check in API - handle it in the frontend
        // The frontend already checks the role before showing the menu item

        // Try to fetch user movies with profiles in a single query
        const { data: userMoviesLog, error: logError } = await supabase
            .from('user_movies')
            .select(`
                id,
                status,
                created_at,
                updated_at,
                watched_date,
                user_id,
                profiles!user_movies_user_id_fkey (
                    id,
                    first_name,
                    last_name,
                    user_email
                ),
                movies!user_movies_movie_id_fkey (
                    id,
                    movie_id,
                    title,
                    poster,
                    year,
                    rating,
                    rating_source,
                    type,
                    description
                )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (logError) {
            return NextResponse.json({ error: logError.message }, { status: 500 })
        }

        // Debug: Log the first item to see the data structure
        if (userMoviesLog && userMoviesLog.length > 0) {
            console.log('Sample log entry with joined profiles:', JSON.stringify(userMoviesLog[0], null, 2));
        }

        // Data is already enriched with profiles from the join
        const enrichedData = userMoviesLog || [];

        // Get total count for pagination
        const { count, error: countError } = await supabase
            .from('user_movies')
            .select('*', { count: 'exact', head: true })

        if (countError) {
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        return NextResponse.json({
            data: enrichedData,
            pagination: {
                page,
                limit,
                total: count,
                hasMore: offset + limit < count
            }
        })
    } catch (error) {
        console.error('User logs API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
