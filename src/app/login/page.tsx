
'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react'

function LoginForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const searchParams = useSearchParams()
    const next = searchParams.get('next')

    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=${next || '/pitch'}`,
                },
            })

            if (error) {
                setError(error.message)
                setIsLoading(false)
            } else {
                // Check if email confirmation is required
                setError("Check your email for the confirmation link!")
                setIsLoading(false)
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
                setIsLoading(false)
            } else {
                router.push(next || '/pitch')
                router.refresh()
            }
        }
    }

    const handleGoogleLogin = async () => {
        setIsLoading(true)

        // Nuclear Option 5.0: SIMPLICITY
        // Remove query params to ensure strict match with Supabase Allowlist.
        // Use hardcoded production URL.
        const finalRedirect = 'https://founder-voice.vercel.app/auth/callback'

        // No alerts. Just go.
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: finalRedirect,
            },
        })

        if (error) {
            alert(`Auth Error: ${error.message}`)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative">
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-20">
                <Link href="/">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white pl-0 hover:bg-transparent">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </Button>
                </Link>
            </div>
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/30 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/30 rounded-full blur-3xl opacity-50" />
            </div>

            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 text-white z-10 shadow-2xl shadow-purple-900/20">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-zinc-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 border border-zinc-800">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {isSignUp ? "Create an account" : "Welcome back"}
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        {isSignUp
                            ? "Enter your email to create your account"
                            : "Enter your credentials to access the War Room"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" className="text-black bg-white hover:bg-zinc-200 border-zinc-700 font-medium" onClick={handleGoogleLogin} disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                // Simple Google Icon Mock since I can't confirm Icons import
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}{" "}
                            {isSignUp ? "Sign up with Google" : "Continue with Google"}
                        </Button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-950 px-2 text-zinc-400">Or continue with</span>
                        </div>
                    </div>
                    <form onSubmit={handleAuth}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="bg-zinc-900 border-zinc-800 text-white"
                                />
                            </div>

                            {error && (
                                <div className={error.includes("Check your email") ? "text-green-400 text-sm text-center" : "text-red-400 text-sm text-center"}>
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSignUp ? "Create Account" : "Sign In"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button
                        variant="link"
                        className="text-zinc-500 hover:text-white text-xs"
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setError(null)
                        }}
                    >
                        {isSignUp
                            ? "Already have an account? Sign In"
                            : "Don't have an account? Sign Up"}
                    </Button>
                </CardFooter>
            </Card>

            {/* DEBUG INFO - REMOVE IN PROD */}
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>}>
            <LoginForm />
        </Suspense>
    )
}
