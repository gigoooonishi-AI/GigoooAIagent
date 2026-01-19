# データ構造

## 1. チャット関連

### Message

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    agent_type?: string;
    processing_time?: number;
    tokens_used?: number;
  };
}
```

### ChatHistory

```typescript
interface ChatHistory {
  id: number;
  title: string;
  agent_type: string;
  messages: Message[];
  created_at: string;
  updated_at?: string;
}
```

### ChatRequest

```typescript
interface ChatRequest {
  message: string;
  agent_type: string;
  context?: Record<string, any>;
  stream?: boolean;
}
```

## 2. リード関連

### Lead

```typescript
interface Lead {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  temperature: 'hot' | 'warm' | 'cold';
  source: 'web' | 'referral' | 'exhibition' | 'advertising' | 'other';
  expected_amount?: number;
  probability?: number;
  bant_score?: BANTScore;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
  assigned_to?: number;
  created_at: string;
  updated_at?: string;
}
```

### BANTScore

```typescript
interface BANTScore {
  budget: {
    score: number;
    detail: string;
  };
  authority: {
    score: number;
    detail: string;
  };
  need: {
    score: number;
    detail: string;
  };
  timeline: {
    score: number;
    detail: string;
  };
  total_score: number;
}
```

### LeadStats

```typescript
interface LeadStats {
  total: number;
  by_status: Record<string, number>;
  by_temperature: Record<string, number>;
  by_source: Record<string, number>;
  conversion_rate: number;
}
```

## 3. 問い合わせ関連

### Inquiry

```typescript
interface Inquiry {
  id: number;
  subject: string;
  customer_name: string;
  customer_email: string;
  channel: 'email' | 'phone' | 'chat' | 'web';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'high' | 'medium' | 'low';
  content: string;
  created_at: string;
  sla_target_minutes: number;
  sla_deadline?: string;
  first_response_at?: string;
  response_time_minutes?: number;
  is_sla_breached: boolean;
  assigned_to?: number;
  category?: string;
}
```

### InquiryResponse

```typescript
interface InquiryResponse {
  id: number;
  inquiry_id: number;
  content: string;
  responded_by: number;
  created_at: string;
}
```

### InquiryStats

```typescript
interface InquiryStats {
  total: number;
  today_new: number;
  open: number;
  in_progress: number;
  resolved: number;
  sla_breached: number;
  by_channel: Record<string, number>;
}
```

## 4. パイプライン関連

### Deal

```typescript
interface Deal {
  id: number;
  title: string;
  stage: 'first_meeting' | 'proposal' | 'quote' | 'negotiation' | 'closed_won' | 'closed_lost';
  amount: number;
  probability: number;
  expected_close_date: string;
  lead_id: number;
  owner_id: number;
  days_stalled?: number;
  activities?: Activity[];
  created_at: string;
  updated_at: string;
}
```

### Activity

```typescript
interface Activity {
  id: number;
  deal_id: number;
  type: 'call' | 'meeting' | 'email' | 'proposal' | 'demo' | 'other';
  description: string;
  date: string;
  created_by: number;
}
```

### PipelineMetrics

```typescript
interface PipelineMetrics {
  stage_metrics: Record<string, {
    count: number;
    total_amount: number;
    weighted_amount: number;
  }>;
  win_rate: number;
  total_pipeline_value: number;
  average_deal_size: number;
  average_lead_time: number;
}
```

### ForecastData

```typescript
interface ForecastData {
  current_month: ForecastPeriod;
  current_quarter: ForecastPeriod;
  total_pipeline: ForecastPeriod;
}

interface ForecastPeriod {
  period: string;
  total_amount: number;
  weighted_amount: number;
  high_probability: number;
  mid_probability: number;
  low_probability: number;
  deal_count: number;
}
```

## 5. 提案書関連

### Proposal

```typescript
interface Proposal {
  id: number;
  title: string;
  lead_id: number;
  deal_id?: number;
  template_id?: number;
  content: ProposalContent;
  status: 'draft' | 'sent' | 'won' | 'lost';
  version: number;
  created_by: number;
  created_at: string;
  updated_at?: string;
  quote?: Quote;
}
```

### ProposalContent

```typescript
interface ProposalContent {
  sections: ProposalSection[];
  metadata?: Record<string, any>;
}

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  order: number;
}
```

### Quote

```typescript
interface Quote {
  items: QuoteItem[];
  subtotal: number;
  discount_rate: number;
  tax_rate: number;
  total: number;
  valid_until?: string;
}

