'use client';

import { FaCheck, FaTimes } from 'react-icons/fa';
import Modal from '../Modal';
import AdaptiveButton from '../AdaptiveButton';
import styles from './TiebreakSelectionDialog.module.css';

export default function TiebreakSelectionDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  players = [],
  selectedParticipants = new Set(),
  onToggleParticipant,
  getPlayerName,
  getPlayerColor
}) {
  const participantCount = selectedParticipants.size;
  const isValidSelection = participantCount >= 2;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выбор участников перестрелки">
      <div className={styles.content}>
        <p className={styles.description}>
          Выберите игроков, которые будут участвовать в перестрелке:
        </p>
        
        <div className={styles.participantsList}>
          {players.map((player, playerIndex) => (
            <label key={player.playerId} className={styles.participantItem}>
              <input
                type="checkbox"
                checked={selectedParticipants.has(player.playerId)}
                onChange={() => onToggleParticipant(player.playerId)}
                className={styles.participantCheckbox}
              />
              <span 
                className={styles.participantName}
                style={{ color: getPlayerColor(player.playerInfo, playerIndex) }}
              >
                {getPlayerName(player.playerInfo)}
              </span>
            </label>
          ))}
        </div>
        
        <div className={styles.footer}>
          <span className={`${styles.participantCount} ${!isValidSelection ? styles.participantCountError : ''}`}>
            Выбрано участников: {participantCount}
            {participantCount < 2 && (
              <span className={styles.validationMessage}> (минимум 2)</span>
            )}
          </span>
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
            onClick={onConfirm} 
            icon={FaCheck} 
            text="Создать перестрелку" 
            title={isValidSelection ? "Создать перестрелку" : "Выберите минимум 2 участников"}
            variant="primary"
            disabled={!isValidSelection}
          />
        </div>
      </div>
    </Modal>
  );
}