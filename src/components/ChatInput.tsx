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

  return (
    <div className="p-6 border-t border-gray-200 flex gap-3 bg-white">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-[inherit] resize-none outline-none"
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
