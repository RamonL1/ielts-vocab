import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilrreynuygmxarptaymn.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscnJleW51eWdteGFycHRheW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjE4MDAsImV4cCI6MjA2MjY5NzgwMH0.KkQX4JN4e1WmK4xkOgZo4eWkJxT5W-V9oXRGzpvKmHU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
