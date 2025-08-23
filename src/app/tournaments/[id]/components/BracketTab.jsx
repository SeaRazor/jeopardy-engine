'use client';

import { createBracketTabComponent } from '../../../components/brackets/BracketTabFactory';

const BracketTab = ({ tournament }) => {
  // Use factory to get the appropriate bracket component
  const BracketComponent = createBracketTabComponent(tournament);
  
  // Render the appropriate component with all props
  return <BracketComponent tournament={tournament} />;
};

export default BracketTab;