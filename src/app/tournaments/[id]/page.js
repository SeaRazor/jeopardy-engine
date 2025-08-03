'use client';

import { useParams } from 'next/navigation';

export default function TournamentDetailPage() {
  const { id } = useParams();

  return (
    <div className="container">
      <h1>Tournament Details</h1>
      <p>Details for tournament with ID: {id} will be displayed here.</p>
    </div>
  );
}
