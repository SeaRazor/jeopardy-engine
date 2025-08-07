'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './Players.module.css';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import TeamCard from './components/TeamCard';

const fetchTeams = async () => {
  const res = await fetch('/api/players?type=team');
  if (!res.ok) {
    throw new Error('Failed to fetch teams');
  }
  return res.json();
};

const deleteTeam = async (id) => {
  const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error('Failed to delete team');
  }
};

export default function Teams() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [teamToDelete, setTeamToDelete] = useState(null);

  const { data: teams = [], isLoading } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const deleteMutation = useMutation({ 
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    }
  });

  const handleDeleteTeam = (id) => {
    deleteMutation.mutate(id);
    setTeamToDelete(null);
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Filter by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterInput}
        />
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.grid}>
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} onDelete={() => setTeamToDelete(team.id)} />
          ))}
        </div>
      )}
      <ConfirmationDialog
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => handleDeleteTeam(teamToDelete)}
        message="Are you sure you want to delete this team?"
      />
    </div>
  );
}