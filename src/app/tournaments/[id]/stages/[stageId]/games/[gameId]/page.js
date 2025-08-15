'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaUsers, FaMicrophone, FaTrophy, FaUserTimes, FaCheckCircle, FaChevronLeft, FaChevronRight, FaCheck, FaInfoCircle, FaChevronRight as FaBreadcrumbChevron, FaPlus, FaMinus } from 'react-icons/fa';
import Link from 'next/link';
import Card from '../../../../../../UI/Card/Card';
import { useToast } from '../../../../../../util/ToastContext';
import styles from './GameDetailsPage.module.css';

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showError } = useToast();
  
  const [game, setGame] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [stage, setStage] = useState(null);
  const [presenter, setPresenter] = useState(null);
  const [players, setPlayers] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [completedThemes, setCompletedThemes] = useState(new Set());
  const [revealedQuestions, setRevealedQuestions] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const { id: tournamentId, stageId, gameId } = params;

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);

        // Fetch game data
        const gameResponse = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`);
        if (!gameResponse.ok) throw new Error('Failed to fetch game');
        const gameData = await gameResponse.json();
        setGame(gameData);

        // Fetch tournament data
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentResponse.ok) throw new Error('Failed to fetch tournament');
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);

        // Find the stage
        const stageData = tournamentData.schema.stages.find(s => s.id === parseInt(stageId));
        setStage(stageData);

        // Fetch presenter if exists
        if (gameData.presenterId) {
          const presenterResponse = await fetch('/api/presenters');
          if (presenterResponse.ok) {
            const presenters = await presenterResponse.json();
            const gamePresenter = presenters.find(p => p.id === gameData.presenterId);
            setPresenter(gamePresenter);
          }
        }

        // Fetch players data
        if (gameData.participants?.length > 0) {
          const playersResponse = await fetch('/api/players');
          if (playersResponse.ok) {
            const allPlayers = await playersResponse.json();
            const gameParticipants = gameData.participants.map(participant => {
              const playerInfo = allPlayers.find(p => p.id === participant.playerId);
              return {
                ...participant,
                playerInfo
              };
            }).filter(p => p.playerInfo);

            // Sort by points descending
            gameParticipants.sort((a, b) => {
              if (b.points !== a.points) {
                return b.points - a.points;
              }
              const aExtra = parseFloat(a.extraResult) || 0;
              const bExtra = parseFloat(b.extraResult) || 0;
              return bExtra - aExtra;
            });

            setPlayers(gameParticipants);
          }
        }

        // Initialize themes using real theme names from the API
        const stageThemes = gameData.stageThemes || [];
        const numberOfThemes = stageThemes.length || stageData?.numberOfThemesInGame || 6;
        
        const initialThemes = Array.from({ length: numberOfThemes }, (_, index) => {
          const themeData = stageThemes[index];
          let themeName = `Тема ${index + 1}`;
          let themeDescription = '';
          
          // Handle both string and object formats
          if (themeData) {
            if (typeof themeData === 'string') {
              themeName = themeData;
            } else if (typeof themeData === 'object' && themeData.name) {
              themeName = themeData.name;
              themeDescription = themeData.description || '';
            }
          }
          
          return {
            id: index + 1,
            name: themeName,
            description: themeDescription,
            questions: Array.from({ length: 5 }, (_, qIndex) => ({
              id: `${index + 1}-${qIndex + 1}`,
              value: (qIndex + 1) * 10,
              answered: false,
              answeredBy: null
            }))
          };
        });
        setThemes(initialThemes);

      } catch (error) {
        console.error('Error fetching game data:', error);
        showError('Ошибка загрузки данных игры');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId && stageId && gameId) {
      fetchGameData();
    }
  }, [tournamentId, stageId, gameId, showError]);

  const getPlayerName = (playerInfo) => {
    if (!playerInfo) return 'Unknown Player';
    
    let fullName;
    if (playerInfo.name) {
      fullName = playerInfo.name; // Team name
    } else if (playerInfo.firstName && playerInfo.lastName) {
      fullName = `${playerInfo.firstName} ${playerInfo.lastName}`;
    } else {
      fullName = playerInfo.firstName || 'Unknown Player';
    }
    
    // Split name by space and show on separate lines if two words
    const words = fullName.split(' ');
    if (words.length === 2) {
      return (
        <>
          {words[0]}
          <br />
          {words[1]}
        </>
      );
    }
    
    return fullName;
  };

  const getPlayerInitials = (playerInfo) => {
    if (!playerInfo) return '?';
    if (playerInfo.name) return playerInfo.name.charAt(0).toUpperCase(); // Team initial
    if (playerInfo.firstName && playerInfo.lastName) {
      return `${playerInfo.firstName.charAt(0)}${playerInfo.lastName.charAt(0)}`.toUpperCase();
    }
    return playerInfo.firstName?.charAt(0)?.toUpperCase() || '?';
  };

  const getPlayerColor = (playerInfo, playerIndex) => {
    if (!playerInfo) return '#ccc';
    
    // Use 4 grades of amber for visual differentiation
    const predefinedColors = [
      '#d97706', // Amber 600 (darkest)
      '#f59e0b', // Amber 500 
      '#fbbf24', // Amber 400
      '#fcd34d'  // Amber 300 (lightest)
    ];
    
    return predefinedColors[playerIndex % predefinedColors.length];
  };

  const handleThemeSelect = (index) => {
    setSelectedThemeIndex(index);
  };

  const handlePrevTheme = () => {
    setSelectedThemeIndex(prev => prev > 0 ? prev - 1 : themes.length - 1);
  };

  const handleNextTheme = () => {
    setSelectedThemeIndex(prev => prev < themes.length - 1 ? prev + 1 : 0);
  };

  const handleQuestionClick = (themeIndex, questionIndex, playerId = null) => {
    setThemes(prevThemes => {
      const newThemes = [...prevThemes];
      newThemes[themeIndex].questions[questionIndex] = {
        ...newThemes[themeIndex].questions[questionIndex],
        answered: !newThemes[themeIndex].questions[questionIndex].answered,
        answeredBy: newThemes[themeIndex].questions[questionIndex].answered ? null : playerId
      };
      return newThemes;
    });
  };

  const handleCompleteTheme = () => {
    setCompletedThemes(prev => {
      const newCompleted = new Set(prev);
      newCompleted.add(selectedThemeIndex);
      return newCompleted;
    });
  };

  const handleScoreAdjustment = (playerId, adjustment, event, questionId, themeIndex, questionIndex) => {
    event.stopPropagation();
    event.preventDefault();
    
    const isCorrectAnswer = adjustment > 0;
    
    // Reveal the question value for this specific player
    setRevealedQuestions(prev => {
      const newMap = new Map(prev);
      const playerQuestions = newMap.get(playerId) || new Set();
      playerQuestions.add(questionId);
      newMap.set(playerId, playerQuestions);
      return newMap;
    });
    
    // Update question state
    setThemes(prevThemes => {
      const newThemes = [...prevThemes];
      if (isCorrectAnswer) {
        // Correct answer: mark as answered and completed for all players
        newThemes[themeIndex].questions[questionIndex] = {
          ...newThemes[themeIndex].questions[questionIndex],
          answered: true,
          answeredBy: playerId,
          isCompleted: true
        };
      } else {
        // Incorrect answer: mark as answered by this player but keep available for others
        newThemes[themeIndex].questions[questionIndex] = {
          ...newThemes[themeIndex].questions[questionIndex],
          answeredBy: playerId,
          incorrectAnswers: [
            ...(newThemes[themeIndex].questions[questionIndex].incorrectAnswers || []),
            playerId
          ]
        };
      }
      return newThemes;
    });
    
    // Update player scores
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(player => 
        player.playerId === playerId 
          ? { ...player, points: player.points + adjustment }
          : player
      );
      
      return newPlayers;
    });
  };

  const handleCompleteGame = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          status: 'completed',
          completedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Failed to complete game');
      
      const updatedGame = await response.json();
      setGame(updatedGame);
      
      // Show success message and redirect back
      alert('Игра завершена успешно!');
      router.back();
      
    } catch (error) {
      console.error('Error completing game:', error);
      showError('Ошибка при завершении игры');
    }
  };

  const getWinnersAndLosers = () => {
    if (!players.length) return { winners: 0, losers: 0 };
    
    const gameWinnersNum = stage?.topGameWinnersNum || stage?.gameWinnersNum || Math.ceil(players.length / 2);
    const winners = Math.min(gameWinnersNum, players.length);
    const losers = players.length - winners;
    
    return { winners, losers };
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!game || !tournament || !stage) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Игра не найдена</div>
      </div>
    );
  }

  const { winners, losers } = getWinnersAndLosers();
  const selectedTheme = themes[selectedThemeIndex] || { name: 'Загрузка...', description: '' };

  return (
    <div className={styles.container}>
      {/* Header with breadcrumbs and game title */}
      <div className={styles.header}>
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumbTrail}>
            <Link href="/tournaments" className={styles.breadcrumbLink}>
              Турниры
            </Link>
            <span className={styles.breadcrumbSeparator}>
              <FaBreadcrumbChevron />
            </span>
            <Link href={`/tournaments/${tournamentId}`} className={styles.breadcrumbLink}>
              {tournament.name}
            </Link>
            <span className={styles.breadcrumbSeparator}>
              <FaBreadcrumbChevron />
            </span>
            <Link href={`/tournaments/${tournamentId}?tab=stage-${(stage?.order || 1) - 1}`} className={styles.breadcrumbLink}>
              {stage.name}
            </Link>
            <span className={styles.breadcrumbSeparator}>
              <FaBreadcrumbChevron />
            </span>
            <span className={styles.currentPage}>
              {stage.isFinal ? 'Финал' : `Бой ${game.gameNumber || game.id}`}
            </span>
          </div>
        </div>
      </div>

      {/* Game Information Section */}
      <Card className={styles.gameInfoCard}>
        <div className={styles.gameInfoHeader}>
          <div className={styles.detailInline}>
            <div className={styles.detailHeader}>
              <FaInfoCircle className={styles.detailIcon} />
              <strong>Информация о бое:</strong>
            </div>
          </div>
        </div>
        
        <div className={styles.gameInfoGrid}>
          <div className={styles.gameInfoItem}>
            <FaUsers className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Игроков</div>
              <div className={styles.infoValue}>{players.length}</div>
            </div>
          </div>
          
          
          {presenter && (
            <div className={styles.gameInfoItem}>
              <FaMicrophone className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <div className={styles.infoLabel}>Ведущий</div>
                <div className={styles.infoValue}>
                  {presenter.firstName} {presenter.lastName}
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.gameInfoItem}>
            <FaTrophy className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Проходят</div>
              <div className={styles.infoValue}>{winners}</div>
            </div>
          </div>
          
          <div className={styles.gameInfoItem}>
            <FaUserTimes className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Выбывают</div>
              <div className={styles.infoValue}>{losers}</div>
            </div>
          </div>
        </div>
        
        {/* Themes Section */}
        {/*<div className={styles.themesInfoSection}>
          <div className={styles.themesInfoHeader}>
            <div className={styles.themesInfoIcon}>📚</div>
            <div className={styles.themesInfoLabel}>Темы игры ({themes.length})</div>
          </div>
          <div className={styles.themesInfoList}>
            {themes.map((theme, index) => (
              <span key={theme.id} className={styles.themeTag}>
                {theme.name}
              </span>
            ))}
          </div>
        </div>*/}
      </Card>

      {/* Main Game Area */}
      <div className={styles.gameArea}>
        {/* Themes Stepper */}
        {themes.length > 0 && (
          <Card className={styles.themesCard}>
            <div className={styles.themesHeaderWithStepper}>
              <div className={styles.themesHeaderInfo}>
                <h3>Темы игры</h3>
                <div className={styles.themeCounter}>
                  {selectedThemeIndex + 1} из {themes.length}
                </div>
              </div>
              
              <div className={styles.stepperContainer}>
                <button
                  onClick={handlePrevTheme}
                  className={styles.navButton}
                  aria-label="Предыдущая тема"
                >
                  <FaChevronLeft />
                </button>
                
                <div className={styles.themesStepper}>
                  {themes.map((theme, index) => (
                    <div key={theme.id} className={styles.stepperItem}>
                      <div 
                        className={`${styles.stepCircle} ${
                          completedThemes.has(index) ? styles.completed : 
                          index === selectedThemeIndex ? styles.current : styles.upcoming
                        }`}
                        onClick={() => setSelectedThemeIndex(index)}
                      >
                        {completedThemes.has(index) ? (
                          <FaCheckCircle className={styles.checkIcon} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < themes.length - 1 && (
                        <div 
                          className={`${styles.stepLine} ${
                            completedThemes.has(index) ? styles.completed : ''
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleNextTheme}
                  className={styles.navButton}
                  aria-label="Следующая тема"
                >
                  <FaChevronRight />
                </button>
              </div>
              
              <div className={styles.headerActions}>
                <button
                  onClick={handleCompleteTheme}
                  className={`${styles.actionButton} ${styles.completeThemeButton}`}
                  disabled={completedThemes.has(selectedThemeIndex)}
                >
                  <FaCheck />
                  {completedThemes.has(selectedThemeIndex) ? 'Завершена' : 'Завершить'}
                </button>
                
                <button
                  onClick={handleCompleteGame}
                  className={`${styles.actionButton} ${styles.completeGameButton}`}
                  disabled={game?.status === 'completed'}
                >
                  <FaTrophy />
                  {game?.status === 'completed' ? 'Завершена' : 'Завершить игру'}
                </button>
              </div>
            </div>
            
            <div className={styles.currentThemeInfo}>
              <div className={styles.themeName}>{selectedTheme.name}</div>
              {selectedTheme.description && (
                <div className={styles.themeDescription}>{selectedTheme.description}</div>
              )}
            </div>
          </Card>
        )}


        {/* Game Grid */}
        <Card className={styles.gameGridCard}>
          <div className={styles.gameGrid}>
            {/* Header Row */}
            <div className={styles.gridHeader}>
              <div></div>
              <div className={styles.scoreHeader}>Счет</div>
              {selectedTheme.questions.map((question) => (
                <div key={question.id} className={styles.questionHeader}>
                  {question.value}
                </div>
              ))}
            </div>

            {/* Player Rows */}
            {players.map((player, playerIndex) => (
              <div key={player.playerId} className={styles.gridRow}>
                <div className={styles.playerCell}>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerName} style={{ color: getPlayerColor(player.playerInfo, playerIndex) }}>
                      {getPlayerName(player.playerInfo)}
                    </div>
                  </div>
                </div>
                
                <div className={styles.scoreCell} style={{ color: getPlayerColor(player.playerInfo, playerIndex) }}>
                  {player.points}
                  {player.extraResult && (
                    <span className={styles.extraResult}> ({player.extraResult})</span>
                  )}
                </div>
                
                {selectedTheme.questions.map((question, questionIndex) => (
                  <div 
                    key={question.id} 
                    className={`${styles.questionCell} ${
                      question.answered && question.answeredBy === player.playerId 
                        ? styles.answeredCorrect 
                        : (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))
                          ? styles.answeredIncorrect
                          : ''
                    }`}
                  >
                    <div className={styles.questionContent}>
                      {!(question.isCompleted || (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))) && (
                        <button 
                          className={`${styles.adjustButton} ${styles.minusButton}`}
                          onClick={(e) => handleScoreAdjustment(player.playerId, -question.value, e, question.id, selectedThemeIndex, questionIndex)}
                          aria-label="Уменьшить счет"
                        >
                          <FaMinus />
                        </button>
                      )}
                      <span className={styles.questionValue}>
                        {question.answered && question.answeredBy === player.playerId ? '✓' : 
                         (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId)) ? '✗' : 
                         (revealedQuestions && revealedQuestions.get && revealedQuestions.get(player.playerId) && revealedQuestions.get(player.playerId).has(question.id)) ? question.value : ''}
                      </span>
                      {!(question.isCompleted || (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))) && (
                        <button 
                          className={`${styles.adjustButton} ${styles.plusButton}`}
                          onClick={(e) => handleScoreAdjustment(player.playerId, question.value, e, question.id, selectedThemeIndex, questionIndex)}
                          aria-label="Увеличить счет"
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}