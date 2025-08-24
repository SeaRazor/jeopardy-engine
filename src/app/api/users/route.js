import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/users/db.json');

const readUsers = () => {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  
  const users = readUsers();
  
  if (role && role !== 'all') {
    const filteredUsers = users.filter(user => user.role === role);
    return NextResponse.json(filteredUsers);
  }
  
  return NextResponse.json(users);
}

export async function POST(request) {
  const body = await request.json();
  const users = readUsers();
  
  const newUser = { 
    ...body, 
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1
  };
  
  users.push(newUser);
  writeUsers(users);
  
  return NextResponse.json(newUser);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  let users = readUsers();
  users = users.filter((u) => u.id !== parseInt(id));
  writeUsers(users);
  
  return NextResponse.json({ success: true });
}

export async function PUT(request) {
  const body = await request.json();
  const users = readUsers();
  
  const userIndex = users.findIndex(u => u.id === body.id);
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...body };
    writeUsers(users);
    return NextResponse.json(users[userIndex]);
  }
  
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}