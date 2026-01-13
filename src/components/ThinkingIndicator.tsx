import React from 'react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex w-full">
      <div className="bg-gray-100 p-4 rounded-xl">
        <div className="flex gap-1 justify-center">
          <span className="thinking-dot text-[8px] text-gray-500">●</span>
          <span className="thinking-dot text-[8px] text-gray-500">●</span>
          <span className="thinking-dot text-[8px] text-gray-500">●</span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
