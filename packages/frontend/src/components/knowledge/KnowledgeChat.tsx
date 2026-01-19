import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:8000';

interface ActionItem {
  owner?: string;
  task: string;
  deadline?: string;
}

interface NextAction {
  action: string;
  date?: string;
}

interface AIExtraction {
  summary: string;
  decisions: string[];
  action_items: ActionItem[];
  next_actions: NextAction[];
  meeting_date?: string;
  related_projects: string[];
}

interface CompanyMemo {
  id: number;
  company_name: string;
  original_text: string;
  summary?: string;
  decisions?: string[];
  action_items?: ActionItem[];
  next_actions?: NextAction[];
  meeting_date?: string;
  related_projects?: string[];
  memo_type: string;
  registered_user_name?: string;
  created_at: string;
  updated_at?: string;
}

interface SimpleUser {
  id: number;
  name: string;
  department?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  extraction?: AIExtraction;
  memos?: CompanyMemo[];
}

interface KnowledgeChatProps {
  onClose?: () => void;
}

const KnowledgeChat: React.FC<KnowledgeChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: '会社ナレッジベースです。議事録や会社情報を保存・検索できます。\n\n使い方:\n- テキストを貼り付けて「保存」すると、AIが自動で内容を整理します\n- 会社名やキーワードで「検索」すると、過去の情報を参照できます',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newUserName, setNewUserName] = useState('');
  const [showUserInput, setShowUserInput] = useState(false);
  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'list'>('chat');
  const [memoList, setMemoList] = useState<CompanyMemo[]>([]);
  const [previewTab, setPreviewTab] = useState<'formatted' | 'original'>('formatted');
  const [selectedMemo, setSelectedMemo] = useState<CompanyMemo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ユーザー一覧取得
  useEffect(() => {
    fetchUsers();
  }, []);

  // メッセージ追加時にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0 && !selectedUser) {
          setSelectedUser(data[0].name);
        }
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const fetchMemos = async (query?: string) => {
    try {
      const url = query
        ? `${API_BASE_URL}/api/knowledge/memos?company_name=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/knowledge/memos`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemoList(data);
      }
    } catch (e) {
      console.error('Failed to fetch memos:', e);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim() }),
      });
      if (res.ok) {
        await fetchUsers();
        setSelectedUser(newUserName.trim());
        setNewUserName('');
        setShowUserInput(false);
      }
    } catch (e) {
      console.error('Failed to add user:', e);
    }
  };

  const handleExtract = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: '',
          original_text: text,
          registered_user_name: selectedUser,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtraction(data);
        setShowSaveDialog(true);
      }
    } catch (e) {
      console.error('Extract failed:', e);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!companyName.trim() || !extraction) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          original_text: inputValue,
          memo_type: 'meeting_note',
          registered_user_name: selectedUser,
        }),
      });
      if (res.ok) {
        const savedMemo = await res.json();
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `「${companyName}」の情報を保存しました。`,
        }]);
        setShowSaveDialog(false);
        setExtraction(null);
        setCompanyName('');
        setInputValue('');
        fetchMemos();
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
    setIsLoading(false);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 }),
      });
      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.length > 0
            ? `${data.length}件の情報が見つかりました。`
            : '該当する情報が見つかりませんでした。',
          memos: data,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      console.error('Search failed:', e);
    }
    setIsLoading(false);
    setInputValue('');
  };

  const handleDeleteMemo = async (memoId: number) => {
    if (!confirm('このメモを削除しますか？')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/memos/${memoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMemos(searchQuery);
        setSelectedMemo(null);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // 長文は保存候補として扱う
    if (inputValue.split('\n').length >= 3 || inputValue.length > 200) {
      handleExtract(inputValue);
    } else {
      handleSearch(inputValue);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="knowledge-container">
      {/* ヘッダー */}
      <div className="knowledge-header">
        <div className="knowledge-tabs">
          <button
            className={`knowledge-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            チャット
          </button>
          <button
            className={`knowledge-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => { setActiveTab('list'); fetchMemos(); }}
          >
            一覧
          </button>
        </div>
        <div className="knowledge-user-selector">
          {showUserInput ? (
            <div className="user-input-row">
              <input
                type="text"
                placeholder="ユーザー名"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
              />
              <button onClick={handleAddUser}>追加</button>
              <button onClick={() => setShowUserInput(false)}>キャンセル</button>
            </div>
          ) : (
            <div className="user-select-row">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
              <button onClick={() => setShowUserInput(true)} title="ユーザー追加">+</button>
            </div>
          )}
        </div>
      </div>

      {/* チャットタブ */}
      {activeTab === 'chat' && (
        <div className="knowledge-chat">
          <div className="knowledge-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`knowledge-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '📚' : '⚙️'}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                  {msg.memos && msg.memos.length > 0 && (
                    <div className="search-results">
                      {msg.memos.map(memo => (
                        <div
                          key={memo.id}
                          className="memo-card"
                          onClick={() => setSelectedMemo(memo)}
                        >
                          <div className="memo-card-header">
                            <span className="company-name">{memo.company_name}</span>
                            <span className="memo-date">{formatDate(memo.created_at)}</span>
                          </div>
                          <div className="memo-card-summary">
                            {memo.summary || memo.original_text.substring(0, 100)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="knowledge-message assistant">
                <div className="message-avatar">📚</div>
                <div className="message-content">
                  <div className="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="knowledge-input-area">
            <div className="action-buttons">
              <button
                className="action-btn save-btn"
                onClick={() => inputValue.trim() && handleExtract(inputValue)}
                disabled={!inputValue.trim()}
                title="テキストを解析して保存"
              >
                💾 保存
              </button>
              <button
                className="action-btn search-btn"
                onClick={() => handleSearch(inputValue)}
                disabled={!inputValue.trim()}
                title="キーワードで検索"
              >
                🔍 検索
              </button>
            </div>
            <textarea
              className="knowledge-textarea"
              placeholder="議事録を貼り付けるか、会社名・キーワードを入力..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={3}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              送信
            </button>
          </div>
        </div>
      )}

      {/* 一覧タブ */}
      {activeTab === 'list' && (
        <div className="knowledge-list">
          <div className="list-search">
            <input
              type="text"
              placeholder="会社名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMemos(searchQuery)}
            />
            <button onClick={() => fetchMemos(searchQuery)}>検索</button>
            <button onClick={() => { setSearchQuery(''); fetchMemos(); }}>クリア</button>
          </div>
          <div className="memo-list">
            {memoList.map(memo => (
              <div
                key={memo.id}
                className={`memo-item ${selectedMemo?.id === memo.id ? 'selected' : ''}`}
                onClick={() => setSelectedMemo(memo)}
              >
                <div className="memo-item-header">
                  <span className="company-name">{memo.company_name}</span>
                  <span className="memo-date">{formatDate(memo.created_at)}</span>
                </div>
                <div className="memo-item-summary">
                  {memo.summary || memo.original_text.substring(0, 80)}...
                </div>
                <div className="memo-item-meta">
                  <span>{memo.registered_user_name || '不明'}</span>
                </div>
              </div>
            ))}
            {memoList.length === 0 && (
              <div className="empty-list">保存されたメモはありません</div>
            )}
          </div>
        </div>
      )}

      {/* 保存ダイアログ */}
      {showSaveDialog && extraction && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>内容を確認して保存</h3>
              <button className="close-btn" onClick={() => setShowSaveDialog(false)}>×</button>
            </div>

            <div className="dialog-body">
              <div className="company-input">
                <label>会社名 *</label>
                <input
                  type="text"
                  placeholder="会社名を入力"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="preview-tabs">
                <button
                  className={previewTab === 'formatted' ? 'active' : ''}
                  onClick={() => setPreviewTab('formatted')}
                >
                  AI整形済み
                </button>
                <button
                  className={previewTab === 'original' ? 'active' : ''}
                  onClick={() => setPreviewTab('original')}
                >
                  原文
                </button>
              </div>

              {previewTab === 'formatted' ? (
                <div className="extraction-preview">
                  <div className="preview-section">
                    <h4>要約</h4>
                    <p>{extraction.summary || '（なし）'}</p>
                  </div>
                  {extraction.decisions.length > 0 && (
                    <div className="preview-section">
                      <h4>決定事項</h4>
                      <ul>
                        {extraction.decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {extraction.action_items.length > 0 && (
                    <div className="preview-section">
                      <h4>宿題</h4>
                      <ul>
                        {extraction.action_items.map((a, i) => (
                          <li key={i}>
                            {a.owner && <span className="owner">[{a.owner}]</span>} {a.task}
                            {a.deadline && <span className="deadline">（{a.deadline}）</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extraction.next_actions.length > 0 && (
                    <div className="preview-section">
                      <h4>次回アクション</h4>
                      <ul>
                        {extraction.next_actions.map((n, i) => (
                          <li key={i}>{n.action} {n.date && `(${n.date})`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extraction.meeting_date && (
                    <div className="preview-section">
                      <h4>日付</h4>
                      <p>{extraction.meeting_date}</p>
                    </div>
                  )}
                  {extraction.related_projects.length > 0 && (
                    <div className="preview-section">
                      <h4>関連案件</h4>
                      <p>{extraction.related_projects.join(', ')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="original-text">
                  <pre>{inputValue}</pre>
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button className="cancel-btn" onClick={() => setShowSaveDialog(false)}>
                キャンセル
              </button>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={!companyName.trim() || isLoading}
              >
                {isLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メモ詳細モーダル */}
      {selectedMemo && (
        <div className="modal-overlay" onClick={() => setSelectedMemo(null)}>
          <div className="memo-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{selectedMemo.company_name}</h3>
              <button className="close-btn" onClick={() => setSelectedMemo(null)}>×</button>
            </div>

            <div className="dialog-body">
              <div className="preview-tabs">
                <button
                  className={previewTab === 'formatted' ? 'active' : ''}
                  onClick={() => setPreviewTab('formatted')}
                >
                  AI整形済み
                </button>
                <button
                  className={previewTab === 'original' ? 'active' : ''}
                  onClick={() => setPreviewTab('original')}
                >
                  原文
                </button>
              </div>

              {previewTab === 'formatted' ? (
                <div className="extraction-preview">
                  <div className="preview-section">
                    <h4>要約</h4>
                    <p>{selectedMemo.summary || '（なし）'}</p>
                  </div>
                  {selectedMemo.decisions && selectedMemo.decisions.length > 0 && (
                    <div className="preview-section">
                      <h4>決定事項</h4>
                      <ul>
                        {selectedMemo.decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {selectedMemo.action_items && selectedMemo.action_items.length > 0 && (
                    <div className="preview-section">
                      <h4>宿題</h4>
                      <ul>
                        {selectedMemo.action_items.map((a: any, i: number) => (
                          <li key={i}>
                            {a.owner && <span className="owner">[{a.owner}]</span>} {a.task}
                            {a.deadline && <span className="deadline">（{a.deadline}）</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedMemo.next_actions && selectedMemo.next_actions.length > 0 && (
                    <div className="preview-section">
                      <h4>次回アクション</h4>
                      <ul>
                        {selectedMemo.next_actions.map((n: any, i: number) => (
                          <li key={i}>{n.action} {n.date && `(${n.date})`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedMemo.meeting_date && (
                    <div className="preview-section">
                      <h4>日付</h4>
                      <p>{selectedMemo.meeting_date}</p>
                    </div>
                  )}
                  {selectedMemo.related_projects && selectedMemo.related_projects.length > 0 && (
                    <div className="preview-section">
                      <h4>関連案件</h4>
                      <p>{selectedMemo.related_projects.join(', ')}</p>
                    </div>
                  )}
                  <div className="preview-section meta">
                    <p>登録者: {selectedMemo.registered_user_name || '不明'}</p>
                    <p>登録日時: {formatDate(selectedMemo.created_at)}</p>
                  </div>
                </div>
              ) : (
                <div className="original-text">
                  <pre>{selectedMemo.original_text}</pre>
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <button
                className="delete-btn"
                onClick={() => handleDeleteMemo(selectedMemo.id)}
              >
                削除
              </button>
              <button className="cancel-btn" onClick={() => setSelectedMemo(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeChat;
