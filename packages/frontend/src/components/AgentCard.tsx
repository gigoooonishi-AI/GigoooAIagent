import React from 'react';

interface AgentCardProps {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'idle' | 'thinking';
  isSelected: boolean;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  name,
  icon,
  status,
  isSelected,
  onClick,
}) => {
  return (
    <div
      className={`agent-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="agent-card-icon">{icon}</span>
      <span className="agent-card-text">{name}</span>
      <span className={`status-dot ${status}`} />
    </div>
  );
};

export default AgentCard;
