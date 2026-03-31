export const getTournamentStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return 'Планируется';
  }
  if (now > end) {
    return 'Закончен';
  }
  return 'Идет';
};

// Central registry of tournament types.
// Add new types here — all consumers derive labels, names and colors from this.
export const TOURNAMENT_TYPES = [
  { id: 1, label: 'СИ', name: 'Своя игра',        color: '#f59e0b', colorAlpha: 'rgba(245,158,11,0.12)'  },
  { id: 2, label: 'ЭК', name: 'Эрудит-квартет',   color: '#10b981', colorAlpha: 'rgba(16,185,129,0.12)'  },
  { id: 3, label: 'БР', name: 'Брейн-ринг',        color: '#f43f5e', colorAlpha: 'rgba(244,63,94,0.12)'   },
];

export const getTypeLabel = (type) => {
  const match = TOURNAMENT_TYPES.find(
    t => t.id === type || t.id === Number(type) || t.name === type
  );
  return match?.label ?? '';
};

export const getTypeMeta = (type) => {
  const label = getTypeLabel(type);
  return TOURNAMENT_TYPES.find(t => t.label === label) ?? null;
};
