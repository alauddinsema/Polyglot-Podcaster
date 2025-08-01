import { createRouteHandlerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient(request)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}