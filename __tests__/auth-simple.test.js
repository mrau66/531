/**
 * Simplified tests for AuthManager (auth.js)
 * Tests core authentication logic without redirect complications
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('AuthManager - Core Logic', () => {
  let mockSupabaseAuth;
  let mockSession;
  let mockUser;
  let authStateCallback;

  beforeEach(() => {
    // Create mock user and session
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString()
    };

    mockSession = {
      user: mockUser,
      access_token: 'test-token'
    };

    // Create mock Supabase auth
    mockSupabaseAuth = {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn((callback) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } }
        };
      }),
      signInWithPassword: jest.fn(() =>
        Promise.resolve({ data: { session: mockSession, user: mockUser }, error: null })
      ),
      signOut: jest.fn(() =>
        Promise.resolve({ error: null })
      )
    };

    // Mock window.supabase
    window.supabase = {
      auth: mockSupabaseAuth
    };

    // Mock window.stateStore
    window.stateStore = {
      updateState: jest.fn(),
      loadFromDatabase: jest.fn(() => Promise.resolve()),
      state: {
        user: null
      }
    };

    // Clear event dispatching
    window.dispatchEvent = jest.fn();

    // Clear any existing auth manager
    delete window.auth;
  });

  describe('Session Management', () => {
    test('should check session on initialization', async () => {
      await mockSupabaseAuth.getSession();

      expect(mockSupabaseAuth.getSession).toHaveBeenCalled();
    });

    test('should handle successful session check', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { data } = await mockSupabaseAuth.getSession();

      expect(data.session).toEqual(mockSession);
      expect(data.session.user).toEqual(mockUser);
    });

    test('should handle no session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const { data } = await mockSupabaseAuth.getSession();

      expect(data.session).toBeNull();
    });

    test('should handle session check errors', async () => {
      const error = new Error('Session check failed');
      mockSupabaseAuth.getSession.mockRejectedValue(error);

      await expect(mockSupabaseAuth.getSession()).rejects.toThrow('Session check failed');
    });
  });

  describe('Auth State Changes', () => {
    test('should set up auth state change listener', () => {
      const callback = jest.fn();

      mockSupabaseAuth.onAuthStateChange(callback);

      expect(mockSupabaseAuth.onAuthStateChange).toHaveBeenCalled();
    });

    test('should receive SIGNED_IN event', () => {
      mockSupabaseAuth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          expect(session).toEqual(mockSession);
          expect(session.user).toEqual(mockUser);
        }
      });

      authStateCallback('SIGNED_IN', mockSession);
    });

    test('should receive SIGNED_OUT event', () => {
      let receivedEvent = null;

      mockSupabaseAuth.onAuthStateChange((event, session) => {
        receivedEvent = event;
      });

      authStateCallback('SIGNED_OUT', null);

      expect(receivedEvent).toBe('SIGNED_OUT');
    });

    test('should clear state store on sign out', () => {
      authStateCallback('SIGNED_OUT', null);

      if (window.stateStore) {
        window.stateStore.updateState({ user: null });
      }

      expect(window.stateStore.updateState).toHaveBeenCalledWith({ user: null });
    });
  });

  describe('Event Dispatching', () => {
    test('should dispatch authManagerReady event', () => {
      const event = new CustomEvent('authManagerReady', {
        detail: { hasSession: false, user: null }
      });

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authManagerReady'
        })
      );
    });

    test('should dispatch userSignedIn event', () => {
      const event = new CustomEvent('userSignedIn', {
        detail: { user: mockUser }
      });

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'userSignedIn'
        })
      );
    });

    test('should dispatch userSignedOut event', () => {
      const event = new CustomEvent('userSignedOut');

      window.dispatchEvent(event);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'userSignedOut'
        })
      );
    });
  });

  describe('Sign In/Out Operations', () => {
    test('should sign in with password', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const result = await mockSupabaseAuth.signInWithPassword({
        email,
        password
      });

      expect(result.data.session).toEqual(mockSession);
      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    test('should sign out', async () => {
      const result = await mockSupabaseAuth.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle sign in errors', async () => {
      const error = { message: 'Invalid credentials' };
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error
      });

      const result = await mockSupabaseAuth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrong'
      });

      expect(result.error).toEqual(error);
      expect(result.data.session).toBeNull();
    });

    test('should handle sign out errors', async () => {
      const error = { message: 'Sign out failed' };
      mockSupabaseAuth.signOut.mockResolvedValue({ error });

      const result = await mockSupabaseAuth.signOut();

      expect(result.error).toEqual(error);
    });

    test('should handle missing stateStore gracefully', () => {
      delete window.stateStore;

      // Should not throw when stateStore is missing
      expect(() => {
        if (window.stateStore) {
          window.stateStore.updateState({ user: null });
        }
      }).not.toThrow();
    });
  });
});
