import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password are required' } },
        { status: 400 }
      )
    }

    // Use service role client for server-side auth
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json(
        { data: null, error },
        { status: 400 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Sign in API error:', error)
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}