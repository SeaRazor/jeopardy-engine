'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaUsers, FaMicrophone, FaTrophy, FaUserTimes, FaCheckCircle, FaChevronLeft, FaChevronRight, FaCheck, FaInfoCircle, FaChevronRight as FaBreadcrumbChevron, FaPlus, FaMinus, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Link from 'next/link';
import Card from '../../../../../../UI/Card/Card';
import ConfirmationDialog from '../../../../../../UI/ConfirmationDialog';
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
  const [themeToComplete, setThemeToComplete] = useState(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

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

        // Load completed themes from game data
        if (gameData.completedThemes && Array.isArray(gameData.completedThemes)) {
          setCompletedThemes(new Set(gameData.completedThemes));
        }

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
    // Validate theme before allowing completion
    const currentTheme = themes[selectedThemeIndex];
    if (!currentTheme) return;
    
    // Check each nominal value (10, 20, 30, 40, 50) for validation
    const validationErrors = [];
    
    // Check if multiple players have been awarded points for the same nominal value
    // This detects the real issue: multiple players getting correct scores for same question
    currentTheme.questions.forEach((question, questionIndex) => {
      const nominal = question.value;
      
      // Count how many players are in revealedQuestions for this question
      // This tracks who has actually been awarded points (either + or -)
      let playersWithThisQuestion = 0;
      let playersWithCorrectAnswer = 0;
      
      players.forEach(player => {
        const playerRevealed = revealedQuestions.get(player.playerId);
        if (playerRevealed && playerRevealed.has(question.id)) {
          playersWithThisQuestion++;
          
          // Check if this player would show as having correct answer
          // (either currently shown as correct, or was correct before being overwritten)
          if (question.answered && question.answeredBy === player.playerId) {
            playersWithCorrectAnswer++;
          }
        }
      });
      
      // Now we can properly validate using the new correctAnswers array
      const currentIncorrectCount = question.incorrectAnswers ? question.incorrectAnswers.length : 0;
      const currentCorrectCount = question.correctAnswers ? question.correctAnswers.length : 0;
      
      console.log(`Nominal ${nominal}: revealed=${playersWithThisQuestion}, currentCorrect=${currentCorrectCount}, currentIncorrect=${currentIncorrectCount}`);
      
      // Simple validation: ensure at most 1 correct answer per nominal
      if (currentCorrectCount > 1) {
        validationErrors.push(`Вопрос на ${nominal} очков имеет ${currentCorrectCount} правильных ответа`);
      }
    });
    
    if (validationErrors.length > 0) {
      showError(`Невозможно завершить тему:\n${validationErrors.join('\n')}`);
      return;
    }
    
    const themeData = {
      index: selectedThemeIndex,
      name: themes[selectedThemeIndex]?.name || `Тема ${selectedThemeIndex + 1}`
    };
    setThemeToComplete(themeData);
  };

  const handleConfirmThemeCompletion = async () => {
    if (!themeToComplete) return;
    
    try {
      // Update local state first for immediate UI feedback
      setCompletedThemes(prev => {
        const newCompleted = new Set(prev);
        newCompleted.add(themeToComplete.index);
        return newCompleted;
      });
      
      // Save theme completion state to API
      const updatedCompletedThemes = Array.from(new Set([...completedThemes, themeToComplete.index]));
      
      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          completedThemes: updatedCompletedThemes,
          updatedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme completion');
      }
      
      // Update game state with saved data
      const updatedGame = await response.json();
      setGame(updatedGame);
      
      // Close dialog
      setThemeToComplete(null);
      
    } catch (error) {
      console.error('Error completing theme:', error);
      showError('Ошибка при завершении темы');
      
      // Revert local state on error
      setCompletedThemes(prev => {
        const newCompleted = new Set(prev);
        newCompleted.delete(themeToComplete.index);
        return newCompleted;
      });
      
      // Close dialog
      setThemeToComplete(null);
    }
  };

  const handleScoreAdjustment = (playerId, adjustment, event, questionId, themeIndex, questionIndex) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Check if the theme is completed and prevent any changes
    if (completedThemes.has(themeIndex)) {
      return;
    }
    
    const isCorrectAnswer = adjustment > 0;
    const currentQuestion = themes[themeIndex].questions[questionIndex];
    
    // Determine if this is a correction based on current state
    const isCorrectingIncorrect = isCorrectAnswer && currentQuestion.incorrectAnswers && currentQuestion.incorrectAnswers.includes(playerId);
    const isCorrectingCorrect = !isCorrectAnswer && currentQuestion.correctAnswers && currentQuestion.correctAnswers.includes(playerId);
    const isCorrection = isCorrectingIncorrect || isCorrectingCorrect;
    

    // Handle revealed questions based on action type
    setRevealedQuestions(prev => {
      const newMap = new Map(prev);
      const playerQuestions = newMap.get(playerId) || new Set();
      
      if (isCorrection) {
        // Any correction - remove from revealed (return to empty)
        playerQuestions.delete(questionId);
      } else {
        // New answer - add to revealed
        playerQuestions.add(questionId);
      }
      
      if (playerQuestions.size === 0) {
        newMap.delete(playerId);
      } else {
        newMap.set(playerId, playerQuestions);
      }
      return newMap;
    });
    
    // Update question state
    setThemes(prevThemes => {
      const newThemes = [...prevThemes];
      const currentQuestionInThemes = newThemes[themeIndex].questions[questionIndex];
      
      if (isCorrectingIncorrect) {
        // Correcting incorrect answer - return to empty state
        const cleanedIncorrectAnswers = (currentQuestionInThemes.incorrectAnswers || []).filter(id => id !== playerId);
        newThemes[themeIndex].questions[questionIndex] = {
          ...currentQuestionInThemes,
          incorrectAnswers: cleanedIncorrectAnswers.length > 0 ? cleanedIncorrectAnswers : undefined
        };
      } else if (isCorrectingCorrect) {
        // Correcting correct answer - return to empty state
        const existingCorrectAnswers = currentQuestionInThemes.correctAnswers || [];
        const cleanedCorrectAnswers = existingCorrectAnswers.filter(id => id !== playerId);
        newThemes[themeIndex].questions[questionIndex] = {
          ...currentQuestionInThemes,
          correctAnswers: cleanedCorrectAnswers.length > 0 ? cleanedCorrectAnswers : undefined,
          // Keep old fields for backward compatibility during transition
          answered: cleanedCorrectAnswers.length > 0,
          answeredBy: cleanedCorrectAnswers.length > 0 ? cleanedCorrectAnswers[cleanedCorrectAnswers.length - 1] : null
        };
      } else if (isCorrectAnswer) {
        // New correct answer
        const existingCorrectAnswers = currentQuestionInThemes.correctAnswers || [];
        const newCorrectAnswers = existingCorrectAnswers.includes(playerId) 
          ? existingCorrectAnswers 
          : [...existingCorrectAnswers, playerId];
        newThemes[themeIndex].questions[questionIndex] = {
          ...currentQuestionInThemes,
          correctAnswers: newCorrectAnswers,
          // Keep old fields for backward compatibility during transition  
          answered: true,
          answeredBy: playerId
        };
      } else {
        // New incorrect answer on empty cell
        const existingIncorrect = currentQuestionInThemes.incorrectAnswers || [];
        // Only add if not already in the array (prevent duplicates)
        if (!existingIncorrect.includes(playerId)) {
          newThemes[themeIndex].questions[questionIndex] = {
            ...currentQuestionInThemes,
            incorrectAnswers: [...existingIncorrect, playerId]
          };
        }
      }
      return newThemes;
    });
    
    // Update player scores using the correction detection logic
    let scoreAdjustment = 0;
    
    if (isCorrectingIncorrect) {
      // Correcting incorrect answer - remove the penalty (return to 0)
      scoreAdjustment = Math.abs(adjustment); // Remove penalty
    } else if (isCorrectingCorrect) {
      // Correcting correct answer - remove the points (return to 0)
      scoreAdjustment = adjustment; // Remove points (adjustment is negative)
    } else {
      // New answer (either correct or incorrect)
      scoreAdjustment = adjustment;
    }
    
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(player => {
        if (player.playerId === playerId) {
          return { ...player, points: player.points + scoreAdjustment };
        }
        return player;
      });
      
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


        {/* Game Grid */}
        <Card className={styles.gameGridCard}>
          {/* Theme Header Section */}
          {themes.length > 0 && (
            <div className={styles.themeHeader}>
              <div className={styles.themeMainRow}>
                <div className={styles.themeInfo}>
                  <h3 className={styles.themeName}>
                    {selectedTheme.name}
                    {selectedTheme.description && (
                      <span className={styles.themeDescriptionInline}> — {selectedTheme.description}</span>
                    )}
                  </h3>
                </div>
                
                <div className={styles.themeControls}>
                  <div className={styles.themeActions}>
                    <button
                      onClick={handleCompleteTheme}
                      className={`${styles.actionButton} ${styles.completeThemeButton}`}
                      disabled={completedThemes.has(selectedThemeIndex)}
                    >
                      <FaCheck />
                      {completedThemes.has(selectedThemeIndex) ? 'Завершена' : 'Закончить тему'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.gameGridContainer}>
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
                      (question.correctAnswers && question.correctAnswers.includes(player.playerId))
                        ? styles.answeredCorrect 
                        : (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))
                          ? styles.answeredIncorrect
                          : ''
                    }`}
                  >
                    <div className={styles.questionContent}>
                      <button 
                        className={`${styles.adjustButton} ${styles.minusButton}`}
                        onClick={(e) => handleScoreAdjustment(player.playerId, -question.value, e, question.id, selectedThemeIndex, questionIndex)}
                        aria-label="Отметить как неверный ответ"
                        style={{
                          visibility: (!completedThemes.has(selectedThemeIndex) && !(question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))) ? 'visible' : 'hidden',
                          pointerEvents: (!completedThemes.has(selectedThemeIndex) && !(question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId))) ? 'auto' : 'none'
                        }}
                      >
                        <FaMinus />
                      </button>
                      <span className={styles.questionValue}>
                        {(question.correctAnswers && question.correctAnswers.includes(player.playerId)) ? question.value : 
                         (question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId)) ? `-${question.value}` : 
                         (revealedQuestions && revealedQuestions.get && revealedQuestions.get(player.playerId) && revealedQuestions.get(player.playerId).has(question.id)) ? question.value : ''}
                      </span>
                      <button 
                        className={`${styles.adjustButton} ${styles.plusButton}`}
                        onClick={(e) => handleScoreAdjustment(player.playerId, question.value, e, question.id, selectedThemeIndex, questionIndex)}
                        aria-label="Отметить как верный ответ"
                        style={{
                          visibility: (!completedThemes.has(selectedThemeIndex) && !(question.correctAnswers && question.correctAnswers.includes(player.playerId))) ? 'visible' : 'hidden',
                          pointerEvents: (!completedThemes.has(selectedThemeIndex) && !(question.correctAnswers && question.correctAnswers.includes(player.playerId))) ? 'auto' : 'none'
                        }}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            </div>
          </div>
          
          {/* Theme Stepper and End Game Section */}
          <div className={styles.gameFooter}>
            {/* Desktop Stepper */}
            <div className={styles.stepperSection}>
              <button
                onClick={handlePrevTheme}
                className={styles.navButton}
                aria-label="Предыдущая тема"
              >
                <FaChevronLeft />
              </button>
              
              <div className={styles.stepperContainer}>
                <div className={styles.themeStepper}>
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
                          <FaCheck className={styles.checkIcon} />
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
              </div>
              
              <button
                onClick={handleNextTheme}
                className={styles.navButton}
                aria-label="Следующая тема"
              >
                <FaChevronRight />
              </button>
            </div>

            {/* Mobile Accordion */}
            <div className={styles.accordionSection}>
              <button
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                className={styles.accordionToggle}
                aria-label={isAccordionOpen ? 'Скрыть темы' : 'Показать темы'}
              >
                <span className={styles.accordionLabel}>
                  Тема {selectedThemeIndex + 1} из {themes.length}
                  {completedThemes.has(selectedThemeIndex) && (
                    <FaCheck className={styles.accordionCheckIcon} />
                  )}
                </span>
                {isAccordionOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              
              {isAccordionOpen && (
                <div className={styles.accordionContent}>
                  {themes.map((theme, index) => (
                    <div 
                      key={theme.id}
                      className={`${styles.accordionItem} ${
                        index === selectedThemeIndex ? styles.accordionItemActive : ''
                      } ${
                        completedThemes.has(index) ? styles.accordionItemCompleted : ''
                      }`}
                      onClick={() => {
                        setSelectedThemeIndex(index);
                        setIsAccordionOpen(false);
                      }}
                    >
                      <div className={styles.accordionItemContent}>
                        <span className={styles.accordionItemNumber}>
                          {completedThemes.has(index) ? (
                            <FaCheck className={styles.accordionItemCheckIcon} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className={styles.accordionItemName}>{theme.name}</span>
                        {index === selectedThemeIndex && (
                          <span className={styles.accordionItemCurrent}>Текущая</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.endGameSection}>
              <button
                onClick={handleCompleteGame}
                className={`${styles.actionButton} ${styles.completeGameButton}`}
                disabled={game?.status === 'completed'}
              >
                <FaTrophy />
                {game?.status === 'completed' ? 'Завершена' : 'Закончить игру'}
              </button>
            </div>
          </div>
        </Card>
        
        {/* Theme Completion Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={!!themeToComplete}
          onClose={() => setThemeToComplete(null)}
          onConfirm={handleConfirmThemeCompletion}
          title="Завершение темы"
          message={`Вы уверены, что хотите завершить тему "${themeToComplete?.name}"?\n\nПосле завершения темы изменения в этой теме будут невозможны.`}
          confirmText="Завершить тему"
          cancelText="Отмена"
        />
      </div>
    </div>
  );
}