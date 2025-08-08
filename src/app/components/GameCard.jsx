'use client';

import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaMicrophone, FaUsers, FaTrophy, FaMedal } from 'react-icons/fa';
import Card from '../UI/Card/Card';
import styles from './GameCard.module.css';

export default function GameCard({ game, showActions = false, onEdit, onDelete }) {
  const [presenter, setPresenter] = useState(null);
  const [players, setPlayers] = useState([]);

  // Fetch presenter data
  useEffect(() => {
    if (game.presenterId) {
      fetch('/api/presenters')
        .then(res => res.json())
        .then(presenters => {
          const gamePresenter = presenters.find(p => p.id === game.presenterId);
          setPresenter(gamePresenter);
        })
        .catch(err => console.error('Error fetching presenter:', err));
    }
  }, [game.presenterId]);

  // Fetch player data
  useEffect(() => {
    if (game.participants?.length > 0) {
      fetch('/api/players')
        .then(res => res.json())
        .then(playersData => {
          const gameParticipants = game.participants.map(participant => {
            const player = playersData.find(p => p.id === participant.playerId);
            return {
              ...participant,
              playerInfo: player
            };
          }).filter(p => p.playerInfo);

          // Sort by points descending
          gameParticipants.sort((a, b) => b.points - a.points);
          setPlayers(gameParticipants);
        })
        .catch(err => console.error('Error fetching players:', err));
    }
  }, [game.participants]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <FaTrophy className={styles.goldTrophy} />;
      case 1: return <FaMedal className={styles.silverMedal} />;
      case 2: return <FaMedal className={styles.bronzeMedal} />;
      default: return null;
    }
  };

  const getPlayerName = (playerInfo) => {
    if (playerInfo.playerType === 'person') {
      return `${playerInfo.firstName} ${playerInfo.lastName}`;
    }
    return playerInfo.name;
  };

  return (
    <Card className={styles.gameCard}>
      {/* Card Title */}
      <div className={styles.cardTitle}>
        <h4>Бой {game.gameNumber || game.id}</h4>
      </div>

      {/* Game Header */}
      <div className={styles.header}>
        <div className={styles.gameInfo}>
          <div className={styles.dateTime}>
            <FaCalendarAlt className={styles.icon} />
            <span>{formatDate(game.gameDate)}</span>
          </div>
          <div className={styles.location}>
            <FaMapMarkerAlt className={styles.icon} />
            <span>{game.gamePlace}</span>
          </div>
        </div>
        {showActions && (
          <div className={styles.actions}>
            <button onClick={() => onEdit?.(game)} className={styles.editButton}>
              Редактировать
            </button>
          </div>
        )}
      </div>

      {/* Presenter Info */}
      {presenter && (
        <div className={styles.presenter}>
          <FaMicrophone className={styles.icon} />
          <span className={styles.presenterName}>
            {presenter.firstName} {presenter.lastName}
          </span>
        </div>
      )}

      {/* Participants */}
      <div className={styles.participants}>
        <div className={styles.participantsHeader}>
          <FaUsers className={styles.icon} />
          <span>Участники ({players.length})</span>
        </div>
        
        <div className={styles.participantsList}>
          {players.map((participant, index) => (
            <div key={participant.playerId} className={styles.participant}>
              <div className={styles.participantRank}>
                {getRankIcon(index)}
                <span className={styles.rankNumber}>{index + 1}</span>
              </div>
              <div className={styles.participantInfo}>
                <span className={styles.participantName}>
                  {getPlayerName(participant.playerInfo)}
                </span>
                <span className={styles.participantType}>
                  {participant.playerInfo.playerType === 'person' ? 'Игрок' : 'Команда'}
                </span>
              </div>
              <div className={styles.participantScore}>
                <span className={styles.points}>{participant.points}</span>
                <span className={styles.pointsLabel}>очков</span>
              </div>
              {participant.extraResult && (
                <div className={styles.extraResult}>
                  {participant.extraResult}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}