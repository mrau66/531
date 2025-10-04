// src/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Wait for config to be available
function waitForConfig() {
  return new Promise((resolve) => {
    if (window.SUPABASE_CONFIG) {
      resolve(window.SUPABASE_CONFIG)
    } else {
      // Wait a bit for the script to load
      setTimeout(() => resolve(window.SUPABASE_CONFIG || {}), 100)
    }
  })
}

// Initialize Supabase client
let supabase = null

async function initSupabase() {
  // Prevent double initialization
  if (supabase) {
    return supabase;
  }

  const config = await waitForConfig()
  
  if (!config || config.url === 'MISSING_URL' || config.key === 'MISSING_KEY' || !config.url || !config.key) {
    console.error('❌ Supabase configuration missing!')
    console.error('Config received:', config)
    throw new Error('Supabase configuration not found. Check your environment variables.')
  }
  
  console.log('✅ Initializing Supabase with:', config.url)
  
  supabase = createClient(config.url, config.key)
  
  // Make available globally immediately
  window.supabase = supabase;
  console.log('✅ Supabase available globally');
  
  return supabase
}

// Export a promise that resolves to the configured client
export const getSupabase = async () => {
  if (!supabase) {
    await initSupabase()
  }
  return supabase
}

// For immediate use (but might not be ready yet)
export { supabase }

// Initialize immediately when module loads
initSupabase().catch(console.error)