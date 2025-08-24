'use client';

import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import Modal from '../UI/Modal';
import AdaptiveButton from '../UI/AdaptiveButton';
import styles from './AddUserForm.module.css';

export default function AddUserModal({ isOpen, onClose, onAddUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('presenter');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      setError('Имя и email обязательны для заполнения.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Пожалуйста, введите корректный email адрес.');
      return;
    }
    onAddUser({ name: name.trim(), email: email.trim(), role });
    setName('');
    setEmail('');
    setRole('presenter');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить нового пользователя">
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>Имя</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          placeholder="Введите полное имя"
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="Введите email адрес"
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="role" className={styles.label}>Роль</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={styles.select}
        >
          <option value="presenter">Ведущий</option>
          <option value="tournamentAdmin">Организатор турнира</option>
          <option value="systemAdmin">Администратор</option>
        </select>
      </div>
      <div className={styles.actions}>
        <AdaptiveButton 
          onClick={onClose} 
          icon={FaTimes} 
          text="Отмена" 
          title="Отмена"
          variant="secondary"
        />
        <AdaptiveButton 
          onClick={handleSubmit} 
          icon={FaPlus} 
          text="Добавить" 
          title="Добавить пользователя"
          variant="primary"
        />
      </div>
    </Modal>
  );
}