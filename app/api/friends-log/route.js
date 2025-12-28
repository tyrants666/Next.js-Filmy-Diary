import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch friend activity logs for the current user (friend requests + friends' movie activities)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const offset = (page - 1) * limit;
        let allLogs = [];

        // 1. Fetch friend requests where user is sender or receiver
        const { data: friendRequestLogs, error: requestError } = await supabase
            .from('friend_requests')
            .select(`
                id,
                sender_id,
                receiver_id,
                sender_email,
                receiver_email,
                status,
                created_at,
                sender:profiles!friend_requests_sender_id_fkey(id, first_name, last_name, username, user_email, avatar_url),
                receiver:profiles!friend_requests_receiver_id_fkey(id, first_name, last_name, username, user_email, avatar_url)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (requestError) {
            console.error('Error fetching friend request logs:', requestError);
        } else {
            const formattedRequestLogs = (friendRequestLogs || []).map(log => ({
                ...log,
                log_type: 'friend_request',
                updated_at: log.created_at
            }));
            allLogs = [...allLogs, ...formattedRequestLogs];
        }

        // 2. Get list of friends
        const { data: friendships, error: friendsError } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', userId);

        if (friendsError) {
            console.error('Error fetching friends:', friendsError);
        }

        const friendIds = (friendships || []).map(f => f.friend_id);

        // 3. Fetch movie activities from friends
        if (friendIds.length > 0) {
            const { data: movieLogs, error: movieError } = await supabase
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
                        username,
                        user_email,
                        avatar_url
                    ),
                    movies!user_movies_movie_id_fkey (
                        id,
                        movie_id,
                        title,
                        poster,
                        year,
                        rating,
                        rating_source,
                        type
                    )
                `)
                .in('user_id', friendIds)
                .order('updated_at', { ascending: false })
                .limit(100); // Limit to recent 100 movie activities

            if (movieError) {
                console.error('Error fetching movie logs:', movieError);
            } else {
                const formattedMovieLogs = (movieLogs || []).map(log => ({
                    ...log,
                    log_type: 'friend_movie'
                }));
                allLogs = [...allLogs, ...formattedMovieLogs];
            }
        }

        // Sort all logs by updated_at (most recent first)
        allLogs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        // Calculate total count before pagination
        const totalCount = allLogs.length;

        // Apply pagination
        const paginatedLogs = allLogs.slice(offset, offset + limit);
        const hasMore = totalCount > offset + limit;
        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            data: paginatedLogs,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages,
                hasMore
            }
        });

    } catch (error) {
        console.error('Error fetching friend logs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
