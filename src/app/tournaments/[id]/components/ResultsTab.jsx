'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaMedal, FaTrophy, FaAward, FaClock, FaSpinner, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useToast } from '../../../util/ToastContext';
import { generateColorFromString } from '../../../util/color';
import styles from './ResultsTab.module.css';

const ResultsTab = ({ tournament }) => {
  const { showError } = useToast();
  const [expandedSections, setExpandedSections] = useState({});
  
  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  // Fetch tournament results from API
  const { 
    data: resultsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['tournamentResults', tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return null;
      
      const response = await fetch(`/api/tournaments/${tournament.id}/results`);
      if (!response.ok) {
        throw new Error('Failed to fetch tournament results');
      }
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    refetchOnWindowFocus: true
  });

  // Show error if fetch failed
  useEffect(() => {
    if (error) {
      showError(`Ошибка загрузки результатов: ${error.message}`);
    }
  }, [error, showError]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FaSpinner className={styles.spinner} />
          <h3>Загрузка результатов...</h3>
        </div>
      </div>
    );
  }

  // No tournament or no data
  if (!tournament || !resultsData) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>Результаты турнира</h3>
          <p>Нет данных для отображения</p>
        </div>
      </div>
    );
  }

  const { results = [], podium = [], stats, tournament: tournamentData } = resultsData;

  const getParticipantName = (playerInfo) => {
    if (!playerInfo) return 'Неизвестный участник';
    
    // Team
    if (playerInfo.name) return playerInfo.name;
    
    // Person
    if (playerInfo.firstName && playerInfo.lastName) {
      return `${playerInfo.firstName} ${playerInfo.lastName}`;
    }
    
    if (playerInfo.firstName) return playerInfo.firstName;
    
    return 'Неизвестный участник';
  };

  const getParticipantAvatar = (playerInfo) => {
    if (!playerInfo) {
      return (
        <div className={styles.avatar} style={{ backgroundColor: '#cccccc' }}>
          ??
        </div>
      );
    }
    
    const avatarColor = generateColorFromString(playerInfo.id?.toString() || '0');
    
    // Team
    if (playerInfo.name) {
      return (
        <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
          {playerInfo.name.substring(0, 2).toUpperCase()}
        </div>
      );
    }
    
    // Person
    if (playerInfo.firstName && playerInfo.lastName) {
      return (
        <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
          {playerInfo.firstName[0]}{playerInfo.lastName[0]}
        </div>
      );
    }
    
    // Fallback for incomplete person info
    return (
      <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
        {(playerInfo.firstName?.[0] || '?').toUpperCase()}
      </div>
    );
  };

  // Get tournament status display
  const getStatusDisplay = () => {
    switch (stats?.tournamentStatus) {
      case 'pending':
        return <span className={styles.statusPending}>Не начат</span>;
      case 'ongoing':
        return <span className={styles.statusOngoing}>В процессе</span>;
      case 'completed':
        return <span className={styles.statusCompleted}>Завершен</span>;
      default:
        return <span className={styles.status}>Неизвестно</span>;
    }
  };

  // Check if we have any results data at all
  const hasResults = results && results.length > 0;
  const eliminatedPlayers = results.filter(result => result !== null);
  
  if (!hasResults) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>Результаты турнира</h3>
          <div className={styles.tournamentInfo}>
            <p><strong>Турнир:</strong> {tournament.name}</p>
            <p><strong>Схема:</strong> {tournament.schema?.schemeName}</p>
            <p><strong>Статус:</strong> {getStatusDisplay()}</p>
          </div>
        </div>
        
        <div className={styles.emptyState}>
          <FaClock className={styles.emptyIcon} />
          <h4>Результаты еще не готовы</h4>
          <p>Турнир еще не завершил ни одной стадии</p>
          <p>Участников: {stats?.totalParticipants || 0}</p>
          {stats?.tournamentStatus === 'ongoing' && (
            <p className={styles.liveIndicator}>Турнир в процессе...</p>
          )}
        </div>
      </div>
    );
  }

  const getPlaceIcon = (place) => {
    switch (place) {
      case 1: return <FaTrophy className={styles.goldIcon} />;
      case 2: return <FaMedal className={styles.silverIcon} />;
      case 3: return <FaAward className={styles.bronzeIcon} />;
      default: return <span className={styles.placeNumber}>{place}</span>;
    }
  };

  const getPlaceClass = (place) => {
    switch (place) {
      case 1: return styles.firstPlace;
      case 2: return styles.secondPlace;
      case 3: return styles.thirdPlace;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Результаты турнира</h3>
        <div className={styles.tournamentInfo}>
          <p><strong>Турнир:</strong> {tournament.name}</p>
          <p><strong>Схема:</strong> {tournament.schema?.schemeName}</p>
          <p><strong>Статус:</strong> {getStatusDisplay()}</p>
          <p><strong>Участников:</strong> {stats?.totalParticipants || 0}</p>
          {stats?.eliminatedCount > 0 && (
            <p><strong>Исключено:</strong> {stats.eliminatedCount}</p>
          )}
        </div>
      </div>

      <div className={styles.podium}>
        {/* Desktop podium */}
        <div className={styles.podiumDesktop}>
          {[
            results.find(r => r && r.finalPlacement === 2), // Second
            results.find(r => r && r.finalPlacement === 1), // First (center)
            results.find(r => r && r.finalPlacement === 3)  // Third
          ].map((result, index) => {
            const place = index === 0 ? 2 : index === 1 ? 1 : 3;
            
            return (
              <div key={place} className={styles.podiumItem}>
                <div className={styles.podiumBar}>{place}</div>
                <div className={`${styles.podiumPlace} ${place === 1 ? styles.first : place === 2 ? styles.second : styles.third}`}>
                  <div className={styles.podiumIcon}>
                    {place === 1 ? <FaTrophy className={styles.goldIcon} /> :
                     place === 2 ? <FaMedal className={styles.silverIcon} /> :
                     <FaAward className={styles.bronzeIcon} />}
                  </div>
                  <div className={styles.podiumInfo}>
                    {result ? (
                      <div className={styles.podiumParticipant}>
                        {getParticipantAvatar(result.playerInfo)}
                        <h4>{getParticipantName(result.playerInfo)}</h4>
                      </div>
                    ) : (
                      <div className={styles.podiumParticipant}>
                        <div className={styles.avatar} style={{ backgroundColor: '#cccccc' }}>??</div>
                        <h4>-</h4>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Mobile podium */}
        <div className={styles.podiumMobile}>
          {[1, 2, 3].map(place => {
            const result = results.find(r => r && r.finalPlacement === place);
            const icon = place === 1 ? <FaTrophy className={styles.goldIcon} /> :
                       place === 2 ? <FaMedal className={styles.silverIcon} /> :
                       <FaAward className={styles.bronzeIcon} />;
            
            return (
              <div key={place} className={`${styles.podiumMobileEntry} ${styles[`place${place}`]}`}>
                <div className={styles.podiumMobilePosition}>
                  {icon}
                  <span className={styles.placeNumber}>{place}</span>
                </div>
                <div className={styles.podiumMobileParticipant}>
                  {result && getParticipantAvatar(result.playerInfo)}
                  <span className={styles.participantName}>
                    {result ? getParticipantName(result.playerInfo) : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.tablesContainer}>
        {(() => {
          // Calculate table sections based on total participants (excluding top 3)
          const totalParticipants = results.length;
          const remainingSlots = totalParticipants - 3; // Exclude top 3 from tables
          const section3Size = Math.ceil(remainingSlots / 3); // Bottom section
          const section12Size = Math.ceil((remainingSlots - section3Size) / 2); // Equal size for sections 1 and 2
          
          // Define sections with equal sizes for sections 1 and 2
          const sections = [
            {
              title: `Места 4-${3 + section12Size}`,
              start: 3,
              end: 3 + section12Size
            },
            {
              title: `Места ${3 + section12Size + 1}-${3 + 2 * section12Size}`,
              start: 3 + section12Size,
              end: 3 + 2 * section12Size
            },
            {
              title: `Места ${3 + 2 * section12Size + 1}-${totalParticipants}`,
              start: 3 + 2 * section12Size,
              end: totalParticipants
            }
          ].filter(section => section.start < totalParticipants);

          return sections.map((section, sectionIndex) => {
            const sectionResults = results.slice(section.start, section.end);
            const hasData = sectionResults.some(r => r !== null);
            
            if (!hasData) return null;
            
            const isExpanded = expandedSections[sectionIndex];
            
            return (
              <div key={sectionIndex} className={`${styles.table} ${styles.compactTable} ${styles.accordionSection}`}>
                <div className={styles.tableHeader} 
                     onClick={() => toggleSection(sectionIndex)}>
                  <h4>{section.title}</h4>
                  <span className={styles.accordionToggle}>
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </span>
                </div>
                
                <div className={`${styles.tableContent} ${isExpanded ? styles.accordionExpanded : styles.accordionCollapsed}`}>
                  <div className={styles.tableRow}>
                    <div className={styles.tableCell}><strong>Место</strong></div>
                    <div className={styles.tableCell}><strong>Участник</strong></div>
                    <div className={styles.tableCell}><strong>Исключен</strong></div>
                  </div>
                  {sectionResults.map((result, index) => {
                    const actualPosition = section.start + index + 1;
                    
                    if (result === null) {
                      return (
                        <div key={`empty-${actualPosition}`} className={styles.tableRow}>
                          <div className={styles.tableCell}>
                            <div className={styles.place}>
                              {getPlaceIcon(actualPosition)}
                            </div>
                          </div>
                          <div className={styles.tableCell}>
                            <span className={styles.emptySlot}>-</span>
                          </div>
                          <div className={styles.tableCell}>-</div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={result.playerId} className={`${styles.tableRow} ${getPlaceClass(result.finalPlacement)}`}>
                        <div className={styles.tableCell}>
                          <div className={styles.place}>
                            {getPlaceIcon(result.finalPlacement)}
                          </div>
                        </div>
                        <div className={styles.tableCell}>
                          <div className={styles.participantInfo}>
                            {getParticipantAvatar(result.playerInfo)}
                            <div className={styles.participantName}>
                              <strong>{getParticipantName(result.playerInfo)}</strong>
                              {result.isFinalResults && result.finalPlacement <= 3 && (
                                <span className={styles.finalIndicator}> (Финалист)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={styles.tableCell}>
                          <span className={styles.eliminationStage}>
                            {result.eliminatedAtStageName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default ResultsTab;