'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTournamentPollingInterval } from '../../util/gamePollingUtils';
import styles from './DoubleEliminationBracketTab.module.css';

// Fetch all games for tournament
const fetchTournamentGames = async (tournamentId) => {
  const res = await fetch(`/api/tournaments/${tournamentId}/games`);
  if (!res.ok) throw new Error('Failed to fetch tournament games');
  return res.json();
};

export const DoubleEliminationBracketTab = ({ tournament }) => {
  const [bracketData, setBracketData] = useState(null);
  
  // Fetch all tournament games with smart polling
  const { data: allGames = [], isLoading, isFetching } = useQuery({
    queryKey: ['tournament-games', tournament?.id],
    queryFn: () => fetchTournamentGames(tournament.id),
    enabled: !!tournament?.id,
    refetchInterval: (data) => getTournamentPollingInterval(data?.data || []),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000
  });

  useEffect(() => {
    if (tournament?.schema && allGames.length > 0) {
      processTournamentData(tournament, allGames);
    }
  }, [tournament, allGames]);

  const processTournamentData = (tournament, games) => {
    const stages = tournament.schema.stages || [];
    
    // Group games by stage and bracket type
    const gamesByStage = {};
    const bracketTypesByStage = {};
    
    stages.forEach(stage => {
      const stageGames = games.filter(game => game.stageId === stage.id);
      gamesByStage[stage.id] = stageGames;
      
      // Track bracket types in this stage
      const bracketTypes = new Set();
      stageGames.forEach(game => {
        if (game.bracketType) {
          bracketTypes.add(game.bracketType);
        }
      });
      bracketTypesByStage[stage.id] = Array.from(bracketTypes);
    });
    
    // Find the maximum number of games in any stage to determine table height
    const maxGamesInStage = Math.max(...stages.map(stage => 
      (gamesByStage[stage.id] || []).length
    ), 1);
    
    setBracketData({
      stages,
      gamesByStage,
      bracketTypesByStage,
      maxGamesInStage,
      tournament
    });
  };

  const getParticipantName = (participant) => {
    if (!participant) return null;
    if (participant.isManual) return participant.name;
    if (participant.name) return participant.name; // team
    return `${participant.firstName} ${participant.lastName}`; // person
  };
  
  const getParticipantInfo = (participant) => {
    if (!participant) return null;
    
    // Handle unresolved participants (with source references)
    if (!participant.resolved && participant.sourceReference) {
      const refParts = participant.sourceReference.split('.');
      if (refParts.length >= 3) {
        const gameNum = refParts[1];
        const placement = refParts[2];
        const placements = { '1': '1-е место', '2': '2-е место', '3': '3-е место', '4': '4-е место' };
        return {
          name: `${placements[placement] || `${placement}-е место`} из Игры ${gameNum}`,
          points: participant.points || 0,
          tieBreakResult: participant.tieBreakResult,
          resolved: false,
          isReference: true
        };
      }
    }
    
    // Handle resolved participants
    if (participant.playerId) {
      const participantData = tournament.participants?.find(p => p.id === participant.playerId);
      if (participantData) {
        return {
          name: getParticipantName(participantData),
          points: participant.points || 0,
          tieBreakResult: participant.tieBreakResult,
          resolved: participant.resolved,
          isReference: false
        };
      }
    }
    
    // Handle empty/null participants
    if (!participant.playerId && !participant.sourceReference) {
      return null;
    }
    
    // Fallback
    return {
      name: getParticipantName(participant) || 'TBD',
      points: participant.points || 0,
      tieBreakResult: participant.tieBreakResult,
      resolved: participant.resolved || false,
      isReference: false
    };
  };
  
  const formatScore = (participant) => {
    if (!participant) return '';
    
    const info = getParticipantInfo(participant);
    if (!info) return '';
    
    let scoreText = info.points.toString();
    
    // Add tiebreak result if present and not null/empty
    if (info.tieBreakResult !== null && info.tieBreakResult !== undefined && info.tieBreakResult !== '') {
      const tieBreak = info.tieBreakResult;
      const sign = tieBreak > 0 ? '+' : '';
      scoreText += `(${sign}${tieBreak})`;
    }
    
    return scoreText;
  };

  const getBracketTypeClass = (game) => {
    if (!game?.bracketType) return '';
    return game.bracketType === 'upper' ? styles.upperBracket : styles.lowerBracket;
  };

  const getBracketLabel = (bracketType) => {
    // Labels removed per user request
    return '';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <h3>Загрузка сетки турнира...</h3>
        </div>
      </div>
    );
  }

  if (!bracketData || !bracketData.stages.length) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>Сетка турнира</h3>
          <p>Игры пока не созданы. Создайте игры на соответствующих этапах.</p>
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

      <div className={styles.bracketTableContainer}>
        <table className={styles.bracketTable}>
          <thead>
            <tr>
              {bracketData.stages.map((stage, index) => (
                <th key={stage.id} className={`${styles.stageColumn}`}>
                  <div className={styles.stageName}>{stage.name}</div>
                  <div className={styles.stageOrder}>{stage.order} этап</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: bracketData.maxGamesInStage }, (_, gameIndex) => (
              <tr key={gameIndex} className={styles.gameRow}>
                {bracketData.stages.map((stage, stageIndex) => {
                  const stageGames = bracketData.gamesByStage[stage.id] || [];
                  const game = stageGames[gameIndex];
                  const participants = game?.participants || [];
                  
                  return (
                    <td key={stage.id} className={`${styles.stageCell} ${getBracketTypeClass(game)}`}>
                      <div className={styles.participantsList}>
                        {game && participants.length > 0 ? (
                          participants.map((participant, pIndex) => {
                            const info = getParticipantInfo(participant);
                            return info ? (
                              <div key={pIndex} className={styles.participantRow}>
                                <div className={`${styles.participantName} ${info.isReference ? styles.reference : ''}`}>
                                  {info.name}
                                </div>
                                <div className={styles.participantScore}>
                                  {info.isReference ? '' : formatScore(participant)}
                                </div>
                              </div>
                            ) : null;
                          })
                        ) : game ? (
                          <div className={styles.emptyCell}>Нет участников</div>
                        ) : (
                          <div className={styles.emptyCell}>-</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};