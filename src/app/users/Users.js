'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus } from 'react-icons/fa';
import styles from './Users.module.css';
import AddUserModal from './AddUserModal';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import UserCard from './UserCard';
import AdaptiveButton from '../UI/AdaptiveButton/AdaptiveButton';

const generateColor = () => {
  const colors = ['#e57373', '#81c784', '#64b5f6', '#ffb74d', '#9575cd', '#f06292', '#4db6ac', '#7986cb', '#a1887f', '#dce775'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const fetchUsers = async (roleFilter = 'all') => {
  const url = roleFilter === 'all' ? '/api/users' : `/api/users?role=${roleFilter}`;
  const res = await fetch(url);
  return res.json();
};

const addUser = async (newUser) => {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newUser),
  });
  return res.json();
};

const deleteUser = async (id) => {
  await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
};

export default function Users() {
  const queryClient = useQueryClient();
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { data: users = [], isLoading } = useQuery({ 
    queryKey: ['users', roleFilter], 
    queryFn: () => fetchUsers(roleFilter)
  });

  const addMutation = useMutation({ 
    mutationFn: addUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  const deleteMutation = useMutation({ 
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setUserToDelete(null);
    }
  });

  const handleAddUser = (newUser) => {
    addMutation.mutate({ ...newUser, color: generateColor() });
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(nameFilter.toLowerCase())
  );

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Filter by name or email..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className={styles.input}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">Все роли</option>
          <option value="systemAdmin">Администратор</option>
          <option value="tournamentAdmin">Организатор турнира</option>
          <option value="presenter">Ведущий</option>
        </select>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.grid}>
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} onDelete={() => setUserToDelete(user)} />
          ))}
        </div>
      )}
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddUser={handleAddUser}
      />
      <ConfirmationDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        message={`Are you sure you want to delete ${userToDelete?.name}?`}
      />
      <AdaptiveButton 
        onClick={() => setIsModalOpen(true)} 
        icon={FaPlus} 
        title="Add User"
        variant="primary"
        className="fab"
      />
    </div>
  );
}