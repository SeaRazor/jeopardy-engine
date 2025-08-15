'use client';

import { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import Modal from '../../../UI/Modal';
import { useToast } from '../../../util/ToastContext';
import styles from './ThemeEditModal.module.css';

const ThemeEditModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialThemes = [], 
  maxThemes = 6,
  isSaving = false 
}) => {
  const [themes, setThemes] = useState([]);
  const [errors, setErrors] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const { showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      const processedThemes = Array.from({ length: maxThemes }, (_, index) => {
        const existing = initialThemes[index];
        if (existing) {
          if (typeof existing === 'string') {
            return { name: existing, description: '' };
          }
          return { name: existing.name || '', description: existing.description || '' };
        }
        return { name: `Тема ${index + 1}`, description: '' };
      });
      setThemes(processedThemes);
      setErrors([]);
      setCurrentStep(0);
    }
  }, [isOpen, initialThemes, maxThemes]);

  const handleThemeChange = (index, field, value) => {
    const updatedThemes = [...themes];
    updatedThemes[index] = { ...updatedThemes[index], [field]: value };
    setThemes(updatedThemes);
    
    const updatedErrors = [...errors];
    updatedErrors[index] = { ...updatedErrors[index], [field]: null };
    setErrors(updatedErrors);
  };

  const validateCurrentStep = () => {
    const theme = themes[currentStep];
    const themeErrors = {};
    let hasErrors = false;

    if (!theme.name.trim()) {
      themeErrors.name = 'Название темы обязательно';
      hasErrors = true;
    } else if (theme.name.length > 50) {
      themeErrors.name = 'Название не должно превышать 50 символов';
      hasErrors = true;
    }
    
    if (theme.description.length > 200) {
      themeErrors.description = 'Описание не должно превышать 200 символов';
      hasErrors = true;
    }
    
    const newErrors = [...errors];
    newErrors[currentStep] = themeErrors;
    setErrors(newErrors);
    return !hasErrors;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, maxThemes - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSave = () => {
    if (validateCurrentStep()) {
      onSave(themes);
      showSuccess('Темы сохранены успешно!');
    }
  };

  const handleClose = () => {
    setErrors([]);
    onClose();
  };

  const currentTheme = themes[currentStep];
  const currentError = errors[currentStep] || {};

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Редактирование темы ${currentStep + 1}/${maxThemes}`} className={styles.compactModal}>
      <div className={styles.modalContent}>
        <div className={styles.wizardContent}>
          <div className={styles.themeForm}>
            <div className={styles.formField}>
              <label htmlFor="theme-name">Название *</label>
              <div className={styles.nameInputWrapper}>
                <div className={styles.themeNumber}>{currentStep + 1}</div>
                <input
                  id="theme-name"
                  type="text"
                  value={currentTheme?.name || ''}
                  onChange={(e) => handleThemeChange(currentStep, 'name', e.target.value)}
                  className={`${styles.nameInput} ${currentError.name ? styles.inputError : ''}`}
                  placeholder="Введите название темы"
                  maxLength={50}
                />
              </div>
              {currentError.name && <p className={styles.errorMessage}>{currentError.name}</p>}
            </div>
            <div className={styles.formField}>
              <label htmlFor="theme-description">Описание</label>
              <textarea
                id="theme-description"
                value={currentTheme?.description || ''}
                onChange={(e) => handleThemeChange(currentStep, 'description', e.target.value)}
                className={`${styles.descriptionInput} ${currentError.description ? styles.inputError : ''}`}
                placeholder="Опишите содержание темы"
                maxLength={200}
                rows={3}
              />
              {currentError.description && <p className={styles.errorMessage}>{currentError.description}</p>}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerRow}>
            <div className={styles.actions + ' ' + styles.mainActions}>
              <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
                <FaSave />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={handleClose} className={styles.closeButton}>
                <FaTimes />
                Закрыть
              </button>
            </div>
            <div className={styles.stepIndicator}>
              {currentStep + 1} / {maxThemes}
            </div>
            <div className={styles.actions + ' ' + styles.navigationActions}>
              <button onClick={handlePrev} disabled={currentStep === 0} className={styles.navButton}>
                <FaArrowLeft />
                Назад
              </button>
              <button onClick={handleNext} disabled={currentStep === maxThemes - 1} className={styles.navButton}>
                Далее
                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ThemeEditModal;
