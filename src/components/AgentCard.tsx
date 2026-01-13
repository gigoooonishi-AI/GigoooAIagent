import React from 'react';

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'thinking';
  isSelected: boolean;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  name,
  description,
  status,
  isSelected,
  onClick,
}) => {
  const cardStyle: React.CSSProperties = {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: isSelected ? '#4b5563' : '#374151',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
  };

  const statusDotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: status === 'active' ? '#10b981' : '#6b7280',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={headerStyle}>
        <span style={nameStyle}>{name}</span>
        <span style={statusDotStyle} />
      </div>
      <p style={descriptionStyle}>{description}</p>
    </div>
  );
};

export default AgentCard;
