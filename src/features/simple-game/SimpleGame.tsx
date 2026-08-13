import React, { useState, useEffect } from 'react';
import './SimpleGame.css';

/**
 * Simple clicker game.
 * Click the button to increase your score. Every 5 seconds a random bonus is added.
 * Reach 100 points to finish.
 */
const SimpleGame: React.FC = () => {
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');

  const handleClick = () => {
    setScore(prev => prev + 1);
  };

  // Add random bonus every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const bonus = Math.floor(Math.random() * 11) + 5; // 5‑15 points
      setScore(prev => prev + bonus);
      setMessage(`Bonus! +${bonus}`);
      setTimeout(() => setMessage(''), 1500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Celebrate at 100 points
  useEffect(() => {
    if (score >= 100) {
      setMessage('🎉 You reached 100! Great job! 🎉');
    }
  }, [score]);

  return (
    <div className="simple-game-container">
      <h2>🕹️ Simple Clicker Game</h2>
      <div className="score-display">Score: {score}</div>
      {message && <div className="message">{message}</div>}
      <button
        className="click-button"
        onClick={handleClick}
        disabled={score >= 100}
      >
        {score >= 100 ? 'Finished' : 'Click Me!'}
      </button>
    </div>
  );
};

export default SimpleGame;
