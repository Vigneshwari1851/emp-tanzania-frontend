import React from 'react';
import SimpleGame from '../../simple-game/SimpleGame';

/**
 * SimpleGamePage – a dedicated page for the time‑pass clicker game.
 * Add this page to your routing configuration to make the game accessible.
 */
const SimpleGamePage: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <SimpleGame />
    </div>
  );
};

export default SimpleGamePage;
