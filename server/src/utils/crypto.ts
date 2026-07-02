import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getSecretKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET || 'xero-default-fallback-super-secret-key-32-chars';
  return crypto.scryptSync(secret, 'xero-salt', 32);
};

export function encrypt(text: string): { iv: string; encryptedData: string; tag: string } {
  const key = getSecretKey();
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    tag: tag,
  };
}

export function decrypt(encryptedData: string, ivHex: string, tagHex: string): string {
  const key = getSecretKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
