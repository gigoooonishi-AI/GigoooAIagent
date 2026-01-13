import React from 'react';

const ThinkingIndicator: React.FC = () => {
  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
  };

  const messageStyle: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '12px',
  };

  const dotsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  };

  const dotStyle: React.CSSProperties = {
    fontSize: '8px',
    animation: 'pulse 1.4s ease-in-out infinite',
    color: '#6b7280',
  };

  return (
    <div style={wrapperStyle}>
      <div style={messageStyle}>
        <div style={dotsStyle}>
          <span style={dotStyle}>●</span>
          <span style={dotStyle}>●</span>
          <span style={dotStyle}>●</span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
