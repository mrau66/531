import { supabase } from './supabase.js'

class AuthManager {
  constructor() {
    this.currentUser = null
    this.loginAttempts = 0;
    this.maxLoginAttempts = 10;
    this.hasCheckedSession = false;
    this.init()
  }

  async init() {
    try {
      // Check if we're on the login page or app page
      const isLoginPage = window.location.pathname === '/login/' || window.location.pathname === '/';
      const isAppPage = window.location.pathname === '/app/';

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()
      this.hasCheckedSession = true;
      
      // Dispatch event that AuthManager has completed its initial check
      window.dispatchEvent(new CustomEvent('authManagerReady', {
        detail: { hasSession: !!session, user: session?.user }
      }));
      
      if (session) {
        this.currentUser = session.user
        
        // If authenticated but on login page, redirect to app
        if (isLoginPage) {
          window.location.href = '/app'
          return
        }
        
        // If on app page and authenticated, initialize app features
        if (isAppPage) {
          await this.initializeApp()
        }
      } else {
        this.currentUser = null
        
        // If not authenticated but trying to access app, redirect to login
        if (isAppPage) {
          window.location.href = '/login'
          return
        }
        
        // If on login page, show login form
        if (isLoginPage) {
          this.initializeLogin()
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user')
        
        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in, setting currentUser and redirecting')
          this.currentUser = session.user
          
          // Dispatch custom event for other managers to listen to
          window.dispatchEvent(new CustomEvent('userSignedIn', {
            detail: { user: session.user }
          }));
          
          // ONLY redirect if we're NOT already on an app page
          const currentPath = window.location.pathname;
          const isOnAppPage = currentPath.startsWith('/app/');
          
          if (!isOnAppPage) {
            window.location.href = '/app'
          }
          // If already on an app page, don't redirect - just stay where we are
          
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, redirecting to login')
          this.currentUser = null
          
          // Clean up state store
          if (window.stateStore) {
            window.stateStore.updateState({ user: null });
          }
          
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('userSignedOut'));
          
          window.location.href = '/login'
        } else if (event === 'INITIAL_SESSION') {
          console.log('Initial session check complete')
          // Don't redirect on initial session check
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.hasCheckedSession = true;
      
      // Still dispatch the ready event even if there's an error
      window.dispatchEvent(new CustomEvent('authManagerReady', {
        detail: { hasSession: false, user: null, error }
      }));
    }
  }

  initializeLogin() {
    // Login page specific initialization
    console.log('Initializing login page')
    // Show any login-specific UI elements
  }

  async initializeApp() {
    // App page specific initialization
    console.log('Initializing app for user:', this.currentUser.email)
    
    // Set user email in UI
    const userEmailElement = document.getElementById('user-email')
    if (userEmailElement) {
      userEmailElement.textContent = this.currentUser.email
    }
    
    // UnifiedStateStore will handle all data loading automatically
    // No need to initialize PersistenceManager anymore
    
    // Dispatch event that app is ready
    window.dispatchEvent(new CustomEvent('appInitialized', {
      detail: { user: this.currentUser }
    }));
    
    console.log('App initialization complete')
  }

  async signIn(email, password) {
    console.log('🔵 signIn method called with:', email, password?.length + ' chars')
    
    try {
      console.log('🔵 About to validate input...')
      
      // Check if SQLInjectionProtection exists
      if (!window.SQLInjectionProtection) {
        console.warn('⚠️ SQLInjectionProtection not found, proceeding without validation')
      } else {
        const validation = window.SQLInjectionProtection.validateLoginInput(email, password);
        console.log('🔵 Validation result:', validation)
        
        if (!validation.success) {
          console.log('❌ Validation failed:', validation.errors)
          alert(validation.errors.join('. '));
          return false;
        }
      }

      console.log('🔵 About to call Supabase signInWithPassword...')

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })
      
      console.log('🔵 Supabase response data:', data)
      console.log('🔵 Supabase response error:', error)
      
      if (error) {
        console.error('❌ Supabase auth error:', error.message)
        alert('Login failed: ' + error.message);
        return false;
      }
      
      console.log('✅ Sign in appears successful!')
      return true;
    } catch (error) {
      console.error('❌ Catch block error:', error)
      alert('Error: ' + error.message)
      return false
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert('Error signing out: ' + error.message)
    }
    // onAuthStateChange will handle the redirect and cleanup
  }
}

// Export the class for use in other modules
export { AuthManager };

// Also create a global instance for immediate use
const auth = new AuthManager()
window.auth = auth

// Page-specific event listeners
document.addEventListener('DOMContentLoaded', function() {
  const currentPath = window.location.pathname
  
  // Login page setup
  if (currentPath === '/login/' || currentPath === '/') {
    const authForm = document.getElementById('auth-form')
    if (authForm) {
      authForm.addEventListener('submit', async function(e) {
        e.preventDefault()
        
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value
        const submitButton = document.getElementById('auth-submit')
        
        submitButton.disabled = true
        submitButton.textContent = 'Signing In...'
        
        try {
          const success = await auth.signIn(email, password)
          // Don't reset button here - let the auth state change handle redirect
          if (!success) {
            // Only reset if login failed
            submitButton.disabled = false
            submitButton.textContent = 'Sign In'
          }
          // If successful, onAuthStateChange will redirect automatically
        } catch (error) {
          console.error('Login error:', error)
          submitButton.disabled = false
          submitButton.textContent = 'Sign In'
        }
      })
    }
  }

})