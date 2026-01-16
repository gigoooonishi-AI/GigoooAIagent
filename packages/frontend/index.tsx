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
  images?: string[];  // Base64エンコードされた画像
  documentContent?: string;  // 解析されたドキュメント内容
}

interface ParsedDocument {
  filename: string;
  content: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'idle' | 'thinking';
}

interface ChatHistory {
  id: string;
  agentId: string;
  projectId?: string;  // プロジェクトに属する場合
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  agentId: string;
  name: string;
  createdAt: Date;
}

// 初期システムメッセージを取得
const getInitialSystemMessage = (agentId: string): Message => {
  const systemMessages: Record<string, string> = {
    analysis: '社内スキル検索です。スキルシートを参照してお答えします。どのようにお手伝いできますか?',
    leads: '見込み客管理エージェントです。リード情報を分析し、優先度判定やネクストアクションを提案します。',
    progress: '進捗管理エージェントです。案件の進捗状況を分析し、ボトルネックの特定や対策を提案します。',
    inquiry: '問い合わせ対応エージェントです。顧客からの質問に対する回答案を作成します。',
    proposal: '提案資料作成エージェントです。顧客ニーズに合わせた提案書を自動生成します。',
    coach: '営業コーチエージェントです。営業活動のアドバイスやベストプラクティスを提供します。',
  };

  return {
    id: Date.now().toString(),
    role: 'system',
    content: systemMessages[agentId] || 'ご質問をどうぞ。',
    timestamp: new Date(),
  };
};

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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);  // Base64画像
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);  // 解析済みドキュメント
  const [isParsingDoc, setIsParsingDoc] = useState(false);  // ドキュメント解析中フラグ
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);  // チャット履歴
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);  // 現在のチャットID
  const [projects, setProjects] = useState<Project[]>([]);  // プロジェクト一覧
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);  // 選択中のプロジェクト
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; historyId: string | null; title: string }>({
    show: false,
    historyId: null,
    title: '',
  });  // 削除確認モーダル
  const [projectRename, setProjectRename] = useState<{ show: boolean; projectId: string | null; name: string }>({
    show: false,
    projectId: null,
    name: '',
  });  // プロジェクト名変更モーダル
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});  // 展開状態
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null);  // ドラッグ中のチャットID
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);  // ドラッグオーバー中のプロジェクトID
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // LocalStorageからチャット履歴とプロジェクトを読み込み
  useEffect(() => {
    // チャット履歴
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // 日付文字列をDateオブジェクトに変換
        const historyWithDates = parsed.map((h: ChatHistory) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          updatedAt: new Date(h.updatedAt),
          messages: h.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setChatHistory(historyWithDates);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }

    // プロジェクト
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        const projectsWithDates = parsed.map((p: Project) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }));
        setProjects(projectsWithDates);
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    }
  }, []);

  // チャット履歴をLocalStorageに保存
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // プロジェクトをLocalStorageに保存
  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  // チャットをデータベースに保存
  const saveToDatabase = useCallback(async (
    sessionId: string,
    agentId: string,
    messages: Message[],
    title?: string,
    projectName?: string
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          agent_id: agentId,
          title: title,
          project_name: projectName,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            attachments: m.images?.map(img => ({
              file_type: 'image',
              content_data: img,
            })) || [],
          })),
        }),
      });

      if (!response.ok) {
        console.error('Failed to save to database');
      }
    } catch (error) {
      console.error('Database save error:', error);
    }
  }, []);

  // 前回のメッセージ数を追跡
  const prevMessageCountRef = useRef<Record<string, number>>({});

  // 現在のチャットを履歴に保存（新しいメッセージが追加された場合のみ）
  useEffect(() => {
    const currentMessages = agentChats[selectedAgent];
    const prevCount = prevMessageCountRef.current[selectedAgent] || 0;
    const currentCount = currentMessages?.length || 0;

    // メッセージ数が増えた場合のみ保存処理を実行
    if (currentCount > prevCount && currentMessages && currentMessages.length > 1) {
      const hasUserMessage = currentMessages.some(m => m.role === 'user');
      if (hasUserMessage) {
        const firstUserMessage = currentMessages.find(m => m.role === 'user');
        const title = firstUserMessage
          ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
          : '新しいチャット';

        // プロジェクト名を取得
        const projectName = selectedProjectId
          ? projects.find(p => p.id === selectedProjectId)?.name
          : undefined;

        if (currentChatId) {
          // 既存のチャットを更新
          setChatHistory(prev => prev.map(h =>
            h.id === currentChatId
              ? { ...h, messages: currentMessages, updatedAt: new Date(), title }
              : h
          ));
          // データベースにも保存
          saveToDatabase(currentChatId, selectedAgent, currentMessages, title, projectName);
        } else {
          // 新しいチャットとして保存
          const newChatId = Date.now().toString();
          setCurrentChatId(newChatId);
          setChatHistory(prev => [{
            id: newChatId,
            agentId: selectedAgent,
            projectId: selectedProjectId || undefined,  // プロジェクトに属する場合
            title,
            messages: currentMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
          }, ...prev].slice(0, 50)); // 最大50件まで保存
          // データベースにも保存
          saveToDatabase(newChatId, selectedAgent, currentMessages, title, projectName);
        }
      }
    }

    // メッセージ数を更新
    prevMessageCountRef.current[selectedAgent] = currentCount;
  }, [agentChats, selectedAgent, currentChatId, selectedProjectId, projects, saveToDatabase]);

  // 新しいチャットを作成
  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const initialMessage = getInitialSystemMessage(selectedAgent);

    // 新しいチャットをすぐに履歴に追加
    const newHistory: ChatHistory = {
      id: newChatId,
      agentId: selectedAgent,
      projectId: selectedProjectId || undefined,
      title: '新しいチャット',
      messages: [initialMessage],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setChatHistory(prev => [newHistory, ...prev].slice(0, 50));
    setCurrentChatId(newChatId);
    setAgentChats(prev => ({
      ...prev,
      [selectedAgent]: [initialMessage],
    }));
    setInputValue('');
    setSelectedImages([]);
    setParsedDocuments([]);

    // メッセージ数を初期化
    prevMessageCountRef.current[selectedAgent] = 1;
  };

  // 履歴からチャットを読み込み
  const handleLoadHistory = (history: ChatHistory) => {
    setCurrentChatId(history.id);
    setSelectedAgent(history.agentId);
    setAgentChats(prev => ({
      ...prev,
      [history.agentId]: history.messages,
    }));
  };

  // 削除確認モーダルを表示
  const showDeleteConfirm = (historyId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, historyId, title });
  };

  // 削除を実行
  const confirmDelete = () => {
    if (deleteConfirm.historyId) {
      setChatHistory(prev => prev.filter(h => h.id !== deleteConfirm.historyId));
      if (currentChatId === deleteConfirm.historyId) {
        setCurrentChatId(null);
      }
      // LocalStorageも更新
      const updatedHistory = chatHistory.filter(h => h.id !== deleteConfirm.historyId);
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    }
    setDeleteConfirm({ show: false, historyId: null, title: '' });
  };

  // 削除をキャンセル
  const cancelDelete = () => {
    setDeleteConfirm({ show: false, historyId: null, title: '' });
  };

  // プロジェクトを作成
  const handleCreateProject = (agentId: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      agentId,
      name: '新しいプロジェクト',
      createdAt: new Date(),
    };
    setProjects(prev => [newProject, ...prev]);
    // 作成後すぐに名前変更モーダルを開く
    setProjectRename({ show: true, projectId: newProject.id, name: newProject.name });
  };

  // プロジェクト名変更モーダルを表示
  const showProjectRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectRename({ show: true, projectId: project.id, name: project.name });
  };

  // プロジェクト名を更新
  const confirmProjectRename = () => {
    if (projectRename.projectId && projectRename.name.trim()) {
      setProjects(prev => prev.map(p =>
        p.id === projectRename.projectId
          ? { ...p, name: projectRename.name.trim() }
          : p
      ));
    }
    setProjectRename({ show: false, projectId: null, name: '' });
  };

  // プロジェクト名変更をキャンセル
  const cancelProjectRename = () => {
    setProjectRename({ show: false, projectId: null, name: '' });
  };

  // プロジェクトを削除
  const handleDeleteProject = (projectId: string) => {
    // プロジェクト内のチャットも解放（プロジェクトIDをnullに）
    setChatHistory(prev => prev.map(h =>
      h.projectId === projectId ? { ...h, projectId: undefined } : h
    ));
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  };

  // プロジェクトの展開/折りたたみを切り替え
  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // チャットをプロジェクトに移動
  const moveToProject = (chatId: string, projectId: string | null) => {
    setChatHistory(prev => prev.map(h =>
      h.id === chatId ? { ...h, projectId: projectId || undefined } : h
    ));
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, chatId: string) => {
    setDraggedChatId(chatId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chatId);
    // ドラッグ中の要素を半透明に
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // ドラッグ終了
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedChatId(null);
    setDragOverProjectId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // プロジェクトへのドラッグオーバー
  const handleDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProjectId(projectId);
  };

  // プロジェクトからのドラッグリーブ
  const handleDragLeave = (e: React.DragEvent) => {
    // 子要素へのドラッグリーブは無視
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverProjectId(null);
  };

  // プロジェクトへのドロップ
  const handleDrop = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('text/plain');
    if (chatId && draggedChatId) {
      moveToProject(chatId, projectId);
      // ドロップ先のプロジェクトを展開
      setExpandedProjects(prev => ({ ...prev, [projectId]: true }));
    }
    setDraggedChatId(null);
    setDragOverProjectId(null);
  };

  // 整理されていないエリアへのドロップ（プロジェクトから外す）
  const handleDropToUnorganized = (e: React.DragEvent) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('text/plain');
    if (chatId && draggedChatId) {
      moveToProject(chatId, null);
    }
    setDraggedChatId(null);
    setDragOverProjectId(null);
  };
  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // ファイルをBase64に変換
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // ドキュメントファイルかどうか判定
  const isDocumentFile = (file: File): boolean => {
    const docExtensions = ['.xlsx', '.xls', '.xlsm', '.docx', '.doc', '.csv'];
    const filename = file.name.toLowerCase();
    return docExtensions.some(ext => filename.endsWith(ext));
  };

  // ドキュメントファイルを解析
  const parseDocumentFile = async (file: File): Promise<ParsedDocument | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/documents/parse`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        return {
          filename: file.name,
          content: data.content,
        };
      }
      return null;
    } catch (error) {
      console.error('Document parse error:', error);
      return null;
    }
  };

  // ファイル選択ハンドラー
  const handleFileSelect = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const docFiles = files.filter(file => isDocumentFile(file));

    // 画像をBase64に変換
    if (imageFiles.length > 0) {
      const base64Images = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
      );
      setSelectedImages(prev => [...prev, ...base64Images]);
    }

    // ドキュメントファイルを解析
    if (docFiles.length > 0) {
      setIsParsingDoc(true);
      const parsedDocs = await Promise.all(
        docFiles.map(file => parseDocumentFile(file))
      );
      const validDocs = parsedDocs.filter((doc): doc is ParsedDocument => doc !== null);
      setParsedDocuments(prev => [...prev, ...validDocs]);
      setIsParsingDoc(false);
    }
  };

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

    const ws = new WebSocket(`${WS_BASE_URL}/api/ws/chat/${agentId}`);

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
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
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
              images: msg.images || [],
            })),
          use_rag: true,
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
          images: msg.images || [],
        })),
    }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedImages.length === 0 && parsedDocuments.length === 0) return;

    // ドキュメント内容をメッセージに含める
    let messageContent = inputValue;
    let documentContentText = '';

    if (parsedDocuments.length > 0) {
      documentContentText = parsedDocuments
        .map(doc => `【添付ファイル: ${doc.filename}】\n${doc.content}`)
        .join('\n\n');

      if (!messageContent.trim()) {
        messageContent = 'ファイルの内容について教えてください。';
      }
    }

    const fullContent = documentContentText
      ? `${messageContent}\n\n---\n${documentContentText}`
      : messageContent;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      timestamp: new Date(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      documentContent: documentContentText || undefined,
    };

    setAgentChats((prev) => ({
      ...prev,
      [selectedAgent]: [...prev[selectedAgent], userMessage],
    }));

    setInputValue('');
    setSelectedImages([]);  // 画像をクリア
    setParsedDocuments([]);  // ドキュメントをクリア
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
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span>+</span>
            <span>新しいチャット</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {/* AIエージェントとチャット履歴（グループ化） */}
          {agents.map((agent) => {
            const agentProjects = projects.filter(p => p.agentId === agent.id);
            const agentHistory = chatHistory.filter(h => h.agentId === agent.id && !h.projectId);
            const isExpanded = selectedAgent === agent.id;

            return (
              <div key={agent.id} className="agent-group">
                {/* エージェントカード */}
                <AgentCard
                  id={agent.id}
                  name={agent.name}
                  icon={agent.icon}
                  status={agent.status}
                  isSelected={selectedAgent === agent.id}
                  onClick={() => {
                    setSelectedAgent(agent.id);
                    setCurrentChatId(null);
                    setSelectedProjectId(null);
                  }}
                />

                {/* このエージェントのプロジェクトとチャット履歴 */}
                {isExpanded && (
                  <div className="agent-history-list">
                    {/* プロジェクト作成ボタン */}
                    <button
                      className="create-project-btn"
                      onClick={() => handleCreateProject(agent.id)}
                    >
                      <span>📁</span>
                      <span>新しいプロジェクト</span>
                    </button>

                    {/* プロジェクト一覧 */}
                    {agentProjects.map((project) => {
                      const projectChats = chatHistory.filter(h => h.projectId === project.id);
                      const isProjectExpanded = expandedProjects[project.id];

                      return (
                        <div
                          key={project.id}
                          className={`project-folder ${dragOverProjectId === project.id ? 'drag-over' : ''}`}
                          onDragOver={(e) => handleDragOver(e, project.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, project.id)}
                        >
                          <div
                            className={`project-header ${selectedProjectId === project.id ? 'active' : ''} ${dragOverProjectId === project.id ? 'drag-over' : ''}`}
                            onClick={() => toggleProjectExpand(project.id)}
                          >
                            <span className="project-icon">{isProjectExpanded ? '📂' : '📁'}</span>
                            <span className="project-name">{project.name}</span>
                            <span className="project-count">{projectChats.length}</span>
                            <div className="project-actions">
                              <button
                                className="project-action-btn"
                                onClick={(e) => showProjectRename(project, e)}
                                title="名前変更"
                              >
                                ✏️
                              </button>
                              <button
                                className="project-action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                }}
                                title="削除"
                              >
                                -
                              </button>
                            </div>
                          </div>

                          {/* プロジェクト内のチャット */}
                          {isProjectExpanded && projectChats.length > 0 && (
                            <div className="project-chats">
                              {projectChats.map((history) => (
                                <div
                                  key={history.id}
                                  className={`chat-history-item nested in-project ${currentChatId === history.id ? 'active' : ''} ${draggedChatId === history.id ? 'dragging' : ''}`}
                                  onClick={() => handleLoadHistory(history)}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, history.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <div className="drag-handle">⋮⋮</div>
                                  <div className="history-info">
                                    <span className="history-title">{history.title}</span>
                                    <span className="history-date">
                                      {history.updatedAt.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                  <button
                                    className="history-delete-btn"
                                    onClick={(e) => showDeleteConfirm(history.id, history.title, e)}
                                    title="削除"
                                  >
                                    -
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* プロジェクトに属さないチャット履歴 */}
                    {agentHistory.length > 0 && (
                      <div
                        className="unorganized-area"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={handleDropToUnorganized}
                      >
                        {agentProjects.length > 0 && (
                          <div className="unorganized-label">整理されていないチャット</div>
                        )}
                        {agentHistory.map((history) => (
                          <div
                            key={history.id}
                            className={`chat-history-item nested ${currentChatId === history.id ? 'active' : ''} ${draggedChatId === history.id ? 'dragging' : ''}`}
                            onClick={() => handleLoadHistory(history)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, history.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="drag-handle">⋮⋮</div>
                            <div className="history-info">
                              <span className="history-title">{history.title}</span>
                              <span className="history-date">
                                {history.updatedAt.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="history-actions">
                              {agentProjects.length > 0 && (
                                <select
                                  className="move-to-project-select"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    moveToProject(history.id, e.target.value || null);
                                    e.target.value = '';
                                  }}
                                  value=""
                                  title="プロジェクトに移動"
                                >
                                  <option value="">📁</option>
                                  {agentProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                className="history-delete-btn"
                                onClick={(e) => showDeleteConfirm(history.id, history.title, e)}
                                title="削除"
                              >
                                -
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          {/* ダッシュボードボタン */}
          <button
            className="dashboard-btn-large"
            onClick={() => setShowSalesDashboard(true)}
            title="営業ダッシュボード"
          >
            <span>📊</span>
            <span>営業ダッシュボード</span>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
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
              images={message.images}
              agentId={selectedAgent}
            />
          ))}

          {isThinking && <ThinkingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onFileSelect={handleFileSelect}
          disabled={isThinking || isParsingDoc}
          placeholder={isParsingDoc ? 'ファイルを解析中...' : `${currentAgent?.name}に質問する...`}
        />
      </div>

      {/* 営業ダッシュボード */}
      {showSalesDashboard && (
        <SalesDashboard onClose={() => setShowSalesDashboard(false)} />
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm.show && (
        <div className="delete-confirm-overlay" onClick={cancelDelete}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">⚠️</div>
            <h3 className="delete-confirm-title">チャット履歴を削除</h3>
            <p className="delete-confirm-message">
              「{deleteConfirm.title}」を削除しますか？<br />
              この操作は取り消せません。
            </p>
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-btn cancel" onClick={cancelDelete}>
                削除しない
              </button>
              <button className="delete-confirm-btn confirm" onClick={confirmDelete}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プロジェクト名変更モーダル */}
      {projectRename.show && (
        <div className="delete-confirm-overlay" onClick={cancelProjectRename}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">📁</div>
            <h3 className="delete-confirm-title">プロジェクト名を変更</h3>
            <input
              type="text"
              className="project-rename-input"
              value={projectRename.name}
              onChange={(e) => setProjectRename(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmProjectRename();
                if (e.key === 'Escape') cancelProjectRename();
              }}
              autoFocus
              placeholder="プロジェクト名"
            />
            <div className="delete-confirm-buttons">
              <button className="delete-confirm-btn cancel" onClick={cancelProjectRename}>
                キャンセル
              </button>
              <button className="delete-confirm-btn confirm" onClick={confirmProjectRename}>
                変更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgentService;
