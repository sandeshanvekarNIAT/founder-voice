'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function DebugAuth() {
    const [config, setConfig] = useState<any>({})
    const [manualLink, setManualLink] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        setConfig({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
                `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'MISSING',
            origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
        })
    }, [])

    const generateLink = async () => {
        try {
            const supabase = createClient()
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'https://founder-voice.vercel.app/auth/callback',
                    skipBrowserRedirect: true
                }
            })

            if (error) {
                setError(error.message)
                return
            }

            if (data?.url) {
                setManualLink(data.url)
                setError('')
            }
        } catch (e: any) {
            setError(e.message)
        }
    }

    return (
        <div className="p-8 text-white bg-black min-h-screen font-mono">
            <h1 className="text-xl mb-4 font-bold text-red-500">Auth Debugger (Production)</h1>

            <div className="mb-6">
                <h2 className="text-lg mb-2">Environment Config</h2>
                <pre className="bg-zinc-900 p-4 rounded text-sm overflow-auto text-green-400">
                    {JSON.stringify(config, null, 2)}
                </pre>
                <p className="text-zinc-500 text-xs mt-2">
                    Confirm 'url' matches: https://attmsrtzvyjnxqfabnrf.supabase.co
                </p>
            </div>

            <div className="mb-6">
                <button onClick={generateLink} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Generate OAuth Link
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-900/50 text-red-200 rounded mb-4">
                    Error: {error}
                </div>
            )}

            {manualLink && (
                <div className="bg-zinc-800 p-4 rounded">
                    <p className="mb-2 text-zinc-400">Generated URL (Click to Test):</p>
                    <a href={manualLink} className="text-blue-400 underline break-all block mb-4">
                        {manualLink}
                    </a>

                    <div className="text-xs text-zinc-500 border-t border-zinc-700 pt-2">
                        <strong>Params Analysis:</strong>
                        <ul className="list-disc pl-4 mt-1">
                            <li>redirect_uri: {new URL(manualLink).searchParams.get('redirect_uri')}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}
