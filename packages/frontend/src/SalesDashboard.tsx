import React, { useState, useEffect, useCallback } from 'react';

interface SalesDashboardProps {
  onClose: () => void;
}

type TabType = 'leads' | 'inquiries' | 'pipeline' | 'proposals' | 'coach' | 'alerts';

const API_BASE = 'http://localhost:8000';

// ========== 型定義 ==========
interface Lead {
  id: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  status: string;
  priority: string;
  score: number;
  temperature: string;
  estimated_value: number;
  next_action: string;
  next_action_date: string;
  last_contact_date: string;
  industry: string;
  company_size?: string;
  source?: string;
  notes?: string;
  lost_reason?: string;
  assigned_to?: number;
}

interface LeadStats {
  total: number;
  active: number;
  by_status: Record<string, number>;
  by_temperature: Record<string, number>;
  by_industry: { industry: string; count: number }[];
  by_size: { size: string; count: number }[];
  by_source: { source: string; count: number }[];
  overdue_actions: number;
  no_recent_contact: number;
  avg_score: number;
}

interface LeadActivity {
  id: number;
  type: string;
  subject: string;
  description?: string;
  outcome?: string;
  next_step?: string;
  activity_date?: string;
  created_at?: string;
  deal_id?: number;
}

interface Inquiry {
  id: number;
  subject: string;
  customer_name: string;
  customer_email: string;
  channel: string;
  status: string;
  priority: string;
  created_at: string;
  is_sla_breached: boolean;
  sla_target_minutes: number;
  sla_deadline?: string;
  first_response_at?: string;
  response_time_minutes?: number;
  sla_met?: boolean;
  urgency_score?: number;
  assigned_to?: number;
  category?: string;
}

interface InquiryStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  today_new: number;
  today_resolved: number;
  sla_breached: number;
  avg_response_time_minutes: number;
  by_assignee: { assignee_id: number; count: number }[];
}

interface ChannelStats {
  channels: Record<string, { total: number; open: number; resolved_today: number }>;
  total_open: number;
  total_resolved_today: number;
}

interface InquiryResponse {
  id: number;
  content: string;
  responded_by: number | null;
  created_at: string;
}

interface Alert {
  id: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  is_read: boolean;
  triggered_at: string;
  entity_type: string;
  entity_id: number;
}

interface Deal {
  id: number;
  title: string;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string;
  lead_id: number;
  days_stalled?: number;
}

interface PipelineMetrics {
  stage_metrics: Record<string, { count: number; total_amount: number; weighted_amount: number }>;
  win_rate: number;
  total_pipeline_value: number;
}

interface DealAnalytics {
  stage_data: Record<string, { count: number; total_amount: number; weighted_amount: number; avg_probability: number }>;
  probability_data: { range: string; count: number; amount: number; weighted: number }[];
  win_rate: number;
  loss_rate: number;
  transition_rates: { from: string; to: string; rate: number }[];
  total_pipeline: number;
  weighted_pipeline: number;
}

interface ForecastData {
  current_month: { period: string; total_amount: number; weighted_amount: number; high_probability: number; mid_probability: number; low_probability: number; deal_count: number };
  current_quarter: { period: string; total_amount: number; weighted_amount: number; high_probability: number; mid_probability: number; low_probability: number; deal_count: number };
  total_pipeline: { total_amount: number; weighted_amount: number; high_probability: number; mid_probability: number; low_probability: number; deal_count: number };
}

interface StalledAlert {
  id: number;
  title: string;
  stage: string;
  amount: number;
  probability: number;
  weighted_value: number;
  days_stalled: number;
  severity: string;
  owner_name: string;
}

interface OwnerData {
  owner_id: number;
  owner_name: string;
  deal_count: number;
  total_amount: number;
  weighted_amount: number;
  stages: Record<string, { count: number; amount: number }>;
}

interface ProposalTemplate {
  id: number;
  name: string;
  industry: string | null;
  issue_type: string | null;
  structure: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

interface Proposal {
  id: number;
  title: string;
  lead_id: number | null;
  deal_id: number | null;
  template_id: number | null;
  content: Record<string, unknown> | null;
  status: string;
  version: number;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  quote: QuoteData | null;
}

interface QuoteData {
  items: QuoteItem[];
  subtotal: number;
  discount_rate: number;
  tax_rate: number;
  total: number;
  valid_until: string | null;
}

interface QuoteItem {
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

interface QuoteSimulation {
  items: QuoteItem[];
  subtotal: number;
  discount_rate: number;
  discount_amount: number;
  after_discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

// コーチ関連の型定義
interface MeetingLog {
  id: number;
  deal_id: number | null;
  employee_id: number | null;
  meeting_date: string | null;
  duration_minutes: number | null;
  attendees: string | null;
  transcript: string | null;
  summary: string | null;
  key_points: string[] | null;
  action_items: string[] | null;
  ng_words_detected: string[] | null;
  created_at: string;
}

interface Employee {
  id: number;
  name: string;
  email: string | null;
  department: string | null;
  role: string | null;
}

interface SkillAssessment {
  employee_id: number;
  skills: Record<string, number>;
}

interface ComparisonData {
  employee: {
    id: number;
    name: string;
    total_deals: number;
    won_deals: number;
    win_rate: number;
    avg_amount: number;
    skills: Record<string, number>;
  };
  top_performers: {
    id: number;
    name: string;
    total_deals: number;
    won_deals: number;
    win_rate: number;
    avg_amount: number;
  }[];
  top_avg_skills: Record<string, number>;
  skill_gaps: Record<string, { your_score: number; top_avg: number; gap: number }>;
  ai_analysis: {
    overall_assessment?: string;
    key_differences?: string[];
    learning_points?: string[];
    action_plan?: { priority: number; action: string; expected_impact: string }[];
    recommended_training?: string[];
  };
}

interface FullAnalysisResult {
  summary?: { overview: string; key_points: string[]; customer_needs: string[]; objections: string[] };
  ng_words_analysis?: { detected: string[]; improvements: { original: string; suggestion: string; reason: string }[] };
  talk_quality?: { score: number; strengths: string[]; weaknesses: string[] };
  next_actions?: { immediate: string[]; follow_up: string[]; preparation: string[] };
  coaching_tips?: { priority_improvements: string[]; recommended_scripts: { situation: string; script: string }[] };
}

// ========== ステータスバッジ ==========
const StatusBadge: React.FC<{ status: string; type?: 'lead' | 'deal' | 'inquiry' | 'priority' }> = ({ status, type = 'lead' }) => {
  const getColor = () => {
    if (type === 'priority') {
      switch (status) {
        case 'high': return '#ef4444';
        case 'medium': return '#f59e0b';
        case 'low': return '#22c55e';
        default: return '#6b7280';
      }
    }
    if (type === 'lead') {
      switch (status) {
        case 'new': return '#3b82f6';
        case 'contacting': return '#8b5cf6';
        case 'proposal': return '#f59e0b';
        case 'negotiation': return '#ec4899';
        case 'won': return '#22c55e';
        case 'lost': return '#ef4444';
        default: return '#6b7280';
      }
    }
    if (type === 'deal') {
      switch (status) {
        case 'discovery': return '#3b82f6';
        case 'proposal': return '#f59e0b';
        case 'negotiation': return '#ec4899';
        case 'closed_won': return '#22c55e';
        case 'closed_lost': return '#ef4444';
        default: return '#6b7280';
      }
    }
    if (type === 'inquiry') {
      switch (status) {
        case 'open': return '#ef4444';
        case 'in_progress': return '#f59e0b';
        case 'resolved': return '#22c55e';
        case 'closed': return '#6b7280';
        default: return '#6b7280';
      }
    }
    return '#6b7280';
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: getColor(),
      color: '#fff',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
};

// ========== 温度感インジケーター ==========
const TemperatureIndicator: React.FC<{ temperature: string }> = ({ temperature }) => {
  const getColor = () => {
    switch (temperature) {
      case 'hot': return '#ef4444';
      case 'warm': return '#f59e0b';
      case 'cold': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: `${getColor()}20`,
      color: getColor(),
    }}>
      {temperature === 'hot' && '🔥'}
      {temperature === 'warm' && '☀️'}
      {temperature === 'cold' && '❄️'}
      {temperature}
    </span>
  );
};

// ========== メインダッシュボード ==========
const SalesDashboard: React.FC<SalesDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [isLoading, setIsLoading] = useState(false);

  // データ状態
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [dealAnalytics, setDealAnalytics] = useState<DealAnalytics | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [stalledAlerts, setStalledAlerts] = useState<StalledAlert[]>([]);
  const [ownerData, setOwnerData] = useState<OwnerData[]>([]);
  const [pipelineView, setPipelineView] = useState<'kanban' | 'funnel' | 'forecast' | 'team'>('kanban');
  const [aiResult, setAiResult] = useState<string>('');

  // 問い合わせ機能状態
  const [inquiryStats, setInquiryStats] = useState<InquiryStats | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [inquiryChannelFilter, setInquiryChannelFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [inquiryResponses, setInquiryResponses] = useState<InquiryResponse[]>([]);
  const [newResponseContent, setNewResponseContent] = useState('');
  const [inquiryView, setInquiryView] = useState<'list' | 'sla' | 'stats'>('list');

  // 見込み客機能状態
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leadTempFilter, setLeadTempFilter] = useState<string>('all');
  const [leadActivities, setLeadActivities] = useState<LeadActivity[]>([]);
  const [leadView, setLeadView] = useState<'list' | 'kanban' | 'stats'>('list');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: 'call', subject: '', description: '', outcome: '' });

  // フォーム状態
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [coachInput, setCoachInput] = useState({ situation: '', question: '' });

