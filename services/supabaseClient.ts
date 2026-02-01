import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fvvtortaeztsanlqycac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2dnRvcnRhZXp0c2FubHF5Y2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTgwNjksImV4cCI6MjA4NTUzNDA2OX0.Qm8Eqw7QwgvrZT2ifgNFTWR_MDR0OniObSeAbGlLc2w';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);