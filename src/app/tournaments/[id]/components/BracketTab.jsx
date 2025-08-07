'use client';

import { useState, useEffect } from 'react';
import styles from './BracketTab.module.css';

const BracketTab = ({ tournament }) => {
  const [bracket, setBracket] = useState(null);

  useEffect(() => {
    // Initialize bracket based on tournament schema
    if (tournament?.schema) {
      generateBracket(tournament);
    }
  }, [tournament]);

  const generateBracket = (tournament) => {
    const schema = tournament.schema;
    const participantsCount = tournament.participants?.length || 0;
    
    // Simple bracket generation logic
    const rounds = [];
    let currentRound = participantsCount;
    let roundIndex = 0;

    while (currentRound > 1) {
      const matches = [];
      const matchesInRound = Math.floor(currentRound / 2);
      
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: `round-${roundIndex}-match-${i}`,
          participant1: roundIndex === 0 ? tournament.participants?.[i * 2] : null,
          participant2: roundIndex === 0 ? tournament.participants?.[i * 2 + 1] : null,
          winner: null,
          score1: null,
          score2: null,
        });
      }
      
      rounds.push({
        id: roundIndex,
        name: getRoundName(roundIndex, rounds.length),
        matches: matches
      });
      
      currentRound = matchesInRound;
      roundIndex++;
    }

    setBracket({ rounds });
  };

  const getRoundName = (roundIndex, totalRounds) => {
    if (roundIndex === totalRounds - 1) return 'Финал';
    if (roundIndex === totalRounds - 2) return 'Полуфинал';
    if (roundIndex === totalRounds - 3) return 'Четвертьфинал';
    return `Раунд ${roundIndex + 1}`;
  };

  const getParticipantName = (participant) => {
    if (!participant) return 'TBD';
    if (participant.isManual) return participant.name;
    if (participant.name) return participant.name; // team
    return `${participant.firstName} ${participant.lastName}`; // person
  };

  if (!bracket) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>Сетка турнира</h3>
          <p>Сначала добавьте участников на вкладке "Участники"</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Сетка турнира</h3>
        <p>Схема: {tournament?.schema?.schemeName}</p>
      </div>

      <div className={styles.bracket}>
        {bracket.rounds.map((round, roundIndex) => (
          <div key={round.id} className={styles.round}>
            <h4 className={styles.roundTitle}>{round.name}</h4>
            <div className={styles.matches}>
              {round.matches.map((match, matchIndex) => (
                <div key={match.id} className={styles.match}>
                  <div className={`${styles.participant} ${match.winner === 1 ? styles.winner : ''}`}>
                    <span className={styles.name}>
                      {getParticipantName(match.participant1)}
                    </span>
                    <span className={styles.score}>{match.score1 || '-'}</span>
                  </div>
                  <div className={styles.vs}>VS</div>
                  <div className={`${styles.participant} ${match.winner === 2 ? styles.winner : ''}`}>
                    <span className={styles.name}>
                      {getParticipantName(match.participant2)}
                    </span>
                    <span className={styles.score}>{match.score2 || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketTab;