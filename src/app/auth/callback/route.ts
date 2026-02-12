
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/pitch'

    const code = searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'

            // Ensure next is a relative path
            const cleanNext = next.startsWith('/') ? next : '/pitch'

            if (isLocalEnv) {
                return NextResponse.redirect(`${request.nextUrl.origin}${cleanNext}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${cleanNext}`)
            } else {
                return NextResponse.redirect(`${request.nextUrl.origin}${cleanNext}`)
            }
        } else {
            console.error("Auth Callback Error:", error)
        }
    }

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        if (!error) {
            // redirect user to specified redirect URL or root of app
            return NextResponse.redirect(new URL(next, request.url))
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(new URL('/login?error=auth_code_error', request.url))
}
