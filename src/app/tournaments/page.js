'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import TournamentCard from './components/TournamentCard';
import TournamentFilters from './components/TournamentFilters/TournamentFilters';
import AddTournamentForm from './components/AddTournamentForm/AddTournamentForm';
import Modal from '../UI/Modal/Modal'; // Import the Modal component
import styles from './tournaments.module.css';
import { getTournamentStatus } from '../util/tournament';

// Define the fetching function once
const getTournaments = async () => {
  const res = await fetch('/api/tournaments');
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
};

export default function TournamentsPage() {
  const [filters, setFilters] = useState({ name: '', type: '', status: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: tournaments, isLoading, isError } = useQuery({
    queryKey: ['tournaments'],
    queryFn: getTournaments,
  });

  const handleFilterChange = (name, value) => {
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ name: '', type: '', status: '' });
  };

  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];
    return tournaments.filter((tournament) => {
      const status = getTournamentStatus(tournament.startDate, tournament.endDate);
      return (
        tournament.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        (filters.type === '' || tournament.type === filters.type) &&
        (filters.status === '' || status === filters.status)
      );
    });
  }, [tournaments, filters]);

  if (isLoading) return <p>Загрузка турниров...</p>;
  if (isError) return <p>Ошибка загрузки турниров.</p>;

  return (
    <div className="container">
      <h1>Турниры</h1>
      <div className={styles.controls}>
        <TournamentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={clearFilters}
        />
        <button onClick={() => setIsFormOpen(true)} className={styles.addTournamentButton}>
          Добавить турнир
        </button>
      </div>
      <div className={styles.grid}>
        {filteredTournaments.length > 0 ? (
          filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))
        ) : (
          <p>Нет турниров, соответствующих фильтрам.</p>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Добавить турнир">
        <AddTournamentForm onClose={() => setIsFormOpen(false)} />
      </Modal>
    </div>
  );
}
