const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

// Load .env.development.local if present
const envPath = path.join(__dirname, '..', '.env.development.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or anon key in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node send_test_signup.js <email>')
    process.exit(1)
  }

  const password = 'TempPass!234'

  const redirectUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `http://localhost:3000/auth/callback`

  console.log('Signing up', email)
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    })
    if (error) {
      console.error('Sign-up error:', error.message || error)
      process.exit(1)
    }
    console.log('Sign-up response:', data)
    console.log('Temporary password used:', password)
    console.log('Confirmation email should be sent to the mailbox — check your inbox.')
    console.log('Computed emailRedirectTo:', redirectUrl)
  } catch (e) {
    console.error('Unexpected error:', e)
    process.exit(1)
  }
}

run()
