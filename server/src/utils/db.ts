import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(__dirname, '../../data/db.json');

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface EncryptedItem {
  id: string;
  userId: string;
  title: string;
  encryptedData: string;
  iv: string;
  tag: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  items: EncryptedItem[];
}

export function readDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], items: [] }, null, 2));
  }
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

export function writeDb(data: DatabaseSchema): void {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
