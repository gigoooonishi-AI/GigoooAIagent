import React from 'react';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const Message: React.FC<MessageProps> = ({ role, content }) => {
  const getAvatar = () => {
    switch (role) {
      case 'user':
        return '👤';
      case 'assistant':
        return '✨';
      case 'system':
        return '⚙️';
    }
  };

  return (
    <div className={`message-row ${role} message-fade-in`}>
      <div className="message-content">
        <div className={`avatar ${role}`}>
          {getAvatar()}
        </div>
        <div className="message-text">
          {content}
        </div>
      </div>
    </div>
  );
};

export default Message;
