import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vekrfnxuizzcmycdfrip.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla3Jmbnh1aXp6Y215Y2RmcmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDQzNjEsImV4cCI6MjA4OTc4MDM2MX0.z43Zm_9ua8vHfFWpSuG_0GQ9bEaJri9Gm1rByJzamBs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
