'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FaCalendarAlt, FaInfoCircle, FaSitemap, FaUsers, FaChevronDown, FaChevronUp, FaChevronRight } from 'react-icons/fa';
import Link from 'next/link';
import InfoComponent from '../../UI/InfoComponent/InfoComponent';
import TournamentTabs from './components/TournamentTabs';
import ParticipantsTab from './components/ParticipantsTab';
import BracketTab from './components/BracketTab';
import ResultsTab from './components/ResultsTab';
import StageTab from './components/StageTab';
import { getTournamentStatus, getTypeLabel } from '../../util/tournament';
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

  const handleUpdateParticipants = (participants) => {
    // In a real app, this would update the tournament via API
    console.log('Updated participants:', participants);
  };

  if (isLoading) return (
    <div className="container">
      <div className={styles.loading}>Загрузка турнира...</div>
    </div>
  );

  if (isError) return (
    <div className="container">
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

  return (
    <>
      <div className={styles.header}>
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumbTrail}>
            <Link href="/tournaments" className={styles.breadcrumbLink}>
              Турниры
            </Link>
            <span className={styles.breadcrumbSeparator}>
              <FaChevronRight />
            </span>
            <span className={styles.currentPage}>{tournament.name}</span>
          </div>
        </div>
        
        <InfoComponent 
          title={tournament.name}
          icon={FaInfoCircle}
          headerContent={tournament.type && (
            <div className={`${styles.typeLabel} ${styles[typeLabel]}`}>
              {typeLabel}
            </div>
          )}
          defaultCollapsed={true}
          className={styles.tournamentInfo}
        >
          
          <div className={styles.details}>
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <FaCalendarAlt className={styles.detailIcon} />
                <strong>Даты:</strong>
              </div>
              <div className={styles.detailValue}>
                {new Date(tournament.startDate).toLocaleDateString('ru-RU')} - 
                {new Date(tournament.endDate).toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <FaInfoCircle className={styles.detailIcon} />
                <strong>Статус:</strong>
              </div>
              <div className={styles.detailValue}>
                <span className={`${styles.status} ${styles[status.toLowerCase()]}`}>
                  {status}
                </span>
              </div>
            </div>
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <FaSitemap className={styles.detailIcon} />
                <strong>Схема:</strong>
              </div>
              <div className={styles.detailValue}>
                {tournament.schema?.schemeName}
              </div>
            </div>
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <FaUsers className={styles.detailIcon} />
                <strong>Участников:</strong>
              </div>
              <div className={styles.detailValue}>
                {tournament.participants?.length || 0} / {tournament.schema?.participantsNum}
              </div>
            </div>
          </div>
        </InfoComponent>
      </div>

      <TournamentTabs 
        tournament={tournament}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div >
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
    </>
  );
}
