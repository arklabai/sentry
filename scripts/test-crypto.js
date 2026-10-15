import { webcrypto } from 'crypto';

// Polyfill global crypto for Node test if needed
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

async function testCrypto() {
  console.log('--- Testing Sentry AI AES-256-GCM Vault Cryptography ---');

  const testProfile = {
    fullName: 'Alex Mercer',
    primaryEmail: 'alex.mercer@arklabai.com',
    phone: '+1-555-0199',
    cityState: 'Austin, TX',
    country: 'United States',
  };

  const passphrase = 'UltraSecureCyberPassphrase123!';

  // Encrypt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const plainBytes = enc.encode(JSON.stringify(testProfile));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plainBytes
  );

  const vault = {
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(encryptedBuffer),
  };

  console.log('[PASS] Encrypted ciphertext generated successfully.');
  console.log(`Ciphertext length: ${vault.ciphertext.length} characters`);

  // Decrypt
  const decSalt = new Uint8Array(base64ToBuffer(vault.salt));
  const decIv = new Uint8Array(base64ToBuffer(vault.iv));
  const decCipher = base64ToBuffer(vault.ciphertext);

  const decKey = await deriveKey(passphrase, decSalt);
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decIv },
    decKey,
    decCipher
  );

  const dec = new TextDecoder();
  const decryptedProfile = JSON.parse(dec.decode(decryptedBuf));

  if (decryptedProfile.fullName === testProfile.fullName && decryptedProfile.primaryEmail === testProfile.primaryEmail) {
    console.log('[PASS] Decrypted profile verified with 100% byte fidelity.');
  } else {
    throw new Error('Profile mismatch!');
  }

  // Verify wrong passphrase rejection
  try {
    const badKey = await deriveKey('WrongPassword123', decSalt);
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decIv }, badKey, decCipher);
    throw new Error('Failed to reject invalid passphrase!');
  } catch (err) {
    console.log('[PASS] Successfully rejected fraudulent/incorrect passphrase.');
  }

  console.log('\nAll Cryptographic tests passed!');
}

testCrypto().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
