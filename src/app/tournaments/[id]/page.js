'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaCalendarAlt, FaInfoCircle, FaSitemap, FaUsers, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import Link from 'next/link';
import TournamentTabs from './components/TournamentTabs';
import ParticipantsTab from './components/ParticipantsTab';
import BracketTab from './components/BracketTab';
import ResultsTab from './components/ResultsTab';
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
  const [activeTab, setActiveTab] = useState('participants');
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
  });

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
      <div className={styles.error}>Ошибка загрузки турнира</div>
    </div>
  );

  const status = getTournamentStatus(tournament.startDate, tournament.endDate);
  const typeLabel = getTypeLabel(tournament.type);

  return (
    <div className="container">
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/tournaments" className={styles.backLink}>
            <FaArrowLeft /> Турниры
          </Link>
        </div>
        
        <div className={styles.tournamentInfo}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{tournament.name}</h1>
            {tournament.type && (
              <div className={`${styles.typeLabel} ${styles[typeLabel]}`}>
                {typeLabel}
              </div>
            )}
          </div>
          
          <div className={styles.infoHeader} onClick={() => setIsInfoExpanded(!isInfoExpanded)}>
            <span className={styles.detailsTitle}>Подробная информация</span>
            <button className={styles.toggleButton}>
              {isInfoExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          </div>
          
          <div className={`${styles.details} ${isInfoExpanded ? styles.expanded : styles.collapsed}`}>
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
        </div>
      </div>

      <TournamentTabs 
        tournament={tournament}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className={styles.content}>
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
        {activeTab.startsWith('stage-') && (
          <div className={styles.stagePlaceholder}>
            <h3>Стадия турнира</h3>
            <p>Здесь будет отображаться информация о стадии турнира</p>
          </div>
        )}
      </div>
    </div>
  );
}
