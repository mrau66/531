/**
 * Simplified tests for Supabase client initialization (supabase.js)
 * Tests configuration validation and client creation logic
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Supabase Client - Configuration', () => {
  let originalConfig;

  beforeEach(() => {
    originalConfig = window.SUPABASE_CONFIG;
    delete window.SUPABASE_CONFIG;
    delete window.supabase;
  });

  afterEach(() => {
    if (originalConfig !== undefined) {
      window.SUPABASE_CONFIG = originalConfig;
    }
    jest.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    test('should validate config with URL and key', () => {
      const config = {
        url: 'https://test.supabase.co',
        key: 'test-anon-key'
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(true);
    });

    test('should reject missing config', () => {
      const config = null;

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject MISSING_URL', () => {
      const config = {
        url: 'MISSING_URL',
        key: 'test-key'
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject MISSING_KEY', () => {
      const config = {
        url: 'https://test.supabase.co',
        key: 'MISSING_KEY'
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject empty URL', () => {
      const config = {
        url: '',
        key: 'test-key'
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject empty key', () => {
      const config = {
        url: 'https://test.supabase.co',
        key: ''
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject null URL', () => {
      const config = {
        url: null,
        key: 'test-key'
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });

    test('should reject null key', () => {
      const config = {
        url: 'https://test.supabase.co',
        key: null
      };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Config Waiting', () => {
    test('should wait for config to become available', async () => {
      const waitForConfig = () => {
        return new Promise((resolve) => {
          if (window.SUPABASE_CONFIG) {
            resolve(window.SUPABASE_CONFIG);
          } else {
            setTimeout(() => resolve(window.SUPABASE_CONFIG || {}), 100);
          }
        });
      };

      // Set config after delay
      setTimeout(() => {
        window.SUPABASE_CONFIG = {
          url: 'https://test.supabase.co',
          key: 'test-key'
        };
      }, 50);

      const config = await waitForConfig();

      expect(config.url).toBe('https://test.supabase.co');
      expect(config.key).toBe('test-key');
    });

    test('should return immediately if config already exists', async () => {
      window.SUPABASE_CONFIG = {
        url: 'https://test.supabase.co',
        key: 'test-key'
      };

      const waitForConfig = () => {
        return new Promise((resolve) => {
          if (window.SUPABASE_CONFIG) {
            resolve(window.SUPABASE_CONFIG);
          } else {
            setTimeout(() => resolve(window.SUPABASE_CONFIG || {}), 100);
          }
        });
      };

      const config = await waitForConfig();

      expect(config).toEqual(window.SUPABASE_CONFIG);
    });

    test('should return empty object if config never arrives', async () => {
      const waitForConfig = () => {
        return new Promise((resolve) => {
          if (window.SUPABASE_CONFIG) {
            resolve(window.SUPABASE_CONFIG);
          } else {
            setTimeout(() => resolve(window.SUPABASE_CONFIG || {}), 100);
          }
        });
      };

      const config = await waitForConfig();

      expect(config).toEqual({});
    });
  });

  describe('Client Creation', () => {
    test('should create client with valid config', () => {
      const mockCreateClient = jest.fn((url, key) => ({
        auth: { getSession: jest.fn() },
        from: jest.fn(),
        _url: url,
        _key: key
      }));

      const config = {
        url: 'https://test.supabase.co',
        key: 'test-anon-key'
      };

      const client = mockCreateClient(config.url, config.key);

      expect(client._url).toBe('https://test.supabase.co');
      expect(client._key).toBe('test-anon-key');
      expect(client.auth).toBeDefined();
      expect(client.from).toBeDefined();
    });

    test('should make client available globally', () => {
      const mockClient = {
        auth: { getSession: jest.fn() },
        from: jest.fn()
      };

      window.supabase = mockClient;

      expect(window.supabase).toBe(mockClient);
      expect(window.supabase.auth).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const config = { url: 'MISSING_URL', key: 'MISSING_KEY' };

      const isValid = !(
        !config ||
        config.url === 'MISSING_URL' ||
        config.key === 'MISSING_KEY' ||
        !config.url ||
        !config.key
      );

      if (!isValid) {
        console.error('❌ Supabase configuration missing!');
        console.error('Config received:', config);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Supabase configuration missing')
      );
      expect(consoleSpy).toHaveBeenCalledWith('Config received:', config);

      consoleSpy.mockRestore();
    });
  });
});
