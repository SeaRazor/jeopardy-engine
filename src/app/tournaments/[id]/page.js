'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FaCalendarAlt, FaInfoCircle, FaSitemap, FaUsers, FaChevronRight, FaTrophy } from 'react-icons/fa';
import InfoCard from '../../UI/InfoCard/InfoCard';
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

        <InfoCard
          title={tournament.name}
          defaultCollapsed={true}
          items={[
            typeMeta && {
              icon: FaTrophy,
              label: 'Тип',
              value: typeMeta.name,
              iconBoxStyle: { background: typeMeta.colorAlpha },
              iconStyle: { color: typeMeta.color },
            },
            {
              icon: FaCalendarAlt,
              label: 'Даты',
              value: `${new Date(tournament.startDate).toLocaleDateString('ru-RU')} — ${new Date(tournament.endDate).toLocaleDateString('ru-RU')}`,
            },
            {
              icon: FaInfoCircle,
              label: 'Статус',
              value: status,
              statusVariant: status.toLowerCase(),
            },
            {
              icon: FaSitemap,
              label: 'Схема',
              value: tournament.schema?.schemeName,
            },
            {
              icon: FaUsers,
              label: 'Участники',
              value: `${tournament.participants?.length || 0} / ${tournament.schema?.participantsNum}`,
            },
          ].filter(Boolean)}
        />
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
