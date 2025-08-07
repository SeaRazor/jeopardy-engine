'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FaUser, FaPlus } from 'react-icons/fa';
import Tabs from '../UI/Tabs';
import Persons from './Persons';
import Teams from './Teams';
import AddPersonModal from './AddPersonModal';
import AddTeamModal from './AddTeamModal';
import { FaPeopleGroup } from 'react-icons/fa6';

export default function PlayersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('persons');
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const tabs = [
    { id: 'persons', label: 'Persons', icon: <FaUser /> },
    { id: 'teams', label: 'Teams', icon: <FaPeopleGroup /> },
  ];

  const handleAddPlayer = async (playerData) => {
    const { playerType } = playerData;
    try {
      const response = await fetch(`/api/players?type=${playerType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });
      if (response.ok) {
        console.log(`${playerType} added successfully`);
        await queryClient.invalidateQueries(['persons', 'teams']);
        if (playerType === 'person') {
          setIsPersonModalOpen(false);
        } else {
          setIsTeamModalOpen(false);
        }
      } else {
        console.error(`Error adding ${playerType}`);
      }
    } catch (error) {
      console.error(`Error adding ${playerType}:`, error);
    }
  };

  return (
    <div className="container">
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="tab-content">
        {activeTab === 'persons' && <Persons />}
        {activeTab === 'teams' && <Teams />}
      </div>
      {activeTab === 'persons' && (
        <button onClick={() => setIsPersonModalOpen(true)} className="fab">
          <FaPlus />
        </button>
      )}
      {activeTab === 'teams' && (
        <button onClick={() => setIsTeamModalOpen(true)} className="fab">
          <FaPlus />
        </button>
      )}
      <AddPersonModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        onAddPerson={handleAddPlayer}
      />
      <AddTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onAddTeam={handleAddPlayer}
      />
    </div>
  );
}
