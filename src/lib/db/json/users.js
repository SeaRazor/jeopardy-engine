import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/users/db.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return [];
  }
}

function write(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getUsers(role) {
  const data = read();
  if (role && role !== 'all') return data.filter(u => u.role === role);
  return data;
}

export function getUserById(id) {
  const data = read();
  return data.find(u => u.id === parseInt(id)) ?? null;
}

export function createUser(userData) {
  const data = read();
  const newUser = {
    ...userData,
    id: data.length > 0 ? Math.max(...data.map(u => u.id)) + 1 : 1,
  };
  data.push(newUser);
  write(data);
  return newUser;
}

export function updateUser(userData) {
  const data = read();
  const index = data.findIndex(u => u.id === userData.id);
  if (index === -1) return null;
  data[index] = { ...data[index], ...userData };
  write(data);
  return data[index];
}

export function deleteUser(id) {
  const data = read();
  const filtered = data.filter(u => u.id !== parseInt(id));
  write(filtered);
  return { success: true };
}
