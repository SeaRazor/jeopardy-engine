'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUsers, FaTrophy, FaMedal, FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './TournamentTabs.module.css';

const TournamentTabs = ({ tournament, onTabChange, activeTab }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef(null);

  const mainTabs = [
    { id: 'participants', label: 'Участники', icon: <FaUsers /> },
    { id: 'bracket',      label: 'Сетка',     icon: <FaTrophy /> },
    { id: 'results',      label: 'Результаты', icon: <FaMedal /> },
  ];

  const stageTabs = [];
  if (tournament?.schema?.stages) {
    tournament.schema.stages.forEach((stage, index) => {
      stageTabs.push({
        id: `stage-${index}`,
        label: stage.name || `Стадия ${index + 1}`,
        number: String(index + 1).padStart(2, '0'),
      });
    });
  }

  const allTabs = [...mainTabs, ...stageTabs];
  const activeTabData = allTabs.find(t => t.id === activeTab) || mainTabs[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabSelect = (tabId) => {
    onTabChange(tabId);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <button
          className={styles.collapseToggle}
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>

        <ul className={styles.navList}>
          {mainTabs.map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => onTabChange(tab.id)}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                title={collapsed ? tab.label : undefined}
              >
                <span className={styles.icon}>{tab.icon}</span>
                {!collapsed && <span className={styles.label}>{tab.label}</span>}
              </button>
            </li>
          ))}
        </ul>

        {stageTabs.length > 0 && (
          <>
            <div className={styles.divider}>
              {!collapsed && <span className={styles.dividerLabel}>Стадии</span>}
            </div>
            <ul className={styles.navList}>
              {stageTabs.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                    title={collapsed ? tab.label : undefined}
                  >
                    <span className={styles.stageNumber}>{tab.number}</span>
                    {!collapsed && <span className={styles.label}>{tab.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      {/* Mobile dropdown */}
      <div className={styles.mobileSelector} ref={dropdownRef}>
        <button
          className={styles.activeTabButton}
          onClick={() => setIsDropdownOpen(v => !v)}
          aria-expanded={isDropdownOpen}
        >
          <span className={styles.icon}>
            {activeTabData.icon || <span className={styles.stageNumber}>{activeTabData.number}</span>}
          </span>
          <span className={styles.label}>{activeTabData.label}</span>
          <span className={styles.chevron}>
            {isDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </button>

        {isDropdownOpen && (
          <div className={styles.dropdown}>
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`${styles.dropdownItem} ${activeTab === tab.id ? styles.active : ''}`}
              >
                <span className={styles.icon}>{tab.icon}</span>
                <span className={styles.label}>{tab.label}</span>
              </button>
            ))}
            {stageTabs.length > 0 && (
              <>
                <div className={styles.dropdownDivider}>Стадии</div>
                {stageTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`${styles.dropdownItem} ${activeTab === tab.id ? styles.active : ''}`}
                  >
                    <span className={styles.stageNumber}>{tab.number}</span>
                    <span className={styles.label}>{tab.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default TournamentTabs;
