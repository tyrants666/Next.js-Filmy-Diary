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
        const logType = searchParams.get('type') || 'all' // 'movies', 'friends', 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        let allLogs = [];
        let totalCount = 0;

        // Fetch movie logs if requested
        if (logType === 'movies' || logType === 'all') {
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
                .order('updated_at', { ascending: false })

            if (logError) {
                console.error('Error fetching movie logs:', logError);
            } else {
                // Add log_type to each entry
                const movieLogs = (userMoviesLog || []).map(log => ({
                    ...log,
                    log_type: 'movie'
                }));
                allLogs = [...allLogs, ...movieLogs];
            }
        }

        // Fetch friend request logs if requested
        if (logType === 'friends' || logType === 'all') {
            const { data: friendRequestsLog, error: friendError } = await supabase
                .from('friend_requests')
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    sender_email,
                    receiver_email,
                    status,
                    created_at,
                    sender:profiles!friend_requests_sender_id_fkey (
                        id,
                        first_name,
                        last_name,
                        user_email,
                        avatar_url
                    ),
                    receiver:profiles!friend_requests_receiver_id_fkey (
                        id,
                        first_name,
                        last_name,
                        user_email,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })

            if (friendError) {
                console.error('Error fetching friend request logs:', friendError);
            } else {
                // Add log_type and updated_at to each entry
                const friendLogs = (friendRequestsLog || []).map(log => ({
                    ...log,
                    log_type: 'friend_request',
                    updated_at: log.created_at // Use created_at as updated_at for sorting
                }));
                allLogs = [...allLogs, ...friendLogs];
            }
        }

        // Sort all logs by updated_at (most recent first)
        allLogs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        // Apply pagination
        totalCount = allLogs.length;
        const paginatedLogs = allLogs.slice(offset, offset + limit);

        return NextResponse.json({
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total: totalCount,
                hasMore: offset + limit < totalCount
            }
        })
    } catch (error) {
        console.error('User logs API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
