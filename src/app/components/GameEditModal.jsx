'use client';

import { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import Modal from '../UI/Modal';
import { useToast } from '../util/ToastContext';
import styles from './GameEditModal.module.css';

export default function GameEditModal({ isOpen, onClose, game, stage, tournamentData, allTournamentGames = [], onSaved }) {
  const { showError } = useToast();
  const [form, setForm] = useState({ gamePlace: '', gameDate: '', presenterId: '' });
  const [participants, setParticipants] = useState([]);
  const [availablePresenters, setAvailablePresenters] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !game) return;
    let localDateTimeString = '';
    if (game.gameDate) {
      const date = new Date(game.gameDate);
      localDateTimeString =
        date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + 'T' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
    }
    setForm({
      gamePlace: game.gamePlace || '',
      gameDate: localDateTimeString,
      presenterId: game.presenterId ? String(game.presenterId) : '',
    });
    setParticipants(game.participants ? game.participants.map(p => ({ ...p })) : []);
  }, [isOpen, game]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/presenters')
      .then(r => r.json())
      .then(setAvailablePresenters)
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !tournamentData) return;
    setAvailablePlayers(tournamentData.participants || []);
  }, [isOpen, tournamentData]);

  const getPlayerName = (player) => {
    if (!player) return 'Неизвестный';
    if (player.name) return player.name;
    if (player.firstName && player.lastName) return `${player.firstName} ${player.lastName}`;
    if (player.firstName) return player.firstName;
    return 'Неизвестный';
  };

  const resolveParticipantName = (participant) => {
    const found = availablePlayers.find(p => p.id === participant.playerId);
    return found ? getPlayerName(found) : `Игрок #${participant.playerId}`;
  };

  const getPlayersInOtherGames = () => {
    const set = new Set();
    allTournamentGames.forEach(g => {
      if (g.id === game?.id) return;
      g.participants?.forEach(p => {
        if (p.playerId && p.resolved !== false) set.add(p.playerId);
      });
    });
    return set;
  };

  const filteredAddablePlayers = () => {
    const inOthers = getPlayersInOtherGames();
    const inCurrent = new Set(participants.map(p => p.playerId));
    return availablePlayers.filter(p => !inOthers.has(p.id) && !inCurrent.has(p.id));
  };

  const updateScore = (index, delta) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], points: (next[index].points || 0) + delta };
      return next;
    });
  };

  const setScore = (index, value) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], points: value };
      return next;
    });
  };

  const updateTiebreak = (index, delta) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], tieBreakResult: (next[index].tieBreakResult || 0) + delta };
      return next;
    });
  };

  const setTiebreak = (index, value) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], tieBreakResult: value };
      return next;
    });
  };

  const removeParticipant = (index) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const addParticipant = (playerId) => {
    if (!playerId) return;
    const maxPlayers = stage?.numberOfPlayers || 4;
    if (participants.length >= maxPlayers) {
      showError(`Максимальное количество игроков: ${maxPlayers}`);
      return;
    }
    setParticipants(prev => [...prev, { playerId, points: 0, tieBreakResult: 0 }]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let gameDate = game.gameDate;
      if (form.gameDate) {
        const [datePart, timePart] = form.gameDate.split('T');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        gameDate = new Date(
          parseInt(year), parseInt(month) - 1, parseInt(day),
          parseInt(hour), parseInt(minute)
        ).toISOString();
      }

      const updatedGame = {
        ...game,
        gamePlace: form.gamePlace,
        gameDate,
        presenterId: parseInt(form.presenterId) || null,
        participants,
      };

      const res = await fetch(
        `/api/tournaments/${game.tournamentId}/stages/${game.stageId}/games/${game.id}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedGame) }
      );

      if (!res.ok) throw new Error('Failed to update game');

      const saved = await res.json();
      onSaved(saved);
      onClose();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gameUpdated', { detail: { gameId: game.id, updatedData: saved } }));
      }
    } catch {
      showError('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  if (!game) return null;

  const maxPlayers = stage?.numberOfPlayers || 4;
  const isStage1 = stage?.order === 1;
  const canAddMore = participants.length < maxPlayers && filteredAddablePlayers().length > 0;
  const showScores = participants.length > 0;
  const showAddPlayer = (isStage1 || showScores) && canAddMore;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Бой ${game.gameNumber || game.id}`} className={styles.modal}>
      <div className={styles.body}>

        {/* Details section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Детали</h3>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>Место проведения</label>
              <input
                type="text"
                value={form.gamePlace}
                onChange={e => setForm(f => ({ ...f, gamePlace: e.target.value }))}
                className={styles.input}
                placeholder="Не указано"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Дата и время</label>
              <input
                type="datetime-local"
                value={form.gameDate}
                onChange={e => setForm(f => ({ ...f, gameDate: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ведущий</label>
              <select
                value={form.presenterId}
                onChange={e => setForm(f => ({ ...f, presenterId: e.target.value }))}
                className={styles.select}
              >
                <option value="">Не назначен</option>
                {availablePresenters.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Scores section */}
        {(showScores || isStage1) && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Результаты</h3>

            {showScores ? (
              <div className={styles.scoresList}>
                {participants.map((p, i) => (
                  <div key={p.playerId || i} className={styles.scoreRow}>
                    <div className={styles.scoreRowHeader}>
                      <span className={styles.scorePlayerName}>{resolveParticipantName(p)}</span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeParticipant(i)}
                        title="Убрать игрока"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <div className={styles.scoreRowControls}>
                      <div className={styles.scoreField}>
                        <span className={styles.scoreFieldLabel}>Очки</span>
                        <div className={styles.stepper}>
                          <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => updateScore(i, -10)}
                          >−10</button>
                          <input
                            type="number"
                            value={p.points ?? 0}
                            onChange={e => setScore(i, parseInt(e.target.value) || 0)}
                            className={styles.scoreInput}
                          />
                          <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => updateScore(i, 10)}
                          >+10</button>
                        </div>
                      </div>
                      <div className={styles.scoreField}>
                        <span className={styles.scoreFieldLabel}>Доп. очки</span>
                        <div className={styles.stepper}>
                          <button
                            type="button"
                            className={`${styles.stepBtn} ${styles.stepBtnSm}`}
                            onClick={() => updateTiebreak(i, -1)}
                          >−</button>
                          <input
                            type="number"
                            value={p.tieBreakResult ?? 0}
                            onChange={e => setTiebreak(i, parseInt(e.target.value) || 0)}
                            className={styles.tiebreakInput}
                          />
                          <button
                            type="button"
                            className={`${styles.stepBtn} ${styles.stepBtnSm}`}
                            onClick={() => updateTiebreak(i, 1)}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isStage1 ? (
              <p className={styles.emptyHint}>Добавьте игроков ниже</p>
            ) : (
              <p className={styles.emptyHint}>Участники будут добавлены автоматически</p>
            )}

            {showAddPlayer && (
              <div className={styles.addPlayer}>
                <select
                  value=""
                  onChange={e => addParticipant(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Добавить игрока...</option>
                  {filteredAddablePlayers().map(p => (
                    <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                  ))}
                </select>
              </div>
            )}
          </section>
        )}
      </div>

      <div className={styles.footer}>
        <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>
          <FaSave />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button onClick={onClose} className={styles.cancelButton}>
          <FaTimes />
          Отмена
        </button>
      </div>
    </Modal>
  );
}