interface QuoteItem {
  name: string;
  description?: string;
  unit_price: number;
  quantity: number;
  amount: number;
}
```

### Competitor

```typescript
interface Competitor {
  id: number;
  name: string;
  description?: string;
  strengths: string[];
  weaknesses: string[];
  pricing_info?: string;
  features: Record<string, any>;
}
```

### WonProposal

```typescript
interface WonProposal {
  id: number;
  industry: string;
  company_size: string;
  deal_value: number;
  pain_points: string[];
  key_success_factors: string[];
  proposal_sections: ProposalSection[];
  quote_items: QuoteItem[];
}
```

## 6. コーチ関連

### Employee

```typescript
interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
}
```

### SkillAssessment

```typescript
interface SkillAssessment {
  employee_id: number;
  assessment_date: string;
  skills: {
    ヒアリング力: number;
    提案力: number;
    クロージング力: number;
    商品知識: number;
    コミュニケーション: number;
    課題発見力: number;
  };
}
```

### MeetingLog

```typescript
interface MeetingLog {
  id: number;
  deal_id?: number;
  employee_id: number;
  meeting_date: string;
  duration_minutes?: number;
  attendees?: string[];
  transcript?: string;
  summary?: string;
  key_points?: string[];
  action_items?: string[];
  ng_words_detected?: string[];
  created_at: string;
}
```

### TopPerformerComparison

```typescript
interface TopPerformerComparison {
  employee: EmployeeMetrics;
  top_performers: EmployeeMetrics[];
  skill_gaps: Record<string, {
    your_score: number;
    top_avg: number;
    gap: number;
  }>;
  ai_analysis: {
    key_differences: string[];
    learning_points: string[];
    action_plan: ActionItem[];
  };
}

interface EmployeeMetrics {
  id: number;
  name: string;
  win_rate: number;
  average_deal_size: number;
  deals_closed: number;
}

interface ActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}
```

## 7. アラート関連

### Alert

```typescript
interface Alert {
  id: number;
  type: 'follow_up' | 'stalled_deal' | 'inquiry_sla' | 'hot_lead';
  entity_type: 'lead' | 'deal' | 'inquiry';
  entity_id: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  assigned_to?: number;
  is_read: boolean;
  is_dismissed: boolean;
  triggered_at: string;
}
```

### AlertRule

```typescript
interface AlertRule {
  id: number;
  name: string;
  type: string;
  condition: AlertCondition;
  action: AlertAction;
  is_active: boolean;
  created_at: string;
}

interface AlertCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: any;
  and?: AlertCondition[];
  or?: AlertCondition[];
}

interface AlertAction {
  create_alert: boolean;
  send_email?: boolean;
  assign_to?: number;
}
```

## 8. ナレッジベース関連

### CompanyMemo

```typescript
interface CompanyMemo {
  id: number;
  lead_id?: number;
  company_name: string;
  original_text: string;
  summary?: string;
  decisions?: string[];
  action_items?: ActionItemDetail[];
  next_actions?: NextActionDetail[];
  meeting_date?: string;
  related_projects?: string[];
  memo_type: 'meeting_note' | 'company_info' | 'other';
  registered_user_name?: string;
  created_at: string;
  updated_at?: string;
}

interface ActionItemDetail {
  owner: string;
  task: string;
  deadline?: string;
}

interface NextActionDetail {
  action: string;
  date?: string;
}
```

### SimpleUser

```typescript
interface SimpleUser {
  id: number;
  name: string;
  created_at: string;
}
```

## 9. 共通型

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

### ApiError

```typescript
interface ApiError {
  detail: string;
  error_code?: string;
  timestamp: string;
}
```

### FilterParams

```typescript
interface FilterParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  [key: string]: any;
}
```