  // コーチ機能拡張状態
  const [coachView, setCoachView] = useState<'meetings' | 'transcribe' | 'skills' | 'compare' | 'advice'>('meetings');
  const [meetingLogs, setMeetingLogs] = useState<MeetingLog[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingLog | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [skillAssessment, setSkillAssessment] = useState<SkillAssessment | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysisResult | null>(null);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [proposalInput, setProposalInput] = useState({
    clientName: '', clientNeeds: '', productName: '', productFeatures: '', hearingNotes: '', clientIndustry: ''
  });

  // 提案書関連状態
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [proposalView, setProposalView] = useState<'list' | 'templates' | 'create' | 'quote'>('list');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', industry: '', issue_type: '' });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([{ name: '', description: '', unit_price: 0, quantity: 1, amount: 0 }]);
  const [quoteSimulation, setQuoteSimulation] = useState<QuoteSimulation | null>(null);
  const [discountRate, setDiscountRate] = useState(0);
  const [taxRate, setTaxRate] = useState(10);

  // ========== データ取得 ==========
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/leads?limit=100`);
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    }
  }, []);

  const fetchLeadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/leads/stats/overview`);
      const data = await res.json();
      setLeadStats(data);
    } catch (e) {
      console.error('Failed to fetch lead stats:', e);
    }
  }, []);

  const fetchLeadActivities = useCallback(async (leadId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/db/leads/${leadId}/history`);
      const data = await res.json();
      setLeadActivities(data.activities || []);
    } catch (e) {
      console.error('Failed to fetch lead activities:', e);
    }
  }, []);

  const addLeadActivity = async (leadId: number, activity: { type: string; subject: string; description?: string; outcome?: string }) => {
    try {
      const params = new URLSearchParams({
        type: activity.type,
        subject: activity.subject,
        ...(activity.description && { description: activity.description }),
        ...(activity.outcome && { outcome: activity.outcome })
      });
      const res = await fetch(`${API_BASE}/api/db/leads/${leadId}/activities?${params}`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchLeadActivities(leadId);
        await fetchLeads();
        setShowActivityForm(false);
        setNewActivity({ type: 'call', subject: '', description: '', outcome: '' });
      }
    } catch (e) {
      console.error('Failed to add activity:', e);
    }
  };

  const updateLeadStatus = async (leadId: number, status: string, lostReason?: string) => {
    try {
      const params = new URLSearchParams({ status });
      if (lostReason) params.append('lost_reason', lostReason);
      const res = await fetch(`${API_BASE}/api/db/leads/${leadId}/status?${params}`, {
        method: 'PUT'
      });
      if (res.ok) {
        await fetchLeads();
        await fetchLeadStats();
      }
    } catch (e) {
      console.error('Failed to update lead status:', e);
    }
  };

  const updateLeadScore = async (leadId: number, score: number, temperature?: string) => {
    try {
      const params = new URLSearchParams({ score: score.toString() });
      if (temperature) params.append('temperature', temperature);
      const res = await fetch(`${API_BASE}/api/db/leads/${leadId}/score?${params}`, {
        method: 'PUT'
      });
      if (res.ok) {
        await fetchLeads();
        await fetchLeadStats();
      }
    } catch (e) {
      console.error('Failed to update lead score:', e);
    }
  };

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals?limit=100`);
      const data = await res.json();
      setDeals(data);
    } catch (e) {
      console.error('Failed to fetch deals:', e);
    }
  }, []);

  const fetchPipelineMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals/metrics`);
      const data = await res.json();
      setPipelineMetrics(data);
    } catch (e) {
      console.error('Failed to fetch pipeline metrics:', e);
    }
  }, []);

  const fetchDealAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals/analytics`);
      const data = await res.json();
      setDealAnalytics(data);
    } catch (e) {
      console.error('Failed to fetch deal analytics:', e);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals/forecast-detailed`);
      const data = await res.json();
      setForecastData(data);
    } catch (e) {
      console.error('Failed to fetch forecast:', e);
    }
  }, []);

  const fetchStalledAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals/stalled-alerts?days=14`);
      const data = await res.json();
      setStalledAlerts(data.alerts || []);
    } catch (e) {
      console.error('Failed to fetch stalled alerts:', e);
    }
  }, []);

  const fetchOwnerData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/deals/by-owner`);
      const data = await res.json();
      setOwnerData(data.owners || []);
    } catch (e) {
      console.error('Failed to fetch owner data:', e);
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/sla-status`);
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch (e) {
      console.error('Failed to fetch inquiries:', e);
    }
  }, []);

  const fetchInquiryStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/stats`);
      const data = await res.json();
      setInquiryStats(data);
    } catch (e) {
      console.error('Failed to fetch inquiry stats:', e);
    }
  }, []);

  const fetchChannelStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/by-channel`);
      const data = await res.json();
      setChannelStats(data);
    } catch (e) {
      console.error('Failed to fetch channel stats:', e);
    }
  }, []);

  const fetchInquiryResponses = useCallback(async (inquiryId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/${inquiryId}/responses`);
      const data = await res.json();
      setInquiryResponses(data.responses || []);
    } catch (e) {
      console.error('Failed to fetch inquiry responses:', e);
    }
  }, []);

  const addInquiryResponse = async (inquiryId: number, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/${inquiryId}/responses?content=${encodeURIComponent(content)}`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchInquiryResponses(inquiryId);
        await fetchInquiries();
        await fetchInquiryStats();
        setNewResponseContent('');
      }
    } catch (e) {
      console.error('Failed to add response:', e);
    }
  };

  const updateInquiryStatus = async (inquiryId: number, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/db/inquiries/${inquiryId}/status?status=${status}`, {
        method: 'PUT'
      });
      if (res.ok) {
        await fetchInquiries();
        await fetchInquiryStats();
      }
    } catch (e) {
      console.error('Failed to update inquiry status:', e);
    }
  };

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts/`);
      const data = await res.json();
      setAlerts(data);

      const countRes = await fetch(`${API_BASE}/api/alerts/unread-count`);
      const countData = await countRes.json();
      setUnreadAlertCount(countData.unread_count || 0);
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    }
  }, []);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/`);
      const data = await res.json();
      setProposals(data);
    } catch (e) {
      console.error('Failed to fetch proposals:', e);
    }
  }, []);

  const createTemplate = async () => {
    if (!newTemplate.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/proposals/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      if (res.ok) {
        await fetchTemplates();
        setShowTemplateForm(false);
        setNewTemplate({ name: '', industry: '', issue_type: '' });
      }
    } catch (e) {
      console.error('Failed to create template:', e);
    }
  };

  const deleteTemplate = async (templateId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/templates/${templateId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTemplates();
      }
    } catch (e) {
      console.error('Failed to delete template:', e);
    }
  };

  const simulateQuote = async () => {
    try {
      const items = quoteItems.map(item => ({
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity
      }));
      const res = await fetch(`${API_BASE}/api/proposals/quote/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          discount_rate: discountRate,
          tax_rate: taxRate
        })
      });
      const data = await res.json();
      setQuoteSimulation(data);
    } catch (e) {
      console.error('Failed to simulate quote:', e);
    }
  };

  const addQuoteItem = () => {
    setQuoteItems([...quoteItems, { name: '', description: '', unit_price: 0, quantity: 1, amount: 0 }]);
  };

  const updateQuoteItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'unit_price' || field === 'quantity') {
      newItems[index].amount = newItems[index].unit_price * newItems[index].quantity;
    }
    setQuoteItems(newItems);
  };

  const removeQuoteItem = (index: number) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter((_, i) => i !== index));
    }
  };

  const exportPdf = async (proposalId: number) => {
    window.open(`${API_BASE}/api/proposals/${proposalId}/export/pdf`, '_blank');
  };

  const exportPptx = async (proposalId: number) => {
    window.open(`${API_BASE}/api/proposals/${proposalId}/export/pptx`, '_blank');
  };

  const autofillCustomer = async (proposalId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/proposals/${proposalId}/autofill-customer`, { method: 'POST' });
      if (res.ok) {
        await fetchProposals();
        alert('顧客情報を差し込みました');
      }
    } catch (e) {
      console.error('Failed to autofill customer:', e);
    }
  };

  // ========== コーチ機能データ取得 ==========
  const fetchMeetingLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings`);
      const data = await res.json();
      setMeetingLogs(data);
    } catch (e) {
      console.error('Failed to fetch meeting logs:', e);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/coach/employees`);
      const data = await res.json();
      setEmployees(data);
      if (data.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch employees:', e);
    }
  }, [selectedEmployeeId]);

  const fetchEmployeeSkills = async (employeeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/coach/employees/${employeeId}/skills`);
      const data = await res.json();
      setSkillAssessment(data);
    } catch (e) {
      console.error('Failed to fetch employee skills:', e);
    }
  };

  const assessEmployeeSkills = async (employeeId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/employees/${employeeId}/skills/assess`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchEmployeeSkills(employeeId);
        setAiResult(data.content);
      }
    } catch (e) {
      console.error('Failed to assess skills:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchComparison = async (employeeId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/employees/${employeeId}/compare-top-performers`);
      const data = await res.json();
      setComparisonData(data);
    } catch (e) {
      console.error('Failed to fetch comparison:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const transcribeAudio = async () => {
    if (!audioFile) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioFile);
      if (selectedEmployeeId) {
        formData.append('employee_id', selectedEmployeeId.toString());
      }
      const res = await fetch(`${API_BASE}/api/coach/meetings/transcribe`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setTranscriptInput(data.transcript);
        await fetchMeetingLogs();
        alert(`文字起こし完了（商談ID: ${data.meeting_id}）`);
      } else {
        alert('文字起こしに失敗しました: ' + data.error);
      }
    } catch (e) {
      console.error('Failed to transcribe:', e);
    } finally {
      setIsTranscribing(false);
      setAudioFile(null);
    }
  };

  const createMeetingFromText = async () => {
    if (!transcriptInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptInput,
          employee_id: selectedEmployeeId,
          meeting_date: new Date().toISOString()
        })
      });
      if (res.ok) {
        await fetchMeetingLogs();
        setTranscriptInput('');
        alert('商談ログを作成しました');
      }
    } catch (e) {
      console.error('Failed to create meeting:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullAnalysis = async (meetingId: number) => {
    setIsAnalyzing(true);
    setFullAnalysis(null);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings/${meetingId}/full-analysis`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const parsed = JSON.parse(data.content);
        setFullAnalysis(parsed);
        await fetchMeetingLogs();
      }
    } catch (e) {
      console.error('Failed to run full analysis:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const summarizeMeeting = async (meetingId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings/${meetingId}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.content);
        await fetchMeetingLogs();
      }
    } catch (e) {
      console.error('Failed to summarize:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectNgWords = async (meetingId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings/${meetingId}/detect-ng-words`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.content);
        await fetchMeetingLogs();
      }
    } catch (e) {
      console.error('Failed to detect NG words:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestActions = async (meetingId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings/${meetingId}/suggest-actions`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.content);
      }
    } catch (e) {
      console.error('Failed to suggest actions:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const improveTalk = async (meetingId: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/coach/meetings/${meetingId}/improve-talk`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.content);
      }
    } catch (e) {
      console.error('Failed to get talk improvement:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchLeadStats();
    fetchDeals();
    fetchPipelineMetrics();
    fetchDealAnalytics();
    fetchForecast();
    fetchStalledAlerts();
    fetchOwnerData();
    fetchInquiries();
    fetchInquiryStats();
    fetchChannelStats();
    fetchAlerts();
    fetchTemplates();
    fetchProposals();
    fetchMeetingLogs();
    fetchEmployees();
  }, [fetchLeads, fetchLeadStats, fetchDeals, fetchPipelineMetrics, fetchDealAnalytics, fetchForecast, fetchStalledAlerts, fetchOwnerData, fetchInquiries, fetchInquiryStats, fetchChannelStats, fetchAlerts, fetchTemplates, fetchProposals, fetchMeetingLogs, fetchEmployees]);

  // ========== タブコンテンツ ==========
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'leads', label: '見込み客', icon: '👥' },
    { id: 'pipeline', label: '進捗管理', icon: '📊' },
    { id: 'inquiries', label: '問い合わせ', icon: '💬' },
    { id: 'proposals', label: '提案書', icon: '📝' },
    { id: 'coach', label: 'コーチ', icon: '🎓' },
    { id: 'alerts', label: 'アラート', icon: '🔔' },
  ];

  // ========== 見込み客管理タブ ==========
  const statusLabels: Record<string, string> = {
    new: '新規',
    contacting: '接触中',
    proposal: '提案中',
    negotiation: '交渉中',
    won: '受注',
    lost: '失注'
  };

  const sizeLabels: Record<string, string> = {
    small: '小規模',
    medium: '中規模',
    large: '大規模',
    enterprise: 'エンタープライズ'
  };

  const activityTypeLabels: Record<string, string> = {
    call: '📞 電話',
    email: '📧 メール',
    meeting: '🤝 商談',
    demo: '💻 デモ',
    other: '📋 その他'
  };

  const filteredLeads = leads.filter(lead => {
    if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) return false;
    if (leadTempFilter !== 'all' && lead.temperature !== leadTempFilter) return false;
    return true;
  });

  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead);
    await fetchLeadActivities(lead.id);
  };

  const renderLeadsTab = () => (
    <div className="dashboard-tab-content">
      {/* 統計カード */}
      <div className="lead-stats-grid">
        <div className="lead-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{leadStats?.total || 0}</div>
            <div className="stat-label">総見込み客</div>
          </div>
        </div>
        <div className="lead-stat-card info">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{leadStats?.active || 0}</div>
            <div className="stat-label">アクティブ</div>
          </div>
        </div>
        <div className="lead-stat-card success">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{leadStats?.by_temperature?.hot || 0}</div>
            <div className="stat-label">ホット案件</div>
          </div>
        </div>
        <div className="lead-stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{leadStats?.overdue_actions || 0}</div>
            <div className="stat-label">要アクション</div>
          </div>
        </div>
        <div className="lead-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{leadStats?.avg_score || 0}</div>
            <div className="stat-label">平均スコア</div>
          </div>
        </div>
      </div>

      {/* コントロール */}
      <div className="lead-controls">
        <div className="lead-view-toggle">
          <button
            className={`view-btn ${leadView === 'list' ? 'active' : ''}`}
            onClick={() => setLeadView('list')}
          >
            📋 一覧
          </button>
          <button
            className={`view-btn ${leadView === 'kanban' ? 'active' : ''}`}
            onClick={() => setLeadView('kanban')}
          >
            📊 カンバン
          </button>
          <button
            className={`view-btn ${leadView === 'stats' ? 'active' : ''}`}
            onClick={() => setLeadView('stats')}
          >
            📈 統計
          </button>
        </div>
        <div className="lead-filters">
          <select
            value={leadStatusFilter}
            onChange={e => setLeadStatusFilter(e.target.value)}
            className="lead-filter-select"
          >
            <option value="all">全ステータス</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={leadTempFilter}
            onChange={e => setLeadTempFilter(e.target.value)}
            className="lead-filter-select"
          >
            <option value="all">全温度感</option>
            <option value="hot">🔥 ホット</option>
            <option value="warm">☀️ ウォーム</option>
            <option value="cold">❄️ コールド</option>
          </select>
          <button className="dashboard-add-btn" onClick={() => setShowLeadForm(true)}>
            + 新規追加
          </button>
        </div>
      </div>

      {/* 一覧ビュー */}
      {leadView === 'list' && (
        <div className="dashboard-table-container">
          <table className="dashboard-table lead-table">
            <thead>
              <tr>
                <th>会社名</th>
                <th>業界</th>
                <th>規模</th>
                <th>担当者</th>
                <th>流入経路</th>
                <th>ステータス</th>
                <th>温度感</th>
                <th>スコア</th>
                <th>最終接触</th>
                <th>次アクション</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const daysSinceContact = lead.last_contact_date
                  ? Math.floor((Date.now() - new Date(lead.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date();

                return (
                  <tr
                    key={lead.id}
                    onClick={() => handleLeadClick(lead)}
                    className={`lead-row ${isOverdue ? 'overdue' : ''}`}
                  >
                    <td className="lead-company">{lead.company_name}</td>
                    <td>{lead.industry || '-'}</td>
                    <td>{lead.company_size ? sizeLabels[lead.company_size] || lead.company_size : '-'}</td>
                    <td>{lead.contact_name || '-'}</td>
                    <td>{lead.source || '-'}</td>
                    <td><StatusBadge status={lead.status} type="lead" /></td>
                    <td><TemperatureIndicator temperature={lead.temperature || 'warm'} /></td>
                    <td>
                      <div className="score-bar">
                        <div className="score-fill" style={{ width: `${lead.score || 50}%` }} />
                        <span>{lead.score || 50}</span>
                      </div>
                    </td>
                    <td>
                      {daysSinceContact !== null ? (
                        <span className={daysSinceContact > 14 ? 'text-warning' : ''}>
                          {daysSinceContact}日前
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="next-action-cell">
                        <span className={isOverdue ? 'text-danger' : ''}>{lead.next_action || '-'}</span>
                        {lead.next_action_date && (
                          <small className={isOverdue ? 'text-danger' : ''}>
                            {new Date(lead.next_action_date).toLocaleDateString('ja-JP')}
                          </small>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="dashboard-empty">見込み客データがありません</div>
          )}
        </div>
      )}

      {/* カンバンビュー */}
      {leadView === 'kanban' && (
        <div className="lead-kanban-board">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="lead-kanban-column">
              <div className="kanban-column-header">
                <span>{label}</span>
                <span className="kanban-count">{leads.filter(l => l.status === status).length}</span>
              </div>
              <div className="kanban-cards">
                {leads.filter(l => l.status === status).map(lead => (
                  <div
                    key={lead.id}
                    className="lead-kanban-card"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <div className="kanban-card-header">
                      <span className="kanban-company">{lead.company_name}</span>
                      <TemperatureIndicator temperature={lead.temperature || 'warm'} />
                    </div>
                    <div className="kanban-card-body">
                      <div className="kanban-contact">{lead.contact_name || '-'}</div>
                      {lead.estimated_value && (
                        <div className="kanban-value">¥{lead.estimated_value.toLocaleString()}</div>
                      )}
                    </div>
                    <div className="kanban-card-footer">
                      <div className="score-bar small">
                        <div className="score-fill" style={{ width: `${lead.score || 50}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 統計ビュー */}
      {leadView === 'stats' && (
        <div className="lead-stats-view">
          <div className="stats-grid">
            <div className="stats-section">
              <h4>ステータス別</h4>
              <div className="stats-bars">
                {Object.entries(statusLabels).map(([status, label]) => {
                  const count = leadStats?.by_status?.[status] || 0;
                  const total = leadStats?.total || 1;
                  return (
                    <div key={status} className="stats-bar-item">
                      <div className="stats-bar-label">{label}</div>
                      <div className="stats-bar-container">
                        <div
                          className={`stats-bar-fill status-${status}`}
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                      <div className="stats-bar-value">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="stats-section">
              <h4>温度感別</h4>
              <div className="temp-stats">
                <div className="temp-stat hot">
                  <span className="temp-icon">🔥</span>
                  <span className="temp-label">ホット</span>
                  <span className="temp-value">{leadStats?.by_temperature?.hot || 0}</span>
                </div>
                <div className="temp-stat warm">
                  <span className="temp-icon">☀️</span>
                  <span className="temp-label">ウォーム</span>
                  <span className="temp-value">{leadStats?.by_temperature?.warm || 0}</span>
                </div>
                <div className="temp-stat cold">
                  <span className="temp-icon">❄️</span>
                  <span className="temp-label">コールド</span>
                  <span className="temp-value">{leadStats?.by_temperature?.cold || 0}</span>
                </div>
              </div>
            </div>
            <div className="stats-section">
              <h4>流入経路別</h4>
              <div className="source-stats">
                {leadStats?.by_source?.map((item, i) => (
                  <div key={i} className="source-item">
                    <span className="source-name">{item.source}</span>
                    <span className="source-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stats-section">
              <h4>業界別</h4>
              <div className="industry-stats">
                {leadStats?.by_industry?.map((item, i) => (
                  <div key={i} className="industry-item">
                    <span className="industry-name">{item.industry}</span>
                    <span className="industry-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 見込み客詳細モーダル */}
      {selectedLead && (
        <div className="lead-detail-overlay" onClick={() => setSelectedLead(null)}>
          <div className="lead-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="lead-detail-header">
              <h3>{selectedLead.company_name}</h3>
              <div className="lead-header-badges">
                <StatusBadge status={selectedLead.status} type="lead" />
                <TemperatureIndicator temperature={selectedLead.temperature || 'warm'} />
              </div>
              <button className="close-btn" onClick={() => setSelectedLead(null)}>×</button>
            </div>

            <div className="lead-detail-content">
              <div className="lead-info-grid">
                <div className="lead-info-section">
                  <h4>基本情報</h4>
                  <div className="info-row"><span>担当者:</span><span>{selectedLead.contact_name || '-'}</span></div>
                  <div className="info-row"><span>メール:</span><span>{selectedLead.contact_email || '-'}</span></div>
                  <div className="info-row"><span>電話:</span><span>{selectedLead.contact_phone || '-'}</span></div>
                  <div className="info-row"><span>業界:</span><span>{selectedLead.industry || '-'}</span></div>
                  <div className="info-row"><span>規模:</span><span>{selectedLead.company_size ? sizeLabels[selectedLead.company_size] : '-'}</span></div>
                  <div className="info-row"><span>流入経路:</span><span>{selectedLead.source || '-'}</span></div>
                </div>
                <div className="lead-info-section">
                  <h4>スコアリング</h4>
                  <div className="score-display">
                    <div className="score-circle">
                      <span className="score-number">{selectedLead.score || 50}</span>
                    </div>
                    <div className="score-controls">
                      <button onClick={() => updateLeadScore(selectedLead.id, Math.min(100, (selectedLead.score || 50) + 10))}>+10</button>
                      <button onClick={() => updateLeadScore(selectedLead.id, Math.max(0, (selectedLead.score || 50) - 10))}>-10</button>
                    </div>
                  </div>
                  <div className="temp-selector">
                    <button
                      className={selectedLead.temperature === 'hot' ? 'active' : ''}
                      onClick={() => updateLeadScore(selectedLead.id, selectedLead.score || 50, 'hot')}
                    >🔥 ホット</button>
                    <button
                      className={selectedLead.temperature === 'warm' ? 'active' : ''}
                      onClick={() => updateLeadScore(selectedLead.id, selectedLead.score || 50, 'warm')}
                    >☀️ ウォーム</button>
                    <button
                      className={selectedLead.temperature === 'cold' ? 'active' : ''}
                      onClick={() => updateLeadScore(selectedLead.id, selectedLead.score || 50, 'cold')}
                    >❄️ コールド</button>
                  </div>
                </div>
              </div>

              <div className="lead-status-section">
                <h4>ステータス変更</h4>
                <div className="status-buttons">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <button
                      key={status}
                      className={`status-btn ${selectedLead.status === status ? 'active' : ''}`}
                      onClick={() => updateLeadStatus(selectedLead.id, status)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lead-activity-section">
                <div className="activity-header">
                  <h4>活動履歴</h4>
                  <button
                    className="add-activity-btn"
                    onClick={() => setShowActivityForm(!showActivityForm)}
                  >
                    + 活動追加
                  </button>
                </div>

                {showActivityForm && (
                  <div className="activity-form">
                    <select
                      value={newActivity.type}
                      onChange={e => setNewActivity({ ...newActivity, type: e.target.value })}
                    >
                      {Object.entries(activityTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="件名"
                      value={newActivity.subject}
                      onChange={e => setNewActivity({ ...newActivity, subject: e.target.value })}
                    />
                    <textarea
                      placeholder="詳細（任意）"
                      value={newActivity.description}
                      onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                      rows={2}
                    />
                    <input
                      type="text"
                      placeholder="結果（任意）"
                      value={newActivity.outcome}
                      onChange={e => setNewActivity({ ...newActivity, outcome: e.target.value })}
                    />
                    <button
                      onClick={() => {
                        if (newActivity.subject.trim()) {
                          addLeadActivity(selectedLead.id, newActivity);
                        }
                      }}
                      disabled={!newActivity.subject.trim()}
                    >
                      追加
                    </button>
                  </div>
                )}

                <div className="activity-list">
                  {leadActivities.length === 0 ? (
                    <div className="no-activities">活動履歴がありません</div>
                  ) : (
                    leadActivities.map(activity => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-icon">
                          {activityTypeLabels[activity.type]?.split(' ')[0] || '📋'}
                        </div>
                        <div className="activity-content">
                          <div className="activity-subject">{activity.subject}</div>
                          {activity.description && (
                            <div className="activity-description">{activity.description}</div>
                          )}
                          {activity.outcome && (
                            <div className="activity-outcome">結果: {activity.outcome}</div>
                          )}
                        </div>
                        <div className="activity-date">
                          {activity.activity_date
                            ? new Date(activity.activity_date).toLocaleDateString('ja-JP')
                            : '-'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedLead.notes && (
                <div className="lead-notes-section">
                  <h4>メモ</h4>
                  <div className="notes-content">{selectedLead.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ========== パイプライン管理タブ ==========
  const renderPipelineTab = () => {
    const stages = ['discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const stageLabels: Record<string, string> = {
      discovery: '発掘',
      proposal: '提案',
      negotiation: '交渉',
      closed_won: '受注',
      closed_lost: '失注'
    };

    return (
      <div className="dashboard-tab-content">
        {/* ビュー切替 */}
        <div className="pipeline-view-tabs">
          <button className={`view-tab ${pipelineView === 'kanban' ? 'active' : ''}`} onClick={() => setPipelineView('kanban')}>
            カンバン
          </button>
          <button className={`view-tab ${pipelineView === 'funnel' ? 'active' : ''}`} onClick={() => setPipelineView('funnel')}>
            ファネル
          </button>
          <button className={`view-tab ${pipelineView === 'forecast' ? 'active' : ''}`} onClick={() => setPipelineView('forecast')}>
            売上予測
          </button>
          <button className={`view-tab ${pipelineView === 'team' ? 'active' : ''}`} onClick={() => setPipelineView('team')}>
            チーム別
          </button>
        </div>

        {/* サマリーカード */}
        <div className="pipeline-summary">
          <div className="summary-card">
            <div className="summary-label">パイプライン総額</div>
            <div className="summary-value">{(dealAnalytics?.total_pipeline || 0).toLocaleString()}円</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">加重パイプライン</div>
            <div className="summary-value">{(dealAnalytics?.weighted_pipeline || 0).toLocaleString()}円</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">勝率</div>
            <div className="summary-value win">{dealAnalytics?.win_rate || 0}%</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">失注率</div>
            <div className="summary-value loss">{dealAnalytics?.loss_rate || 0}%</div>
          </div>
          <div className="summary-card alert-card">
            <div className="summary-label">滞留案件</div>
            <div className="summary-value">{stalledAlerts.length}件</div>
          </div>
        </div>

        {/* 滞留アラート */}
        {stalledAlerts.length > 0 && (
          <div className="stalled-alerts-section">
            <h4>滞留アラート（14日以上進捗なし）</h4>
            <div className="stalled-alerts-list">
              {stalledAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`stalled-alert-item ${alert.severity}`}>
                  <div className="alert-info">
                    <span className="alert-title">{alert.title}</span>
                    <span className="alert-stage">{stageLabels[alert.stage]}</span>
                  </div>
                  <div className="alert-details">
                    <span className="alert-amount">{(alert.amount || 0).toLocaleString()}円</span>
                    <span className="alert-days">{alert.days_stalled}日滞留</span>
                    <span className="alert-owner">{alert.owner_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* カンバンビュー */}
        {pipelineView === 'kanban' && (
          <div className="kanban-board">
            {stages.filter(s => s !== 'closed_won' && s !== 'closed_lost').map(stage => (
              <div key={stage} className="kanban-column">
                <div className="kanban-column-header">
                  <span>{stageLabels[stage]}</span>
                  <span className="kanban-count">
                    {pipelineMetrics?.stage_metrics[stage]?.count || 0}
                  </span>
                </div>
                <div className="kanban-amount">
                  {(pipelineMetrics?.stage_metrics[stage]?.total_amount || 0).toLocaleString()}円
                </div>
                <div className="kanban-cards">
                  {deals.filter(d => d.stage === stage).map(deal => (
                    <div key={deal.id} className={`kanban-card ${stalledAlerts.some(a => a.id === deal.id) ? 'stalled' : ''}`}>
                      <div className="kanban-card-title">{deal.title}</div>
                      <div className="kanban-card-amount">{(deal.amount || 0).toLocaleString()}円</div>
                      <div className="kanban-card-footer">
                        <span className="probability">{deal.probability}%</span>
                        <span className="close-date">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('ja-JP') : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ファネルビュー */}
        {pipelineView === 'funnel' && dealAnalytics && (
          <div className="funnel-view">
            <div className="funnel-chart">
              {stages.filter(s => s !== 'closed_won' && s !== 'closed_lost').map((stage, idx) => {
                const data = dealAnalytics.stage_data[stage];
                const maxAmount = Math.max(...Object.values(dealAnalytics.stage_data).map(d => d.total_amount));
                const widthPercent = maxAmount > 0 ? (data.total_amount / maxAmount) * 100 : 0;
                return (
                  <div key={stage} className="funnel-stage">
                    <div className="funnel-label">
                      <span className="stage-name">{stageLabels[stage]}</span>
                      <span className="stage-count">{data.count}件</span>
                    </div>
                    <div className="funnel-bar-container">
                      <div className="funnel-bar" style={{ width: `${Math.max(widthPercent, 10)}%` }}>
                        <span>{data.total_amount.toLocaleString()}円</span>
                      </div>
                    </div>
                    {dealAnalytics.transition_rates[idx] && (
                      <div className="transition-rate">
                        → {dealAnalytics.transition_rates[idx].rate}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="probability-breakdown">
              <h4>確度別内訳</h4>
              {dealAnalytics.probability_data.map(pd => (
                <div key={pd.range} className="prob-row">
                  <span className="prob-label">{pd.range}</span>
                  <span className="prob-count">{pd.count}件</span>
                  <span className="prob-amount">{pd.amount.toLocaleString()}円</span>
                  <span className="prob-weighted">加重: {pd.weighted.toLocaleString()}円</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 売上予測ビュー */}
        {pipelineView === 'forecast' && forecastData && (
          <div className="forecast-view">
            <div className="forecast-cards">
              <div className="forecast-card">
                <div className="forecast-period">今月 ({forecastData.current_month.period})</div>
                <div className="forecast-main">
                  <div className="forecast-total">{forecastData.current_month.total_amount.toLocaleString()}円</div>
                  <div className="forecast-weighted">加重: {forecastData.current_month.weighted_amount.toLocaleString()}円</div>
                </div>
                <div className="forecast-breakdown">
                  <div className="forecast-item high">
                    <span>高確度(75%以上)</span>
                    <span>{forecastData.current_month.high_probability.toLocaleString()}円</span>
                  </div>
                  <div className="forecast-item mid">
                    <span>中確度(50-74%)</span>
                    <span>{forecastData.current_month.mid_probability.toLocaleString()}円</span>
                  </div>
                  <div className="forecast-item low">
                    <span>低確度(50%未満)</span>
                    <span>{forecastData.current_month.low_probability.toLocaleString()}円</span>
                  </div>
                </div>
                <div className="forecast-count">{forecastData.current_month.deal_count}件</div>
              </div>
              <div className="forecast-card">
                <div className="forecast-period">今四半期 ({forecastData.current_quarter.period})</div>
                <div className="forecast-main">
                  <div className="forecast-total">{forecastData.current_quarter.total_amount.toLocaleString()}円</div>
                  <div className="forecast-weighted">加重: {forecastData.current_quarter.weighted_amount.toLocaleString()}円</div>
                </div>
                <div className="forecast-breakdown">
                  <div className="forecast-item high">
                    <span>高確度(75%以上)</span>
                    <span>{forecastData.current_quarter.high_probability.toLocaleString()}円</span>
                  </div>
                  <div className="forecast-item mid">
                    <span>中確度(50-74%)</span>
                    <span>{forecastData.current_quarter.mid_probability.toLocaleString()}円</span>
                  </div>
                  <div className="forecast-item low">
                    <span>低確度(50%未満)</span>
                    <span>{forecastData.current_quarter.low_probability.toLocaleString()}円</span>
                  </div>
                </div>
                <div className="forecast-count">{forecastData.current_quarter.deal_count}件</div>
              </div>
            </div>
          </div>
        )}

        {/* チーム別ビュー */}
        {pipelineView === 'team' && (
          <div className="team-view">
            <div className="team-table-container">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>担当者</th>
                    <th>案件数</th>
                    <th>パイプライン</th>
                    <th>加重パイプライン</th>
                    <th>発掘</th>
                    <th>提案</th>
                    <th>交渉</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerData.map(owner => (
                    <tr key={owner.owner_id}>
                      <td className="owner-name">{owner.owner_name}</td>
                      <td>{owner.deal_count}</td>
                      <td>{owner.total_amount.toLocaleString()}円</td>
                      <td>{Math.round(owner.weighted_amount).toLocaleString()}円</td>
                      <td>{owner.stages['discovery']?.count || 0}</td>
                      <td>{owner.stages['proposal']?.count || 0}</td>
                      <td>{owner.stages['negotiation']?.count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ownerData.length === 0 && (
                <div className="dashboard-empty">担当者データがありません</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========== 問い合わせ管理タブ ==========
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'web': return '🌐';
      case 'email': return '📧';
      case 'phone': return '📞';
      default: return '💬';
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'web': return 'Web';
      case 'email': return 'メール';
      case 'phone': return '電話';
      default: return channel;
    }
  };

  const filteredInquiries = inquiryChannelFilter === 'all'
    ? inquiries
    : inquiries.filter(inq => inq.channel === inquiryChannelFilter);

  const handleInquiryClick = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    await fetchInquiryResponses(inquiry.id);
  };

  const renderInquiriesTab = () => (
    <div className="dashboard-tab-content">
      {/* 統計カード */}
      <div className="inquiry-stats-grid">
        <div className="inquiry-stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <div className="stat-value">{inquiryStats?.total || 0}</div>
            <div className="stat-label">総件数</div>
          </div>
        </div>
        <div className="inquiry-stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{inquiryStats?.open || 0}</div>
            <div className="stat-label">未対応</div>
          </div>
        </div>
        <div className="inquiry-stat-card info">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{inquiryStats?.in_progress || 0}</div>
            <div className="stat-label">対応中</div>
          </div>
        </div>
        <div className="inquiry-stat-card danger">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{inquiryStats?.sla_breached || 0}</div>
            <div className="stat-label">SLA違反</div>
          </div>
        </div>
        <div className="inquiry-stat-card success">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{inquiryStats?.avg_response_time_minutes || 0}分</div>
            <div className="stat-label">平均対応時間</div>
          </div>
        </div>
      </div>

      {/* ビュー切り替え＆フィルター */}
      <div className="inquiry-controls">
        <div className="inquiry-view-toggle">
          <button
            className={`view-btn ${inquiryView === 'list' ? 'active' : ''}`}
            onClick={() => setInquiryView('list')}
          >
            📋 一覧
          </button>
          <button
            className={`view-btn ${inquiryView === 'sla' ? 'active' : ''}`}
            onClick={() => setInquiryView('sla')}
          >
            ⏱️ SLA管理
          </button>
          <button
            className={`view-btn ${inquiryView === 'stats' ? 'active' : ''}`}
            onClick={() => setInquiryView('stats')}
          >
            📊 統計
          </button>
        </div>
        <div className="inquiry-channel-filter">
          <button
            className={`channel-btn ${inquiryChannelFilter === 'all' ? 'active' : ''}`}
            onClick={() => setInquiryChannelFilter('all')}
          >
            全て
          </button>
          <button
            className={`channel-btn ${inquiryChannelFilter === 'web' ? 'active' : ''}`}
            onClick={() => setInquiryChannelFilter('web')}
          >
            🌐 Web ({channelStats?.channels?.web?.open || 0})
          </button>
          <button
            className={`channel-btn ${inquiryChannelFilter === 'email' ? 'active' : ''}`}
            onClick={() => setInquiryChannelFilter('email')}
          >
            📧 メール ({channelStats?.channels?.email?.open || 0})
          </button>
          <button
            className={`channel-btn ${inquiryChannelFilter === 'phone' ? 'active' : ''}`}
            onClick={() => setInquiryChannelFilter('phone')}
          >
            📞 電話 ({channelStats?.channels?.phone?.open || 0})
          </button>
        </div>
      </div>

      {/* 一覧ビュー */}
      {inquiryView === 'list' && (
        <div className="dashboard-table-container">
          <table className="dashboard-table inquiry-table">
            <thead>
              <tr>
                <th>チャネル</th>
                <th>件名</th>
                <th>顧客名</th>
                <th>ステータス</th>
                <th>優先度</th>
                <th>SLA</th>
                <th>作成日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map(inq => (
                <tr key={inq.id} className={inq.is_sla_breached ? 'sla-breached-row' : ''}>
                  <td>
                    <span className={`channel-badge channel-${inq.channel}`}>
                      {getChannelIcon(inq.channel)} {getChannelLabel(inq.channel)}
                    </span>
                  </td>
                  <td className="inquiry-subject" onClick={() => handleInquiryClick(inq)}>
                    {inq.subject || '(無題)'}
                  </td>
                  <td>{inq.customer_name || '-'}</td>
                  <td><StatusBadge status={inq.status} type="inquiry" /></td>
                  <td><StatusBadge status={inq.priority} type="priority" /></td>
                  <td>
                    {inq.is_sla_breached ? (
                      <span className="sla-badge sla-breached">違反</span>
                    ) : inq.sla_met ? (
                      <span className="sla-badge sla-met">達成</span>
                    ) : (
                      <span className="sla-badge sla-pending">
                        {inq.sla_target_minutes}分以内
                      </span>
                    )}
                  </td>
                  <td>{new Date(inq.created_at).toLocaleString('ja-JP')}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn"
                        onClick={() => handleInquiryClick(inq)}
                        title="詳細・対応"
                      >
                        💬
                      </button>
                      {inq.status !== 'resolved' && inq.status !== 'closed' && (
                        <button
                          className="action-btn resolve"
                          onClick={() => updateInquiryStatus(inq.id, 'resolved')}
                          title="解決済みにする"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInquiries.length === 0 && (
            <div className="dashboard-empty">問い合わせデータがありません</div>
          )}
        </div>
      )}

      {/* SLA管理ビュー */}
      {inquiryView === 'sla' && (
        <div className="sla-management-view">
          <div className="sla-summary">
            <div className="sla-metric">
              <div className="sla-metric-label">SLA遵守率</div>
              <div className="sla-metric-value">
                {inquiries.length > 0
                  ? Math.round((inquiries.filter(i => !i.is_sla_breached).length / inquiries.length) * 100)
                  : 100}%
              </div>
            </div>
            <div className="sla-metric">
              <div className="sla-metric-label">本日解決</div>
              <div className="sla-metric-value">{inquiryStats?.today_resolved || 0}件</div>
            </div>
            <div className="sla-metric">
              <div className="sla-metric-label">本日新規</div>
              <div className="sla-metric-value">{inquiryStats?.today_new || 0}件</div>
            </div>
          </div>

          <h4>SLA違反・リスク案件</h4>
          <div className="sla-alerts-list">
            {inquiries.filter(i => i.is_sla_breached || (i.status === 'open' && !i.first_response_at)).map(inq => (
              <div key={inq.id} className={`sla-alert-card ${inq.is_sla_breached ? 'breached' : 'at-risk'}`}>
                <div className="sla-alert-header">
                  <span className={`channel-badge channel-${inq.channel}`}>
                    {getChannelIcon(inq.channel)}
                  </span>
                  <span className="sla-alert-subject">{inq.subject || '(無題)'}</span>
                  {inq.is_sla_breached && <span className="sla-breached-tag">SLA違反</span>}
                </div>
                <div className="sla-alert-body">
                  <div>顧客: {inq.customer_name || '-'}</div>
                  <div>受付: {new Date(inq.created_at).toLocaleString('ja-JP')}</div>
                  <div>目標: {inq.sla_target_minutes}分以内</div>
                </div>
                <button
                  className="sla-respond-btn"
                  onClick={() => handleInquiryClick(inq)}
                >
                  対応する
                </button>
              </div>
            ))}
            {inquiries.filter(i => i.is_sla_breached || (i.status === 'open' && !i.first_response_at)).length === 0 && (
              <div className="dashboard-empty">SLA違反・リスク案件はありません</div>
            )}
          </div>
        </div>
      )}

      {/* 統計ビュー */}
      {inquiryView === 'stats' && (
        <div className="inquiry-stats-view">
          <div className="stats-section">
            <h4>チャネル別統計</h4>
            <div className="channel-stats-grid">
              {['web', 'email', 'phone'].map(channel => (
                <div key={channel} className="channel-stat-card">
                  <div className="channel-stat-header">
                    {getChannelIcon(channel)} {getChannelLabel(channel)}
                  </div>
                  <div className="channel-stat-body">
                    <div className="channel-stat-item">
                      <span>総数</span>
                      <span>{channelStats?.channels?.[channel]?.total || 0}</span>
                    </div>
                    <div className="channel-stat-item">
                      <span>対応中</span>
                      <span>{channelStats?.channels?.[channel]?.open || 0}</span>
                    </div>
                    <div className="channel-stat-item">
                      <span>本日解決</span>
                      <span>{channelStats?.channels?.[channel]?.resolved_today || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-section">
            <h4>対応状況</h4>
            <div className="status-breakdown">
              <div className="status-bar">
                <div
                  className="status-segment open"
                  style={{ width: `${inquiryStats?.total ? (inquiryStats.open / inquiryStats.total * 100) : 0}%` }}
                  title={`未対応: ${inquiryStats?.open || 0}`}
                />
                <div
                  className="status-segment in-progress"
                  style={{ width: `${inquiryStats?.total ? (inquiryStats.in_progress / inquiryStats.total * 100) : 0}%` }}
                  title={`対応中: ${inquiryStats?.in_progress || 0}`}
                />
                <div
                  className="status-segment resolved"
                  style={{ width: `${inquiryStats?.total ? (inquiryStats.resolved / inquiryStats.total * 100) : 0}%` }}
                  title={`解決済み: ${inquiryStats?.resolved || 0}`}
                />
              </div>
              <div className="status-legend">
                <span className="legend-item"><span className="legend-dot open"></span>未対応 ({inquiryStats?.open || 0})</span>
                <span className="legend-item"><span className="legend-dot in-progress"></span>対応中 ({inquiryStats?.in_progress || 0})</span>
                <span className="legend-item"><span className="legend-dot resolved"></span>解決済み ({inquiryStats?.resolved || 0})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 問い合わせ詳細モーダル */}
      {selectedInquiry && (
        <div className="inquiry-detail-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="inquiry-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="inquiry-detail-header">
              <h3>
                <span className={`channel-badge channel-${selectedInquiry.channel}`}>
                  {getChannelIcon(selectedInquiry.channel)}
                </span>
                {selectedInquiry.subject || '(無題)'}
              </h3>
              <button className="close-btn" onClick={() => setSelectedInquiry(null)}>×</button>
            </div>

            <div className="inquiry-detail-info">
              <div className="info-row">
                <span className="info-label">顧客名:</span>
                <span>{selectedInquiry.customer_name || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">メール:</span>
                <span>{selectedInquiry.customer_email || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">ステータス:</span>
                <StatusBadge status={selectedInquiry.status} type="inquiry" />
              </div>
              <div className="info-row">
                <span className="info-label">優先度:</span>
                <StatusBadge status={selectedInquiry.priority} type="priority" />
              </div>
              <div className="info-row">
                <span className="info-label">受付日時:</span>
                <span>{new Date(selectedInquiry.created_at).toLocaleString('ja-JP')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">SLA:</span>
                <span>
                  {selectedInquiry.is_sla_breached ? (
                    <span className="sla-badge sla-breached">違反</span>
                  ) : selectedInquiry.sla_met ? (
                    <span className="sla-badge sla-met">達成 ({selectedInquiry.response_time_minutes}分)</span>
                  ) : (
                    <span className="sla-badge sla-pending">{selectedInquiry.sla_target_minutes}分以内</span>
                  )}
                </span>
              </div>
            </div>

            <div className="inquiry-responses-section">
              <h4>対応履歴</h4>
              <div className="responses-list">
                {inquiryResponses.length === 0 ? (
                  <div className="no-responses">まだ対応履歴がありません</div>
                ) : (
                  inquiryResponses.map(resp => (
                    <div key={resp.id} className="response-item">
                      <div className="response-header">
                        <span className="response-time">
                          {new Date(resp.created_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="response-content">{resp.content}</div>
                    </div>
                  ))
                )}
              </div>

              {selectedInquiry.status !== 'closed' && (
                <div className="add-response-form">
                  <textarea
                    placeholder="対応内容を入力..."
                    value={newResponseContent}
                    onChange={e => setNewResponseContent(e.target.value)}
                    rows={3}
                  />
                  <div className="response-actions">
                    <button
                      className="submit-response-btn"
                      onClick={() => {
                        if (newResponseContent.trim()) {
                          addInquiryResponse(selectedInquiry.id, newResponseContent);
                        }
                      }}
                      disabled={!newResponseContent.trim()}
                    >
                      対応を追加
                    </button>
                    {selectedInquiry.status !== 'resolved' && (
                      <button
                        className="resolve-btn"
                        onClick={() => {
                          updateInquiryStatus(selectedInquiry.id, 'resolved');
                          setSelectedInquiry(null);
                        }}
                      >
                        解決済みにする
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ========== 提案書作成タブ ==========
  const handleGenerateProposal = async () => {
    setIsLoading(true);
    setAiResult('');
    try {
      const res = await fetch(`${API_BASE}/api/proposals/ai/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: proposalInput.clientName,
          client_needs: proposalInput.clientNeeds,
          product_name: proposalInput.productName,
          product_features: proposalInput.productFeatures,
          hearing_notes: proposalInput.hearingNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.content);
      } else {
        setAiResult(`エラー: ${data.error}`);
      }
    } catch (e) {
      setAiResult(`接続エラー: ${e}`);
    }
    setIsLoading(false);
  };

  const renderProposalsTab = () => (
    <div className="dashboard-tab-content">
      {/* ビュー切替 */}
      <div className="proposal-controls">
        <div className="proposal-view-toggle">
          <button className={`view-btn ${proposalView === 'list' ? 'active' : ''}`} onClick={() => setProposalView('list')}>
            📋 提案書一覧
          </button>
          <button className={`view-btn ${proposalView === 'templates' ? 'active' : ''}`} onClick={() => setProposalView('templates')}>
            📁 テンプレート
          </button>
          <button className={`view-btn ${proposalView === 'create' ? 'active' : ''}`} onClick={() => setProposalView('create')}>
            ✨ AI生成
          </button>
          <button className={`view-btn ${proposalView === 'quote' ? 'active' : ''}`} onClick={() => setProposalView('quote')}>
            💰 見積シミュレーション
          </button>
        </div>
      </div>

      {/* 提案書一覧ビュー */}
      {proposalView === 'list' && (
        <div className="proposals-list-view">
          <div className="dashboard-section-header">
            <h3>提案書一覧</h3>
            <span className="count-badge">{proposals.length}件</span>
          </div>
          <div className="dashboard-table-container">
            <table className="dashboard-table proposal-table">
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>ステータス</th>
                  <th>バージョン</th>
                  <th>作成日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(proposal => (
                  <tr key={proposal.id}>
                    <td className="proposal-title">{proposal.title}</td>
                    <td>
                      <span className={`status-badge status-${proposal.status}`}>
                        {proposal.status === 'draft' ? '下書き' : proposal.status === 'sent' ? '送付済' : proposal.status === 'accepted' ? '受注' : '失注'}
                      </span>
                    </td>
                    <td>v{proposal.version}</td>
                    <td>{new Date(proposal.created_at).toLocaleDateString('ja-JP')}</td>
                    <td>
                      <div className="proposal-actions">
                        {proposal.lead_id && (
                          <button className="action-btn" onClick={() => autofillCustomer(proposal.id)} title="顧客情報差込">
                            👤
                          </button>
                        )}
                        <button className="action-btn" onClick={() => exportPdf(proposal.id)} title="PDF出力">
                          📄
                        </button>
                        <button className="action-btn" onClick={() => exportPptx(proposal.id)} title="PowerPoint出力">
                          📽️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proposals.length === 0 && <div className="dashboard-empty">提案書がありません</div>}
          </div>
        </div>
      )}

      {/* テンプレート管理ビュー */}
      {proposalView === 'templates' && (
        <div className="templates-view">
          <div className="dashboard-section-header">
            <h3>テンプレート管理</h3>
            <button className="dashboard-add-btn" onClick={() => setShowTemplateForm(!showTemplateForm)}>
              + 新規テンプレート
            </button>
          </div>

          {showTemplateForm && (
            <div className="template-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>テンプレート名</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="DX推進提案テンプレート"
                  />
                </div>
                <div className="form-group">
                  <label>業界</label>
                  <select value={newTemplate.industry} onChange={e => setNewTemplate({ ...newTemplate, industry: e.target.value })}>
                    <option value="">選択してください</option>
                    <option value="製造">製造</option>
                    <option value="金融">金融</option>
                    <option value="小売">小売</option>
                    <option value="IT">IT</option>
                    <option value="医療">医療</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>課題タイプ</label>
                  <select value={newTemplate.issue_type} onChange={e => setNewTemplate({ ...newTemplate, issue_type: e.target.value })}>
                    <option value="">選択してください</option>
                    <option value="業務効率化">業務効率化</option>
                    <option value="コスト削減">コスト削減</option>
                    <option value="DX推進">DX推進</option>
                    <option value="顧客体験向上">顧客体験向上</option>
                    <option value="セキュリティ">セキュリティ</option>
                  </select>
                </div>
              </div>
              <button className="dashboard-submit-btn" onClick={createTemplate} disabled={!newTemplate.name.trim()}>
                テンプレート作成
              </button>
            </div>
          )}

          <div className="templates-grid">
            {templates.map(template => (
              <div key={template.id} className="template-card" onClick={() => setSelectedTemplate(template)}>
                <div className="template-header">
                  <h4>{template.name}</h4>
                  <button className="delete-btn" onClick={e => { e.stopPropagation(); deleteTemplate(template.id); }} title="削除">×</button>
                </div>
                <div className="template-tags">
                  {template.industry && <span className="tag industry">{template.industry}</span>}
                  {template.issue_type && <span className="tag issue">{template.issue_type}</span>}
                </div>
                <div className="template-date">作成: {new Date(template.created_at).toLocaleDateString('ja-JP')}</div>
              </div>
            ))}
            {templates.length === 0 && <div className="dashboard-empty">テンプレートがありません</div>}
          </div>
        </div>
      )}

      {/* AI生成ビュー */}
      {proposalView === 'create' && (
        <div className="create-view">
          <div className="dashboard-section-header">
            <h3>提案書AI生成</h3>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>顧客名</label>
              <input
                type="text"
                value={proposalInput.clientName}
                onChange={e => setProposalInput({ ...proposalInput, clientName: e.target.value })}
                placeholder="株式会社〇〇"
              />
            </div>
            <div className="form-group">
              <label>業界</label>
              <select value={proposalInput.clientIndustry} onChange={e => setProposalInput({ ...proposalInput, clientIndustry: e.target.value })}>
                <option value="">選択してください</option>
                <option value="製造">製造</option>
                <option value="金融">金融</option>
                <option value="小売">小売</option>
                <option value="IT">IT</option>
                <option value="医療">医療</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div className="form-group">
              <label>製品・サービス名</label>
              <input
                type="text"
                value={proposalInput.productName}
                onChange={e => setProposalInput({ ...proposalInput, productName: e.target.value })}
                placeholder="AIソリューション"
              />
            </div>
            <div className="form-group full-width">
              <label>顧客のニーズ・課題</label>
              <textarea
                value={proposalInput.clientNeeds}
                onChange={e => setProposalInput({ ...proposalInput, clientNeeds: e.target.value })}
                placeholder="業務効率化、コスト削減など"
                rows={3}
              />
            </div>
            <div className="form-group full-width">
              <label>製品・サービスの特徴</label>
              <textarea
                value={proposalInput.productFeatures}
                onChange={e => setProposalInput({ ...proposalInput, productFeatures: e.target.value })}
                placeholder="AI自動化、24時間対応など"
                rows={3}
              />
            </div>
            <div className="form-group full-width">
              <label>ヒアリング内容（任意）</label>
              <textarea
                value={proposalInput.hearingNotes}
                onChange={e => setProposalInput({ ...proposalInput, hearingNotes: e.target.value })}
                placeholder="商談でヒアリングした内容"
                rows={3}
              />
            </div>
          </div>

          <button className="dashboard-submit-btn" onClick={handleGenerateProposal} disabled={isLoading}>
            {isLoading ? '生成中...' : '提案書ストーリー生成'}
          </button>

          {aiResult && (
            <div className="ai-result">
              <h4>生成結果</h4>
              <pre>{aiResult}</pre>
            </div>
          )}
        </div>
      )}

      {/* 見積シミュレーションビュー */}
      {proposalView === 'quote' && (
        <div className="quote-view">
          <div className="dashboard-section-header">
            <h3>見積金額シミュレーション</h3>
          </div>

          <div className="quote-items-table">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>項目名</th>
                  <th>説明</th>
                  <th>単価</th>
                  <th>数量</th>
                  <th>金額</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateQuoteItem(index, 'name', e.target.value)}
                        placeholder="項目名"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateQuoteItem(index, 'description', e.target.value)}
                        placeholder="説明"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateQuoteItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min={0}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQuoteItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        min={1}
                      />
                    </td>
                    <td className="amount-cell">¥{(item.unit_price * item.quantity).toLocaleString()}</td>
                    <td>
                      <button className="remove-item-btn" onClick={() => removeQuoteItem(index)} disabled={quoteItems.length === 1}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-item-btn" onClick={addQuoteItem}>+ 項目を追加</button>
          </div>

          <div className="quote-options">
            <div className="form-group">
              <label>割引率 (%)</label>
              <input
                type="number"
                value={discountRate}
                onChange={e => setDiscountRate(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
              />
            </div>
            <div className="form-group">
              <label>税率 (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 10)}
                min={0}
                max={100}
              />
            </div>
          </div>

          <button className="dashboard-submit-btn" onClick={simulateQuote}>
            見積を計算
          </button>

          {quoteSimulation && (
            <div className="quote-result">
              <h4>見積計算結果</h4>
              <div className="quote-summary">
                <div className="summary-row">
                  <span>小計:</span>
                  <span>¥{quoteSimulation.subtotal.toLocaleString()}</span>
                </div>
                {quoteSimulation.discount_rate > 0 && (
                  <div className="summary-row discount">
                    <span>割引 ({quoteSimulation.discount_rate}%):</span>
                    <span>-¥{quoteSimulation.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>割引後:</span>
                  <span>¥{quoteSimulation.after_discount.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>消費税 ({quoteSimulation.tax_rate}%):</span>
                  <span>¥{quoteSimulation.tax_amount.toLocaleString()}</span>
                </div>
                <div className="summary-row total">
                  <span>合計:</span>
                  <span>¥{quoteSimulation.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ========== 営業コーチタブ ==========
  const handleGetCoaching = async () => {
    setIsLoading(true);
    setAiResult('');
    try {
      const res = await fetch(`${API_BASE}/api/sales/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coachInput),
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data.advice);
      } else {
        setAiResult(`エラー: ${data.error}`);
      }
    } catch (e) {
      setAiResult(`接続エラー: ${e}`);
    }
    setIsLoading(false);
  };

  const renderCoachTab = () => {
    // スキルレーダーチャートのレンダリング
    const renderRadarChart = (skills: Record<string, number>, topSkills?: Record<string, number>) => {
      const skillNames = Object.keys(skills);
      const size = 200;
      const centerX = size / 2;
      const centerY = size / 2;
      const maxRadius = 80;
      const levels = 5;

      const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / skillNames.length - Math.PI / 2;
        const radius = (value / 100) * maxRadius;
        return {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      };

      const gridLines = [];
      for (let level = 1; level <= levels; level++) {
        const radius = (level / levels) * maxRadius;
        const points = skillNames.map((_, i) => {
          const angle = (Math.PI * 2 * i) / skillNames.length - Math.PI / 2;
          return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
        }).join(' ');
        gridLines.push(<polygon key={level} points={points} fill="none" stroke="#444" strokeWidth="0.5" />);
      }

      const axisLines = skillNames.map((_, i) => {
        const angle = (Math.PI * 2 * i) / skillNames.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + Math.cos(angle) * maxRadius}
            y2={centerY + Math.sin(angle) * maxRadius}
            stroke="#444"
            strokeWidth="0.5"
          />
        );
      });

      const dataPoints = skillNames.map((name, i) => getPoint(i, skills[name]));
      const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

      let topPath = '';
      if (topSkills) {
        const topPoints = skillNames.map((name, i) => getPoint(i, topSkills[name]));
        topPath = topPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      }

      const labels = skillNames.map((name, i) => {
        const angle = (Math.PI * 2 * i) / skillNames.length - Math.PI / 2;
        const labelRadius = maxRadius + 20;
        return (
          <text
            key={name}
            x={centerX + Math.cos(angle) * labelRadius}
            y={centerY + Math.sin(angle) * labelRadius}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#ccc"
          >
            {name}
          </text>
        );
      });

      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {gridLines}
          {axisLines}
          {topSkills && <path d={topPath} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="1.5" />}
          <path d={dataPath} fill="rgba(34, 197, 94, 0.3)" stroke="#22c55e" strokeWidth="2" />
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#22c55e" />
          ))}
          {labels}
        </svg>
      );
    };

    return (
      <div className="dashboard-tab-content">
        <div className="dashboard-section-header">
          <h3>営業コーチ</h3>
        </div>

        {/* サブナビゲーション */}
        <div className="sub-nav" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'meetings' as const, label: '商談ログ' },
            { id: 'skills' as const, label: 'スキル分析' },
            { id: 'advice' as const, label: 'AIアドバイス' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setCoachView(item.id); setAiResult(''); setFullAnalysis(null); }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: coachView === item.id ? '#3b82f6' : '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 商談ログビュー */}
        {coachView === 'meetings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0 }}>商談ログ一覧</h4>
            </div>

            {selectedMeeting ? (
              <div className="meeting-detail">
                <button onClick={() => { setSelectedMeeting(null); setFullAnalysis(null); }} style={{ marginBottom: '16px', background: '#444', border: 'none', padding: '8px 16px', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                  ← 一覧に戻る
                </button>

                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#888' }}>ID: {selectedMeeting.id}</span>
                    <span style={{ color: '#888' }}>日付: {selectedMeeting.meeting_date ? new Date(selectedMeeting.meeting_date).toLocaleDateString('ja-JP') : '未設定'}</span>
                    <span style={{ color: '#888' }}>時間: {selectedMeeting.duration_minutes || 0}分</span>
                  </div>

                  {selectedMeeting.transcript && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ color: '#ccc', marginBottom: '8px' }}>議事録</h5>
                      <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', whiteSpace: 'pre-wrap', fontSize: '13px', maxHeight: '200px', overflow: 'auto' }}>
                        {selectedMeeting.transcript}
                      </div>
                    </div>
                  )}

                  {selectedMeeting.summary && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ color: '#ccc', marginBottom: '8px' }}>要約</h5>
                      <p style={{ color: '#aaa' }}>{selectedMeeting.summary}</p>
                    </div>
                  )}

                  {selectedMeeting.key_points && selectedMeeting.key_points.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ color: '#ccc', marginBottom: '8px' }}>重要ポイント</h5>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#aaa' }}>
                        {selectedMeeting.key_points.map((point, i) => <li key={i}>{point}</li>)}
                      </ul>
                    </div>
                  )}

                  {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ color: '#ccc', marginBottom: '8px' }}>アクションアイテム</h5>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#aaa' }}>
                        {selectedMeeting.action_items.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {selectedMeeting.ng_words_detected && selectedMeeting.ng_words_detected.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h5 style={{ color: '#ef4444', marginBottom: '8px' }}>検出されたNGワード</h5>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedMeeting.ng_words_detected.map((word, i) => (
                          <span key={i} style={{ background: '#ef444420', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{word}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI分析ボタン */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button onClick={() => runFullAnalysis(selectedMeeting.id)} disabled={isAnalyzing} style={{ padding: '10px 20px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    {isAnalyzing ? '分析中...' : '総合分析'}
                  </button>
                  <button onClick={() => summarizeMeeting(selectedMeeting.id)} disabled={isAnalyzing} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    要約
                  </button>
                  <button onClick={() => detectNgWords(selectedMeeting.id)} disabled={isAnalyzing} style={{ padding: '10px 16px', background: '#f59e0b', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    NGワード検出
                  </button>
                  <button onClick={() => suggestActions(selectedMeeting.id)} disabled={isAnalyzing} style={{ padding: '10px 16px', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    次アクション
                  </button>
                  <button onClick={() => improveTalk(selectedMeeting.id)} disabled={isAnalyzing} style={{ padding: '10px 16px', background: '#ec4899', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                    トーク改善
                  </button>
                </div>

                {/* 総合分析結果 */}
                {fullAnalysis && (
                  <div style={{ background: '#1a3a1a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#22c55e', marginBottom: '16px' }}>総合分析結果</h4>

                    {fullAnalysis.summary && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ color: '#ccc' }}>要約</h5>
                        <p style={{ color: '#aaa' }}>{fullAnalysis.summary.overview}</p>
                        {fullAnalysis.summary.customer_needs?.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <span style={{ color: '#888', fontSize: '12px' }}>顧客ニーズ: </span>
                            {fullAnalysis.summary.customer_needs.map((need, i) => (
                              <span key={i} style={{ background: '#3b82f620', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>{need}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {fullAnalysis.talk_quality && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ color: '#ccc' }}>トーク品質スコア: <span style={{ color: fullAnalysis.talk_quality.score >= 70 ? '#22c55e' : fullAnalysis.talk_quality.score >= 50 ? '#f59e0b' : '#ef4444', fontSize: '24px' }}>{fullAnalysis.talk_quality.score}</span>/100</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                          <div>
                            <span style={{ color: '#22c55e', fontSize: '12px' }}>良かった点</span>
                            <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#aaa', fontSize: '12px' }}>
                              {fullAnalysis.talk_quality.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div>
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>改善点</span>
                            <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#aaa', fontSize: '12px' }}>
                              {fullAnalysis.talk_quality.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {fullAnalysis.ng_words_analysis?.improvements && fullAnalysis.ng_words_analysis.improvements.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ color: '#f59e0b' }}>表現の改善案</h5>
                        {fullAnalysis.ng_words_analysis.improvements.map((imp, i) => (
                          <div key={i} style={{ background: '#2a2a2a', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                            <div><span style={{ color: '#ef4444' }}>「{imp.original}」</span> → <span style={{ color: '#22c55e' }}>「{imp.suggestion}」</span></div>
                            <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>{imp.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {fullAnalysis.next_actions && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ color: '#8b5cf6' }}>次のアクション</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px' }}>
                          <div>
                            <span style={{ color: '#888', fontSize: '11px' }}>今すぐ</span>
                            <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#aaa', fontSize: '12px' }}>
                              {fullAnalysis.next_actions.immediate?.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                          <div>
                            <span style={{ color: '#888', fontSize: '11px' }}>フォロー</span>
                            <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#aaa', fontSize: '12px' }}>
                              {fullAnalysis.next_actions.follow_up?.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                          <div>
                            <span style={{ color: '#888', fontSize: '11px' }}>次回準備</span>
                            <ul style={{ margin: '4px 0', paddingLeft: '16px', color: '#aaa', fontSize: '12px' }}>
                              {fullAnalysis.next_actions.preparation?.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {fullAnalysis.coaching_tips?.recommended_scripts && fullAnalysis.coaching_tips.recommended_scripts.length > 0 && (
                      <div>
                        <h5 style={{ color: '#ec4899' }}>推奨トークスクリプト</h5>
                        {fullAnalysis.coaching_tips.recommended_scripts.map((script, i) => (
                          <div key={i} style={{ background: '#2a2a2a', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                            <div style={{ color: '#888', fontSize: '11px' }}>{script.situation}</div>
                            <div style={{ color: '#fff', marginTop: '4px' }}>「{script.script}」</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {aiResult && !fullAnalysis && (
                  <div className="ai-result">
                    <h4>AI分析結果</h4>
                    <pre>{aiResult}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="meeting-list">
                {meetingLogs.length === 0 ? (
                  <div className="dashboard-empty">商談ログがありません。</div>
                ) : (
                  meetingLogs.map(meeting => (
                    <div key={meeting.id} onClick={() => setSelectedMeeting(meeting)} style={{ background: '#2a2a2a', padding: '12px 16px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#333'} onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a2a'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>商談 #{meeting.id}</span>
                          <span style={{ color: '#888', marginLeft: '12px', fontSize: '13px' }}>
                            {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('ja-JP') : '日付未設定'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {meeting.summary && <span style={{ background: '#22c55e20', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>要約済</span>}
                          {meeting.ng_words_detected && meeting.ng_words_detected.length > 0 && <span style={{ background: '#ef444420', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>NG: {meeting.ng_words_detected.length}</span>}
                        </div>
                      </div>
                      {meeting.summary && <p style={{ color: '#888', fontSize: '12px', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meeting.summary}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* スキル分析ビュー */}
        {coachView === 'skills' && (
          <div>
            <h4 style={{ marginBottom: '16px' }}>個人別スキル分析</h4>

            <div style={{ marginBottom: '16px' }}>
              <select
                value={selectedEmployeeId || ''}
                onChange={(e) => {
                  const empId = Number(e.target.value);
                  setSelectedEmployeeId(empId);
                  if (empId) fetchEmployeeSkills(empId);
                }}
                style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '14px' }}
              >
                <option value="">社員を選択</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {selectedEmployeeId && skillAssessment && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px' }}>
                  <h5 style={{ color: '#ccc', marginBottom: '16px', textAlign: 'center' }}>スキルレーダーチャート</h5>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderRadarChart(skillAssessment.skills)}
                  </div>
                  <button
                    onClick={() => selectedEmployeeId && assessEmployeeSkills(selectedEmployeeId)}
                    disabled={isAnalyzing}
                    style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                  >
                    {isAnalyzing ? 'AI評価中...' : 'AIでスキル再評価'}
                  </button>
                </div>

                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px' }}>
                  <h5 style={{ color: '#ccc', marginBottom: '16px' }}>スキル詳細</h5>
                  {Object.entries(skillAssessment.skills).map(([name, score]) => (
                    <div key={name} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#aaa' }}>{name}</span>
                        <span style={{ color: score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{score}</span>
                      </div>
                      <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiResult && (
              <div className="ai-result" style={{ marginTop: '16px' }}>
                <h4>AI評価結果</h4>
                <pre>{aiResult}</pre>
              </div>
            )}
          </div>
        )}

        {/* AIアドバイスビュー（従来の機能） */}
        {coachView === 'advice' && (
          <div>
            <h4 style={{ marginBottom: '16px' }}>AIコーチにアドバイスを求める</h4>

            <div className="form-grid">
              <div className="form-group full-width">
                <label>現在の状況</label>
                <textarea
                  value={coachInput.situation}
                  onChange={e => setCoachInput({ ...coachInput, situation: e.target.value })}
                  placeholder="商談の状況、課題、悩みなどを入力してください"
                  rows={5}
                />
              </div>
              <div className="form-group full-width">
                <label>質問（任意）</label>
                <textarea
                  value={coachInput.question}
                  onChange={e => setCoachInput({ ...coachInput, question: e.target.value })}
                  placeholder="具体的に聞きたいことがあれば入力してください"
                  rows={3}
                />
              </div>
            </div>

            <button className="dashboard-submit-btn" onClick={handleGetCoaching} disabled={isLoading}>
              {isLoading ? 'アドバイス取得中...' : 'アドバイスを取得'}
            </button>

            {aiResult && (
              <div className="ai-result">
                <h4>コーチからのアドバイス</h4>
                <pre>{aiResult}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ========== アラートタブ ==========
  const handleMarkAsRead = async (alertId: number) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/read`, { method: 'PUT' });
      fetchAlerts();
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const handleDismissAlert = async (alertId: number) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/dismiss`, { method: 'PUT' });
      fetchAlerts();
    } catch (e) {
      console.error('Failed to dismiss alert:', e);
    }
  };

  const renderAlertsTab = () => (
    <div className="dashboard-tab-content">
      <div className="dashboard-section-header">
        <h3>アラート</h3>
        <span className="alert-badge">{unreadAlertCount} 未読</span>
      </div>

      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={alert.id} className={`alert-card ${alert.is_read ? 'read' : 'unread'}`}>
            <div className="alert-header">
              <StatusBadge status={alert.priority} type="priority" />
              <span className="alert-type">{alert.type}</span>
              <span className="alert-time">
                {new Date(alert.triggered_at).toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="alert-title">{alert.title}</div>
            <div className="alert-description">{alert.description}</div>
            <div className="alert-actions">
              {!alert.is_read && (
                <button onClick={() => handleMarkAsRead(alert.id)}>既読にする</button>
              )}
              <button onClick={() => handleDismissAlert(alert.id)}>却下</button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="dashboard-empty">アラートはありません</div>
        )}
      </div>
    </div>
  );

  // ========== レンダリング ==========
  const renderTabContent = () => {
    switch (activeTab) {
      case 'leads': return renderLeadsTab();
      case 'inquiries': return renderInquiriesTab();
      case 'pipeline': return renderPipelineTab();
      case 'proposals': return renderProposalsTab();
      case 'coach': return renderCoachTab();
      case 'alerts': return renderAlertsTab();
      default: return null;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="sales-dashboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="sales-dashboard-header">
          <h2>営業ダッシュボード</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* タブナビゲーション */}
        <div className="sales-dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setAiResult(''); }}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.id === 'alerts' && unreadAlertCount > 0 && (
                <span className="tab-badge">{unreadAlertCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="sales-dashboard-content">
          {renderTabContent()}
        </div>
      </div>

      <style>{`
        .sales-dashboard-modal {
          background: #202123;
          border-radius: 12px;
          width: 95vw;
          max-width: 1400px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sales-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #343541;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .sales-dashboard-header h2 {
          margin: 0;
          font-size: 18px;
          color: #ececf1;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: #8e8ea0;
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #ececf1;
        }

        .sales-dashboard-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 24px;
          background: #2a2b32;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #8e8ea0;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .tab-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #ececf1;
        }

        .tab-btn.active {
          background: #10a37f;
          color: #fff;
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-badge {
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .sales-dashboard-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .dashboard-tab-content {
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .dashboard-section-header h3 {
          margin: 0;
          color: #ececf1;
          font-size: 16px;
        }

        .dashboard-add-btn {
          background: #10a37f;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .dashboard-add-btn:hover {
          background: #0d8a6a;
        }

        .dashboard-table-container {
          background: #343541;
          border-radius: 8px;
          overflow: hidden;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
        }

        .dashboard-table th,
        .dashboard-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .dashboard-table th {
          background: #2a2b32;
          color: #8e8ea0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .dashboard-table td {
          color: #ececf1;
          font-size: 13px;
        }

        .dashboard-table tbody tr:hover {
          background: rgba(255,255,255,0.05);
        }

        .dashboard-empty {
          padding: 40px;
          text-align: center;
          color: #8e8ea0;
        }

        .score-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .score-bar .score-fill {
          height: 6px;
          background: #10a37f;
          border-radius: 3px;
          width: 60px;
        }

        .score-bar span {
          font-size: 12px;
          color: #8e8ea0;
        }

        .channel-badge {
          background: #3b82f6;
          color: #fff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        .channel-badge.channel-web { background: #3b82f6; }
        .channel-badge.channel-email { background: #8b5cf6; }
        .channel-badge.channel-phone { background: #22c55e; }

        .sla-breached {
          color: #ef4444;
          font-weight: 600;
        }

        .sla-ok {
          color: #22c55e;
        }

        /* 問い合わせ統計カード */
        .inquiry-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .inquiry-stat-card {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inquiry-stat-card.warning { border-left: 3px solid #f59e0b; }
        .inquiry-stat-card.danger { border-left: 3px solid #ef4444; }
        .inquiry-stat-card.success { border-left: 3px solid #22c55e; }
        .inquiry-stat-card.info { border-left: 3px solid #3b82f6; }

        .stat-icon { font-size: 24px; }
        .stat-content { flex: 1; }
        .stat-value { font-size: 24px; font-weight: 600; color: #ececf1; }
        .stat-label { font-size: 12px; color: #8e8ea0; }

        /* 問い合わせコントロール */
        .inquiry-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .inquiry-view-toggle, .inquiry-channel-filter {
          display: flex;
          gap: 4px;
        }

        .view-btn, .channel-btn {
          background: #343541;
          border: none;
          color: #8e8ea0;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .view-btn:hover, .channel-btn:hover {
          background: #444654;
          color: #ececf1;
        }

        .view-btn.active, .channel-btn.active {
          background: #10a37f;
          color: #fff;
        }

        /* SLAバッジ */
        .sla-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .sla-badge.sla-breached {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .sla-badge.sla-met {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .sla-badge.sla-pending {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        /* テーブル行 */
        .sla-breached-row {
          background: rgba(239, 68, 68, 0.1) !important;
        }

        .inquiry-subject {
          cursor: pointer;
          color: #3b82f6;
        }

        .inquiry-subject:hover {
          text-decoration: underline;
        }

        .action-buttons {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          background: #444654;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #565869;
        }

        .action-btn.resolve {
          color: #22c55e;
        }

        /* SLA管理ビュー */
        .sla-management-view h4 {
          color: #ececf1;
          margin: 20px 0 12px;
        }

        .sla-summary {
          display: flex;
          gap: 24px;
          margin-bottom: 20px;
        }

        .sla-metric {
          background: #343541;
          padding: 16px 24px;
          border-radius: 8px;
        }

        .sla-metric-label {
          color: #8e8ea0;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .sla-metric-value {
          color: #ececf1;
          font-size: 28px;
          font-weight: 700;
        }

        .sla-alerts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sla-alert-card {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid #f59e0b;
        }

        .sla-alert-card.breached {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .sla-alert-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .sla-alert-subject {
          color: #ececf1;
          font-weight: 500;
          flex: 1;
        }

        .sla-breached-tag {
          background: #ef4444;
          color: #fff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        .sla-alert-body {
          color: #8e8ea0;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .sla-alert-body div {
          margin-bottom: 4px;
        }

        .sla-respond-btn {
          background: #10a37f;
          border: none;
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .sla-respond-btn:hover {
          background: #0d8a6a;
        }

        /* 統計ビュー */
        .inquiry-stats-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .stats-section h4 {
          color: #ececf1;
          margin-bottom: 12px;
        }

        .channel-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .channel-stat-card {
          background: #343541;
          border-radius: 8px;
          overflow: hidden;
        }

        .channel-stat-header {
          background: #444654;
          padding: 12px 16px;
          font-weight: 500;
          color: #ececf1;
        }

        .channel-stat-body {
          padding: 16px;
        }

        .channel-stat-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: #8e8ea0;
        }

        .channel-stat-item:last-child {
          border-bottom: none;
        }

        .channel-stat-item span:last-child {
          color: #ececf1;
          font-weight: 500;
        }

        .status-breakdown {
          background: #343541;
          padding: 20px;
          border-radius: 8px;
        }

        .status-bar {
          display: flex;
          height: 24px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .status-segment {
          transition: width 0.3s;
        }

        .status-segment.open { background: #f59e0b; }
        .status-segment.in-progress { background: #3b82f6; }
        .status-segment.resolved { background: #22c55e; }

        .status-legend {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8e8ea0;
          font-size: 13px;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-dot.open { background: #f59e0b; }
        .legend-dot.in-progress { background: #3b82f6; }
        .legend-dot.resolved { background: #22c55e; }

        /* 問い合わせ詳細モーダル */
        .inquiry-detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .inquiry-detail-modal {
          background: #202123;
          border-radius: 12px;
          width: 600px;
          max-width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
        }

        .inquiry-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #343541;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .inquiry-detail-header h3 {
          margin: 0;
          font-size: 16px;
          color: #ececf1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inquiry-detail-info {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .info-row {
          display: flex;
          margin-bottom: 12px;
        }

        .info-label {
          color: #8e8ea0;
          width: 100px;
          flex-shrink: 0;
        }

        .inquiry-responses-section {
          padding: 20px;
        }

        .inquiry-responses-section h4 {
          color: #ececf1;
          margin-bottom: 16px;
        }

        .responses-list {
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 16px;
        }

        .no-responses {
          color: #8e8ea0;
          text-align: center;
          padding: 20px;
        }

        .response-item {
          background: #343541;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .response-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .response-time {
          color: #8e8ea0;
          font-size: 12px;
        }

        .response-content {
          color: #ececf1;
          font-size: 14px;
          white-space: pre-wrap;
        }

        .add-response-form textarea {
          width: 100%;
          background: #343541;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          color: #ececf1;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 12px;
        }

        .add-response-form textarea:focus {
          outline: none;
          border-color: #10a37f;
        }

        .response-actions {
          display: flex;
          gap: 12px;
        }

        .submit-response-btn {
          background: #10a37f;
          border: none;
          color: #fff;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .submit-response-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-response-btn:hover:not(:disabled) {
          background: #0d8a6a;
        }

        .resolve-btn {
          background: #444654;
          border: none;
          color: #22c55e;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .resolve-btn:hover {
          background: #565869;
        }

        /* 見込み客管理 */
        .lead-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .lead-stat-card {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lead-stat-card.info { border-left: 3px solid #3b82f6; }
        .lead-stat-card.success { border-left: 3px solid #22c55e; }
        .lead-stat-card.warning { border-left: 3px solid #f59e0b; }

        .lead-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .lead-view-toggle {
          display: flex;
          gap: 4px;
        }

        .lead-filters {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .lead-filter-select {
          background: #343541;
          border: 1px solid rgba(255,255,255,0.1);
          color: #ececf1;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .lead-row { cursor: pointer; }
        .lead-row:hover { background: #444654; }
        .lead-row.overdue { background: rgba(239, 68, 68, 0.1); }

        .lead-company {
          font-weight: 500;
          color: #3b82f6;
        }

        .text-warning { color: #f59e0b; }
        .text-danger { color: #ef4444; }

        .next-action-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .next-action-cell small {
          font-size: 11px;
          color: #8e8ea0;
        }

        /* リードカンバン */
        .lead-kanban-board {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 16px;
        }

        .lead-kanban-column {
          min-width: 220px;
          background: #343541;
          border-radius: 8px;
          padding: 12px;
        }

        .lead-kanban-card {
          background: #2a2b32;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lead-kanban-card:hover {
          background: #444654;
        }

        .kanban-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .kanban-company {
          font-weight: 500;
          color: #ececf1;
          font-size: 13px;
        }

        .kanban-card-body {
          font-size: 12px;
          color: #8e8ea0;
        }

        .kanban-contact { margin-bottom: 4px; }
        .kanban-value { color: #10a37f; font-weight: 500; }

        .kanban-card-footer {
          margin-top: 8px;
        }

        .score-bar.small {
          height: 4px;
        }

        /* リード統計ビュー */
        .lead-stats-view {
          padding: 16px 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .stats-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
        }

        .stats-section h4 {
          color: #ececf1;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .stats-bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stats-bar-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stats-bar-label {
          width: 60px;
          font-size: 12px;
          color: #8e8ea0;
        }

        .stats-bar-container {
          flex: 1;
          height: 8px;
          background: #2a2b32;
          border-radius: 4px;
          overflow: hidden;
        }

        .stats-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }

        .stats-bar-fill.status-new { background: #3b82f6; }
        .stats-bar-fill.status-contacting { background: #8b5cf6; }
        .stats-bar-fill.status-proposal { background: #f59e0b; }
        .stats-bar-fill.status-negotiation { background: #f97316; }
        .stats-bar-fill.status-won { background: #22c55e; }
        .stats-bar-fill.status-lost { background: #ef4444; }

        .stats-bar-value {
          width: 30px;
          text-align: right;
          font-size: 12px;
          color: #ececf1;
        }

        .temp-stats {
          display: flex;
          gap: 16px;
        }

        .temp-stat {
          flex: 1;
          text-align: center;
          padding: 12px;
          background: #2a2b32;
          border-radius: 6px;
        }

        .temp-icon { font-size: 24px; display: block; margin-bottom: 4px; }
        .temp-label { font-size: 12px; color: #8e8ea0; display: block; }
        .temp-value { font-size: 20px; font-weight: 600; color: #ececf1; }

        .source-stats, .industry-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .source-item, .industry-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: #2a2b32;
          border-radius: 4px;
          font-size: 13px;
        }

        .source-name, .industry-name { color: #8e8ea0; }
        .source-count, .industry-count { color: #ececf1; font-weight: 500; }

        /* リード詳細モーダル */
        .lead-detail-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .lead-detail-modal {
          background: #202123;
          border-radius: 12px;
          width: 800px;
          max-width: 90vw;
          max-height: 85vh;
          overflow-y: auto;
        }

        .lead-detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #343541;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          position: sticky;
          top: 0;
        }

        .lead-detail-header h3 {
          flex: 1;
          margin: 0;
          font-size: 18px;
          color: #ececf1;
        }

        .lead-header-badges {
          display: flex;
          gap: 8px;
        }

        .lead-detail-content {
          padding: 20px;
        }

        .lead-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        .lead-info-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
        }

        .lead-info-section h4 {
          color: #ececf1;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .lead-info-section .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 13px;
        }

        .lead-info-section .info-row span:first-child {
          color: #8e8ea0;
        }

        .lead-info-section .info-row span:last-child {
          color: #ececf1;
        }

        .score-display {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .score-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10a37f, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .score-number {
          font-size: 28px;
          font-weight: 700;
          color: #fff;
        }

        .score-controls {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .score-controls button {
          background: #444654;
          border: none;
          color: #ececf1;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .score-controls button:hover {
          background: #565869;
        }

        .temp-selector {
          display: flex;
          gap: 8px;
        }

        .temp-selector button {
          flex: 1;
          padding: 8px;
          background: #2a2b32;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #8e8ea0;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .temp-selector button:hover {
          background: #444654;
        }

        .temp-selector button.active {
          border-color: #10a37f;
          color: #ececf1;
        }

        .lead-status-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .lead-status-section h4 {
          color: #ececf1;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .status-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .status-btn {
          padding: 8px 16px;
          background: #2a2b32;
          border: 1px solid transparent;
          border-radius: 6px;
          color: #8e8ea0;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .status-btn:hover {
          background: #444654;
        }

        .status-btn.active {
          border-color: #10a37f;
          background: rgba(16, 163, 127, 0.2);
          color: #10a37f;
        }

        .lead-activity-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .activity-header h4 {
          color: #ececf1;
          margin: 0;
          font-size: 14px;
        }

        .add-activity-btn {
          background: #10a37f;
          border: none;
          color: #fff;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .add-activity-btn:hover {
          background: #0d8a6a;
        }

        .activity-form {
          background: #2a2b32;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-form select,
        .activity-form input,
        .activity-form textarea {
          background: #343541;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: #ececf1;
          font-size: 13px;
        }

        .activity-form textarea {
          resize: vertical;
        }

        .activity-form button {
          align-self: flex-end;
          background: #10a37f;
          border: none;
          color: #fff;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
        }

        .activity-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .activity-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .no-activities {
          text-align: center;
          color: #8e8ea0;
          padding: 20px;
        }

        .activity-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #2a2b32;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .activity-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-subject {
          color: #ececf1;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .activity-description {
          color: #8e8ea0;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .activity-outcome {
          color: #10a37f;
          font-size: 12px;
        }

        .activity-date {
          color: #8e8ea0;
          font-size: 12px;
          flex-shrink: 0;
        }

        .lead-notes-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
        }

        .lead-notes-section h4 {
          color: #ececf1;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .notes-content {
          color: #8e8ea0;
          font-size: 14px;
          white-space: pre-wrap;
        }

        /* パイプライン */
        .pipeline-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: #343541;
          padding: 16px 24px;
          border-radius: 8px;
          min-width: 180px;
        }

        .summary-label {
          color: #8e8ea0;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .summary-value {
          color: #ececf1;
          font-size: 24px;
          font-weight: 600;
        }

        .kanban-board {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 16px;
        }

        .kanban-column {
          min-width: 280px;
          background: #343541;
          border-radius: 8px;
          padding: 12px;
        }

        .kanban-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          margin-bottom: 12px;
          color: #ececf1;
          font-weight: 600;
        }

        .kanban-count {
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .kanban-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kanban-card {
          background: #2a2b32;
          padding: 12px;
          border-radius: 6px;
          cursor: pointer;
        }

        .kanban-card:hover {
          background: #3a3b42;
        }

        .kanban-card-title {
          color: #ececf1;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .kanban-card-amount {
          color: #10a37f;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .kanban-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .probability {
          color: #8e8ea0;
          font-size: 12px;
        }

        .stalled-badge {
          background: #ef4444;
          color: #fff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }

        /* パイプラインビュー切替 */
        .pipeline-view-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .view-tab {
          background: #343541;
          border: none;
          color: #8e8ea0;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .view-tab:hover {
          background: #444654;
          color: #ececf1;
        }

        .view-tab.active {
          background: #10a37f;
          color: #fff;
        }

        .summary-value.win { color: #22c55e; }
        .summary-value.loss { color: #ef4444; }
        .summary-card.alert-card { border-left: 3px solid #f59e0b; }

        /* 滞留アラート */
        .stalled-alerts-section {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #f59e0b;
        }

        .stalled-alerts-section h4 {
          margin: 0 0 12px 0;
          color: #f59e0b;
          font-size: 14px;
        }

        .stalled-alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stalled-alert-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2a2b32;
          padding: 10px 12px;
          border-radius: 6px;
          border-left: 3px solid #f59e0b;
        }

        .stalled-alert-item.critical {
          border-left-color: #ef4444;
        }

        .alert-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-info .alert-title {
          color: #ececf1;
          font-size: 13px;
        }

        .alert-info .alert-stage {
          background: rgba(255,255,255,0.1);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: #8e8ea0;
        }

        .alert-details {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
        }

        .alert-details .alert-amount {
          color: #10a37f;
          font-weight: 600;
        }

        .alert-details .alert-days {
          color: #f59e0b;
        }

        .alert-details .alert-owner {
          color: #8e8ea0;
        }

        .kanban-amount {
          color: #10a37f;
          font-size: 12px;
          padding: 0 8px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 8px;
        }

        .kanban-card.stalled {
          border-left: 3px solid #f59e0b;
        }

        .kanban-card-footer .close-date {
          font-size: 11px;
          color: #6b7280;
        }

        /* ファネルビュー */
        .funnel-view {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .funnel-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .funnel-stage {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .funnel-label {
          min-width: 100px;
          display: flex;
          flex-direction: column;
        }

        .funnel-label .stage-name {
          color: #ececf1;
          font-size: 13px;
        }

        .funnel-label .stage-count {
          color: #8e8ea0;
          font-size: 11px;
        }

        .funnel-bar-container {
          flex: 1;
          background: #2a2b32;
          border-radius: 4px;
          height: 36px;
        }

        .funnel-bar {
          background: linear-gradient(90deg, #10a37f, #0d8a6a);
          height: 100%;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }

        .transition-rate {
          min-width: 60px;
          color: #8e8ea0;
          font-size: 12px;
        }

        .probability-breakdown {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
        }

        .probability-breakdown h4 {
          margin: 0 0 12px 0;
          color: #ececf1;
          font-size: 14px;
        }

        .prob-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          font-size: 12px;
        }

        .prob-label { color: #8e8ea0; min-width: 60px; }
        .prob-count { color: #ececf1; }
        .prob-amount { color: #10a37f; }
        .prob-weighted { color: #6b7280; }

        /* 売上予測ビュー */
        .forecast-view {
          padding: 16px 0;
        }

        .forecast-cards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .forecast-card {
          background: #343541;
          border-radius: 12px;
          padding: 20px;
        }

        .forecast-period {
          color: #8e8ea0;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .forecast-main {
          margin-bottom: 16px;
        }

        .forecast-total {
          color: #ececf1;
          font-size: 28px;
          font-weight: 600;
        }

        .forecast-weighted {
          color: #10a37f;
          font-size: 14px;
        }

        .forecast-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .forecast-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
        }

        .forecast-item.high {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .forecast-item.mid {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .forecast-item.low {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .forecast-count {
          color: #6b7280;
          font-size: 11px;
          text-align: right;
        }

        /* チーム別ビュー */
        .team-view {
          padding: 16px 0;
        }

        .team-table-container {
          background: #343541;
          border-radius: 8px;
          overflow: hidden;
        }

        .team-table {
          width: 100%;
          border-collapse: collapse;
        }

        .team-table th,
        .team-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .team-table th {
          background: #2a2b32;
          color: #8e8ea0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .team-table td {
          color: #ececf1;
          font-size: 13px;
        }

        .team-table .owner-name {
          font-weight: 500;
        }

        .team-table tbody tr:hover {
          background: rgba(255,255,255,0.05);
        }

        /* フォーム */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          color: #8e8ea0;
          font-size: 12px;
        }

        .form-group input,
        .form-group textarea {
          background: #343541;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 10px 12px;
          color: #ececf1;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #10a37f;
        }

        .dashboard-submit-btn {
          background: #10a37f;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .dashboard-submit-btn:hover:not(:disabled) {
          background: #0d8a6a;
        }

        .dashboard-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-result {
          margin-top: 24px;
          background: #343541;
          border-radius: 8px;
          padding: 16px;
        }

        .ai-result h4 {
          color: #10a37f;
          margin: 0 0 12px 0;
          font-size: 14px;
        }

        .ai-result pre {
          color: #ececf1;
          font-size: 13px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          font-family: inherit;
          line-height: 1.6;
        }

        /* アラート */
        .alert-badge {
          background: #ef4444;
          color: #fff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-card {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid #10a37f;
        }

        .alert-card.unread {
          border-left-color: #ef4444;
          background: #3a3541;
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .alert-type {
          color: #8e8ea0;
          font-size: 11px;
          text-transform: uppercase;
        }

        .alert-time {
          color: #6b7280;
          font-size: 11px;
          margin-left: auto;
        }

        .alert-title {
          color: #ececf1;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .alert-description {
          color: #8e8ea0;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .alert-actions {
          display: flex;
          gap: 8px;
        }

        .alert-actions button {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #ececf1;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .alert-actions button:hover {
          background: rgba(255,255,255,0.2);
        }

        /* 提案書タブ */
        .proposal-controls {
          margin-bottom: 20px;
        }

        .proposal-view-toggle {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .proposals-list-view,
        .templates-view,
        .create-view,
        .quote-view {
          padding: 0;
        }

        .count-badge {
          background: rgba(16, 163, 127, 0.2);
          color: #10a37f;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
        }

        .proposal-table .proposal-title {
          font-weight: 500;
          color: #ececf1;
        }

        .proposal-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.status-draft {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
        }

        .status-badge.status-sent {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .status-badge.status-accepted {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .status-badge.status-rejected {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        /* テンプレート管理 */
        .template-form {
          background: #343541;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .template-card {
          background: #343541;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid transparent;
        }

        .template-card:hover {
          transform: translateY(-2px);
          border-color: rgba(16, 163, 127, 0.5);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .template-header h4 {
          margin: 0;
          color: #ececf1;
          font-size: 16px;
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 18px;
          padding: 0 4px;
          line-height: 1;
        }

        .delete-btn:hover {
          color: #ef4444;
        }

        .template-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .tag {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
        }

        .tag.industry {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .tag.issue {
          background: rgba(168, 85, 247, 0.2);
          color: #a78bfa;
        }

        .template-date {
          color: #6b7280;
          font-size: 12px;
        }

        /* 見積シミュレーション */
        .quote-items-table {
          margin-bottom: 20px;
        }

        .quote-items-table input {
          background: #2a2b32;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 8px 10px;
          color: #ececf1;
          font-size: 13px;
          width: 100%;
        }

        .quote-items-table input:focus {
          outline: none;
          border-color: #10a37f;
        }

        .quote-items-table input[type="number"] {
          width: 100px;
        }

        .amount-cell {
          color: #10a37f;
          font-weight: 600;
          text-align: right;
          white-space: nowrap;
        }

        .remove-item-btn {
          background: rgba(239, 68, 68, 0.2);
          border: none;
          color: #ef4444;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .remove-item-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.4);
        }

        .remove-item-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .add-item-btn {
          background: rgba(16, 163, 127, 0.2);
          border: none;
          color: #10a37f;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          margin-top: 12px;
        }

        .add-item-btn:hover {
          background: rgba(16, 163, 127, 0.3);
        }

        .quote-options {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .quote-options .form-group {
          flex: 1;
          max-width: 200px;
        }

        .quote-result {
          margin-top: 24px;
          background: #343541;
          border-radius: 8px;
          padding: 20px;
        }

        .quote-result h4 {
          margin: 0 0 16px 0;
          color: #ececf1;
          font-size: 16px;
        }

        .quote-summary {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          color: #ececf1;
          font-size: 14px;
        }

        .summary-row.discount {
          color: #f59e0b;
        }

        .summary-row.total {
          border-bottom: none;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 600;
          color: #10a37f;
        }
      `}</style>
    </div>
  );
};

export default SalesDashboard;
