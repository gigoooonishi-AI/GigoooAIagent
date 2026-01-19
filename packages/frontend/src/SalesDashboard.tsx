import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';

interface SalesDashboardProps {
  onClose: () => void;
  onSendSpreadsheetToChat?: (data: Record<string, unknown>[], columns: string[], sheetName: string) => void;
}

interface KPIData {
  totalSales: number;
  totalLeads: number;
  totalDeals: number;
  winRate: number;
  salesChange: number;
  leadsChange: number;
  dealsChange: number;
  winRateChange: number;
}

interface PipelineStage {
  name: string;
  count: number;
  amount: number;
  color: string;
}

interface TodayAction {
  id: number;
  type: string;
  title: string;
  company: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface Activity {
  id: number;
  type: string;
  description: string;
  time: string;
  user: string;
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ onClose }) => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalSales: 0,
    totalLeads: 0,
    totalDeals: 0,
    winRate: 0,
    salesChange: 0,
    leadsChange: 0,
    dealsChange: 0,
    winRateChange: 0,
  });
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [targetProgress, setTargetProgress] = useState({ current: 0, target: 100, percentage: 0 });
  const [todayActions, setTodayActions] = useState<TodayAction[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // KPIデータ取得
      const [leadsRes, dealsRes] = await Promise.all([
        fetch(`${API_BASE}/api/db/leads?limit=1000`),
        fetch(`${API_BASE}/api/db/deals?limit=1000`),
      ]);

      const leads = await leadsRes.json();
      const deals = await dealsRes.json();

      // KPI計算
      const totalSales = deals.reduce((sum: number, d: { amount: number; stage: string }) =>
        d.stage === 'won' ? sum + d.amount : sum, 0);
      const wonDeals = deals.filter((d: { stage: string }) => d.stage === 'won').length;
      const closedDeals = deals.filter((d: { stage: string }) => d.stage === 'won' || d.stage === 'lost').length;
      const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

      setKpiData({
        totalSales,
        totalLeads: leads.length,
        totalDeals: deals.length,
        winRate,
        salesChange: 12.5,
        leadsChange: 8.3,
        dealsChange: -2.1,
        winRateChange: 5.2,
      });

      // パイプラインデータ
      const stages = [
        { name: '初期接触', key: 'initial', color: '#3b82f6' },
        { name: '提案中', key: 'proposal', color: '#8b5cf6' },
        { name: '交渉中', key: 'negotiation', color: '#f59e0b' },
        { name: '最終調整', key: 'closing', color: '#10b981' },
      ];

      const pipelineData = stages.map(stage => {
        const stageDeals = deals.filter((d: { stage: string }) => d.stage === stage.key);
        return {
          name: stage.name,
          count: stageDeals.length,
          amount: stageDeals.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0),
          color: stage.color,
        };
      });
      setPipeline(pipelineData);

      // 目標進捗
      const monthlyTarget = 50000000;
      const currentProgress = totalSales;
      setTargetProgress({
        current: currentProgress,
        target: monthlyTarget,
        percentage: Math.min(Math.round((currentProgress / monthlyTarget) * 100), 100),
      });

      // 今日のアクション（リードから生成）
      const actions: TodayAction[] = leads.slice(0, 5).map((lead: { id: number; next_action: string; company_name: string; priority: string }, idx: number) => ({
        id: lead.id,
        type: idx % 2 === 0 ? 'call' : 'meeting',
        title: lead.next_action || 'フォローアップ',
        company: lead.company_name,
        time: `${9 + idx}:00`,
        priority: lead.priority as 'high' | 'medium' | 'low',
      }));
      setTodayActions(actions);

      // AIインサイト
      setAiInsights([
        `今月の成約率は${winRate}%で、先月比+5.2%の改善です`,
        `${leads.filter((l: { temperature: string }) => l.temperature === 'hot').length}件のホットリードがフォローアップ待ちです`,
        '商談「ABC株式会社」は今週中にクロージングの可能性が高いです',
        '見込み客の平均スコアが上昇傾向にあります',
      ]);

      // 最近のアクティビティ
      setActivities([
        { id: 1, type: 'deal', description: '新規商談を作成しました', time: '10分前', user: '田中' },
        { id: 2, type: 'lead', description: 'リードのステータスを更新', time: '30分前', user: '佐藤' },
        { id: 3, type: 'call', description: '顧客との通話を完了', time: '1時間前', user: '田中' },
        { id: 4, type: 'proposal', description: '提案書を送付しました', time: '2時間前', user: '鈴木' },
        { id: 5, type: 'meeting', description: '商談ミーティング完了', time: '3時間前', user: '佐藤' },
      ]);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}億`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
    return value.toLocaleString();
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'meeting': return '👥';
      case 'email': return '📧';
      default: return '📋';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deal': return '💼';
      case 'lead': return '👤';
      case 'call': return '📞';
      case 'proposal': return '📝';
      case 'meeting': return '🤝';
      default: return '📌';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    modal: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '1400px',
      height: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.02)',
    },
    title: {
      margin: 0,
      fontSize: '20px',
      fontWeight: 600,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      color: '#9ca3af',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '8px 12px',
      borderRadius: '8px',
      transition: 'all 0.2s',
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '24px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px',
    },
    kpiCard: {
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    kpiLabel: {
      fontSize: '13px',
      color: '#9ca3af',
      marginBottom: '8px',
    },
    kpiValue: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#fff',
      marginBottom: '8px',
    },
    kpiChange: {
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    section: {
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      color: '#fff',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    twoColumns: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    },
    threeColumns: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      gap: '20px',
    },
    pipelineBar: {
      display: 'flex',
      height: '40px',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    },
    pipelineStage: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 500,
      transition: 'all 0.3s',
      cursor: 'pointer',
    },
    pipelineLegend: {
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap' as const,
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: '#d1d5db',
    },
    legendDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
    },
    progressContainer: {
      marginBottom: '12px',
    },
    progressBar: {
      height: '12px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '6px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #10b981, #34d399)',
      borderRadius: '6px',
      transition: 'width 0.5s ease',
    },
    progressText: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      color: '#9ca3af',
      marginTop: '8px',
    },
    actionItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      marginBottom: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
    },
    actionIcon: {
      fontSize: '20px',
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: '14px',
      color: '#fff',
      marginBottom: '4px',
    },
    actionMeta: {
      fontSize: '12px',
      color: '#9ca3af',
    },
    actionPriority: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
    },
    insightItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '12px',
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '8px',
      marginBottom: '8px',
      borderLeft: '3px solid #3b82f6',
    },
    insightIcon: {
      fontSize: '16px',
    },
    insightText: {
      fontSize: '13px',
      color: '#d1d5db',
      lineHeight: 1.5,
    },
    quickAccessGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
    },
    quickAccessBtn: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '8px',
      padding: '16px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      color: '#d1d5db',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '12px',
    },
    activityItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    activityIcon: {
      fontSize: '16px',
    },
    activityContent: {
      flex: 1,
      fontSize: '13px',
      color: '#d1d5db',
    },
    activityTime: {
      fontSize: '12px',
      color: '#6b7280',
    },
    loadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
    },
  };

  const totalPipelineCount = pipeline.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <span>📊</span>
            営業ダッシュボード
          </h2>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
              読み込み中...
            </div>
          ) : (
            <>
              {/* KPIカード */}
              <div style={styles.grid}>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>売上</div>
                  <div style={styles.kpiValue}>¥{formatCurrency(kpiData.totalSales)}</div>
                  <div style={{ ...styles.kpiChange, color: kpiData.salesChange >= 0 ? '#10b981' : '#ef4444' }}>
                    {kpiData.salesChange >= 0 ? '↑' : '↓'} {Math.abs(kpiData.salesChange)}%
                    <span style={{ color: '#6b7280', marginLeft: '4px' }}>前月比</span>
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>見込み客</div>
                  <div style={styles.kpiValue}>{kpiData.totalLeads}</div>
                  <div style={{ ...styles.kpiChange, color: kpiData.leadsChange >= 0 ? '#10b981' : '#ef4444' }}>
                    {kpiData.leadsChange >= 0 ? '↑' : '↓'} {Math.abs(kpiData.leadsChange)}%
                    <span style={{ color: '#6b7280', marginLeft: '4px' }}>前月比</span>
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>商談</div>
                  <div style={styles.kpiValue}>{kpiData.totalDeals}</div>
                  <div style={{ ...styles.kpiChange, color: kpiData.dealsChange >= 0 ? '#10b981' : '#ef4444' }}>
                    {kpiData.dealsChange >= 0 ? '↑' : '↓'} {Math.abs(kpiData.dealsChange)}%
                    <span style={{ color: '#6b7280', marginLeft: '4px' }}>前月比</span>
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>成約率</div>
                  <div style={styles.kpiValue}>{kpiData.winRate}%</div>
                  <div style={{ ...styles.kpiChange, color: kpiData.winRateChange >= 0 ? '#10b981' : '#ef4444' }}>
                    {kpiData.winRateChange >= 0 ? '↑' : '↓'} {Math.abs(kpiData.winRateChange)}%
                    <span style={{ color: '#6b7280', marginLeft: '4px' }}>前月比</span>
                  </div>
                </div>
              </div>

              {/* 商談パイプライン & 目標進捗 */}
              <div style={styles.twoColumns}>
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span>🎯</span> 商談パイプライン
                  </div>
                  <div style={styles.pipelineBar}>
                    {pipeline.map((stage, idx) => (
                      <div
                        key={idx}
                        style={{
                          ...styles.pipelineStage,
                          background: stage.color,
                          width: totalPipelineCount > 0 ? `${(stage.count / totalPipelineCount) * 100}%` : '25%',
                          minWidth: stage.count > 0 ? '60px' : '0',
                        }}
                        title={`${stage.name}: ${stage.count}件 (¥${formatCurrency(stage.amount)})`}
                      >
                        {stage.count > 0 && stage.count}
                      </div>
                    ))}
                  </div>
                  <div style={styles.pipelineLegend}>
                    {pipeline.map((stage, idx) => (
                      <div key={idx} style={styles.legendItem}>
                        <div style={{ ...styles.legendDot, background: stage.color }} />
                        <span>{stage.name}</span>
                        <span style={{ color: '#6b7280' }}>({stage.count}件)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span>📈</span> 月間目標進捗
                  </div>
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${targetProgress.percentage}%` }} />
                    </div>
                    <div style={styles.progressText}>
                      <span>¥{formatCurrency(targetProgress.current)}</span>
                      <span>{targetProgress.percentage}%</span>
                      <span>¥{formatCurrency(targetProgress.target)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
                    目標達成まであと <span style={{ color: '#10b981', fontWeight: 600 }}>
                      ¥{formatCurrency(targetProgress.target - targetProgress.current)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 今日のアクション & AIインサイト & クイックアクセス */}
              <div style={styles.threeColumns}>
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span>📋</span> 今日のアクション
                  </div>
                  {todayActions.map((action) => (
                    <div key={action.id} style={styles.actionItem}>
                      <span style={styles.actionIcon}>{getActionIcon(action.type)}</span>
                      <div style={styles.actionContent}>
                        <div style={styles.actionTitle}>{action.title}</div>
                        <div style={styles.actionMeta}>{action.company} • {action.time}</div>
                      </div>
                      <div style={{ ...styles.actionPriority, background: getPriorityColor(action.priority) }} />
                    </div>
                  ))}
                </div>

                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span>💡</span> AIインサイト
                  </div>
                  {aiInsights.map((insight, idx) => (
                    <div key={idx} style={styles.insightItem}>
                      <span style={styles.insightIcon}>✨</span>
                      <span style={styles.insightText}>{insight}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span>⚡</span> クイックアクセス
                  </div>
                  <div style={styles.quickAccessGrid}>
                    {[
                      { icon: '➕', label: '新規リード' },
                      { icon: '📝', label: '提案書作成' },
                      { icon: '📊', label: 'レポート' },
                      { icon: '📅', label: 'スケジュール' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        style={styles.quickAccessBtn}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 最近のアクティビティ */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>
                  <span>🕐</span> 最近のアクティビティ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 40px' }}>
                  {activities.map((activity) => (
                    <div key={activity.id} style={styles.activityItem}>
                      <span style={styles.activityIcon}>{getActivityIcon(activity.type)}</span>
                      <span style={styles.activityContent}>
                        <strong>{activity.user}</strong>が{activity.description}
                      </span>
                      <span style={styles.activityTime}>{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
