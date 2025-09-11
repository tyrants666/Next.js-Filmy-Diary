import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
    try {
        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Count the actual number of saved movies for this user (ALL statuses)
        // This includes: watched, wishlist, currently_watching, and any other status
        const { data: userMovies, error: countError } = await supabase
            .from('user_movies')
            .select('id')
            .eq('user_id', userId)

        if (countError) {
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        const actualCount = userMovies ? userMovies.length : 0

        // Update the profiles table with the correct count
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                saved_movies: actualCount
            })
            .eq('id', userId)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            actualCount: actualCount,
            message: `Synchronized saved_movies count to ${actualCount}` 
        })
    } catch (error) {
        console.error('Sync API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
