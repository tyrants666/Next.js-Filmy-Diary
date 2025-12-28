import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch pending friend requests for current user
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type'); // 'received', 'sent', 'all'

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        if (type === 'sent') {
            // Get friend requests sent by the user
            const { data: sentRequests, error } = await supabase
                .from('friend_requests')
                .select(`
                    id,
                    receiver_id,
                    status,
                    created_at,
                    receiver:profiles!friend_requests_receiver_id_fkey(id, first_name, last_name, username, avatar_url)
                `)
                .eq('sender_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return NextResponse.json({ requests: sentRequests || [] });
        }

        // Default: Get friend requests received by the user (for notifications)
        const { data: receivedRequests, error } = await supabase
            .from('friend_requests')
            .select(`
                id,
                sender_id,
                status,
                created_at,
                sender:profiles!friend_requests_sender_id_fkey(id, first_name, last_name, username, avatar_url)
            `)
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ requests: receivedRequests || [] });

    } catch (error) {
        console.error('Error fetching friend requests:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Send a new friend request
export async function POST(request) {
    try {
        const body = await request.json();
        const { senderId, receiverId } = body;

        if (!senderId || !receiverId) {
            return NextResponse.json({ error: 'Sender and receiver IDs required' }, { status: 400 });
        }

        if (senderId === receiverId) {
            return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
        }

        // Check if they are already friends
        const { data: existingFriend, error: friendError } = await supabase
            .from('friends')
            .select('id')
            .eq('user_id', senderId)
            .eq('friend_id', receiverId)
            .single();

        if (existingFriend) {
            return NextResponse.json({ error: 'Already friends' }, { status: 400 });
        }

        // Check if a request already exists (in either direction)
        const { data: existingRequest, error: requestError } = await supabase
            .from('friend_requests')
            .select('id, status')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 });
        }

        // Fetch sender and receiver emails from profiles
        const { data: senderProfile, error: senderError } = await supabase
            .from('profiles')
            .select('user_email')
            .eq('id', senderId)
            .single();

        const { data: receiverProfile, error: receiverError } = await supabase
            .from('profiles')
            .select('user_email')
            .eq('id', receiverId)
            .single();

        if (senderError || receiverError) {
            console.error('Error fetching profiles:', senderError || receiverError);
        }

        // Create new friend request with emails
        const { data: newRequest, error: insertError } = await supabase
            .from('friend_requests')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                sender_email: senderProfile?.user_email || null,
                receiver_email: receiverProfile?.user_email || null,
                status: 'pending'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ request: newRequest, message: 'Friend request sent successfully' });

    } catch (error) {
        console.error('Error sending friend request:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Accept or reject a friend request
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { requestId, action, userId } = body; // action: 'accept' or 'reject'

        if (!requestId || !action || !userId) {
            return NextResponse.json({ error: 'Request ID, action, and user ID required' }, { status: 400 });
        }

        if (!['accept', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be "accept" or "reject"' }, { status: 400 });
        }

        // Get the friend request
        const { data: friendRequest, error: fetchError } = await supabase
            .from('friend_requests')
            .select('id, sender_id, receiver_id, status')
            .eq('id', requestId)
            .eq('receiver_id', userId)
            .single();

        if (fetchError || !friendRequest) {
            return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
        }

        if (friendRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Friend request already processed' }, { status: 400 });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';

        // Update the request status
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: newStatus })
            .eq('id', requestId);

        if (updateError) throw updateError;

        // If accepted, add to friends table (both directions)
        if (action === 'accept') {
            const { error: friendInsertError } = await supabase
                .from('friends')
                .insert([
                    { user_id: friendRequest.sender_id, friend_id: friendRequest.receiver_id },
                    { user_id: friendRequest.receiver_id, friend_id: friendRequest.sender_id }
                ]);

            if (friendInsertError) throw friendInsertError;
        }

        return NextResponse.json({ 
            message: action === 'accept' ? 'Friend request accepted' : 'Friend request rejected',
            status: newStatus
        });

    } catch (error) {
        console.error('Error processing friend request:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Cancel/remove a friend request
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestId = searchParams.get('requestId');
        const userId = searchParams.get('userId');

        if (!requestId || !userId) {
            return NextResponse.json({ error: 'Request ID and user ID required' }, { status: 400 });
        }

        // Only allow sender to cancel their own request
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete()
            .eq('id', requestId)
            .eq('sender_id', userId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ message: 'Friend request cancelled' });

    } catch (error) {
        console.error('Error cancelling friend request:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

