import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch friends list for a user
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get all friends for the user with their profile info
        const { data: friendships, error } = await supabase
            .from('friends')
            .select(`
                id,
                friend_id,
                created_at,
                friend:profiles!friends_friend_id_fkey(id, first_name, last_name, username, user_email, avatar_url, saved_movies)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format the response to flatten the friend data
        const friends = friendships?.map(f => ({
            id: f.friend?.id,
            first_name: f.friend?.first_name,
            last_name: f.friend?.last_name,
            username: f.friend?.username,
            user_email: f.friend?.user_email,
            avatar_url: f.friend?.avatar_url,
            saved_movies: f.friend?.saved_movies,
            friendship_date: f.created_at
        })).filter(f => f.id) || [];

        return NextResponse.json({ friends });

    } catch (error) {
        console.error('Error fetching friends:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove a friend (unfriend)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const friendId = searchParams.get('friendId');

        if (!userId || !friendId) {
            return NextResponse.json({ error: 'User ID and Friend ID required' }, { status: 400 });
        }

        // Delete both directions of the friendship
        const { error: deleteError } = await supabase
            .from('friends')
            .delete()
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Friend removed successfully' });

    } catch (error) {
        console.error('Error removing friend:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Check friendship status between two users
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, targetUserId } = body;

        if (!userId || !targetUserId) {
            return NextResponse.json({ error: 'User ID and Target User ID required' }, { status: 400 });
        }

        // Check if they are friends
        const { data: friendship, error: friendError } = await supabase
            .from('friends')
            .select('id')
            .eq('user_id', userId)
            .eq('friend_id', targetUserId)
            .single();

        if (friendship) {
            return NextResponse.json({ status: 'friends', isFriend: true });
        }

        // Check if there's a pending request from current user
        const { data: sentRequest, error: sentError } = await supabase
            .from('friend_requests')
            .select('id, status')
            .eq('sender_id', userId)
            .eq('receiver_id', targetUserId)
            .eq('status', 'pending')
            .single();

        if (sentRequest) {
            return NextResponse.json({ status: 'request_sent', isFriend: false, requestId: sentRequest.id });
        }

        // Check if there's a pending request from target user
        const { data: receivedRequest, error: receivedError } = await supabase
            .from('friend_requests')
            .select('id, status')
            .eq('sender_id', targetUserId)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .single();

        if (receivedRequest) {
            return NextResponse.json({ status: 'request_received', isFriend: false, requestId: receivedRequest.id });
        }

        // No relationship
        return NextResponse.json({ status: 'none', isFriend: false });

    } catch (error) {
        console.error('Error checking friendship status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

