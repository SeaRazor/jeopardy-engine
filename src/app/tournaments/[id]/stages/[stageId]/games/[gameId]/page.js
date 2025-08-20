'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaUsers, FaMicrophone, FaTrophy, FaUserTimes, FaCheckCircle, FaChevronLeft, FaChevronRight, FaCheck, FaInfoCircle, FaChevronRight as FaBreadcrumbChevron, FaPlus, FaMinus, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Link from 'next/link';
import Card from '../../../../../../UI/Card/Card';
import InfoComponent from '../../../../../../UI/InfoComponent/InfoComponent';
import ConfirmationDialog from '../../../../../../UI/ConfirmationDialog';
import TiebreakSelectionDialog from '../../../../../../UI/TiebreakSelectionDialog';
import AdaptiveButton from '../../../../../../UI/AdaptiveButton';
import { useToast } from '../../../../../../util/ToastContext';
// Removed client-side import - now handled server-side
import styles from './GameDetailsPage.module.css';

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { showError, showSuccess, showInfo } = useToast();
  
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
  const [gameToComplete, setGameToComplete] = useState(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [pendingScoreChanges, setPendingScoreChanges] = useState(new Map());
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [isProcessingProgression, setIsProcessingProgression] = useState(false);
  const [tiebreakParticipants, setTiebreakParticipants] = useState(new Set());
  const [isTiebreakSelectionOpen, setIsTiebreakSelectionOpen] = useState(false);
  const [tempTiebreakParticipants, setTempTiebreakParticipants] = useState(new Set());
  const saveTimeoutRef = useRef(null);

  const { id: tournamentId, stageId, gameId } = params;

  // Utility functions for tiebreak management
  const getTieBreakThemes = useCallback(() => {
    return themes.filter(theme => theme.name.startsWith('Перестрелка'));
  }, [themes]);

  const getLatestTieBreakTheme = useCallback(() => {
    const tieBreakThemes = getTieBreakThemes();
    if (tieBreakThemes.length === 0) return null;
    
    // Sort by tiebreak number (extracted from name)
    return tieBreakThemes.sort((a, b) => {
      const aNum = getTieBreakNumber(a.name);
      const bNum = getTieBreakNumber(b.name);
      return bNum - aNum; // Descending order to get latest
    })[0];
  }, [getTieBreakThemes]);

  const getTieBreakNumber = useCallback((themeName) => {
    if (themeName === 'Перестрелка') return 1;
    const match = themeName.match(/Перестрелка (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }, []);

  const generateTieBreakName = useCallback(() => {
    const tieBreakThemes = getTieBreakThemes();
    if (tieBreakThemes.length === 0) return 'Перестрелка';
    
    const maxNumber = Math.max(...tieBreakThemes.map(theme => getTieBreakNumber(theme.name)));
    return `Перестрелка ${maxNumber + 1}`;
  }, [getTieBreakThemes, getTieBreakNumber]);

  const calculateMainScore = useCallback((playerId) => {
    const regularThemes = themes.filter(theme => !theme.name.startsWith('Перестрелка'));
    let mainScore = 0;
    
    regularThemes.forEach(theme => {
      theme.questions.forEach(question => {
        if (question.correctAnswers && question.correctAnswers.includes(playerId)) {
          mainScore += question.value;
        }
        if (question.incorrectAnswers && question.incorrectAnswers.includes(playerId)) {
          mainScore -= question.value;
        }
      });
    });
    
    return mainScore;
  }, [themes]);

  const calculateLatestTieBreakScore = useCallback((playerId) => {
    const latestTieBreak = getLatestTieBreakTheme();
    if (!latestTieBreak) return 0;
    
    let tieBreakScore = 0;
    latestTieBreak.questions.forEach(question => {
      if (question.correctAnswers && question.correctAnswers.includes(playerId)) {
        tieBreakScore += question.value;
      }
      if (question.incorrectAnswers && question.incorrectAnswers.includes(playerId)) {
        tieBreakScore -= question.value;
      }
    });
    
    return tieBreakScore;
  }, [getLatestTieBreakTheme]);

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

        // Initialize themes first so we can calculate scores
        const stageThemes = gameData.stageThemes || [];
        const numberOfThemes = stageThemes.length || stageData?.numberOfThemesInGame || 6;
        
        // Check if we have saved game state with question answers
        const savedGameState = gameData.gameState;
        let initialThemes;

        if (savedGameState && savedGameState.themes) {
          // Restore themes with all question answers from saved state
          initialThemes = savedGameState.themes;
        } else {
          // Initialize fresh themes if no saved state exists
          initialThemes = Array.from({ length: numberOfThemes }, (_, index) => {
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
        }
        
        setThemes(initialThemes);

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

            setPlayers(gameParticipants);
          }
        }


        // Load completed themes from saved game state or legacy field
        let completedThemesData = [];
        if (savedGameState && savedGameState.completedThemes) {
          completedThemesData = savedGameState.completedThemes;
        } else if (gameData.completedThemes && Array.isArray(gameData.completedThemes)) {
          completedThemesData = gameData.completedThemes;
        }
        setCompletedThemes(new Set(completedThemesData));

        // Restore revealed questions from saved game state
        if (savedGameState && savedGameState.revealedQuestions) {
          const restoredRevealedQuestions = new Map();
          Object.entries(savedGameState.revealedQuestions).forEach(([playerId, questionIds]) => {
            restoredRevealedQuestions.set(playerId, new Set(questionIds));
          });
          setRevealedQuestions(restoredRevealedQuestions);
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


  // Batch save scores with debouncing
  const batchSaveScores = useCallback(async () => {
    if (pendingScoreChanges.size === 0 || !game) return;

    try {
      setIsSavingScores(true);
      
      // Recalculate scores based on current theme state (instead of optimistic updates)
      const updatedParticipants = game.participants?.map(participant => {
        const mainScore = calculateMainScore(participant.playerId);
        
        // Only calculate tiebreak score if player is a tiebreak participant
        const currentTieBreakResult = participant.tieBreakResult;
        const newTieBreakResult = currentTieBreakResult !== null 
          ? calculateLatestTieBreakScore(participant.playerId)
          : null;
        
        return {
          ...participant,
          points: mainScore,
          tieBreakResult: newTieBreakResult
        };
      }) || [];

      // Convert revealedQuestions Map to serializable object
      const revealedQuestionsData = {};
      revealedQuestions.forEach((questionSet, playerId) => {
        revealedQuestionsData[playerId] = Array.from(questionSet);
      });

      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          participants: updatedParticipants,
          // Save complete game state including all question answers
          gameState: {
            themes: themes,
            revealedQuestions: revealedQuestionsData,
            completedThemes: Array.from(completedThemes)
          },
          updatedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save score changes');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
      
      // Clear pending changes after successful save
      setPendingScoreChanges(new Map());
      
    } catch (error) {
      console.error('Error saving scores:', error);
      showError('Ошибка сохранения очков. Попробуйте еще раз.');
      
      // Retry after 5 seconds
      setTimeout(() => {
        if (pendingScoreChanges.size > 0) {
          batchSaveScores();
        }
      }, 5000);
    } finally {
      setIsSavingScores(false);
    }
  }, [game, pendingScoreChanges, players, themes, revealedQuestions, completedThemes, tournamentId, stageId, gameId, showError]);

  // Debounced save trigger
  const triggerDebouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      batchSaveScores();
    }, 2500); // 2.5 second delay
  }, [batchSaveScores]);

  // Force save on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (pendingScoreChanges.size > 0) {
        // Cancel the event to show browser confirmation dialog
        event.preventDefault();
        event.returnValue = 'Есть несохраненные изменения. Хотите покинуть страницу?';
        
        // Try to save data synchronously
        try {
          await batchSaveScores();
        } catch (error) {
          console.error('Failed to save on page unload:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingScoreChanges.size > 0) {
        // Force save when page becomes hidden
        batchSaveScores();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clean up timeout and force save any pending changes
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Force save on unmount if there are pending changes
      if (pendingScoreChanges.size > 0) {
        batchSaveScores();
      }

      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingScoreChanges, batchSaveScores]);

  const getPlayerName = (playerInfo) => {
    if (!playerInfo) return 'Unknown Player';
    
    if (playerInfo.name) {
      return playerInfo.name; // Team name
    } else if (playerInfo.firstName && playerInfo.lastName) {
      return `${playerInfo.firstName} ${playerInfo.lastName}`;
    } else {
      return playerInfo.firstName || 'Unknown Player';
    }
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
      // Save any pending score changes first
      if (pendingScoreChanges.size > 0) {
        await batchSaveScores();
      }

      // Update local state first for immediate UI feedback
      setCompletedThemes(prev => {
        const newCompleted = new Set(prev);
        newCompleted.add(themeToComplete.index);
        return newCompleted;
      });
      
      // Save theme completion state to API
      const updatedCompletedThemes = Array.from(new Set([...completedThemes, themeToComplete.index]));
      
      // Convert revealedQuestions Map to serializable object
      const revealedQuestionsData = {};
      revealedQuestions.forEach((questionSet, playerId) => {
        revealedQuestionsData[playerId] = Array.from(questionSet);
      });

      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          completedThemes: updatedCompletedThemes,
          // Save complete game state including all question answers
          gameState: {
            themes: themes,
            revealedQuestions: revealedQuestionsData,
            completedThemes: updatedCompletedThemes
          },
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

      // Auto-navigate to next uncompleted theme
      const updatedCompletedSet = new Set([...completedThemes, themeToComplete.index]);
      const nextUncompletedTheme = themes.findIndex((_, index) => 
        index > themeToComplete.index && !updatedCompletedSet.has(index)
      );
      
      if (nextUncompletedTheme !== -1) {
        setSelectedThemeIndex(nextUncompletedTheme);
      }
      
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
    
    // Find the correct question by ID to avoid index mismatches
    const targetTheme = themes[themeIndex];
    const actualQuestionIndex = targetTheme.questions.findIndex(q => q.id === questionId);
    
    if (actualQuestionIndex === -1) {
      console.error('Question not found:', questionId);
      return;
    }
    
    const currentQuestion = targetTheme.questions[actualQuestionIndex];
    
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
      const currentQuestionInThemes = newThemes[themeIndex].questions[actualQuestionIndex];
      
      if (isCorrectingIncorrect) {
        // Correcting incorrect answer - return to empty state
        const cleanedIncorrectAnswers = (currentQuestionInThemes.incorrectAnswers || []).filter(id => id !== playerId);
        newThemes[themeIndex].questions[actualQuestionIndex] = {
          ...currentQuestionInThemes,
          incorrectAnswers: cleanedIncorrectAnswers.length > 0 ? cleanedIncorrectAnswers : undefined
        };
      } else if (isCorrectingCorrect) {
        // Correcting correct answer - return to empty state
        const existingCorrectAnswers = currentQuestionInThemes.correctAnswers || [];
        const cleanedCorrectAnswers = existingCorrectAnswers.filter(id => id !== playerId);
        newThemes[themeIndex].questions[actualQuestionIndex] = {
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
        newThemes[themeIndex].questions[actualQuestionIndex] = {
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
          newThemes[themeIndex].questions[actualQuestionIndex] = {
            ...currentQuestionInThemes,
            incorrectAnswers: [...existingIncorrect, playerId]
          };
        }
      }
      return newThemes;
    });
    
    // Calculate score adjustment using the correction detection logic
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
    
    // Update player scores optimistically (immediate UI feedback)
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(player => {
        if (player.playerId === playerId) {
          // For immediate feedback, just adjust the current scores
          const isCurrentThemeTieBreak = themes[themeIndex].name.startsWith('Перестрелка');
          
          if (isCurrentThemeTieBreak) {
            // Tiebreak theme: only adjust score if player is a tiebreak participant
            if (player.tieBreakResult !== null) {
              const latestTieBreakScore = calculateLatestTieBreakScore(playerId) + scoreAdjustment;
              return { 
                ...player, 
                tieBreakResult: latestTieBreakScore
              };
            } else {
              // Player is not a tiebreak participant, don't change their tieBreakResult
              return player;
            }
          } else {
            // Regular theme: adjust main points only
            return { 
              ...player, 
              points: player.points + scoreAdjustment
            };
          }
        }
        return player;
      });
      
      return newPlayers;
    });

    // Add to pending score changes for batch saving
    setPendingScoreChanges(prev => {
      const newPending = new Map(prev);
      const currentPending = newPending.get(playerId) || { totalAdjustment: 0, changes: [] };
      
      const newPending_value = {
        totalAdjustment: currentPending.totalAdjustment + scoreAdjustment,
        changes: [...currentPending.changes, {
          questionId,
          adjustment: scoreAdjustment,
          timestamp: Date.now()
        }]
      };
      
      newPending.set(playerId, newPending_value);
      return newPending;
    });

    // Trigger debounced save
    triggerDebouncedSave();
  };

  const handleToggleTiebreakParticipant = (playerId) => {
    setTiebreakParticipants(prev => {
      const newParticipants = new Set(prev);
      if (newParticipants.has(playerId)) {
        newParticipants.delete(playerId);
        
        // Remove tiebreak result for deselected player
        setPlayers(prevPlayers => 
          prevPlayers.map(player =>
            player.playerId === playerId 
              ? { ...player, tieBreakResult: null }
              : player
          )
        );
      } else {
        newParticipants.add(playerId);
        
        // Initialize tiebreak result to 0 for newly selected player
        setPlayers(prevPlayers => 
          prevPlayers.map(player =>
            player.playerId === playerId 
              ? { ...player, tieBreakResult: 0 }
              : player
          )
        );
      }
      return newParticipants;
    });
    
    // Trigger save to persist the changes
    triggerDebouncedSave();
  };

  const handleStartTiebreak = () => {
    // Open participant selection modal
    setTempTiebreakParticipants(new Set());
    setIsTiebreakSelectionOpen(true);
  };

  const handleTiebreakSelectionConfirm = async () => {
    try {
      // Set the selected participants
      setTiebreakParticipants(new Set(tempTiebreakParticipants));
      
      // Create new tiebreak theme
      const tieBreakName = generateTieBreakName();
      const newThemeId = themes.length + 1;
      
      const newTieBreakTheme = {
        id: newThemeId,
        name: tieBreakName,
        description: '',
        questions: Array.from({ length: 5 }, (_, qIndex) => ({
          id: `${newThemeId}-${qIndex + 1}`,
          value: (qIndex + 1) * 10,
          answered: false,
          answeredBy: null
        }))
      };
      
      // Add tiebreak theme to themes array
      const updatedThemes = [...themes, newTieBreakTheme];
      setThemes(updatedThemes);
      
      // Select the new tiebreak theme
      setSelectedThemeIndex(updatedThemes.length - 1);
      
      // Update participants with tiebreak results based on selection
      const updatedParticipants = game.participants?.map(participant => ({
        ...participant,
        tieBreakResult: tempTiebreakParticipants.has(participant.playerId) ? 0 : null
      })) || [];
      
      // Update local player state as well
      setPlayers(prevPlayers => 
        prevPlayers.map(player => ({
          ...player,
          tieBreakResult: tempTiebreakParticipants.has(player.playerId) ? 0 : null
        }))
      );
      
      // Save to API
      const revealedQuestionsData = {};
      revealedQuestions.forEach((questionSet, playerId) => {
        revealedQuestionsData[playerId] = Array.from(questionSet);
      });
      
      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          participants: updatedParticipants,
          gameState: {
            themes: updatedThemes,
            revealedQuestions: revealedQuestionsData,
            completedThemes: Array.from(completedThemes)
          },
          updatedAt: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tiebreak theme');
      }
      
      const updatedGame = await response.json();
      setGame(updatedGame);
      
      // Close modal
      setIsTiebreakSelectionOpen(false);
      setTempTiebreakParticipants(new Set());
      
      showSuccess(`Добавлена тема "${tieBreakName}" с ${tempTiebreakParticipants.size} участниками`);
      
    } catch (error) {
      console.error('Error creating tiebreak theme:', error);
      showError(error.message || 'Ошибка при создании темы перестрелки');
    }
  };

  const handleTiebreakSelectionCancel = () => {
    setIsTiebreakSelectionOpen(false);
    setTempTiebreakParticipants(new Set());
  };

  const handleTempToggleTiebreakParticipant = (playerId) => {
    setTempTiebreakParticipants(prev => {
      const newParticipants = new Set(prev);
      if (newParticipants.has(playerId)) {
        newParticipants.delete(playerId);
      } else {
        newParticipants.add(playerId);
      }
      return newParticipants;
    });
  };

  const handleCompleteGame = () => {
    // Client-side validation: Check if all themes are completed
    if (!allThemesCompleted) {
      showError('Невозможно завершить игру: не все темы завершены. Завершите все темы перед окончанием игры.');
      return;
    }

    // Additional check: game should not already be completed
    if (game?.status === 'completed') {
      showError('Игра уже завершена.');
      return;
    }

    // Show confirmation dialog
    setGameToComplete(true);
  };

  const handleConfirmGameCompletion = async () => {
    if (!gameToComplete) return;

    try {
      // Save any pending score changes first
      if (pendingScoreChanges.size > 0) {
        await batchSaveScores();
      }

      // Convert revealedQuestions Map to serializable object
      const revealedQuestionsData = {};
      revealedQuestions.forEach((questionSet, playerId) => {
        revealedQuestionsData[playerId] = Array.from(questionSet);
      });

      // Use new completion endpoint that handles both completion and progression
      const response = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games/${gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...game,
          // Send completed themes for server-side validation
          completedThemes: Array.from(completedThemes),
          // Save complete game state including all question answers
          gameState: {
            themes: themes,
            revealedQuestions: revealedQuestionsData,
            completedThemes: Array.from(completedThemes)
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to complete game');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setGame(result.game);
        
        // Close dialog
        setGameToComplete(null);
        
        // Set progression state for UI feedback
        setIsProcessingProgression(true);
        
        // Dispatch custom event for other components to react
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gameCompleted', {
            detail: {
              gameId: result.game.id,
              stageId: result.game.stageId,
              tournamentId: tournamentId,
              resolvedGames: result.progression.resolvedGames || 0,
              resolvedReferences: result.progression.resolvedReferences || 0
            }
          }));
        }
        
        // Show appropriate success message based on progression result
        let successMessage = 'Игра завершена успешно!';
        if (result.summary.progressionSucceeded && result.summary.playersPromoted > 0) {
          successMessage += ` Автоматически добавлено ${result.summary.playersPromoted} игроков в следующие этапы турнира.`;
          showSuccess(successMessage);
        } else if (result.summary.progressionSucceeded) {
          successMessage += ' Нет игроков для продвижения на следующий этап.';
          showSuccess(successMessage);
        } else {
          showInfo('Игра завершена успешно! Внимание: Возможны проблемы с автоматическим продвижением игроков. Проверьте следующие этапы турнира.');
          console.warn('Progression failed:', result.progression.error);
        }
        
        setIsProcessingProgression(false);
      } else {
        throw new Error(result.error || 'Неизвестная ошибка при завершении игры');
      }
      
      // Redirect back
      router.back();
      
    } catch (error) {
      console.error('Error completing game:', error);
      showError(`Ошибка при завершении игры: ${error.message}`);
      
      // Close dialog on error
      setGameToComplete(null);
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
  
  // Check if all regular themes are completed (excludes tiebreak themes)
  const regularThemes = themes.filter(theme => !theme.name.startsWith('Перестрелка'));
  const allRegularThemesCompleted = regularThemes.length > 0 && regularThemes.every((theme, index) => {
    const originalIndex = themes.findIndex(t => t.id === theme.id);
    return completedThemes.has(originalIndex);
  });
  
  // Check if all themes (including tiebreaks) are completed
  const allThemesCompleted = themes.length > 0 && themes.every((_, index) => completedThemes.has(index));

  // Check if current theme is a tiebreak theme
  const isCurrentThemeTiebreak = selectedTheme.name?.startsWith('Перестрелка');

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
      <InfoComponent 
        title="Информация о бое" 
        icon={FaInfoCircle}
        defaultCollapsed={false}
      >
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
      </InfoComponent>

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
                    <AdaptiveButton
                      onClick={handleCompleteTheme}
                      className={`${styles.actionButton} ${styles.completeThemeButton}`}
                      disabled={completedThemes.has(selectedThemeIndex)}
                      icon={FaCheck}
                      text={completedThemes.has(selectedThemeIndex) ? 'Завершена' : 'Закончить тему'}
                      title={completedThemes.has(selectedThemeIndex) ? 'Тема завершена' : 'Закончить тему'}
                      variant="primary"
                    />
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
              <div className={styles.scoreHeader}>
                Счет
                {(isSavingScores || pendingScoreChanges.size > 0) && (
                  <span className={styles.savingIndicator}>
                    {isSavingScores ? ' 💾' : ' ⏱️'}
                  </span>
                )}
              </div>
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
                  {player.tieBreakResult !== null && player.tieBreakResult !== undefined && player.tieBreakResult !== "" && (
                    <span className={styles.tieBreakResult}>({player.tieBreakResult}) </span>
                  )}
                  {player.points}
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
                          visibility: (!completedThemes.has(selectedThemeIndex) && 
                                     !(question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId)) &&
                                     (!isCurrentThemeTiebreak || tiebreakParticipants.has(player.playerId))) ? 'visible' : 'hidden',
                          pointerEvents: (!completedThemes.has(selectedThemeIndex) && 
                                        !(question.incorrectAnswers && question.incorrectAnswers.includes(player.playerId)) &&
                                        (!isCurrentThemeTiebreak || tiebreakParticipants.has(player.playerId))) ? 'auto' : 'none'
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
                          visibility: (!completedThemes.has(selectedThemeIndex) && 
                                     !(question.correctAnswers && question.correctAnswers.includes(player.playerId)) &&
                                     (!isCurrentThemeTiebreak || tiebreakParticipants.has(player.playerId))) ? 'visible' : 'hidden',
                          pointerEvents: (!completedThemes.has(selectedThemeIndex) && 
                                        !(question.correctAnswers && question.correctAnswers.includes(player.playerId)) &&
                                        (!isCurrentThemeTiebreak || tiebreakParticipants.has(player.playerId))) ? 'auto' : 'none'
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
              <AdaptiveButton
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                className={styles.accordionToggle}
                icon={isAccordionOpen ? FaChevronUp : FaChevronDown}
                text={`Тема ${selectedThemeIndex + 1} из ${themes.length}${completedThemes.has(selectedThemeIndex) ? ' ✓' : ''}`}
                title={isAccordionOpen ? 'Скрыть темы' : 'Показать темы'}
                variant="secondary"
              />
              
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
              <AdaptiveButton
                onClick={handleStartTiebreak}
                className={`${styles.actionButton} ${styles.tieBreakButton}`}
                disabled={game?.status === 'completed' || !allRegularThemesCompleted}
                title={!allRegularThemesCompleted ? 'Завершите все основные темы для добавления перестрелки' : ''}
                icon={FaPlus}
                text={generateTieBreakName()}
                variant="primary"
              />
              <AdaptiveButton
                onClick={handleCompleteGame}
                className={`${styles.actionButton} ${styles.completeGameButton}`}
                disabled={game?.status === 'completed' || !allThemesCompleted}
                title={!allThemesCompleted ? 'Завершите все темы перед окончанием игры' : ''}
                icon={FaTrophy}
                text={game?.status === 'completed' ? 'Завершена' : 'Закончить игру'}
                variant="primary"
              />
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

        {/* Game Completion Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={!!gameToComplete}
          onClose={() => !isProcessingProgression && setGameToComplete(null)}
          onConfirm={handleConfirmGameCompletion}
          title="Завершение игры"
          message={isProcessingProgression 
            ? "Завершаем игру и обновляем турнирную сетку...\n\nПожалуйста, подождите. Это может занять несколько секунд."
            : "Вы уверены, что хотите завершить игру?\n\nПосле завершения игры изменения в ней будут невозможны. Убедитесь, что все темы завершены и результаты корректны."
          }
          confirmText={isProcessingProgression ? "Обработка..." : "Завершить игру"}
          cancelText="Отмена"
          confirmDisabled={isProcessingProgression}
          cancelDisabled={isProcessingProgression}
        />

        {/* Tiebreak Participant Selection Modal */}
        <TiebreakSelectionDialog
          isOpen={isTiebreakSelectionOpen}
          onClose={handleTiebreakSelectionCancel}
          onConfirm={handleTiebreakSelectionConfirm}
          players={players}
          selectedParticipants={tempTiebreakParticipants}
          onToggleParticipant={handleTempToggleTiebreakParticipant}
          getPlayerName={getPlayerName}
          getPlayerColor={getPlayerColor}
        />
      </div>
    </div>
  );
}