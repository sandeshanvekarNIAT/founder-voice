import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

console.log("Supabase Client Init - URL:", supabaseUrl);
// Don't log key for security

export const supabase = createClient(supabaseUrl, supabaseKey);
