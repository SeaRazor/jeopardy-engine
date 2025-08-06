'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTrash, FaPlus } from 'react-icons/fa';
import styles from '../players/Players.module.css';
import AddPresenterModal from './AddPresenterModal';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import PresenterCard from './PresenterCard';

const generateColor = () => {
  const colors = ['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#9575cd', '#f06292', '#4db6ac', '#7986cb', '#a1887f', '#dce775'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const fetchPresenters = async () => {
  const res = await fetch('/api/presenters');
  return res.json();
};

const addPresenter = async (newPresenter) => {
  const res = await fetch('/api/presenters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newPresenter),
  });
  return res.json();
};

const deletePresenter = async (id) => {
  await fetch(`/api/presenters?id=${id}`, { method: 'DELETE' });
};

export default function Presenters() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presenterToDelete, setPresenterToDelete] = useState(null);

  const { data: presenters = [], isLoading } = useQuery({ queryKey: ['presenters'], queryFn: fetchPresenters });

  const addMutation = useMutation({ 
    mutationFn: addPresenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['presenters']);
    }
  });

  const deleteMutation = useMutation({ 
    mutationFn: deletePresenter,
    onSuccess: () => {
      queryClient.invalidateQueries(['presenters']);
      setPresenterToDelete(null);
    }
  });

  const handleAddPresenter = (newPresenter) => {
    addMutation.mutate({ ...newPresenter, color: generateColor() });
  };

  const handleDeleteConfirm = () => {
    if (presenterToDelete) {
      deleteMutation.mutate(presenterToDelete.id);
    }
  };

  const filteredPresenters = presenters.filter(
    (presenter) =>
      presenter.firstName.toLowerCase().includes(filter.toLowerCase()) ||
      presenter.lastName.toLowerCase().includes(filter.toLowerCase()) ||
      presenter.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Filter by name or email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterInput}
        />
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.grid}>

          {filteredPresenters.map((presenter) => (
            <PresenterCard key={presenter.id} presenter={presenter} onDelete={() => setPresenterToDelete(presenter)} />
          ))}
        </div>
      )}
      <AddPresenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPresenter={handleAddPresenter}
      />
      <ConfirmationDialog
        isOpen={!!presenterToDelete}
        onClose={() => setPresenterToDelete(null)}
        onConfirm={handleDeleteConfirm}
        message={`Are you sure you want to delete ${presenterToDelete?.firstName} ${presenterToDelete?.lastName}?`}
      />
      <button onClick={() => setIsModalOpen(true)} className="fab">
        <FaPlus />
      </button>
    </div>
  );
}
