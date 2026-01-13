import React, { useState, useRef, useEffect, useCallback } from 'react';
import SalesDashboard from './src/SalesDashboard';
import MessageComponent from './src/components/Message';
import AgentCard from './src/components/AgentCard';
import ThinkingIndicator from './src/components/ThinkingIndicator';
import ChatInput from './src/components/ChatInput';

// API設定
const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'idle' | 'thinking';
}

const AIAgentService: React.FC = () => {
  const agents: Agent[] = [
    { id: 'analysis', name: '社内スキル検索', description: 'スキルシート参照', icon: '🔍', status: 'active' },
    { id: 'leads', name: '見込み客管理', description: '優先度分析・アクション提案', icon: '📊', status: 'idle' },
    { id: 'progress', name: '進捗管理', description: 'ボトルネック特定・対策提案', icon: '📈', status: 'idle' },
    { id: 'inquiry', name: '問い合わせ対応', description: '回答案自動作成', icon: '💬', status: 'idle' },
    { id: 'proposal', name: '提案資料作成', description: '提案書の自動生成', icon: '📝', status: 'idle' },
    { id: 'coach', name: '営業コーチ', description: 'アドバイス・ベストプラクティス', icon: '🎯', status: 'idle' },
  ];

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
        content: '見込み客管理エージェントです。リード情報を分析し、優先度判定やネクストアクションを提案します。',
        timestamp: new Date(),
      },
    ],
    progress: [
      {
        id: '3',
        role: 'system',
        content: '進捗管理エージェントです。案件の進捗状況を分析し、ボトルネックの特定や対策を提案します。',
        timestamp: new Date(),
      },
    ],
    inquiry: [
      {
        id: '4',
        role: 'system',
        content: '問い合わせ対応エージェントです。顧客からの質問に対する回答案を作成します。',
        timestamp: new Date(),
      },
    ],
    proposal: [
      {
        id: '5',
        role: 'system',
        content: '提案資料作成エージェントです。顧客ニーズに合わせた提案書を自動生成します。',
        timestamp: new Date(),
      },
    ],
    coach: [
      {
        id: '6',
        role: 'system',
        content: '営業コーチエージェントです。営業活動のアドバイスやベストプラクティスを提供します。',
        timestamp: new Date(),
      },
    ],
  });

  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('analysis');
  const [isThinking, setIsThinking] = useState(false);
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const messages = agentChats[selectedAgent] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket接続管理
  const connectWebSocket = useCallback((agentId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${agentId}`);

    ws.onopen = () => {
      setWsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'token') {
        // ストリーミングトークンを追加
        const messageId = streamingMessageIdRef.current;
        if (messageId) {
          setAgentChats((prev) => ({
            ...prev,
            [agentId]: prev[agentId].map((msg) =>
              msg.id === messageId
                ? { ...msg, content: msg.content + data.content }
                : msg
            ),
          }));
        }
      } else if (data.type === 'end') {
        // ストリーミング完了
        const messageId = streamingMessageIdRef.current;
        if (messageId) {
          setAgentChats((prev) => ({
            ...prev,
            [agentId]: prev[agentId].map((msg) =>
              msg.id === messageId
                ? { ...msg, isStreaming: false }
                : msg
            ),
          }));
        }
        streamingMessageIdRef.current = null;
        setIsThinking(false);
      } else if (data.type === 'error') {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `エラー: ${data.message}`,
          timestamp: new Date(),
        };
        setAgentChats((prev) => ({
          ...prev,
          [agentId]: [...prev[agentId], errorMessage],
        }));
        setIsThinking(false);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    wsRef.current = ws;
  }, []);

  // エージェント変更時にWebSocket再接続
  useEffect(() => {
    if (useStreaming) {
      connectWebSocket(selectedAgent);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedAgent, useStreaming, connectWebSocket]);

  // REST API経由でメッセージ送信
  const sendMessageREST = async (userMessage: Message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
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
          stream: false,
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

        setAgentChats((prev) => ({
          ...prev,
          [selectedAgent]: [...prev[selectedAgent], aiMessage],
        }));
      } else {
        throw new Error(data.error || '不明なエラー');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
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

  // WebSocket経由でメッセージ送信
  const sendMessageWebSocket = (userMessage: Message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      // WebSocket未接続の場合はREST APIにフォールバック
      sendMessageREST(userMessage);
      return;
    }

    // ストリーミング用の空メッセージを追加
    const aiMessageId = (Date.now() + 1).toString();
    streamingMessageIdRef.current = aiMessageId;

    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setAgentChats((prev) => ({
      ...prev,
      [selectedAgent]: [...prev[selectedAgent], aiMessage],
    }));

    // WebSocketでメッセージ送信
    wsRef.current.send(JSON.stringify({
      messages: agentChats[selectedAgent]
        .concat([userMessage])
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
    }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setAgentChats((prev) => ({
      ...prev,
      [selectedAgent]: [...prev[selectedAgent], userMessage],
    }));

    setInputValue('');
    setIsThinking(true);

    if (useStreaming && wsConnected) {
      sendMessageWebSocket(userMessage);
    } else {
      await sendMessageREST(userMessage);
    }
  };

  const currentAgent = agents.find(a => a.id === selectedAgent);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* サイドバー */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => setShowSalesDashboard(true)}>
            <span>+</span>
            <span>営業ダッシュボード</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 16px', fontSize: '12px', color: '#8e8ea0' }}>
            AIエージェント
          </div>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              icon={agent.icon}
              status={agent.status}
              isSelected={selectedAgent === agent.id}
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: wsConnected ? '#10b981' : '#ef4444',
                }}
              />
              <span style={{ fontSize: '12px' }}>
                {wsConnected ? 'ストリーミング接続中' : 'REST API使用'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>総メッセージ: {Object.values(agentChats).reduce((sum, chat) => sum + chat.length, 0)}</span>
              <button
                onClick={() => setUseStreaming(!useStreaming)}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  backgroundColor: useStreaming ? '#374151' : '#1f2937',
                  color: '#9ca3af',
                  border: '1px solid #4b5563',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {useStreaming ? 'Stream ON' : 'Stream OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="main-chat">
        <div className="chat-header">
          {currentAgent?.icon} {currentAgent?.name}
        </div>

        <div className="messages-container">
          {messages.map((message) => (
            <MessageComponent
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))}

          {isThinking && <ThinkingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isThinking}
          placeholder={`${currentAgent?.name}に質問する...`}
        />
      </div>

      {/* 営業ダッシュボード */}
      {showSalesDashboard && (
        <SalesDashboard onClose={() => setShowSalesDashboard(false)} />
      )}
    </div>
  );
};

export default AIAgentService;
