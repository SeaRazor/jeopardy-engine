'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTrash, FaPlus } from 'react-icons/fa';
import styles from './Players.module.css';
import AddTeamModal from './AddTeamModal';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import TeamCard from './components/TeamCard';

const generateColor = () => {
  const colors = ['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#9575cd', '#f06292', '#4db6ac', '#7986cb', '#a1887f', '#dce775'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const fetchTeams = async () => {
  const res = await fetch('/api/players?type=teams');
  return res.json();
};

const addTeam = async (newTeam) => {
  const res = await fetch('/api/players?type=teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newTeam),
  });
  return res.json();
};

const deleteTeam = async (id) => {
  await fetch(`/api/players?type=teams&id=${id}`, { method: 'DELETE' });
};

export default function Teams() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  const { data: teams = [], isLoading } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const addMutation = useMutation({ 
    mutationFn: addTeam,
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    }
  });

  const deleteMutation = useMutation({ 
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
    }
  });

  const handleAddTeam = (newTeam) => {
    addMutation.mutate({ ...newTeam, color: generateColor() });
  };

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
      <AddTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTeam={handleAddTeam}
      />
      <ConfirmationDialog
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => handleDeleteTeam(teamToDelete)}
        message="Are you sure you want to delete this team?"
      />
      <button onClick={() => setIsModalOpen(true)} className="fab">
        <FaPlus />
      </button>
    </div>
  );
}
