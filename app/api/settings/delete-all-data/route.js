import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log('Starting deletion process for user:', userId);

        // Start a transaction-like operation by deleting in the correct order
        // to avoid foreign key constraint issues

        // 1. Delete from user_movies table (watched movies, wishlist)
        const { error: userMoviesError } = await supabase
            .from('user_movies')
            .delete()
            .eq('user_id', userId);

        if (userMoviesError) {
            console.error('Error deleting user_movies:', userMoviesError);
            throw userMoviesError;
        }

        // 2. Delete from watching table (currently watching movies)
        const { error: watchingError } = await supabase
            .from('watching')
            .delete()
            .eq('user_id', userId);

        if (watchingError) {
            console.error('Error deleting watching:', watchingError);
            throw watchingError;
        }

        // 3. Reset saved_movies count in profiles table
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ saved_movies: 0 })
            .eq('id', userId);

        if (profileError) {
            console.error('Error updating profile:', profileError);
            // Don't throw here as this is not critical
            console.warn('Failed to reset saved_movies count, but continuing...');
        }

        // 4. Optional: Clean up orphaned movies that are no longer referenced
        // This is a more complex operation, so we'll skip it for now to avoid
        // accidentally deleting movies that other users might have saved

        console.log('Successfully deleted all data for user:', userId);

        return NextResponse.json({ 
            success: true, 
            message: 'All user movie data has been deleted successfully' 
        });

    } catch (error) {
        console.error('Error in delete-all-data API:', error);
        return NextResponse.json({ 
            error: 'Failed to delete user data', 
            details: error.message 
        }, { status: 500 });
    }
}

// Only allow DELETE method
export async function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function POST() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
