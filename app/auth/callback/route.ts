import { createClient } from '@/lib/supabase/server'
import { createCircleUser } from '@/lib/circle-user'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await createCircleUser(user.id)
        }
      } catch (circleError) {
        console.error('Failed to provision Circle user after auth callback:', circleError)
      }
      return NextResponse.redirect(`${origin}/dashboard?walletSetup=1`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
