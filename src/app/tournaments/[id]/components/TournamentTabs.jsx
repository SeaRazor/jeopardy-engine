'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUsers, FaTrophy, FaMedal, FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './TournamentTabs.module.css';

const TournamentTabs = ({ tournament, onTabChange, activeTab }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const dropdownRef = useRef(null);
  const tabsRef = useRef(null);

  const tabs = [
    { id: 'participants', label: 'Участники', icon: <FaUsers /> },
    { id: 'bracket', label: 'Сетка', icon: <FaTrophy /> },
    { id: 'results', label: 'Результаты', icon: <FaMedal /> },
  ];

  // Add stage tabs based on tournament schema
  if (tournament?.schema?.stages) {
    tournament.schema.stages.forEach((stage, index) => {
      tabs.splice(1 + index, 0, {
        id: `stage-${index}`,
        label: stage.name || `Стадия ${index + 1}`,
        icon: <span className={styles.stageNumber}>{String(index + 1).padStart(2, '0')}</span>
      });
    });
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTabSelect = (tabId) => {
    onTabChange(tabId);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Check scroll position and update scroll indicators
  const checkScrollPosition = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Initialize scroll position check
  useEffect(() => {
    const handleResize = () => {
      checkScrollPosition();
    };

    checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabs]);

  // Scroll functions
  const scrollLeft = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.tabsContainer}>
      {/* Desktop tabs */}
      <div className={styles.tabsWrapper}>
        {showLeftScroll && (
          <button className={styles.scrollButton} onClick={scrollLeft} aria-label="Scroll left">
            <FaChevronLeft />
          </button>
        )}
        <div 
          className={styles.tabs}
          ref={tabsRef}
          onScroll={checkScrollPosition}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            >
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
            </button>
          ))}
        </div>
        {showRightScroll && (
          <button className={styles.scrollButton} onClick={scrollRight} aria-label="Scroll right">
            <FaChevronRight />
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      <div className={styles.mobileTabSelector} ref={dropdownRef}>
        <button 
          className={styles.activeTabButton}
          onClick={toggleDropdown}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <span className={styles.icon}>{activeTabData.icon}</span>
          <span className={styles.label}>{activeTabData.label}</span>
          <span className={styles.chevron}>
            {isDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </button>
        
        {isDropdownOpen && (
          <div className={styles.tabDropdown}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`${styles.dropdownTab} ${activeTab === tab.id ? styles.active : ''}`}
              >
                <span className={styles.icon}>{tab.icon}</span>
                <span className={styles.label}>{tab.label}</span>
                {activeTab === tab.id && <span className={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentTabs;