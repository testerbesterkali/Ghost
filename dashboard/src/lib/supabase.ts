import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oocvlgwpirjutrfcaxoh.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vY3ZsZ3dwaXJqdXRyZmNheG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDcyODUsImV4cCI6MjA4NzA4MzI4NX0.mCK8tFeAknDtGOE--jilswtsvdy4F8hoYK0dVx_XwNc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };
