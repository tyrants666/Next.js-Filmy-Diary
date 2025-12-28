import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch users data (top users, all users for suggestions)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'top', 'all', 'search', 'profile'
        const userId = searchParams.get('userId');
        const searchQuery = searchParams.get('q');
        const profileId = searchParams.get('profileId');

        if (type === 'top') {
            // Get top users based on saved_movies count
            const { data: topUsers, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, username, user_email, avatar_url, saved_movies')
                .order('saved_movies', { ascending: false })
                .limit(12);

            if (error) throw error;

            return NextResponse.json({ users: topUsers || [] });
        }

        if (type === 'all') {
            // Get all users except the current user for suggestions
            let query = supabase
                .from('profiles')
                .select('id, first_name, last_name, username, user_email, avatar_url, saved_movies')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.neq('id', userId);
            }

            const { data: allUsers, error } = await query.limit(50);

            if (error) throw error;

            return NextResponse.json({ users: allUsers || [] });
        }

        if (type === 'search') {
            // Search users by name, email, or username
            if (!searchQuery || searchQuery.trim().length < 2) {
                return NextResponse.json({ users: [] });
            }

            const searchTerm = searchQuery.trim().toLowerCase();
            
            const { data: searchResults, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, username, user_email, avatar_url, saved_movies')
                .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
                .neq('id', userId)
                .limit(20);

            if (error) throw error;

            return NextResponse.json({ users: searchResults || [] });
        }

        if (type === 'profile') {
            // Get single user profile with their movie stats
            if (!profileId) {
                return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, username, user_email, avatar_url, saved_movies, created_at, last_login')
                .eq('id', profileId)
                .single();

            if (profileError) throw profileError;

            // Get movie counts by status
            const { data: movieStats, error: statsError } = await supabase
                .from('user_movies')
                .select('status')
                .eq('user_id', profileId);

            if (statsError) throw statsError;

            const stats = {
                watched: movieStats?.filter(m => m.status === 'watched').length || 0,
                watching: movieStats?.filter(m => m.status === 'currently_watching').length || 0,
                wishlist: movieStats?.filter(m => m.status === 'wishlist').length || 0,
                total: movieStats?.length || 0
            };

            return NextResponse.json({ profile, stats });
        }

        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });

    } catch (error) {
        console.error('Error in users API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

