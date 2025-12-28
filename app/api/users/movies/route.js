import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to check if requester can view target user's movies
async function canViewUserMovies(requesterId, targetUserId) {
    // If viewing own movies, always allow
    if (requesterId === targetUserId) {
        return true;
    }

    // Check if requester is superadmin
    const { data: requesterProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

    if (!profileError && requesterProfile?.role === 'superadmin') {
        return true;
    }

    // Check if they are friends
    const { data: friendship, error: friendError } = await supabase
        .from('friends')
        .select('id')
        .eq('user_id', requesterId)
        .eq('friend_id', targetUserId)
        .single();

    if (!friendError && friendship) {
        return true;
    }

    return false;
}

// GET - Fetch a user's movies for their public profile
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId'); // Target user whose movies we want
        const requesterId = searchParams.get('requesterId'); // Current logged-in user
        const status = searchParams.get('status'); // 'watched', 'currently_watching', 'wishlist', or 'all'

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Security check: Verify requester has permission to view these movies
        if (requesterId) {
            const hasAccess = await canViewUserMovies(requesterId, userId);
            if (!hasAccess) {
                return NextResponse.json({ 
                    error: 'Access denied. You must be friends with this user to view their movies.',
                    accessDenied: true 
                }, { status: 403 });
            }
        }

        let query = supabase
            .from('user_movies')
            .select(`
                id,
                status,
                watched_date,
                updated_at,
                created_at,
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
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: movies, error } = await query;

        if (error) throw error;

        // Group movies by status if fetching all
        if (!status || status === 'all') {
            const grouped = {
                watched: movies?.filter(m => m.status === 'watched') || [],
                watching: movies?.filter(m => m.status === 'currently_watching') || [],
                wishlist: movies?.filter(m => m.status === 'wishlist') || []
            };
            return NextResponse.json({ movies: grouped });
        }

        return NextResponse.json({ movies: movies || [] });

    } catch (error) {
        console.error('Error fetching user movies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

