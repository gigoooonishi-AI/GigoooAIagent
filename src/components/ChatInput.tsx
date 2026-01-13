import React from 'react';
import Button from './Button';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'メッセージを入力... (Enterで送信、Shift+Enterで改行)',
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    backgroundColor: '#fff',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
  };

  return (
    <div style={containerStyle}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        style={inputStyle}
        rows={3}
        disabled={disabled}
      />
      <Button
        onClick={onSend}
        disabled={!value.trim() || disabled}
        variant="primary"
      >
        送信 ✈️
      </Button>
    </div>
  );
};

export default ChatInput;
