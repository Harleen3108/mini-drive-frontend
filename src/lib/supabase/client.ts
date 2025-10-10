import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tmmeztilkvinafnwxkfl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbWV6dGlsa3ZpbmFmbnd4a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjM2NzQsImV4cCI6MjA3NTQ5OTY3NH0.IRSg1d-2qcjZ1ZPx-0nF4P5hrpkHJ3i7b2TWoO1mzM8'

export const supabase = createClient(supabaseUrl, supabaseKey)