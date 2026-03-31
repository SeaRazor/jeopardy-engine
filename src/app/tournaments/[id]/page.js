'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FaCalendarAlt, FaInfoCircle, FaSitemap, FaUsers, FaChevronRight, FaTrophy, FaChevronDown } from 'react-icons/fa';
import Link from 'next/link';
import TournamentTabs from './components/TournamentTabs';
import ParticipantsTab from './components/ParticipantsTab';
import BracketTab from './components/BracketTab';
import ResultsTab from './components/ResultsTab';
import StageTab from './components/StageTab';
import { getTournamentStatus, getTypeLabel, getTypeMeta } from '../../util/tournament';
import styles from './TournamentDetail.module.css';

const fetchTournament = async (id) => {
  const res = await fetch(`/api/tournaments/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch tournament');
  }
  return res.json();
};

export default function TournamentDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('participants');
  const [infoExpanded, setInfoExpanded] = useState(false);
  
  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
  });

  // Set active tab from URL parameter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Redirect to tournaments list if tournament not found
  useEffect(() => {
    if (isError) {
      const timer = setTimeout(() => {
        router.push('/tournaments');
      }, 3000); // 3 second delay to show error message
      
      return () => clearTimeout(timer);
    }
  }, [isError, router]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Update URL with query parameter
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    router.push(url.pathname + url.search, undefined, { shallow: true });
  };

  const handleUpdateParticipants = (participants) => {
    // In a real app, this would update the tournament via API
    console.log('Updated participants:', participants);
  };

  if (isLoading) return (
    <div className={styles.container}>
      <div className={styles.loading}>Загрузка турнира...</div>
    </div>
  );

  if (isError) return (
    <div className={styles.container}>
      <div className={styles.error}>
        <div className={styles.errorTitle}>
          <FaInfoCircle className={styles.errorIcon} />
          Турнир не найден
        </div>
        <p className={styles.errorMessage}>
          Запрашиваемый турнир не существует или был удален.
        </p>
        <p className={styles.redirectMessage}>
          Перенаправление на список турниров через 3 секунды...
        </p>
        <Link href="/tournaments" className={styles.backLink}>
          Перейти к списку турниров сейчас
        </Link>
      </div>
    </div>
  );

  const status = getTournamentStatus(tournament.startDate, tournament.endDate);
  const typeLabel = getTypeLabel(tournament.type);
  const typeMeta = getTypeMeta(tournament.type);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbTrail}>
          <Link href="/tournaments" className={styles.breadcrumbLink}>
            Турниры
          </Link>
          <span className={styles.breadcrumbSeparator}><FaChevronRight /></span>
          <span className={styles.currentPage}>{tournament.name}</span>
        </div>

        <div className={styles.infoCard}>
          <button
            className={styles.infoToggle}
            onClick={() => setInfoExpanded(v => !v)}
            aria-expanded={infoExpanded}
          >
            <h1 className={styles.title}>{tournament.name}</h1>
            <FaChevronDown className={`${styles.infoToggleChevron} ${infoExpanded ? styles.infoToggleChevronOpen : ''}`} />
          </button>

          <div className={`${styles.infoStrip} ${infoExpanded ? styles.infoStripOpen : styles.infoStripClosed}`}>
            {typeMeta && (
              <div className={styles.infoItem}>
                <div className={styles.infoIconBox} style={{ background: typeMeta.colorAlpha }}>
                  <FaTrophy className={styles.infoIcon} style={{ color: typeMeta.color }} />
                </div>
                <div className={styles.infoText}>
                  <span className={styles.infoLabel}>Тип</span>
                  <span className={styles.infoValue}>{typeMeta.name}</span>
                </div>
              </div>
            )}
            <div className={styles.infoItem}>
              <div className={styles.infoIconBox}>
                <FaCalendarAlt className={styles.infoIcon} />
              </div>
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>Даты</span>
                <span className={styles.infoValue}>
                  {new Date(tournament.startDate).toLocaleDateString('ru-RU')} — {new Date(tournament.endDate).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
            <div className={`${styles.infoItem} ${styles[status.toLowerCase()]}`}>
              <div className={styles.infoIconBox}>
                <FaInfoCircle className={styles.infoIcon} />
              </div>
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>Статус</span>
                <span className={styles.infoValue}>{status}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoIconBox}>
                <FaSitemap className={styles.infoIcon} />
              </div>
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>Схема</span>
                <span className={styles.infoValue}>{tournament.schema?.schemeName}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoIconBox}>
                <FaUsers className={styles.infoIcon} />
              </div>
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>Участники</span>
                <span className={styles.infoValue}>{tournament.participants?.length || 0} / {tournament.schema?.participantsNum}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <TournamentTabs
          tournament={tournament}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <div className={styles.tabContent}>
          {activeTab === 'participants' && (
            <ParticipantsTab
              tournament={tournament}
              onUpdateParticipants={handleUpdateParticipants}
            />
          )}
          {activeTab === 'bracket' && (
            <BracketTab tournament={tournament} />
          )}
          {activeTab === 'results' && (
            <ResultsTab tournament={tournament} />
          )}
          {activeTab.startsWith('stage-') && (() => {
            const stageIndex = parseInt(activeTab.replace('stage-', ''));
            const stage = tournament?.schema?.stages?.[stageIndex];
            return (
              <StageTab
                stage={stage}
                stageIndex={stageIndex}
                tournament={tournament}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
