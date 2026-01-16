import React, { KeyboardEvent, useRef, useState, useEffect } from 'react';

interface SelectedFile {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect?: (files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onFileSelect,
  disabled = false,
  placeholder = 'メッセージを入力...',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  // テキストエリアの自動リサイズ
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 高さをリセットしてからscrollHeightを計算
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // 最小24px、最大200pxに制限
      const newHeight = Math.min(Math.max(scrollHeight, 24), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (value.trim() || selectedFiles.length > 0)) {
        handleSend();
      }
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: SelectedFile[] = [];

      Array.from(files).forEach((file) => {
        const selectedFile: SelectedFile = { file };

        // 画像の場合はプレビューを生成
        if (file.type.startsWith('image/')) {
          selectedFile.preview = URL.createObjectURL(file);
        }

        newFiles.push(selectedFile);
      });

      setSelectedFiles((prev) => [...prev, ...newFiles]);

      if (onFileSelect) {
        onFileSelect(Array.from(files));
      }
    }
    // 入力をリセット（同じファイルを再選択できるように）
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      // プレビューURLを解放
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSend = () => {
    onSend();
    // 送信後にファイルをクリア
    selectedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return '📝';
    if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) return '📊';
    if (file.type.includes('powerpoint') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) return '📽️';
    if (file.type.includes('text')) return '📃';
    return '📎';
  };

  return (
    <div className="input-container">
      <div className="input-wrapper">
        {/* ファイルプレビューエリア */}
        {selectedFiles.length > 0 && (
          <div className="file-preview-area">
            {selectedFiles.map((selectedFile, index) => (
              <div key={index} className="file-preview-item">
                {selectedFile.preview ? (
                  <img
                    src={selectedFile.preview}
                    alt={selectedFile.file.name}
                    className="file-preview-image"
                  />
                ) : (
                  <div className="file-preview-icon">
                    {getFileIcon(selectedFile.file)}
                  </div>
                )}
                <span className="file-preview-name">
                  {selectedFile.file.name.length > 15
                    ? selectedFile.file.name.substring(0, 12) + '...'
                    : selectedFile.file.name}
                </span>
                <button
                  className="file-remove-button"
                  onClick={() => removeFile(index)}
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-row">
          {/* ファイル添付ボタン */}
          <button
            className="file-button"
            onClick={handleFileButtonClick}
            disabled={disabled}
            title="ファイルを添付"
          >
            📎
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />

          <textarea
            ref={textareaRef}
            className="chat-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
          />

          <button
            className="send-button"
            onClick={handleSend}
            disabled={disabled || (!value.trim() && selectedFiles.length === 0)}
            title="送信"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
