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
      const session = await this.checkSession();
      const currentPage = this.getCurrentPage();

      if (session) {
        await this.handleAuthenticatedUser(session, currentPage);
      } else {
        this.handleUnauthenticatedUser(currentPage);
      }

      this.setupAuthStateListener();
    } catch (error) {
      this.handleInitError(error);
    }
  }

  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    this.hasCheckedSession = true;

    window.dispatchEvent(new CustomEvent('authManagerReady', {
      detail: { hasSession: !!session, user: session?.user }
    }));

    return session;
  }

  getCurrentPage() {
    const path = window.location.pathname;
    return {
      isLoginPage: path === '/login/' || path === '/',
      isAppPage: path === '/app/',
      path
    };
  }

  async handleAuthenticatedUser(session, { isLoginPage, isAppPage }) {
    this.currentUser = session.user;

    if (isLoginPage) {
      window.location.href = '/app';
      return;
    }

    if (isAppPage) {
      await this.initializeApp();
    }
  }

  handleUnauthenticatedUser({ isAppPage }) {
    this.currentUser = null;

    if (isAppPage) {
      window.location.href = '/login';
    }
  }

  setupAuthStateListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user');

      switch (event) {
        case 'SIGNED_IN':
          await this.handleSignIn(session);
          break;
        case 'SIGNED_OUT':
          this.handleSignOut();
          break;
        case 'INITIAL_SESSION':
          console.log('Initial session check complete');
          break;
      }
    });
  }

  async handleSignIn(session) {
    if (!session) return;

    console.log('User signed in, setting currentUser and redirecting');
    this.currentUser = session.user;

    window.dispatchEvent(new CustomEvent('userSignedIn', {
      detail: { user: session.user }
    }));

    const currentPath = window.location.pathname;
    const isOnAppPage = currentPath.startsWith('/app/');

    if (!isOnAppPage) {
      window.location.href = '/app';
    }
  }

  handleSignOut() {
    console.log('User signed out, redirecting to login');
    this.currentUser = null;

    if (window.stateStore) {
      window.stateStore.updateState({ user: null });
    }

    window.dispatchEvent(new CustomEvent('userSignedOut'));
    window.location.href = '/login';
  }

  handleInitError(error) {
    console.error('Error initializing auth:', error);
    this.hasCheckedSession = true;

    window.dispatchEvent(new CustomEvent('authManagerReady', {
      detail: { hasSession: false, user: null, error }
    }));
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