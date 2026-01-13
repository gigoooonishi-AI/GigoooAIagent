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
    const inputClass = 'w-full p-3 mb-3 border-2 border-gray-200 rounded-lg text-sm font-[inherit] outline-none';
    const textareaClass = 'w-full p-3 mb-3 border-2 border-gray-200 rounded-lg text-sm font-[inherit] resize-y outline-none';
    const buttonClass = 'px-6 py-3 bg-blue-500 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-blue-600';

    switch (activeFeature) {
      case 'leads':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">見込み客分析</h3>
            <input
              className={inputClass}
              placeholder="会社名"
              value={leadData.companyName}
              onChange={(e) => setLeadData({ ...leadData, companyName: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="担当者名"
              value={leadData.contactPerson}
              onChange={(e) => setLeadData({ ...leadData, contactPerson: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="業界"
              value={leadData.industry}
              onChange={(e) => setLeadData({ ...leadData, industry: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="予算"
              value={leadData.budget}
              onChange={(e) => setLeadData({ ...leadData, budget: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="導入時期"
              value={leadData.timeline}
              onChange={(e) => setLeadData({ ...leadData, timeline: e.target.value })}
            />
            <textarea
              className={textareaClass}
              placeholder="ニーズ・課題"
              value={leadData.needs}
              onChange={(e) => setLeadData({ ...leadData, needs: e.target.value })}
              rows={3}
            />
            <button className={buttonClass} onClick={handleLeadsAnalysis} disabled={isLoading}>
              {isLoading ? '分析中...' : '分析実行'}
            </button>
          </div>
        );

      case 'progress':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">進捗管理</h3>
            <input
              className={inputClass}
              placeholder="案件名"
              value={dealData.dealName}
              onChange={(e) => setDealData({ ...dealData, dealName: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="現在のステージ"
              value={dealData.stage}
              onChange={(e) => setDealData({ ...dealData, stage: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="案件金額"
              value={dealData.value}
              onChange={(e) => setDealData({ ...dealData, value: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="成約予定日"
              value={dealData.closeDate}
              onChange={(e) => setDealData({ ...dealData, closeDate: e.target.value })}
            />
            <textarea
              className={textareaClass}
              placeholder="課題・懸念事項"
              value={dealData.challenges}
              onChange={(e) => setDealData({ ...dealData, challenges: e.target.value })}
              rows={3}
            />
            <button className={buttonClass} onClick={handleProgressTracking} disabled={isLoading}>
              {isLoading ? '分析中...' : '進捗分析'}
            </button>
          </div>
        );

      case 'inquiry':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">問い合わせ対応</h3>
            <textarea
              className={textareaClass}
              placeholder="顧客からの問い合わせ内容"
              value={inquiryData.inquiry}
              onChange={(e) => setInquiryData({ ...inquiryData, inquiry: e.target.value })}
              rows={4}
            />
            <textarea
              className={textareaClass}
              placeholder="背景情報（任意）"
              value={inquiryData.context}
              onChange={(e) => setInquiryData({ ...inquiryData, context: e.target.value })}
              rows={2}
            />
            <button className={buttonClass} onClick={handleInquiryResponse} disabled={isLoading}>
              {isLoading ? '作成中...' : '回答案作成'}
            </button>
          </div>
        );

      case 'proposal':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">提案資料作成</h3>
            <input
              className={inputClass}
              placeholder="顧客名"
              value={proposalData.clientName}
              onChange={(e) => setProposalData({ ...proposalData, clientName: e.target.value })}
            />
            <textarea
              className={textareaClass}
              placeholder="顧客のニーズ・課題"
              value={proposalData.clientNeeds}
              onChange={(e) => setProposalData({ ...proposalData, clientNeeds: e.target.value })}
              rows={3}
            />
            <input
              className={inputClass}
              placeholder="提案する製品・サービス名"
              value={proposalData.productName}
              onChange={(e) => setProposalData({ ...proposalData, productName: e.target.value })}
            />
            <textarea
              className={textareaClass}
              placeholder="製品・サービスの特徴"
              value={proposalData.productFeatures}
              onChange={(e) => setProposalData({ ...proposalData, productFeatures: e.target.value })}
              rows={3}
            />
            <button className={buttonClass} onClick={handleProposalGeneration} disabled={isLoading}>
              {isLoading ? '作成中...' : '提案書作成'}
            </button>
          </div>
        );

      case 'coach':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">営業コーチ</h3>
            <textarea
              className={textareaClass}
              placeholder="現在の状況を説明してください"
              value={coachData.situation}
              onChange={(e) => setCoachData({ ...coachData, situation: e.target.value })}
              rows={4}
            />
            <textarea
              className={textareaClass}
              placeholder="具体的な質問（任意）"
              value={coachData.question}
              onChange={(e) => setCoachData({ ...coachData, question: e.target.value })}
              rows={2}
            />
            <button className={buttonClass} onClick={handleCoaching} disabled={isLoading}>
              {isLoading ? 'アドバイス中...' : 'アドバイス取得'}
            </button>
          </div>
        );
    }
  };

  const getMenuButtonClass = (feature: SalesFeature) => {
    const baseClass = 'px-4 py-3 bg-transparent border-none rounded-lg cursor-pointer text-left text-sm font-medium text-gray-700 transition-colors duration-200';
    const activeClass = 'bg-blue-500 text-white';
    return `${baseClass} ${activeFeature === feature ? activeClass : 'hover:bg-gray-100'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000]">
      <div className="bg-white rounded-xl w-[90%] max-w-[1200px] h-[90%] max-h-[800px] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="m-0 text-2xl font-semibold text-gray-900">営業ダッシュボード</h2>
          <button
            className="bg-transparent border-none text-2xl cursor-pointer text-gray-500 px-2 py-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-60 border-r border-gray-200 p-4 flex flex-col gap-2">
            <button
              className={getMenuButtonClass('leads')}
              onClick={() => setActiveFeature('leads')}
            >
              📊 見込み客管理
            </button>
            <button
              className={getMenuButtonClass('progress')}
              onClick={() => setActiveFeature('progress')}
            >
              📈 進捗管理
            </button>
            <button
              className={getMenuButtonClass('inquiry')}
              onClick={() => setActiveFeature('inquiry')}
            >
              💬 問い合わせ対応
            </button>
            <button
              className={getMenuButtonClass('proposal')}
              onClick={() => setActiveFeature('proposal')}
            >
              📝 提案資料作成
            </button>
            <button
              className={getMenuButtonClass('coach')}
              onClick={() => setActiveFeature('coach')}
            >
              🎓 営業コーチ
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {renderFeatureForm()}

            {result && (
              <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-base font-semibold mb-3 text-gray-900">結果</h4>
                <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{result}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
