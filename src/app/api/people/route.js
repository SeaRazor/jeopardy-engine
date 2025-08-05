
import { NextResponse } from 'next/server';

const people = [
    { id: 1, firstName: 'John', lastName: 'Doe' },
    { id: 2, firstName: 'Jane', lastName: 'Smith' },
];

export async function GET() {
    return NextResponse.json(people);
}

export async function POST(request) {
    const person = await request.json();
    person.id = people.length + 1;
    people.push(person);
    return NextResponse.json(person, { status: 201 });
}
