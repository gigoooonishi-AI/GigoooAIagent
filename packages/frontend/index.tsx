import React, { useState, useRef, useEffect, useCallback } from 'react';
import SalesDashboard from './src/SalesDashboard';
import MessageComponent from './src/components/Message';
import ThinkingIndicator from './src/components/ThinkingIndicator';
import ChatInput from './src/components/ChatInput';
import KnowledgeChat from './src/components/knowledge/KnowledgeChat';

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
    knowledge: '会社ナレッジベースです。議事録や会社情報を保存・検索できます。テキストを貼り付けると自動で内容を整理します。',
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
    { id: 'knowledge', name: '会社ナレッジベース', description: '議事録・会社情報の保存・検索', icon: '📚', status: 'idle' },
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
    knowledge: [
      {
        id: '7',
        role: 'system',
        content: '会社ナレッジベースです。議事録や会社情報を保存・検索できます。テキストを貼り付けると自動で内容を整理します。',
        timestamp: new Date(),
      },
    ],
  });

  const [inputValue, setInputValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('analysis');
  const [isThinking, setIsThinking] = useState(false);
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'chat'>('dashboard');  // 表示モード
  const [showSidebar, setShowSidebar] = useState(false);  // サイドバー表示
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
  const [spreadsheetContext, setSpreadsheetContext] = useState<{ data: Record<string, unknown>[]; columns: string[]; sheetName: string; importedId?: number; isFile?: boolean } | null>(null);  // スプレッドシートコンテキスト
  const [showSpreadsheetImport, setShowSpreadsheetImport] = useState(false);  // スプレッドシートインポートダイアログ
  const [spreadsheetImportUrl, setSpreadsheetImportUrl] = useState('');  // インポートURL
  const [spreadsheetImportLoading, setSpreadsheetImportLoading] = useState(false);  // インポート中
  const [spreadsheetImportError, setSpreadsheetImportError] = useState('');  // エラーメッセージ
  const [spreadsheetDuplicateInfo, setSpreadsheetDuplicateInfo] = useState<{ isDuplicate: boolean; existingId?: number; lastSynced?: string } | null>(null);  // 重複情報
  const [importMode, setImportMode] = useState<'url' | 'file'>('file');  // インポートモード（デフォルトをファイルに）
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);  // 選択されたExcelファイル
  const [isDragOver, setIsDragOver] = useState(false);  // ドラッグオーバー状態
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  // スプレッドシートの自動更新
  useEffect(() => {
    if (!spreadsheetContext?.importedId) return;

    // 30分ごとに自動更新
    const intervalId = setInterval(async () => {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/spreadsheet/refresh/${spreadsheetContext.importedId}`, {
          method: 'POST'
        });
        const refreshResult = await refreshRes.json();

        if (refreshResult.success) {
          // 更新されたデータを取得
          const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${spreadsheetContext.importedId}`);
          const dataResult = await dataRes.json();

          if (dataResult.success) {
            setSpreadsheetContext(prev => prev ? {
              ...prev,
              data: dataResult.data,
              columns: dataResult.columns
            } : null);
            console.log('Spreadsheet auto-refreshed:', dataResult.total_rows, 'rows');
          }
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 30 * 60 * 1000); // 30分

    return () => clearInterval(intervalId);
  }, [spreadsheetContext?.importedId]);

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

  // スプレッドシート/Excelファイルかどうか判定
  const isSpreadsheetFile = (file: File): boolean => {
    const spreadsheetExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];
    const filename = file.name.toLowerCase();
    return spreadsheetExtensions.some(ext => filename.endsWith(ext));
  };

  // Google SpreadsheetのURLかどうか判定
  const isGoogleSpreadsheetUrl = (text: string): boolean => {
    return /docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/.test(text);
  };

  // Google SpreadsheetのURLを抽出
  const extractGoogleSpreadsheetUrl = (text: string): string | null => {
    const match = text.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+[^\s]*/);
    return match ? match[0] : null;
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

  // スプレッドシートURLからDBにインポート
  const importSpreadsheetUrlToDb = async (url: string): Promise<{ success: boolean; id?: number; data?: Record<string, unknown>[]; columns?: string[]; sheetName?: string; isDuplicate?: boolean; existingId?: number; error?: string }> => {
    try {
      // 重複チェック
      const checkRes = await fetch(`${API_BASE_URL}/api/spreadsheet/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const checkResult = await checkRes.json();

      if (checkResult.is_duplicate) {
        // 既存データを取得
        const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${checkResult.existing_id}`);
        const dataResult = await dataRes.json();

        if (dataResult.success) {
          return {
            success: true,
            isDuplicate: true,
            existingId: checkResult.existing_id,
            id: dataResult.id,
            data: dataResult.data,
            columns: dataResult.columns,
            sheetName: dataResult.sheet_name
          };
        }
        return { success: false, isDuplicate: true, existingId: checkResult.existing_id };
      }

      // 新規インポート
      const importRes = await fetch(`${API_BASE_URL}/api/spreadsheet/import-to-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          auto_refresh: true,
          refresh_interval_minutes: 30
        })
      });
      const importResult = await importRes.json();

      if (importResult.is_duplicate) {
        const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${importResult.existing_id}`);
        const dataResult = await dataRes.json();
        if (dataResult.success) {
          return {
            success: true,
            isDuplicate: true,
            existingId: importResult.existing_id,
            id: dataResult.id,
            data: dataResult.data,
            columns: dataResult.columns,
            sheetName: dataResult.sheet_name
          };
        }
      }

      if (!importResult.success) {
        return { success: false, error: importResult.detail };
      }

      // インポート成功 - 保存されたデータを取得
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${importResult.id}`);
      const dataResult = await dataRes.json();

      if (dataResult.success) {
        return {
          success: true,
          id: dataResult.id,
          data: dataResult.data,
          columns: dataResult.columns,
          sheetName: dataResult.sheet_name
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Spreadsheet URL import error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // スプレッドシートファイルをDBにインポート
  const importSpreadsheetFileToDb = async (file: File): Promise<{ success: boolean; id?: number; data?: Record<string, unknown>[]; columns?: string[]; sheetName?: string; isDuplicate?: boolean; existingId?: number }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${API_BASE_URL}/api/spreadsheet/upload-excel`, {
        method: 'POST',
        body: formData
      });
      const uploadResult = await uploadRes.json();

      if (uploadResult.is_duplicate) {
        // 既存データを取得
        const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${uploadResult.existing_id}`);
        const dataResult = await dataRes.json();

        if (dataResult.success) {
          return {
            success: true,
            isDuplicate: true,
            existingId: uploadResult.existing_id,
            id: dataResult.id,
            data: dataResult.data,
            columns: dataResult.columns,
            sheetName: dataResult.sheet_name
          };
        }
        return { success: false, isDuplicate: true, existingId: uploadResult.existing_id };
      }

      if (!uploadResult.success) {
        console.error('Upload failed:', uploadResult.detail);
        return { success: false };
      }

      // インポート成功 - 保存されたデータを取得
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${uploadResult.id}`);
      const dataResult = await dataRes.json();

      if (dataResult.success) {
        return {
          success: true,
          id: dataResult.id,
          data: dataResult.data,
          columns: dataResult.columns,
          sheetName: dataResult.sheet_name
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Spreadsheet import error:', error);
      return { success: false };
    }
  };

  // ファイル選択ハンドラー
  const handleFileSelect = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const spreadsheetFiles = files.filter(file => isSpreadsheetFile(file));
    const otherDocFiles = files.filter(file => isDocumentFile(file) && !isSpreadsheetFile(file));

    // 画像をBase64に変換
    if (imageFiles.length > 0) {
      const base64Images = await Promise.all(
        imageFiles.map(file => fileToBase64(file))
      );
      setSelectedImages(prev => [...prev, ...base64Images]);
    }

    // スプレッドシート/Excelファイルをデータベースにインポート
    if (spreadsheetFiles.length > 0) {
      setIsParsingDoc(true);

      // 最初のファイルのみ処理（複数ファイルの場合は最初の1つ）
      const file = spreadsheetFiles[0];
      const result = await importSpreadsheetFileToDb(file);

      if (result.success && result.data && result.columns && result.sheetName) {
        // スプレッドシートコンテキストに設定
        setSpreadsheetContext({
          data: result.data,
          columns: result.columns,
          sheetName: result.sheetName,
          importedId: result.id,
          isFile: true
        });

        // ドキュメント解析結果としても追加（LLMへの送信用）
        const parsedDoc: ParsedDocument = {
          filename: file.name,
          content: `【${file.name}】がデータベースにインポートされました（${result.data.length}件のデータ）`
        };
        setParsedDocuments(prev => [...prev, parsedDoc]);
      } else {
        // インポート失敗時は従来の解析方法にフォールバック
        const parsedDoc = await parseDocumentFile(file);
        if (parsedDoc) {
          setParsedDocuments(prev => [...prev, parsedDoc]);
        }
      }

      setIsParsingDoc(false);
    }

    // その他のドキュメントファイル（Word等）を解析
    if (otherDocFiles.length > 0) {
      setIsParsingDoc(true);
      const parsedDocs = await Promise.all(
        otherDocFiles.map(file => parseDocumentFile(file))
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

  // スプレッドシートデータをチャットに送信
  const handleSpreadsheetToChat = (data: Record<string, unknown>[], columns: string[], sheetName: string) => {
    setSpreadsheetContext({ data, columns, sheetName });
    setShowSalesDashboard(false);
    // 現在のエージェントを維持（全エージェントでスプレッドシートデータを使用可能）
  };

  // スプレッドシートコンテキストをクリア
  const clearSpreadsheetContext = () => {
    setSpreadsheetContext(null);
  };

  // スプレッドシートをインポート
  const handleImportSpreadsheet = async () => {
    if (!spreadsheetImportUrl.trim()) return;

    setSpreadsheetImportLoading(true);
    setSpreadsheetImportError('');
    setSpreadsheetDuplicateInfo(null);

    try {
      // まず重複チェック
      const checkRes = await fetch(`${API_BASE_URL}/api/spreadsheet/check-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: spreadsheetImportUrl })
      });
      const checkResult = await checkRes.json();

      if (checkResult.is_duplicate) {
        // 既にインポート済み - 既存データを使用
        setSpreadsheetDuplicateInfo({
          isDuplicate: true,
          existingId: checkResult.existing_id,
          lastSynced: checkResult.last_synced_at
        });
        setSpreadsheetImportError('このスプレッドシートは既にインポートされています');
        setSpreadsheetImportLoading(false);
        return;
      }

      // 新規インポート - DBに保存
      const importRes = await fetch(`${API_BASE_URL}/api/spreadsheet/import-to-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: spreadsheetImportUrl,
          auto_refresh: true,
          refresh_interval_minutes: 30
        })
      });
      const importResult = await importRes.json();

      if (importResult.is_duplicate) {
        // 競合状態で重複が発生した場合
        setSpreadsheetDuplicateInfo({
          isDuplicate: true,
          existingId: importResult.existing_id,
          lastSynced: importResult.last_synced_at
        });
        setSpreadsheetImportError('このスプレッドシートは既にインポートされています');
        setSpreadsheetImportLoading(false);
        return;
      }

      if (!importResult.success) {
        throw new Error(importResult.detail || 'インポートに失敗しました');
      }

      // インポート成功 - 保存されたデータを取得
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${importResult.id}`);
      const dataResult = await dataRes.json();

      if (!dataResult.success) {
        throw new Error('データの取得に失敗しました');
      }

      // コンテキストに設定
      setSpreadsheetContext({
        data: dataResult.data,
        columns: dataResult.columns,
        sheetName: dataResult.sheet_name,
        importedId: dataResult.id
      });

      // ダイアログを閉じる
      setShowSpreadsheetImport(false);
      setSpreadsheetImportUrl('');

    } catch (error) {
      setSpreadsheetImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setSpreadsheetImportLoading(false);
    }
  };

  // 既存のインポート済みスプレッドシートを使用
  const handleUseExistingSpreadsheet = async () => {
    if (!spreadsheetDuplicateInfo?.existingId) return;

    setSpreadsheetImportLoading(true);
    try {
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${spreadsheetDuplicateInfo.existingId}`);
      const dataResult = await dataRes.json();

      if (!dataResult.success) {
        throw new Error('データの取得に失敗しました');
      }

      setSpreadsheetContext({
        data: dataResult.data,
        columns: dataResult.columns,
        sheetName: dataResult.sheet_name,
        importedId: dataResult.id
      });

      // ダイアログを閉じる
      setShowSpreadsheetImport(false);
      setSpreadsheetImportUrl('');
      setSpreadsheetDuplicateInfo(null);
      setSpreadsheetImportError('');
    } catch (error) {
      setSpreadsheetImportError(error instanceof Error ? error.message : 'データの読み込みに失敗しました');
    } finally {
      setSpreadsheetImportLoading(false);
    }
  };

  // スプレッドシートデータを更新
  const handleRefreshSpreadsheet = async () => {
    if (!spreadsheetContext?.importedId) return;

    setSpreadsheetImportLoading(true);
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/api/spreadsheet/refresh/${spreadsheetContext.importedId}`, {
        method: 'POST'
      });
      const refreshResult = await refreshRes.json();

      if (!refreshResult.success) {
        throw new Error(refreshResult.detail || '更新に失敗しました');
      }

      // 更新されたデータを取得
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${spreadsheetContext.importedId}`);
      const dataResult = await dataRes.json();

      if (dataResult.success) {
        setSpreadsheetContext({
          data: dataResult.data,
          columns: dataResult.columns,
          sheetName: dataResult.sheet_name,
          importedId: dataResult.id
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setSpreadsheetImportLoading(false);
    }
  };

  // Excelファイルをアップロードしてインポート
  const handleImportExcelFile = async () => {
    if (!selectedExcelFile) return;

    setSpreadsheetImportLoading(true);
    setSpreadsheetImportError('');
    setSpreadsheetDuplicateInfo(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedExcelFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/spreadsheet/upload-excel`, {
        method: 'POST',
        body: formData
      });
      const uploadResult = await uploadRes.json();

      if (uploadResult.is_duplicate) {
        // 既にインポート済み
        setSpreadsheetDuplicateInfo({
          isDuplicate: true,
          existingId: uploadResult.existing_id,
          lastSynced: uploadResult.last_synced_at
        });
        setSpreadsheetImportError('このファイルは既にインポートされています');
        setSpreadsheetImportLoading(false);
        return;
      }

      if (!uploadResult.success) {
        throw new Error(uploadResult.detail || 'インポートに失敗しました');
      }

      // インポート成功 - 保存されたデータを取得
      const dataRes = await fetch(`${API_BASE_URL}/api/spreadsheet/imported/${uploadResult.id}`);
      const dataResult = await dataRes.json();

      if (!dataResult.success) {
        throw new Error('データの取得に失敗しました');
      }

      // コンテキストに設定
      setSpreadsheetContext({
        data: dataResult.data,
        columns: dataResult.columns,
        sheetName: dataResult.sheet_name,
        importedId: dataResult.id,
        isFile: true
      });

      // ダイアログを閉じる
      setShowSpreadsheetImport(false);
      setSelectedExcelFile(null);
      setSpreadsheetImportError('');

    } catch (error) {
      setSpreadsheetImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setSpreadsheetImportLoading(false);
    }
  };

  // Excelファイル選択ハンドラー
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedExcelFile(file);
      setSpreadsheetImportError('');
      setSpreadsheetDuplicateInfo(null);
    }
  };

  // ドラッグ＆ドロップ ハンドラー
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // ドロップゾーンから出た場合のみ状態を更新
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOverChat = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // ファイルを収集
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    // ファイルがあれば処理
    if (files.length > 0) {
      await handleFileSelect(files);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedImages.length === 0 && parsedDocuments.length === 0) return;

    // インポートされたスプレッドシートデータを保持する変数
    let importedSpreadsheetData: { data: Record<string, unknown>[]; columns: string[]; sheetName: string; importedId?: number } | null = null;

    // Google Spreadsheet URLが含まれているかチェック
    const spreadsheetUrl = extractGoogleSpreadsheetUrl(inputValue);
    if (spreadsheetUrl && !spreadsheetContext) {
      setIsThinking(true);

      const result = await importSpreadsheetUrlToDb(spreadsheetUrl);

      if (result.success && result.data && result.columns && result.sheetName) {
        // インポートされたデータを変数に保持
        importedSpreadsheetData = {
          data: result.data,
          columns: result.columns,
          sheetName: result.sheetName,
          importedId: result.id
        };

        // スプレッドシートコンテキストに設定
        setSpreadsheetContext({
          data: result.data,
          columns: result.columns,
          sheetName: result.sheetName,
          importedId: result.id,
          isFile: false
        });
      }

      setIsThinking(false);
    }

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

    // 表示用コンテンツ（スプレッドシートデータは含めない）
    const displayContent = documentContentText
      ? `${messageContent}\n\n---\n${documentContentText}`
      : messageContent;

    // 使用するスプレッドシートデータ（新規インポート分 or 既存コンテキスト）
    const activeSpreadsheetData = importedSpreadsheetData || spreadsheetContext;

    // API送信用コンテンツ（スプレッドシートデータを含める - 全エージェント対応）
    let apiContent = displayContent;
    if (activeSpreadsheetData) {
      const dataJson = JSON.stringify(activeSpreadsheetData.data, null, 2);
      const spreadsheetContextText = `\n\n【スプレッドシートデータ（${activeSpreadsheetData.sheetName}）】\n` +
        `カラム: ${activeSpreadsheetData.columns.join(', ')}\n` +
        `データ件数: ${activeSpreadsheetData.data.length}件\n` +
        `データ:\n${dataJson}`;
      apiContent = displayContent + spreadsheetContextText;
    }

    // 表示用メッセージ（チャットに表示される）
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      documentContent: documentContentText || undefined,
    };

    // API送信用メッセージ（LLMに送信される）
    const apiMessage: Message = {
      ...userMessage,
      content: apiContent,
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
      sendMessageWebSocket(apiMessage);
    } else {
      await sendMessageREST(apiMessage);
    }
  };

  const currentAgent = agents.find(a => a.id === selectedAgent);

  // チャットが開始されているかどうか（ユーザーメッセージがあるか）
  const hasStartedChat = messages.some(m => m.role === 'user');

  // サジェスションボタンの定義（各項目に質問プロンプトを追加）
  const suggestions = [
    { id: 'leads', icon: '👥', text: '見込み客', prompt: '見込み客の現在の状況を教えてください。優先度の高いリードはありますか？' },
    { id: 'progress', icon: '📊', text: '進捗管理', prompt: '現在の案件の進捗状況を確認したいです。ボトルネックになっている案件はありますか？' },
    { id: 'inquiry', icon: '💬', text: '問い合わせ', prompt: '未対応の問い合わせはありますか？対応が必要な案件を教えてください。' },
    { id: 'proposal', icon: '📝', text: '提案書', prompt: '新しい提案書を作成したいです。どのような情報が必要ですか？' },
    { id: 'coach', icon: '🎯', text: '営業コーチ', prompt: '営業活動についてアドバイスをください。成約率を上げるコツはありますか？' },
    { id: 'analysis', icon: '🔍', text: 'スキル検索', prompt: '社内のスキルを検索したいです。どのようなスキルを探していますか？' },
    { id: 'knowledge', icon: '📚', text: 'ナレッジ', prompt: '' },
  ];

  // サジェスションクリック時の処理（エージェント切替 + プロンプトセット）
  const handleSuggestionClick = (agentId: string, prompt?: string) => {
    setSelectedAgent(agentId);
    setCurrentChatId(null);
    setSelectedProjectId(null);
    // プロンプトがあれば入力欄にセット
    if (prompt) {
      setInputValue(prompt);
    }
  };

  // インラインスタイル定義
  const styles = {
    container: {
      height: '100vh',
      backgroundColor: '#0d0d0d',
      color: '#e3e3e3',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
    },
    logo: {
      fontSize: '22px',
      fontWeight: '600',
      letterSpacing: '-0.5px',
      color: '#e3e3e3',
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    headerBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#1f1f1f',
      border: '1px solid #3c4043',
      borderRadius: '20px',
      padding: '10px 18px',
      color: '#e3e3e3',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      marginTop: '-80px',
    },
    greeting: {
      textAlign: 'left' as const,
      width: '100%',
      maxWidth: '768px',
      marginBottom: '32px',
    },
    title: {
      fontSize: '48px',
      fontWeight: '600',
      margin: '0',
      background: 'linear-gradient(90deg, #4285f4, #9b72cb, #d96570)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-1px',
    },
    inputBox: {
      width: '100%',
      maxWidth: '768px',
      background: '#1e1f20',
      borderRadius: '28px',
      padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontSize: '16px',
      color: '#e3e3e3',
    },
    inputActions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputLeftActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    iconBtn: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s',
    },
    toolBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderRadius: '20px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: '#9aa0a6',
      fontSize: '14px',
      transition: 'background 0.2s',
    },
    suggestions: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '12px',
      marginTop: '24px',
      justifyContent: 'center',
      maxWidth: '900px',
    },
    suggestionBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 20px',
      borderRadius: '24px',
      background: '#1e1f20',
      border: '1px solid #3c4043',
      cursor: 'pointer',
      color: '#c4c7c5',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    suggestionBtnActive: {
      background: 'rgba(66, 133, 244, 0.15)',
      borderColor: '#4285f4',
      color: '#8ab4f8',
    },
    chatScreen: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      width: '100%',
      maxWidth: '900px',
      margin: '0 auto',
      marginTop: '0',
      justifyContent: 'flex-start',
      minHeight: 0,
      overflow: 'hidden',
    },
    chatHeader: {
      padding: '12px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      fontSize: '14px',
      color: '#9aa0a6',
    },
    chatInputArea: {
      padding: '16px 0',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    },
    agentBar: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      gap: '8px',
      marginTop: '12px',
    },
    agentLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '6px 12px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      color: '#8e8ea0',
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    agentLabelActive: {
      background: 'rgba(66, 133, 244, 0.15)',
      borderColor: 'rgba(66, 133, 244, 0.4)',
      color: '#8ab4f8',
    },
    // 新しいレイアウト用スタイル
    mainLayout: {
      display: 'flex',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    sidebar: {
      width: '280px',
      background: '#171717',
      borderRight: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden',
    },
    sidebarHeader: {
      padding: '16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sidebarTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#e3e3e3',
    },
    sidebarContent: {
      flex: 1,
      overflow: 'auto',
      padding: '8px',
    },
    historyItem: {
      padding: '12px',
      borderRadius: '8px',
      cursor: 'pointer',
      marginBottom: '4px',
      transition: 'background 0.2s',
    },
    historyItemTitle: {
      fontSize: '13px',
      color: '#e3e3e3',
      marginBottom: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    historyItemMeta: {
      fontSize: '11px',
      color: '#6b7280',
    },
    projectBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    tabBar: {
      display: 'flex',
      gap: '8px',
      padding: '0 24px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    tab: {
      padding: '12px 20px',
      background: 'transparent',
      border: 'none',
      borderBottom: '2px solid transparent',
      color: '#9ca3af',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    tabActive: {
      color: '#e3e3e3',
      borderBottomColor: '#4285f4',
    },
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={styles.logo}>GIGOOO</div>
          {/* タブ切り替え */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                ...styles.tab,
                ...(viewMode === 'dashboard' ? styles.tabActive : {}),
              }}
              onClick={() => setViewMode('dashboard')}
            >
              📊 ダッシュボード
            </button>
            <button
              style={{
                ...styles.tab,
                ...(viewMode === 'chat' ? styles.tabActive : {}),
              }}
              onClick={() => setViewMode('chat')}
            >
              💬 AIチャット
            </button>
          </div>
        </div>
        <div style={styles.headerActions}>
          {hasStartedChat && viewMode === 'chat' && (
            <>
              <button
                style={styles.headerBtn}
                onClick={() => setShowSidebar(!showSidebar)}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2d2e2f';
                  e.currentTarget.style.borderColor = '#5f6368';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#1f1f1f';
                  e.currentTarget.style.borderColor = '#3c4043';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                履歴
              </button>
              <button
                style={styles.headerBtn}
                onClick={handleNewChat}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2d2e2f';
                  e.currentTarget.style.borderColor = '#5f6368';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#1f1f1f';
                  e.currentTarget.style.borderColor = '#3c4043';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新しいチャット
              </button>
              <button
                style={styles.projectBtn}
                onClick={() => handleCreateProject(selectedAgent)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                プロジェクト作成
              </button>
            </>
          )}
        </div>
      </header>

      {/* メインレイアウト */}
      <div style={styles.mainLayout}>
        {/* 左サイドバー（履歴） - チャットモードでhasStartedChatの場合のみ表示 */}
        {viewMode === 'chat' && showSidebar && hasStartedChat && (
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <span style={styles.sidebarTitle}>チャット履歴</span>
              <button
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setShowSidebar(false)}
              >
                ×
              </button>
            </div>
            <div style={styles.sidebarContent}>
              {/* プロジェクト一覧 */}
              {projects.filter(p => p.agentId === selectedAgent).map(project => (
                <div
                  key={project.id}
                  style={{
                    marginBottom: '8px',
                    background: dragOverProjectId === project.id ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                    borderRadius: '8px',
                    transition: 'background 0.2s',
                  }}
                  onDragOver={(e) => handleDragOver(e, project.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, project.id)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      background: selectedProjectId === project.id ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                    }}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      toggleProjectExpand(project.id);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#9ca3af' }}>{expandedProjects[project.id] ? '📂' : '📁'}</span>
                      <span style={{ fontSize: '13px', color: '#e3e3e3' }}>{project.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}
                        onClick={(e) => showProjectRename(project, e)}
                        title="名前変更"
                      >
                        ✏️
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {/* プロジェクト内のチャット */}
                  {expandedProjects[project.id] && (
                    <div style={{ paddingLeft: '24px' }}>
                      {chatHistory
                        .filter(h => h.projectId === project.id && h.agentId === selectedAgent)
                        .map(history => (
                          <div
                            key={history.id}
                            style={{
                              ...styles.historyItem,
                              background: currentChatId === history.id ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                            }}
                            onClick={() => handleLoadHistory(history)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, history.id)}
                            onDragEnd={handleDragEnd}
                            onMouseOver={(e) => {
                              if (currentChatId !== history.id) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (currentChatId !== history.id) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <div style={styles.historyItemTitle}>{history.title}</div>
                            <div style={styles.historyItemMeta}>
                              {new Date(history.updatedAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 整理されていないチャット */}
              <div
                style={{ marginTop: '8px' }}
                onDragOver={(e) => { e.preventDefault(); setDragOverProjectId('unorganized'); }}
                onDragLeave={() => setDragOverProjectId(null)}
                onDrop={handleDropToUnorganized}
              >
                <div style={{ fontSize: '11px', color: '#6b7280', padding: '8px 12px', textTransform: 'uppercase' }}>
                  最近のチャット
                </div>
                {chatHistory
                  .filter(h => !h.projectId && h.agentId === selectedAgent)
                  .slice(0, 20)
                  .map(history => (
                    <div
                      key={history.id}
                      style={{
                        ...styles.historyItem,
                        background: currentChatId === history.id ? 'rgba(66, 133, 244, 0.15)' :
                          (draggedChatId && dragOverProjectId === 'unorganized' ? 'rgba(66, 133, 244, 0.05)' : 'transparent'),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onClick={() => handleLoadHistory(history)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, history.id)}
                      onDragEnd={handleDragEnd}
                      onMouseOver={(e) => {
                        if (currentChatId !== history.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentChatId !== history.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={styles.historyItemTitle}>{history.title}</div>
                        <div style={styles.historyItemMeta}>
                          {new Date(history.updatedAt).toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          opacity: 0.6,
                          padding: '4px',
                        }}
                        onClick={(e) => showDeleteConfirm(history.id, history.title, e)}
                        onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = '#6b7280'; }}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        )}

        {/* メインコンテンツエリア */}
        {viewMode === 'dashboard' ? (
          /* ダッシュボード表示 */
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SalesDashboard
              onClose={() => setViewMode('chat')}
              onSendSpreadsheetToChat={(data, columns, sheetName) => {
                handleSpreadsheetToChat(data, columns, sheetName);
                setViewMode('chat');
              }}
            />
          </div>
        ) : (
          /* チャット表示 */
          <main style={{
            ...(!hasStartedChat && selectedAgent !== 'knowledge' ? styles.main : { ...styles.main, marginTop: '0', justifyContent: 'flex-start', flex: 1, minHeight: 0, overflow: 'hidden' }),
            flex: 1,
          }}>
        {/* 初期画面（チャット未開始時） */}
        {!hasStartedChat && selectedAgent !== 'knowledge' ? (
          <>
            <div style={styles.greeting}>
              <h1 style={styles.title}>Start!!</h1>
            </div>

            {/* 入力ボックス */}
            <div style={styles.inputBox}>
              <div style={styles.inputRow}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <input
                  type="text"
                  placeholder="GIGOOO AIと会話する"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputActions}>
                <div style={styles.inputLeftActions}>
                  <button
                    style={styles.iconBtn}
                    onClick={() => document.getElementById('file-upload')?.click()}
                    onMouseOver={(e) => e.currentTarget.style.background = '#2d2e2f'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <input
                    id="file-upload"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    multiple
                  />
                  <button
                    style={styles.toolBtn}
                    onClick={() => setShowSpreadsheetImport(true)}
                    onMouseOver={(e) => e.currentTarget.style.background = '#2d2e2f'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                    </svg>
                    データ
                  </button>
                </div>
                <button
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: inputValue.trim() ? '#4285f4' : '#3c4043',
                    border: 'none',
                    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                  onClick={() => inputValue.trim() && handleSendMessage()}
                  disabled={!inputValue.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* サジェスションボタン */}
            <div style={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  style={{
                    ...styles.suggestionBtn,
                    ...(selectedAgent === suggestion.id ? styles.suggestionBtnActive : {}),
                  }}
                  onClick={() => handleSuggestionClick(suggestion.id, suggestion.prompt)}
                  onMouseOver={(e) => {
                    if (selectedAgent !== suggestion.id) {
                      e.currentTarget.style.background = '#2d2e2f';
                      e.currentTarget.style.borderColor = '#5f6368';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedAgent !== suggestion.id) {
                      e.currentTarget.style.background = '#1e1f20';
                      e.currentTarget.style.borderColor = '#3c4043';
                    }
                  }}
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* チャット画面 */
          <div
            style={styles.chatScreen}
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOverChat}
            onDragLeave={handleFileDragLeave}
            onDrop={handleDropFiles}
          >
            {/* ドラッグオーバー時のオーバーレイ */}
            {isDragOver && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(66, 133, 244, 0.15)',
                border: '3px dashed #4285f4',
                borderRadius: '8px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#8ab4f8' }}>ファイルをドロップ</div>
                <div style={{ fontSize: '13px', color: '#9aa0a6', marginTop: '8px' }}>Excel, CSV, 画像, Word ファイルに対応</div>
              </div>
            )}

            {selectedAgent === 'knowledge' ? (
              <KnowledgeChat />
            ) : (
              <>
                {/* チャットヘッダー */}
                <div style={styles.chatHeader}>
                  {currentAgent?.icon} {currentAgent?.name}
                </div>

                {/* メッセージエリア */}
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

                {/* スプレッドシートコンテキスト表示 */}
                {spreadsheetContext && (
                  <div className="spreadsheet-context-indicator">
                    <div className="context-info">
                      <span className="context-icon">📊</span>
                      <span className="context-text">
                        スプレッドシート: {spreadsheetContext.sheetName} ({spreadsheetContext.data.length}件)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {spreadsheetContext.importedId && (
                        <button
                          className="clear-context-btn"
                          onClick={handleRefreshSpreadsheet}
                          title="データを更新"
                          disabled={spreadsheetImportLoading}
                        >
                          🔄
                        </button>
                      )}
                      <button className="clear-context-btn" onClick={clearSpreadsheetContext} title="クリア">
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* チャット入力欄 */}
                <div style={styles.chatInputArea}>
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSendMessage}
                    onFileSelect={handleFileSelect}
                    disabled={isThinking || isParsingDoc}
                    placeholder={isParsingDoc ? 'ファイルを解析中...' : spreadsheetContext ? 'スプレッドシートについて質問...' : `${currentAgent?.name}に質問する...`}
                  />

                  {/* エージェント選択ラベル */}
                  <div style={styles.agentBar}>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        style={{
                          ...styles.agentLabel,
                          ...(selectedAgent === suggestion.id ? styles.agentLabelActive : {}),
                        }}
                        onClick={() => handleSuggestionClick(suggestion.id, suggestion.prompt)}
                        title={agents.find(a => a.id === suggestion.id)?.description}
                        onMouseOver={(e) => {
                          if (selectedAgent !== suggestion.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = '#ececf1';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (selectedAgent !== suggestion.id) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.color = '#8e8ea0';
                          }
                        }}
                      >
                        <span>{suggestion.icon}</span>
                        <span>{suggestion.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
          </main>
        )}
      </div>

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

      {/* スプレッドシートインポートモーダル */}
      {showSpreadsheetImport && (
        <div className="delete-confirm-overlay" onClick={() => !spreadsheetImportLoading && setShowSpreadsheetImport(false)}>
          <div className="spreadsheet-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spreadsheet-import-header">
              <span className="spreadsheet-import-icon">📊</span>
              <h3>データをインポート</h3>
            </div>

            {/* タブ切り替え */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid #374151' }}>
              <button
                style={{
                  flex: 1,
                  padding: '10px',
                  background: importMode === 'file' ? '#374151' : 'transparent',
                  border: 'none',
                  borderBottom: importMode === 'file' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: importMode === 'file' ? '#c4b5fd' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: importMode === 'file' ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setImportMode('file');
                  setSpreadsheetImportError('');
                  setSpreadsheetDuplicateInfo(null);
                }}
              >
                📁 Excelファイル
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '10px',
                  background: importMode === 'url' ? '#374151' : 'transparent',
                  border: 'none',
                  borderBottom: importMode === 'url' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: importMode === 'url' ? '#c4b5fd' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: importMode === 'url' ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setImportMode('url');
                  setSpreadsheetImportError('');
                  setSpreadsheetDuplicateInfo(null);
                }}
              >
                🔗 スプレッドシートURL
              </button>
            </div>

            {importMode === 'file' ? (
              <>
                <p className="spreadsheet-import-description">
                  Excel (.xlsx, .xls) または CSV ファイルを選択してください
                </p>
                <div
                  style={{
                    position: 'relative',
                    border: '2px dashed #4b5563',
                    borderRadius: '10px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '12px',
                    background: selectedExcelFile ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedExcelFile ? (
                    <div style={{ color: '#c4b5fd' }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📄</span>
                      <span style={{ fontWeight: '500' }}>{selectedExcelFile.name}</span>
                      <span style={{ display: 'block', fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                        {(selectedExcelFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ) : (
                    <div style={{ color: '#9ca3af' }}>
                      <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📁</span>
                      <span>ファイルを選択</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.xlsm,.csv"
                    onChange={handleExcelFileSelect}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                    disabled={spreadsheetImportLoading}
                  />
                </div>
                <label
                  style={{
                    display: 'block',
                    padding: '10px 16px',
                    background: '#374151',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    fontSize: '13px'
                  }}
                >
                  ファイルを選択
                  <input
                    type="file"
                    accept=".xlsx,.xls,.xlsm,.csv"
                    onChange={handleExcelFileSelect}
                    style={{ display: 'none' }}
                    disabled={spreadsheetImportLoading}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="spreadsheet-import-description">
                  公開設定されたGoogle SpreadsheetのURLを入力してください
                </p>
                <input
                  type="text"
                  className="spreadsheet-import-input"
                  value={spreadsheetImportUrl}
                  onChange={(e) => {
                    setSpreadsheetImportUrl(e.target.value);
                    setSpreadsheetImportError('');
                    setSpreadsheetDuplicateInfo(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !spreadsheetImportLoading) handleImportSpreadsheet();
                    if (e.key === 'Escape' && !spreadsheetImportLoading) setShowSpreadsheetImport(false);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={spreadsheetImportLoading}
                  autoFocus
                />
              </>
            )}

            {spreadsheetImportError && (
              <div className="spreadsheet-import-error">
                <span>⚠️</span> {spreadsheetImportError}
                {spreadsheetDuplicateInfo?.lastSynced && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
                    最終同期: {new Date(spreadsheetDuplicateInfo.lastSynced).toLocaleString('ja-JP')}
                  </span>
                )}
              </div>
            )}
            <div className="spreadsheet-import-buttons">
              <button
                className="spreadsheet-import-cancel"
                onClick={() => {
                  setShowSpreadsheetImport(false);
                  setSpreadsheetImportError('');
                  setSpreadsheetDuplicateInfo(null);
                  setSelectedExcelFile(null);
                  setSpreadsheetImportUrl('');
                }}
                disabled={spreadsheetImportLoading}
              >
                キャンセル
              </button>
              {spreadsheetDuplicateInfo?.isDuplicate ? (
                <button
                  className="spreadsheet-import-confirm"
                  onClick={handleUseExistingSpreadsheet}
                  disabled={spreadsheetImportLoading}
                >
                  {spreadsheetImportLoading ? '読み込み中...' : '既存データを使用'}
                </button>
              ) : importMode === 'file' ? (
                <button
                  className="spreadsheet-import-confirm"
                  onClick={handleImportExcelFile}
                  disabled={!selectedExcelFile || spreadsheetImportLoading}
                >
                  {spreadsheetImportLoading ? '読み込み中...' : 'インポート'}
                </button>
              ) : (
                <button
                  className="spreadsheet-import-confirm"
                  onClick={handleImportSpreadsheet}
                  disabled={!spreadsheetImportUrl.trim() || spreadsheetImportLoading}
                >
                  {spreadsheetImportLoading ? '読み込み中...' : 'インポート'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgentService;
