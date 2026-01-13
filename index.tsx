import React, { useState, useRef, useEffect } from 'react';
import SalesDashboard from './src/SalesDashboard';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'thinking';
}

const AIAgentService: React.FC = () => {
  const agents: Agent[] = [
    { id: 'analysis', name: '社内スキル検索', description: 'スキルシート参照', status: 'active' },
    { id: 'leads', name: '見込み客管理', description: '優先度分析・アクション提案', status: 'idle' },
    { id: 'progress', name: '進捗管理', description: 'ボトルネック特定・対策提案', status: 'idle' },
    { id: 'inquiry', name: '問い合わせ対応', description: '回答案自動作成', status: 'idle' },
    { id: 'proposal', name: '提案資料作成', description: '提案書の自動生成', status: 'idle' },
    { id: 'coach', name: '営業コーチ', description: 'アドバイス・ベストプラクティス', status: 'idle' },
  ];

  // 各エージェントごとにチャット履歴を保存
  const [agentChats, setAgentChats] = useState<Record<string, Message[]>>({
    analysis: [
      {
        id: '1',
        role: 'system',
        content: '社内スキル検索です。スキルシートを参照してお答えします。どのようにお手伝いできますか?',
        timestamp: new Date(),
      },
    ],
    leads: [
      {
        id: '2',
        role: 'system',
        content: '見込み客管理エージェントです。リード情報を分析し、優先度判定やネクストアクションを提案します。会社名、担当者、ニーズなどを教えてください。',
        timestamp: new Date(),
      },
    ],
    progress: [
      {
        id: '3',
        role: 'system',
        content: '進捗管理エージェントです。案件の進捗状況を分析し、ボトルネックの特定や対策を提案します。案件名、ステージ、課題などを教えてください。',
        timestamp: new Date(),
      },
    ],
    inquiry: [
      {
        id: '4',
        role: 'system',
        content: '問い合わせ対応エージェントです。顧客からの質問に対する回答案を作成します。問い合わせ内容を教えてください。',
        timestamp: new Date(),
      },
    ],
    proposal: [
      {
        id: '5',
        role: 'system',
        content: '提案資料作成エージェントです。顧客ニーズに合わせた提案書を自動生成します。顧客情報と提案内容を教えてください。',
        timestamp: new Date(),
      },
    ],
    coach: [
      {
        id: '6',
        role: 'system',
        content: '営業コーチエージェントです。営業活動のアドバイスやベストプラクティスを提供します。現在の状況や課題を教えてください。',
        timestamp: new Date(),
      },
    ],
  });

  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('analysis');
  const [isThinking, setIsThinking] = useState(false);
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 現在選択されているエージェントのメッセージを取得
  const messages = agentChats[selectedAgent] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    // 現在選択されているエージェントのチャットにメッセージを追加
    setAgentChats((prev) => ({
      ...prev,
      [selectedAgent]: [...prev[selectedAgent], userMessage],
    }));

    setInputValue('');
    setIsThinking(true);

    try {
      // Python APIにリクエストを送信
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: selectedAgent,
          messages: agentChats[selectedAgent]
            .concat([userMessage])
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        // 現在選択されているエージェントのチャットにAI応答を追加
        setAgentChats((prev) => ({
          ...prev,
          [selectedAgent]: [...prev[selectedAgent], aiMessage],
        }));
      } else {
        // エラーメッセージを表示
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `エラー: ${data.error}`,
          timestamp: new Date(),
        };

        setAgentChats((prev) => ({
          ...prev,
          [selectedAgent]: [...prev[selectedAgent], errorMessage],
        }));
      }
    } catch (error) {
      // ネットワークエラーなどの場合
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}。バックエンドサーバーが起動しているか確認してください。`,
        timestamp: new Date(),
      };

      setAgentChats((prev) => ({
        ...prev,
        [selectedAgent]: [...prev[selectedAgent], errorMessage],
      }));
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={styles.container}>
      {/* サイドバー */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <img
            src="/assets/gigooo-logo.png"
            alt="GIGOOO"
            style={styles.logoImage}
          />
        </div>

        <div style={styles.agentList}>
          <h3 style={styles.sectionTitle}>利用可能なエージェント</h3>
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              style={{
                ...styles.agentCard,
                ...(selectedAgent === agent.id ? styles.agentCardActive : {}),
              }}
            >
              <div style={styles.agentHeader}>
                <span style={styles.agentName}>{agent.name}</span>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: agent.status === 'active' ? '#10b981' : '#6b7280',
                  }}
                />
              </div>
              <p style={styles.agentDescription}>{agent.description}</p>
            </div>
          ))}
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>総メッセージ</span>
            <span style={styles.statValue}>
              {Object.values(agentChats).reduce((sum, chat) => sum + chat.length, 0)}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>このチャット</span>
            <span style={styles.statValue}>{messages.length}</span>
          </div>
        </div>
      </div>

      {/* メインチャットエリア */}
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            {agents.find(a => a.id === selectedAgent)?.name}
          </h2>
          <div style={styles.headerActions}>
            <button
              style={styles.salesButton}
              onClick={() => setShowSalesDashboard(true)}
              title="営業ダッシュボード"
            >
              💼 営業機能
            </button>
            <button style={styles.iconButton}>⚙️</button>
            <button style={styles.iconButton}>📊</button>
          </div>
        </div>

        <div style={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageWrapper,
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : {}),
                  ...(message.role === 'system' ? styles.systemMessage : {}),
                }}
              >
                <div style={styles.messageHeader}>
                  <span style={styles.messageRole}>
                    {message.role === 'user' ? '👤 あなた' :
                     message.role === 'system' ? '🔔 システム' : '🤖 AI'}
                  </span>
                  <span style={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p style={styles.messageContent}>{message.content}</p>
              </div>
            </div>
          ))}

          {isThinking && (
            <div style={styles.messageWrapper}>
              <div style={{ ...styles.message, ...styles.thinkingMessage }}>
                <div style={styles.thinkingDots}>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力... (Enterで送信、Shift+Enterで改行)"
            style={styles.input}
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isThinking}
            style={{
              ...styles.sendButton,
              ...((!inputValue.trim() || isThinking) ? styles.sendButtonDisabled : {}),
            }}
          >
            送信 ✈️
          </button>
        </div>
      </div>

      {/* 営業ダッシュボード */}
      {showSalesDashboard && (
        <SalesDashboard onClose={() => setShowSalesDashboard(false)} />
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
  },
  sidebar: {
    width: '320px',
    backgroundColor: '#1f2937',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #374151',
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: '1px solid #374151',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    maxWidth: '200px',
    height: 'auto',
  },
  agentList: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto' as const,
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
    letterSpacing: '0.05em',
  },
  agentCard: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#374151',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  agentCardActive: {
    backgroundColor: '#4b5563',
    borderColor: '#3b82f6',
  },
  agentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  agentName: {
    fontSize: '14px',
    fontWeight: '600',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  agentDescription: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  stats: {
    padding: '16px',
    borderTop: '1px solid #374151',
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#fff',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.2s',
  },
  salesButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#f3f4f6',
  },
  userMessage: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  systemMessage: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    maxWidth: '100%',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '12px',
    opacity: 0.8,
  },
  messageRole: {
    fontWeight: '600',
  },
  messageTime: {
    fontSize: '11px',
  },
  messageContent: {
    margin: 0,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
  },
  thinkingMessage: {
    backgroundColor: '#f3f4f6',
    padding: '16px',
  },
  thinkingDots: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  dot: {
    fontSize: '8px',
    animation: 'pulse 1.4s ease-in-out infinite',
    color: '#6b7280',
  },
  inputContainer: {
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none' as const,
    outline: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
};

export default AIAgentService;
