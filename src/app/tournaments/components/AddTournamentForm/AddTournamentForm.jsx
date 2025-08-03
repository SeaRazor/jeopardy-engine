'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import styles from './AddTournamentForm.module.css';

export default function AddTournamentForm({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    type: '',
    schema: '',
    participants: 0,
  });
  const [errors, setErrors] = useState({});

  const { data: types } = useQuery({
    queryKey: ['types'],
    queryFn: async () => {
      const res = await fetch('/api/types');
      if (!res.ok) throw new Error('Failed to fetch types');
      return res.json();
    },
  });

  const { data: schemes } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => {
      const res = await fetch('/api/schemes');
      if (!res.ok) throw new Error('Failed to fetch schemes');
      return res.json();
    },
  });

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Название турнира обязательно.';
    if (!formData.startDate) newErrors.startDate = 'Дата начала обязательна.';
    if (!formData.endDate) newErrors.endDate = 'Дата окончания обязательна.';
    if (!formData.type) newErrors.type = 'Тип турнира обязателен.';
    if (!formData.schema) newErrors.schema = 'Схема турнира обязательна.';
    if (formData.participants <= 0) newErrors.participants = 'Количество участников должно быть больше 0.';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'Дата окончания не может быть раньше даты начала.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTournamentMutation = useMutation({
    mutationFn: async (newTournament) => {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTournament),
      });
      if (!res.ok) throw new Error('Failed to add tournament');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tournaments']);
      onClose();
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: name === 'participants' ? Number(value) : value,
    }));
    // Clear error for the field being changed
    setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      addTournamentMutation.mutate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Название турнира</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={errors.name ? styles.inputError : ''}
        />
        {errors.name && <p className={styles.errorText}>{errors.name}</p>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="startDate">Дата начала</label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          className={errors.startDate ? styles.inputError : ''}
        />
        {errors.startDate && <p className={styles.errorText}>{errors.startDate}</p>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="endDate">Дата окончания</label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          className={errors.endDate ? styles.inputError : ''}
        />
        {errors.endDate && <p className={styles.errorText}>{errors.endDate}</p>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="type">Тип турнира</label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
          className={errors.type ? styles.inputError : ''}
        >
          <option value="">Выберите тип</option>
          {types?.map((type) => (
            <option key={type.id} value={type.name}>
              {type.name}
            </option>
          ))}
        </select>
        {errors.type && <p className={styles.errorText}>{errors.type}</p>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="schema">Схема турнира</label>
        <select
          id="schema"
          name="schema"
          value={formData.schema}
          onChange={handleChange}
          className={errors.schema ? styles.inputError : ''}
        >
          <option value="">Выберите схему</option>
          {schemes?.map((schema) => (
            <option key={schema.id} value={schema.name}>
              {schema.name}
            </option>
          ))}
        </select>
        {errors.schema && <p className={styles.errorText}>{errors.schema}</p>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="participants">Количество участников</label>
        <input
          type="number"
          id="participants"
          name="participants"
          value={formData.participants}
          onChange={handleChange}
          min="0"
          className={errors.participants ? styles.inputError : ''}
        />
        {errors.participants && <p className={styles.errorText}>{errors.participants}</p>}
      </div>
      <div className={styles.actions}>
        <button type="submit" disabled={addTournamentMutation.isPending}>
          {addTournamentMutation.isPending ? 'Добавление...' : 'Добавить турнир'}
        </button>
        <button type="button" onClick={onClose} disabled={addTournamentMutation.isPending}>
          Отмена
        </button>
      </div>
      {addTournamentMutation.isError && (
        <p className={styles.error}>Ошибка: {addTournamentMutation.error.message}</p>
      )}
    </form>
  );
}