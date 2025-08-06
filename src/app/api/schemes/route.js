import { NextResponse } from 'next/server';
import schemes from '../../templates/schemes.json';

export async function GET() {
  return NextResponse.json(schemes);
}