'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Card from '../../UI/Card/Card';
import ConfirmationDialog from '../../UI/ConfirmationDialog';
import styles from './TournamentCard.module.css';
import { getTournamentStatus, getTypeLabel } from '../../util/tournament';
import { FaUsers, FaTrash } from 'react-icons/fa';

const statusClassMap = {
  'Планируется': styles.planned,
  'Идет': styles.ongoing,
  'Закончен': styles.finished,
};

export default function TournamentCard({ tournament }) {
  const { id, name, startDate, endDate, type, schema, participants } = tournament;
  const status = getTournamentStatus(startDate, endDate);
  const typeLabel = getTypeLabel(type);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  
  const queryClient = useQueryClient();
  
  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tournament');
      }
      
      const result = await response.json();
      
      // Invalidate queries to refresh the tournaments list
      queryClient.invalidateQueries(['tournaments']);
      
      // Show success message (you could add toast notification here)
      console.log(result.message);
      
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setDeleteError(error.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);
  };

  return (
    <Card className={styles.tournamentCard}>
      {type && (
        <div className={`${styles.typeLabel} ${styles[typeLabel]}`}>
          {typeLabel}
        </div>
      )}
      <div className={styles.header}>
        <h3 className={styles.name}>{name}</h3>
      </div>
      <div className={styles.details}>
        <p className={styles.dates}>
          {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
        </p>
        <span className={`${styles.status} ${statusClassMap[status]}`}>
          {status}
        </span>
      </div>
      <div className={styles.meta}>
        <div className={styles.schema}>{schema.schemeName}</div>
        <span className={styles.participants}>
          <FaUsers /> {participants.length} / {schema.participantsNum}
        </span>
      </div>
      <div className={styles.actions}>
        <FaTrash 
          className={styles.deleteIcon} 
          onClick={handleDeleteClick}
          title="Удалить турнир"
        />
        <Link href={`/tournaments/${id}`} className={styles.detailsButton}>
          Детали
        </Link>
      </div>
      
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Удаление турнира"
        message={`Вы уверены, что хотите удалить турнир "${name}"?\n\nЭто действие нельзя отменить. Турнир и все связанные с ним игры будут удалены навсегда.`}
        confirmText={isDeleting ? "Удаление..." : "Удалить"}
        cancelText="Отмена"
        confirmDisabled={isDeleting}
        cancelDisabled={isDeleting}
      />
      
      {deleteError && (
        <div className={styles.errorMessage}>
          Ошибка при удалении: {deleteError}
        </div>
      )}
    </Card>
  );
}
