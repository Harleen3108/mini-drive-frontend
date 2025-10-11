import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dmvtgdwiivsrrktvirfy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdnRnZHdpaXZzcnJrdHZpcmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjgxMTQsImV4cCI6MjA3NTY0NDExNH0.APeyGiTDXsJggZpeD8ZTyJlJdm_4jVOsywwYosKRfSw'

export const supabase = createClient(supabaseUrl, supabaseKey)