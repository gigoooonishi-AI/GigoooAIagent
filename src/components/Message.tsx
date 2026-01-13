import React from 'react';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const Message: React.FC<MessageProps> = ({ role, content, timestamp }) => {
  const wrapperClasses = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const messageClasses = `${
    role === 'system' ? 'max-w-full' : 'max-w-[70%]'
  } px-4 py-3 rounded-xl ${
    role === 'user'
      ? 'bg-blue-500 text-white'
      : role === 'system'
      ? 'bg-amber-100 text-amber-900'
      : 'bg-gray-100 text-gray-700'
  }`;

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
    <div className={wrapperClasses}>
      <div className={messageClasses}>
        <div className="flex justify-between items-center mb-1 text-xs opacity-80">
          <span className="font-semibold">{getRoleLabel()}</span>
          <span className="text-[11px]">
            {timestamp.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="m-0 leading-6 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

export default Message;
