import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[];
  agentId?: string;
}

const Message: React.FC<MessageProps> = ({ role, content, images, agentId }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // MarkdownをWord用の要素に変換
  const parseMarkdownToDocx = (markdownContent: string): Paragraph[] => {
    const lines = markdownContent.split('\n');
    const paragraphs: Paragraph[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const processTextRuns = (text: string): TextRun[] => {
      const runs: TextRun[] = [];
      // 太字、イタリック、インラインコードを処理
      const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^*`]+)/g;
      const matches = text.match(regex) || [text];

      matches.forEach((match) => {
        if (match.startsWith('**') && match.endsWith('**')) {
          runs.push(new TextRun({ text: match.slice(2, -2), bold: true }));
        } else if (match.startsWith('*') && match.endsWith('*')) {
          runs.push(new TextRun({ text: match.slice(1, -1), italics: true }));
        } else if (match.startsWith('`') && match.endsWith('`')) {
          runs.push(new TextRun({ text: match.slice(1, -1), font: 'Consolas' }));
        } else {
          runs.push(new TextRun({ text: match }));
        }
      });

      return runs;
    };

    const createTable = (rows: string[][]): Table => {
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map((row, rowIndex) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                children: [new Paragraph({ children: processTextRuns(cell.trim()) })],
                shading: rowIndex === 0 ? { fill: 'E8E8E8' } : undefined,
              })
            ),
          })
        ),
      });
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // テーブル行の検出
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (trimmedLine.includes('---')) {
          // 区切り行はスキップ
          return;
        }
        inTable = true;
        const cells = trimmedLine.split('|').filter((cell) => cell.trim() !== '');
        tableRows.push(cells);
        return;
      } else if (inTable && tableRows.length > 0) {
        // テーブル終了
        paragraphs.push(new Paragraph({ children: [] })); // 空行
        paragraphs.push(createTable(tableRows) as unknown as Paragraph);
        paragraphs.push(new Paragraph({ children: [] })); // 空行
        tableRows = [];
        inTable = false;
      }

      // 見出し
      if (trimmedLine.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.slice(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );
      } else if (trimmedLine.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          })
        );
      } else if (trimmedLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: trimmedLine.slice(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      }
      // 箇条書き
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        paragraphs.push(
          new Paragraph({
            children: processTextRuns(trimmedLine.slice(2)),
            bullet: { level: 0 },
          })
        );
      }
      // 番号付きリスト
      else if (/^\d+\.\s/.test(trimmedLine)) {
        paragraphs.push(
          new Paragraph({
            children: processTextRuns(trimmedLine.replace(/^\d+\.\s/, '')),
            numbering: { reference: 'default-numbering', level: 0 },
          })
        );
      }
      // 引用
      else if (trimmedLine.startsWith('> ')) {
        paragraphs.push(
          new Paragraph({
            children: processTextRuns(trimmedLine.slice(2)),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: '10A37F' },
            },
          })
        );
      }
      // 水平線
      else if (trimmedLine === '---' || trimmedLine === '***') {
        paragraphs.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
            spacing: { before: 200, after: 200 },
          })
        );
      }
      // 通常の段落
      else if (trimmedLine !== '') {
        paragraphs.push(
          new Paragraph({
            children: processTextRuns(trimmedLine),
            spacing: { after: 120 },
          })
        );
      }
      // 空行
      else {
        paragraphs.push(new Paragraph({ children: [] }));
      }
    });

    // 最後のテーブルを処理
    if (tableRows.length > 0) {
      paragraphs.push(createTable(tableRows) as unknown as Paragraph);
    }

    return paragraphs;
  };

  // Word形式でダウンロード
  const handleDownloadWord = async () => {
    setIsDownloading(true);

    try {
      const paragraphs = parseMarkdownToDocx(content);

      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'default-numbering',
              levels: [
                {
                  level: 0,
                  format: 'decimal',
                  text: '%1.',
                  alignment: AlignmentType.START,
                },
              ],
            },
          ],
        },
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `提案資料_${timestamp}.docx`);
    } catch (error) {
      console.error('Word download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // 提案資料エージェントかどうか
  const isProposalAgent = agentId === 'proposal';

  return (
    <div className={`message-row ${role} message-fade-in`}>
      <div className="message-content">
        <div className={`avatar ${role}`}>
          {getAvatar()}
        </div>
        <div className="message-text">
          {role === 'assistant' ? (
            <div className={`markdown-content ${isProposalAgent ? 'proposal-document' : ''}`}>
              {/* アクションボタン（アシスタントメッセージのみ） */}
              <div className="message-actions">
                {isProposalAgent ? (
                  <button
                    className="download-button"
                    onClick={handleDownloadWord}
                    disabled={isDownloading}
                    title="Word形式でダウンロード"
                  >
                    <span className="download-icon">{isDownloading ? '⏳' : '📄'}</span>
                    <span>{isDownloading ? 'ダウンロード中...' : 'Word (.docx) でダウンロード'}</span>
                  </button>
                ) : (
                  <button
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    title={copied ? 'コピーしました!' : 'コピー'}
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                )}
              </div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // テーブルのスタイリング
                  table: ({ children }) => (
                    <table className="markdown-table">{children}</table>
                  ),
                  // コードブロックのスタイリング
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="inline-code" {...props}>{children}</code>
                    ) : (
                      <code className={`code-block ${className || ''}`} {...props}>{children}</code>
                    );
                  },
                  // preタグのスタイリング
                  pre: ({ children }) => (
                    <pre className="code-pre">{children}</pre>
                  ),
                  // リストのスタイリング
                  ul: ({ children }) => (
                    <ul className="markdown-list">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="markdown-list ordered">{children}</ol>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            content
          )}
          {images && images.length > 0 && (
            <div className="message-images">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`添付画像 ${index + 1}`}
                  className="message-image"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginRight: '8px',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
