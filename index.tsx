import React, { useState, useRef, useEffect } from 'react';
import SalesDashboard from './src/SalesDashboard';
import MessageComponent from './src/components/Message';
import AgentCard from './src/components/AgentCard';
import ThinkingIndicator from './src/components/ThinkingIndicator';
import ChatInput from './src/components/ChatInput';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    setAgentChats((prev) => ({
      ...prev,
      [selectedAgent]: [...prev[selectedAgent], userMessage],
    }));

    setInputValue('');
    setIsThinking(true);

    try {
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

        setAgentChats((prev) => ({
          ...prev,
          [selectedAgent]: [...prev[selectedAgent], aiMessage],
        }));
      } else {
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
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
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>総メッセージ: {Object.values(agentChats).reduce((sum, chat) => sum + chat.length, 0)}</span>
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
