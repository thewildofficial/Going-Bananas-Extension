/**
 * Encryption utilities for sensitive data storage
 * 
 * Provides secure encryption/decryption for API keys and other sensitive data
 * using Web Crypto API with AES-GCM encryption.
 */

// Generate a key derivation function using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Generate a random IV
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt sensitive data using AES-GCM
 * @param data - Data to encrypt
 * @param password - Password for encryption
 * @returns Encrypted data with salt and IV
 */
export async function encryptData(data: string, password: string): Promise<string> {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      new TextEncoder().encode(data)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-GCM
 * @param encryptedData - Encrypted data (base64)
 * @param password - Password for decryption
 * @returns Decrypted data
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a device-specific encryption key
 * This creates a unique key based on the user's browser and extension installation
 */
export async function generateDeviceKey(): Promise<string> {
  try {
    // Use a combination of browser info and extension ID for uniqueness
    const browserInfo = navigator.userAgent + navigator.language + navigator.platform;
    const extensionId = chrome.runtime.id;
    const timestamp = Date.now().toString();
    
    const combined = browserInfo + extensionId + timestamp;
    
    // Hash the combined string to create a consistent key
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(combined));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 32); // Use first 32 characters
  } catch (error) {
    console.error('Failed to generate device key:', error);
    // Fallback to a simple hash
    return 'fallback-device-key-' + Date.now().toString(36);
  }
}

/**
 * Secure API key storage with encryption
 */
export class SecureApiKeyStorage {
  private static instance: SecureApiKeyStorage;
  private deviceKey: string | null = null;

  private constructor() {}

  static getInstance(): SecureApiKeyStorage {
    if (!SecureApiKeyStorage.instance) {
      SecureApiKeyStorage.instance = new SecureApiKeyStorage();
    }
    return SecureApiKeyStorage.instance;
  }

  private async getDeviceKey(): Promise<string> {
    if (!this.deviceKey) {
      this.deviceKey = await generateDeviceKey();
    }
    return this.deviceKey;
  }

  /**
   * Store API key securely
   * @param apiKey - API key to store
   */
  async storeApiKey(apiKey: string): Promise<void> {
    try {
      if (!apiKey) {
        // Remove the key if empty
        await chrome.storage.local.remove(['encrypted_api_key']);
        return;
      }

      const deviceKey = await this.getDeviceKey();
      const encryptedKey = await encryptData(apiKey, deviceKey);
      
      await chrome.storage.local.set({
        encrypted_api_key: encryptedKey,
        key_stored_at: Date.now()
      });
    } catch (error) {
      console.error('Failed to store API key securely:', error);
      throw new Error('Failed to store API key securely');
    }
  }

  /**
   * Retrieve API key securely
   * @returns Decrypted API key or null if not found
   */
  async getApiKey(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(['encrypted_api_key']);
      
      if (!result.encrypted_api_key) {
        return null;
      }

      const deviceKey = await this.getDeviceKey();
      const decryptedKey = await decryptData(result.encrypted_api_key, deviceKey);
      
      return decryptedKey;
    } catch (error) {
      console.error('Failed to retrieve API key securely:', error);
      // If decryption fails, the key might be corrupted or from a different device
      // Clear the corrupted key
      await chrome.storage.local.remove(['encrypted_api_key']);
      return null;
    }
  }

  /**
   * Check if API key is stored
   */
  async hasApiKey(): Promise<boolean> {
    const result = await chrome.storage.local.get(['encrypted_api_key']);
    return !!result.encrypted_api_key;
  }

  /**
   * Clear stored API key
   */
  async clearApiKey(): Promise<void> {
    await chrome.storage.local.remove(['encrypted_api_key', 'key_stored_at']);
  }
}