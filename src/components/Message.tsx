import React from 'react';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const Message: React.FC<MessageProps> = ({ role, content, timestamp }) => {
  const messageWrapperStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
  };

  const messageStyle: React.CSSProperties = {
    maxWidth: role === 'system' ? '100%' : '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor:
      role === 'user'
        ? '#3b82f6'
        : role === 'system'
        ? '#fef3c7'
        : '#f3f4f6',
    color:
      role === 'user'
        ? '#fff'
        : role === 'system'
        ? '#92400e'
        : '#374151',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '12px',
    opacity: 0.8,
  };

  const roleStyle: React.CSSProperties = {
    fontWeight: '600',
  };

  const timeStyle: React.CSSProperties = {
    fontSize: '11px',
  };

  const contentStyle: React.CSSProperties = {
    margin: 0,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'user':
        return '👤 あなた';
      case 'system':
        return '🔔 システム';
      case 'assistant':
        return '🤖 AI';
    }
  };

  return (
    <div style={messageWrapperStyle}>
      <div style={messageStyle}>
        <div style={headerStyle}>
          <span style={roleStyle}>{getRoleLabel()}</span>
          <span style={timeStyle}>
            {timestamp.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p style={contentStyle}>{content}</p>
      </div>
    </div>
  );
};

export default Message;
