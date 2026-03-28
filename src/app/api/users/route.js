import { NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, deleteUser } from '../../../lib/data/users.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const users = await getUsers(role || undefined);
  return NextResponse.json(users);
}

export async function POST(request) {
  const body = await request.json();
  const newUser = await createUser(body);
  return NextResponse.json(newUser);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const result = await deleteUser(id);
  return NextResponse.json(result);
}

export async function PUT(request) {
  const body = await request.json();
  const updated = await updateUser(body);
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}
