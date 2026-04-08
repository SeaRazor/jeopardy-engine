'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaThLarge, FaList, FaTrash } from 'react-icons/fa';
import styles from './Players.module.css';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import TeamCard from './components/TeamCard';
import { generateColorFromString } from '../util/color';

const fetchTeams = async () => {
  const res = await fetch('/api/players?type=team');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const deleteTeam = async (id) => {
  const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete team');
};

export default function Teams() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const { data: teams = [], isLoading } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => queryClient.invalidateQueries(['teams']),
  });

  const handleDeleteTeam = (id) => {
    deleteMutation.mutate(id);
    setTeamToDelete(null);
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterInput}
        />
        <div className={styles.viewSwitcher}>
          <button
            className={`${styles.viewButton} ${viewMode === 'card' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('card')}
            title="Карточки"
            aria-label="Вид карточек"
          >
            <FaThLarge />
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('list')}
            title="Список"
            aria-label="Вид списка"
          >
            <FaList />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : viewMode === 'card' ? (
        <div className={styles.grid}>
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} onDelete={() => setTeamToDelete(team.id)} />
          ))}
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredTeams.map((team) => (
            <li key={team.id} className={styles.listRow}>
              <div
                className={styles.listAvatar}
                style={{ backgroundColor: generateColorFromString(team.id) }}
              >
                {team.name.substring(0, 2).toUpperCase()}
              </div>
              <span className={styles.listName}>{team.name}</span>
              <button
                className={styles.listDeleteButton}
                onClick={() => setTeamToDelete(team.id)}
                title="Удалить"
                aria-label="Удалить команду"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => handleDeleteTeam(teamToDelete)}
        message="Вы уверены, что хотите удалить эту команду?"
      />
    </div>
  );
}
