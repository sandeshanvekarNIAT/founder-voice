
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        // Return a dummy client or throw a specific error that can be caught?
        // Actually, if we are here, we probably want to let the Layout error boundary handle it.
        // But throwing here might crash the component before Boundary renders.
        // Let's throw a specific known error or return null? 
        // Returning null might break types. 
        // Let's try to return a client that throws on *use* rather than creation?
        // Or just don't crash here and let the env validator in Layout handle the UI.

        // However, createServerClient throws if url/key are empty strings/undefined?
        // Let's just pass empty strings if undefined, but maybe that throws too.
        // Better to check.

        if (!supabaseUrl && !supabaseKey) {
            console.error("Supabase keys are missing in createClient")
        }
    }

    return createServerClient(
        supabaseUrl || '',
        supabaseKey || '',
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
