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
  const cardClasses = `p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
    isSelected
      ? 'bg-gray-600 border-blue-500'
      : 'bg-gray-700 border-transparent hover:bg-gray-650'
  }`;

  const statusColor = status === 'active' ? 'bg-emerald-500' : 'bg-gray-500';

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-white">{name}</span>
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
      </div>
      <p className="text-xs text-gray-400 m-0">{description}</p>
    </div>
  );
};

export default AgentCard;
