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
          <div>
            <h3>見込み客分析</h3>
            <input
              placeholder="会社名"
              value={leadData.companyName}
              onChange={(e) => setLeadData({ ...leadData, companyName: e.target.value })}
            />
            <input
              placeholder="担当者名"
              value={leadData.contactPerson}
              onChange={(e) => setLeadData({ ...leadData, contactPerson: e.target.value })}
            />
            <input
              placeholder="業界"
              value={leadData.industry}
              onChange={(e) => setLeadData({ ...leadData, industry: e.target.value })}
            />
            <input
              placeholder="予算"
              value={leadData.budget}
              onChange={(e) => setLeadData({ ...leadData, budget: e.target.value })}
            />
            <input
              placeholder="導入時期"
              value={leadData.timeline}
              onChange={(e) => setLeadData({ ...leadData, timeline: e.target.value })}
            />
            <textarea
              placeholder="ニーズ・課題"
              value={leadData.needs}
              onChange={(e) => setLeadData({ ...leadData, needs: e.target.value })}
              rows={3}
            />
            <button onClick={handleLeadsAnalysis} disabled={isLoading}>
              {isLoading ? '分析中...' : '分析実行'}
            </button>
          </div>
        );

      case 'progress':
        return (
          <div>
            <h3>進捗管理</h3>
            <input
              placeholder="案件名"
              value={dealData.dealName}
              onChange={(e) => setDealData({ ...dealData, dealName: e.target.value })}
            />
            <input
              placeholder="現在のステージ"
              value={dealData.stage}
              onChange={(e) => setDealData({ ...dealData, stage: e.target.value })}
            />
            <input
              placeholder="案件金額"
              value={dealData.value}
              onChange={(e) => setDealData({ ...dealData, value: e.target.value })}
            />
            <input
              placeholder="成約予定日"
              value={dealData.closeDate}
              onChange={(e) => setDealData({ ...dealData, closeDate: e.target.value })}
            />
            <textarea
              placeholder="課題・懸念事項"
              value={dealData.challenges}
              onChange={(e) => setDealData({ ...dealData, challenges: e.target.value })}
              rows={3}
            />
            <button onClick={handleProgressTracking} disabled={isLoading}>
              {isLoading ? '分析中...' : '進捗分析'}
            </button>
          </div>
        );

      case 'inquiry':
        return (
          <div>
            <h3>問い合わせ対応</h3>
            <textarea
              placeholder="顧客からの問い合わせ内容"
              value={inquiryData.inquiry}
              onChange={(e) => setInquiryData({ ...inquiryData, inquiry: e.target.value })}
              rows={4}
            />
            <textarea
              placeholder="背景情報（任意）"
              value={inquiryData.context}
              onChange={(e) => setInquiryData({ ...inquiryData, context: e.target.value })}
              rows={2}
            />
            <button onClick={handleInquiryResponse} disabled={isLoading}>
              {isLoading ? '作成中...' : '回答案作成'}
            </button>
          </div>
        );

      case 'proposal':
        return (
          <div>
            <h3>提案資料作成</h3>
            <input
              placeholder="顧客名"
              value={proposalData.clientName}
              onChange={(e) => setProposalData({ ...proposalData, clientName: e.target.value })}
            />
            <textarea
              placeholder="顧客のニーズ・課題"
              value={proposalData.clientNeeds}
              onChange={(e) => setProposalData({ ...proposalData, clientNeeds: e.target.value })}
              rows={3}
            />
            <input
              placeholder="提案する製品・サービス名"
              value={proposalData.productName}
              onChange={(e) => setProposalData({ ...proposalData, productName: e.target.value })}
            />
            <textarea
              placeholder="製品・サービスの特徴"
              value={proposalData.productFeatures}
              onChange={(e) => setProposalData({ ...proposalData, productFeatures: e.target.value })}
              rows={3}
            />
            <button onClick={handleProposalGeneration} disabled={isLoading}>
              {isLoading ? '作成中...' : '提案書作成'}
            </button>
          </div>
        );

      case 'coach':
        return (
          <div>
            <h3>営業コーチ</h3>
            <textarea
              placeholder="現在の状況を説明してください"
              value={coachData.situation}
              onChange={(e) => setCoachData({ ...coachData, situation: e.target.value })}
              rows={4}
            />
            <textarea
              placeholder="具体的な質問（任意）"
              value={coachData.question}
              onChange={(e) => setCoachData({ ...coachData, question: e.target.value })}
              rows={2}
            />
            <button onClick={handleCoaching} disabled={isLoading}>
              {isLoading ? 'アドバイス中...' : 'アドバイス取得'}
            </button>
          </div>
        );
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="dashboard-header">
          <h2>営業ダッシュボード</h2>
          <button className="dashboard-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dashboard-body">
          <div className="dashboard-sidebar">
            <button
              className={`dashboard-menu-btn ${activeFeature === 'leads' ? 'active' : ''}`}
              onClick={() => setActiveFeature('leads')}
            >
              📊 見込み客管理
            </button>
            <button
              className={`dashboard-menu-btn ${activeFeature === 'progress' ? 'active' : ''}`}
              onClick={() => setActiveFeature('progress')}
            >
              📈 進捗管理
            </button>
            <button
              className={`dashboard-menu-btn ${activeFeature === 'inquiry' ? 'active' : ''}`}
              onClick={() => setActiveFeature('inquiry')}
            >
              💬 問い合わせ対応
            </button>
            <button
              className={`dashboard-menu-btn ${activeFeature === 'proposal' ? 'active' : ''}`}
              onClick={() => setActiveFeature('proposal')}
            >
              📝 提案資料作成
            </button>
            <button
              className={`dashboard-menu-btn ${activeFeature === 'coach' ? 'active' : ''}`}
              onClick={() => setActiveFeature('coach')}
            >
              🎓 営業コーチ
            </button>
          </div>

          <div className="dashboard-main">
            {renderFeatureForm()}

            {result && (
              <div className="dashboard-result">
                <h4>結果</h4>
                <div className="dashboard-result-text">{result}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
