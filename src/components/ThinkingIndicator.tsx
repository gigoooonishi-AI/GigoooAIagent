import React from 'react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="thinking-indicator">
      <div className="thinking-content">
        <div className="avatar assistant">
          ✨
        </div>
        <div className="thinking-dots">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
