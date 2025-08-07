'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './Players.module.css';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import PersonCard from './components/PersonCard';

const fetchPersons = async () => {
  const res = await fetch('/api/players?type=person');
  if (!res.ok) {
    throw new Error('Failed to fetch persons');
  }
  return res.json();
};

const deletePerson = async (id) => {
  const res = await fetch(`/api/players?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error('Failed to delete person');
  }
};

export default function Persons() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [personToDelete, setPersonToDelete] = useState(null);

  const { data: persons = [], isLoading } = useQuery({ queryKey: ['persons'], queryFn: fetchPersons });

  const deleteMutation = useMutation({ 
    mutationFn: deletePerson,
    onSuccess: () => {
      queryClient.invalidateQueries(['persons']);
    }
  });

  const handleDeletePerson = (id) => {
    deleteMutation.mutate(id);
    setPersonToDelete(null);
  };

  const filteredPersons = persons.filter(
    (person) =>
      person.firstName.toLowerCase().includes(filter.toLowerCase()) ||
      person.lastName.toLowerCase().includes(filter.toLowerCase())
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
          {filteredPersons.map((person) => (
            <PersonCard key={person.id} person={person} onDelete={() => setPersonToDelete(person.id)} />
          ))}
        </div>
      )}
      <ConfirmationDialog
        isOpen={!!personToDelete}
        onClose={() => setPersonToDelete(null)}
        onConfirm={() => handleDeletePerson(personToDelete)}
        message="Are you sure you want to delete this person?"
      />
    </div>
  );
}