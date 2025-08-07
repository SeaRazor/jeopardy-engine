const COLORS = [
  '#e57373', '#81c784', '#64b5f6', '#ffb74d', '#9575cd',
  '#f06292', '#4db6ac', '#7986cb', '#a1887f', '#dce775'
];

export const generateColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};