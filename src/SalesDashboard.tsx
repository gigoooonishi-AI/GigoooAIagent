import React, { useState } from 'react';

interface SalesDashboardProps {
  onClose: () => void;
}

type SalesFeature = 'leads' | 'progress' | 'inquiry' | 'proposal' | 'coach';

const SalesDashboard: React.FC<SalesDashboardProps> = ({ onClose }) => {
  const [activeFeature, setActiveFeature] = useState<SalesFeature>('leads');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // 見込み客管理
  const [leadData, setLeadData] = useState({
    companyName: '',
    contactPerson: '',
    industry: '',
    budget: '',
    timeline: '',
    needs: '',
  });

  // 進捗管理
  const [dealData, setDealData] = useState({
    dealName: '',
    stage: '',
    value: '',
    closeDate: '',
    challenges: '',
  });

  // 問い合わせ対応
  const [inquiryData, setInquiryData] = useState({
    inquiry: '',
    context: '',
  });

  // 提案資料
  const [proposalData, setProposalData] = useState({
    clientName: '',
    clientNeeds: '',
    productName: '',
    productFeatures: '',
  });

  // 営業コーチ
  const [coachData, setCoachData] = useState({
    situation: '',
    question: '',
  });

  const handleLeadsAnalysis = async () => {
    setIsLoading(true);
    setResult('');
    try {
      const response = await fetch('http://localhost:5000/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_data: leadData }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.analysis);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`接続エラー: ${error}`);
    }
    setIsLoading(false);
  };

  const handleProgressTracking = async () => {
    setIsLoading(true);
    setResult('');
    try {
      const response = await fetch('http://localhost:5000/api/sales/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_info: dealData }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.analysis);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`接続エラー: ${error}`);
    }
    setIsLoading(false);
  };

  const handleInquiryResponse = async () => {
    setIsLoading(true);
    setResult('');
    try {
      const response = await fetch('http://localhost:5000/api/sales/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryData),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.response);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`接続エラー: ${error}`);
    }
    setIsLoading(false);
  };

  const handleProposalGeneration = async () => {
    setIsLoading(true);
    setResult('');
    try {
      const response = await fetch('http://localhost:5000/api/sales/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_info: {
            name: proposalData.clientName,
            needs: proposalData.clientNeeds,
          },
          product_info: {
            name: proposalData.productName,
            features: proposalData.productFeatures,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.proposal);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`接続エラー: ${error}`);
    }
    setIsLoading(false);
  };

  const handleCoaching = async () => {
    setIsLoading(true);
    setResult('');
    try {
      const response = await fetch('http://localhost:5000/api/sales/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coachData),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data.advice);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`接続エラー: ${error}`);
    }
    setIsLoading(false);
  };

  const renderFeatureForm = () => {
    switch (activeFeature) {
      case 'leads':
        return (
          <div style={styles.formContainer}>
            <h3 style={styles.formTitle}>見込み客分析</h3>
            <input
              style={styles.input}
              placeholder="会社名"
              value={leadData.companyName}
              onChange={(e) => setLeadData({ ...leadData, companyName: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="担当者名"
              value={leadData.contactPerson}
              onChange={(e) => setLeadData({ ...leadData, contactPerson: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="業界"
              value={leadData.industry}
              onChange={(e) => setLeadData({ ...leadData, industry: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="予算"
              value={leadData.budget}
              onChange={(e) => setLeadData({ ...leadData, budget: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="導入時期"
              value={leadData.timeline}
              onChange={(e) => setLeadData({ ...leadData, timeline: e.target.value })}
            />
            <textarea
              style={styles.textarea}
              placeholder="ニーズ・課題"
              value={leadData.needs}
              onChange={(e) => setLeadData({ ...leadData, needs: e.target.value })}
              rows={3}
            />
            <button style={styles.button} onClick={handleLeadsAnalysis} disabled={isLoading}>
              {isLoading ? '分析中...' : '分析実行'}
            </button>
          </div>
        );

      case 'progress':
        return (
          <div style={styles.formContainer}>
            <h3 style={styles.formTitle}>進捗管理</h3>
            <input
              style={styles.input}
              placeholder="案件名"
              value={dealData.dealName}
              onChange={(e) => setDealData({ ...dealData, dealName: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="現在のステージ"
              value={dealData.stage}
              onChange={(e) => setDealData({ ...dealData, stage: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="案件金額"
              value={dealData.value}
              onChange={(e) => setDealData({ ...dealData, value: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="成約予定日"
              value={dealData.closeDate}
              onChange={(e) => setDealData({ ...dealData, closeDate: e.target.value })}
            />
            <textarea
              style={styles.textarea}
              placeholder="課題・懸念事項"
              value={dealData.challenges}
              onChange={(e) => setDealData({ ...dealData, challenges: e.target.value })}
              rows={3}
            />
            <button style={styles.button} onClick={handleProgressTracking} disabled={isLoading}>
              {isLoading ? '分析中...' : '進捗分析'}
            </button>
          </div>
        );

      case 'inquiry':
        return (
          <div style={styles.formContainer}>
            <h3 style={styles.formTitle}>問い合わせ対応</h3>
            <textarea
              style={styles.textarea}
              placeholder="顧客からの問い合わせ内容"
              value={inquiryData.inquiry}
              onChange={(e) => setInquiryData({ ...inquiryData, inquiry: e.target.value })}
              rows={4}
            />
            <textarea
              style={styles.textarea}
              placeholder="背景情報（任意）"
              value={inquiryData.context}
              onChange={(e) => setInquiryData({ ...inquiryData, context: e.target.value })}
              rows={2}
            />
            <button style={styles.button} onClick={handleInquiryResponse} disabled={isLoading}>
              {isLoading ? '作成中...' : '回答案作成'}
            </button>
          </div>
        );

      case 'proposal':
        return (
          <div style={styles.formContainer}>
            <h3 style={styles.formTitle}>提案資料作成</h3>
            <input
              style={styles.input}
              placeholder="顧客名"
              value={proposalData.clientName}
              onChange={(e) => setProposalData({ ...proposalData, clientName: e.target.value })}
            />
            <textarea
              style={styles.textarea}
              placeholder="顧客のニーズ・課題"
              value={proposalData.clientNeeds}
              onChange={(e) => setProposalData({ ...proposalData, clientNeeds: e.target.value })}
              rows={3}
            />
            <input
              style={styles.input}
              placeholder="提案する製品・サービス名"
              value={proposalData.productName}
              onChange={(e) => setProposalData({ ...proposalData, productName: e.target.value })}
            />
            <textarea
              style={styles.textarea}
              placeholder="製品・サービスの特徴"
              value={proposalData.productFeatures}
              onChange={(e) => setProposalData({ ...proposalData, productFeatures: e.target.value })}
              rows={3}
            />
            <button style={styles.button} onClick={handleProposalGeneration} disabled={isLoading}>
              {isLoading ? '作成中...' : '提案書作成'}
            </button>
          </div>
        );

      case 'coach':
        return (
          <div style={styles.formContainer}>
            <h3 style={styles.formTitle}>営業コーチ</h3>
            <textarea
              style={styles.textarea}
              placeholder="現在の状況を説明してください"
              value={coachData.situation}
              onChange={(e) => setCoachData({ ...coachData, situation: e.target.value })}
              rows={4}
            />
            <textarea
              style={styles.textarea}
              placeholder="具体的な質問（任意）"
              value={coachData.question}
              onChange={(e) => setCoachData({ ...coachData, question: e.target.value })}
              rows={2}
            />
            <button style={styles.button} onClick={handleCoaching} disabled={isLoading}>
              {isLoading ? 'アドバイス中...' : 'アドバイス取得'}
            </button>
          </div>
        );
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>営業ダッシュボード</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.sidebar}>
            <button
              style={{
                ...styles.menuItem,
                ...(activeFeature === 'leads' ? styles.menuItemActive : {}),
              }}
              onClick={() => setActiveFeature('leads')}
            >
              📊 見込み客管理
            </button>
            <button
              style={{
                ...styles.menuItem,
                ...(activeFeature === 'progress' ? styles.menuItemActive : {}),
              }}
              onClick={() => setActiveFeature('progress')}
            >
              📈 進捗管理
            </button>
            <button
              style={{
                ...styles.menuItem,
                ...(activeFeature === 'inquiry' ? styles.menuItemActive : {}),
              }}
              onClick={() => setActiveFeature('inquiry')}
            >
              💬 問い合わせ対応
            </button>
            <button
              style={{
                ...styles.menuItem,
                ...(activeFeature === 'proposal' ? styles.menuItemActive : {}),
              }}
              onClick={() => setActiveFeature('proposal')}
            >
              📝 提案資料作成
            </button>
            <button
              style={{
                ...styles.menuItem,
                ...(activeFeature === 'coach' ? styles.menuItemActive : {}),
              }}
              onClick={() => setActiveFeature('coach')}
            >
              🎓 営業コーチ
            </button>
          </div>

          <div style={styles.mainArea}>
            {renderFeatureForm()}

            {result && (
              <div style={styles.resultContainer}>
                <h4 style={styles.resultTitle}>結果</h4>
                <div style={styles.resultContent}>{result}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '1200px',
    height: '90%',
    maxHeight: '800px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px 8px',
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    borderRight: '1px solid #e5e7eb',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  menuItem: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  menuItemActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  mainArea: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto' as const,
  },
  formContainer: {
    marginBottom: '24px',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  resultContainer: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#111827',
  },
  resultContent: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    whiteSpace: 'pre-wrap' as const,
  },
};

export default SalesDashboard;
