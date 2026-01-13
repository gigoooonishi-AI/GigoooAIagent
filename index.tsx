import React, { useState, useRef, useEffect } from 'react';
import SalesDashboard from './src/SalesDashboard';
import Button from './src/components/Button';
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <div className="w-80 bg-gray-800 text-white flex flex-col border-r border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-center items-center">
          <img
            src="/assets/gigooo-logo.png"
            alt="GIGOOO"
            className="w-full max-w-[200px] h-auto"
          />
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 tracking-wider">利用可能なエージェント</h3>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              description={agent.description}
              status={agent.status}
              isSelected={selectedAgent === agent.id}
              onClick={() => setSelectedAgent(agent.id)}
            />
          ))}
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase">総メッセージ</span>
            <span className="text-xl font-bold">
              {Object.values(agentChats).reduce((sum, chat) => sum + chat.length, 0)}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase">このチャット</span>
            <span className="text-xl font-bold">{messages.length}</span>
          </div>
        </div>
      </div>

      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h2 className="m-0 text-xl font-semibold text-gray-900">
            {agents.find(a => a.id === selectedAgent)?.name}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="success"
              onClick={() => setShowSalesDashboard(true)}
              title="営業ダッシュボード"
            >
              💼 営業機能
            </Button>
            <Button variant="icon">⚙️</Button>
            <Button variant="icon">📊</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
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
