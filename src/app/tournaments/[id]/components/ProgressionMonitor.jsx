'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FaPlay, 
  FaClock, 
  FaCheck, 
  FaExclamationTriangle, 
  FaSync, 
  FaChartLine, 
  FaTrophy,
  FaUsers,
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';
import { useToast } from '../../../util/ToastContext';
import { useGameCompletionListener } from '../../../util/immediateResolver';
import styles from './ProgressionMonitor.module.css';

const fetchProgressionStatus = async (tournamentId) => {
  const response = await fetch(`/api/tournaments/${tournamentId}/progression`);
  if (!response.ok) {
    throw new Error('Failed to fetch progression status');
  }
  return response.json();
};

const ProgressionMonitor = ({ tournament }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastGameCompleted, setLastGameCompleted] = useState(null);

  // Fetch progression status
  const { 
    data: progressionData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['progression', tournament.id],
    queryFn: () => fetchProgressionStatus(tournament.id),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
    refetchIntervalInBackground: false
  });

  // Listen for real-time game completion events
  useEffect(() => {
    const cleanup = useGameCompletionListener(tournament.id, (gameCompletionData) => {
      console.log('Game completed:', gameCompletionData);
      
      // Show notification
      const message = gameCompletionData.resolvedGames > 0 
        ? `Игра завершена! Автоматически обновлено ${gameCompletionData.resolvedGames} игр.`
        : 'Игра завершена!';
      showSuccess(message);
      
      // Update state for UI feedback
      setLastGameCompleted({
        ...gameCompletionData,
        timestamp: new Date()
      });
      
      // Clear the activity badge after 8 seconds
      setTimeout(() => {
        setLastGameCompleted(null);
      }, 8000);
      
      // Refresh progression data immediately
      refetch();
    });

    return cleanup;
  }, [tournament.id, refetch, showSuccess]);

  // Resolve references mutation
  const resolveReferencesMutation = useMutation({
    mutationFn: async (action) => {
      const response = await fetch(`/api/tournaments/${tournament.id}/progression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve references');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.resolvedCount > 0) {
        showSuccess(`Разрешено ${data.resolvedCount} ссылок на участников`);
      } else {
        showSuccess('Все ссылки уже разрешены');
      }
      queryClient.invalidateQueries(['progression', tournament.id]);
    },
    onError: (error) => {
      showError(`Ошибка при разрешении ссылок: ${error.message}`);
    }
  });

  // Manual refresh
  const handleRefresh = () => {
    refetch();
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Resolve all references
  const handleResolveAll = () => {
    resolveReferencesMutation.mutate('resolve_all');
  };

  // Get status color for stage
  const getStageStatusColor = (stage) => {
    if (stage.status.canProgress) return 'success';
    if (stage.status.completionPercentage > 0) return 'progress';
    if (stage.references.pending > 0) return 'waiting';
    return 'pending';
  };

  // Get status icon for stage
  const getStageStatusIcon = (stage) => {
    if (stage.status.canProgress) return <FaCheck />;
    if (stage.status.completionPercentage > 0) return <FaPlay />;
    if (stage.references.pending > 0) return <FaClock />;
    return <FaExclamationTriangle />;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Прогресс турнира</h3>
        </div>
        <div className={styles.loading}>
          <FaSpinner className={styles.spinner} />
          <span>Загрузка прогресса...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Прогресс турнира</h3>
        </div>
        <div className={styles.error}>
          <FaExclamationTriangle />
          <span>Ошибка загрузки: {error?.message}</span>
          <button onClick={handleRefresh} className={styles.retryButton}>
            <FaSync /> Повторить
          </button>
        </div>
      </div>
    );
  }

  const stages = progressionData?.stages || [];
  const overallComplete = progressionData?.overallComplete || false;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3>Прогресс турнира</h3>
          {overallComplete && (
            <div className={styles.completeBadge}>
              <FaTrophy /> Турнир завершен
            </div>
          )}
          {lastGameCompleted && (
            <div className={styles.recentActivityBadge}>
              <FaCheck /> Игра завершена
              {lastGameCompleted.resolvedGames > 0 && (
                <span className={styles.resolvedCount}>
                  +{lastGameCompleted.resolvedGames} игр обновлено
                </span>
              )}
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <button 
            onClick={toggleAutoRefresh} 
            className={`${styles.autoRefreshButton} ${autoRefresh ? styles.active : ''}`}
            title="Автообновление каждые 30 секунд"
          >
            <FaSync className={autoRefresh ? styles.spinning : ''} />
          </button>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            <FaSync /> Обновить
          </button>
          <button 
            onClick={handleResolveAll} 
            disabled={resolveReferencesMutation.isPending}
            className={styles.resolveButton}
          >
            {resolveReferencesMutation.isPending ? (
              <>
                <FaSpinner className={styles.spinner} /> Разрешение...
              </>
            ) : (
              <>
                <FaArrowRight /> Разрешить все ссылки
              </>
            )}
          </button>
        </div>
      </div>

      <div className={styles.stagesContainer}>
        {stages.map((stageData, index) => (
          <div 
            key={stageData.stage.id} 
            className={`${styles.stageCard} ${styles[getStageStatusColor(stageData)]}`}
          >
            <div className={styles.stageHeader}>
              <div className={styles.stageTitle}>
                <div className={styles.stageIcon}>
                  {getStageStatusIcon(stageData)}
                </div>
                <div>
                  <h4>{stageData.stage.name}</h4>
                  <span className={styles.stageOrder}>Стадия {stageData.stage.order}</span>
                </div>
              </div>
              <div className={styles.stageProgress}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${stageData.status.completionPercentage}%` }}
                  />
                </div>
                <span className={styles.progressText}>
                  {stageData.status.completionPercentage}%
                </span>
              </div>
            </div>

            <div className={styles.stageDetails}>
              <div className={styles.stageStats}>
                <div className={styles.stat}>
                  <FaPlay className={styles.statIcon} />
                  <span>Игры: {stageData.games.completed}/{stageData.games.total}</span>
                </div>
                
                {stageData.references.pending > 0 && (
                  <div className={styles.stat}>
                    <FaClock className={styles.statIcon} />
                    <span>Ожидает: {stageData.references.pending}</span>
                  </div>
                )}
                
                {stageData.games.brackets && (
                  <div className={styles.brackets}>
                    {stageData.games.brackets.upper.total > 0 && (
                      <div className={styles.bracket}>
                        <span className={styles.bracketLabel}>Верхняя:</span>
                        <span>{stageData.games.brackets.upper.completed}/{stageData.games.brackets.upper.total}</span>
                      </div>
                    )}
                    {stageData.games.brackets.lower.total > 0 && (
                      <div className={styles.bracket}>
                        <span className={styles.bracketLabel}>Нижняя:</span>
                        <span>{stageData.games.brackets.lower.completed}/{stageData.games.brackets.lower.total}</span>
                      </div>
                    )}
                    {stageData.games.brackets.final.total > 0 && (
                      <div className={styles.bracket}>
                        <span className={styles.bracketLabel}>Финал:</span>
                        <span>{stageData.games.brackets.final.completed}/{stageData.games.brackets.final.total}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.nextAction}>
                <span className={styles.actionLabel}>Следующее действие:</span>
                <span className={styles.actionText}>{stageData.status.nextAction}</span>
              </div>
            </div>

            {index < stages.length - 1 && (
              <div className={styles.stageConnector}>
                <FaArrowRight />
              </div>
            )}
          </div>
        ))}
      </div>

      {stages.length === 0 && (
        <div className={styles.emptyState}>
          <FaChartLine className={styles.emptyIcon} />
          <p>Нет данных о прогрессе</p>
          <p>Создайте игры на вкладке "Участники"</p>
        </div>
      )}
    </div>
  );
};

export default ProgressionMonitor;