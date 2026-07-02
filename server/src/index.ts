import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { readDb, writeDb, User, EncryptedItem } from './utils/db';
import { encrypt, decrypt } from './utils/crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'xero-jwt-default-super-secret-key';

app.use(cors());
app.use(express.json());

// Extend express Request type to hold user info
interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded?.userId) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Sign Up Route
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = readDb();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: crypto.randomUUID(),
      email: email,
      passwordHash: passwordHash
    };

    db.users.push(newUser);
    writeDb(db);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, email: newUser.email });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// Login Route
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, email: user.email });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Encrypt & Save Endpoint
app.post('/api/encrypt', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, plaintext } = req.body;
    const userId = req.userId;

    if (!title || !plaintext || !userId) {
      return res.status(400).json({ error: 'Title and plaintext are required' });
    }

    // Encrypt content using native AES-256-GCM
    const { iv, encryptedData, tag } = encrypt(plaintext);

    const db = readDb();
    const newItem: EncryptedItem = {
      id: crypto.randomUUID(),
      userId: userId,
      title: title,
      encryptedData: encryptedData,
      iv: iv,
      tag: tag,
      createdAt: new Date().toISOString()
    };

    db.items.push(newItem);
    writeDb(db);

    res.status(201).json({
      id: newItem.id,
      title: newItem.title,
      encryptedData: newItem.encryptedData,
      createdAt: newItem.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Encryption failed' });
  }
});

// Get User's Encrypted Items List
app.get('/api/items', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDb();
    const userItems = db.items
      .filter(item => item.userId === userId)
      .map(item => ({
        id: item.id,
        title: item.title,
        encryptedData: item.encryptedData,
        createdAt: item.createdAt
      }));

    res.json(userItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve records' });
  }
});

// Decrypt & Fetch Endpoint
app.post('/api/decrypt', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const userId = req.userId;

    if (!id || !userId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const db = readDb();
    const item = db.items.find(item => item.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this record' });
    }

    // Decrypt content using native AES-256-GCM
    const decryptedText = decrypt(item.encryptedData, item.iv, item.tag);

    res.json({ plaintext: decryptedText });
  } catch (error) {
    res.status(500).json({ error: 'Decryption failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Xero secure backend listening on port ${PORT}`);
});
