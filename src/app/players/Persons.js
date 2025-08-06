'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTrash, FaPlus } from 'react-icons/fa';
import styles from './Players.module.css';
import AddPersonModal from './AddPersonModal';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import PersonCard from './components/PersonCard';

const generateColor = () => {
  const colors = ['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#9575cd', '#f06292', '#4db6ac', '#7986cb', '#a1887f', '#dce775'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const fetchPersons = async () => {
  const res = await fetch('/api/players?type=persons');
  return res.json();
};

const addPerson = async (newPerson) => {
  const res = await fetch('/api/players?type=persons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newPerson),
  });
  return res.json();
};

const deletePerson = async (id) => {
  await fetch(`/api/players?type=persons&id=${id}`, { method: 'DELETE' });
};

export default function Persons() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);

  const { data: persons = [], isLoading } = useQuery({ queryKey: ['persons'], queryFn: fetchPersons });

  const addMutation = useMutation({ 
    mutationFn: addPerson,
    onSuccess: () => {
      queryClient.invalidateQueries(['persons']);
    }
  });

  const deleteMutation = useMutation({ 
    mutationFn: deletePerson,
    onSuccess: () => {
      queryClient.invalidateQueries(['persons']);
    }
  });

  const handleAddPerson = (newPerson) => {
    addMutation.mutate({ ...newPerson, color: generateColor() });
  };

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
      <AddPersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPerson={handleAddPerson}
      />
      <ConfirmationDialog
        isOpen={!!personToDelete}
        onClose={() => setPersonToDelete(null)}
        onConfirm={() => handleDeletePerson(personToDelete)}
        message="Are you sure you want to delete this person?"
      />
      <button onClick={() => setIsModalOpen(true)} className="fab">
        <FaPlus />
      </button>
    </div>
  );
}
