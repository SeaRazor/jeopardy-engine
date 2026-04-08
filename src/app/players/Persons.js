'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaThLarge, FaList, FaTrash } from 'react-icons/fa';
import styles from './Players.module.css';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import PersonCard from './components/PersonCard';
import { generateColorFromString } from '../util/color';

const fetchPersons = async () => {
  const res = await fetch('/api/players?type=person');
  if (!res.ok) throw new Error('Failed to fetch persons');
  return res.json();
};

const deletePerson = async (id) => {
  const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete person');
};

export default function Persons() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [personToDelete, setPersonToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');

  const { data: persons = [], isLoading } = useQuery({ queryKey: ['persons'], queryFn: fetchPersons });

  const deleteMutation = useMutation({
    mutationFn: deletePerson,
    onSuccess: () => queryClient.invalidateQueries(['persons']),
  });

  const handleDeletePerson = (id) => {
    deleteMutation.mutate(id);
    setPersonToDelete(null);
  };

  const filteredPersons = persons.filter(
    (p) =>
      p.firstName.toLowerCase().includes(filter.toLowerCase()) ||
      p.lastName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Поиск по имени..."
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
          {filteredPersons.map((person) => (
            <PersonCard key={person.id} person={person} onDelete={() => setPersonToDelete(person.id)} />
          ))}
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredPersons.map((person) => (
            <li key={person.id} className={styles.listRow}>
              <div
                className={styles.listAvatar}
                style={{ backgroundColor: generateColorFromString(person.id) }}
              >
                {person.firstName[0]}{person.lastName[0]}
              </div>
              <span className={styles.listName}>
                {person.firstName} {person.lastName}
              </span>
              <button
                className={styles.listDeleteButton}
                onClick={() => setPersonToDelete(person.id)}
                title="Удалить"
                aria-label="Удалить игрока"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        isOpen={!!personToDelete}
        onClose={() => setPersonToDelete(null)}
        onConfirm={() => handleDeletePerson(personToDelete)}
        message="Вы уверены, что хотите удалить этого игрока?"
      />
    </div>
  );
}
