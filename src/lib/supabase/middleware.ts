
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        // If env vars are missing, we can't create a client.
        // Return response as-is to allow RootLayout to show the error screen.
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Nuclear Option 2.0: Don't trust NODE_ENV. Check Host Header.
    const hostHeader = request.headers.get('host') || ''
    const isLocal = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1')
    const origin = isLocal ? request.nextUrl.origin : 'https://founder-voice.vercel.app'

    // PROTECTED ROUTES LOGIC
    // If user is NOT signed in and trying to access /pitch or /dashboard, redirect to /login
    if (
        !user &&
        (request.nextUrl.pathname.startsWith('/pitch') ||
            request.nextUrl.pathname.startsWith('/dashboard'))
    ) {
        // Use constructed origin instead of nextUrl.clone() which can be localhost
        const next = request.nextUrl.pathname
        return NextResponse.redirect(`${origin}/login?next=${next}`)
    }

    // If user IS signed in and trying to access /login, redirect to /pitch
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(`${origin}/pitch`)
    }

    return response
}
