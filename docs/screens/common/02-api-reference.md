# API リファレンス

## 1. 概要

| 項目 | 値 |
|-----|-----|
| ベースURL | `http://localhost:8000` |
| 認証 | なし（開発環境） |
| コンテンツタイプ | `application/json` |
| 文字エンコーディング | UTF-8 |

## 2. チャットAPI

### エージェントチャット

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/chat` | POST | チャットメッセージ送信（ストリーミング） |
| `/api/chat/history` | GET | チャット履歴取得 |
| `/api/chat/history` | POST | 会話保存 |
| `/api/chat/history/{id}` | GET | 特定の会話取得 |
| `/api/chat/history/{id}` | DELETE | 会話削除 |

#### POST /api/chat

**リクエスト:**
```json
{
  "message": "見込み客を分析してください",
  "agent_type": "lead_management",
  "context": {
    "lead_id": 123
  }
}
```

**レスポンス:** Server-Sent Events (SSE)
```
data: {"content": "分析を", "done": false}
data: {"content": "開始します", "done": false}
data: {"content": "", "done": true}
```

## 3. ドキュメントAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/documents` | GET | ドキュメント一覧 |
| `/api/documents` | POST | ドキュメントアップロード |
| `/api/documents/{id}` | GET | ドキュメント詳細 |
| `/api/documents/{id}` | DELETE | ドキュメント削除 |

#### POST /api/documents

**リクエスト:** `multipart/form-data`
```
file: (binary)
```

**レスポンス:**
```json
{
  "id": 1,
  "filename": "proposal.pdf",
  "content_type": "application/pdf",
  "size": 1024000,
  "created_at": "2026-01-16T10:00:00Z"
}
```

## 4. リードAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/sales/leads` | GET | リード一覧 |
| `/api/sales/leads` | POST | リード作成 |
| `/api/sales/leads/{id}` | GET | リード詳細 |
| `/api/sales/leads/{id}` | PUT | リード更新 |
| `/api/sales/leads/{id}` | DELETE | リード削除 |
| `/api/sales/leads/{id}/analyze` | POST | AI分析 |
| `/api/sales/leads/{id}/recommend-actions` | POST | アクション推薦 |
| `/api/sales/leads/stats` | GET | 統計情報 |
| `/api/sales/leads/search` | GET | 検索 |

#### GET /api/sales/leads

**クエリパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|------|------|
| status | string | ステータスフィルター |
| temperature | string | 温度フィルター |
| source | string | ソースフィルター |
| assigned_to | number | 担当者ID |
| page | number | ページ番号 |
| limit | number | 取得件数 |

**レスポンス:**
```json
{
  "items": [
    {
      "id": 1,
      "company_name": "株式会社ABC",
      "contact_name": "田中太郎",
      "email": "tanaka@abc.co.jp",
      "phone": "03-1234-5678",
      "status": "active",
      "temperature": "hot",
      "source": "web",
      "expected_amount": 5000000,
      "probability": 60,
      "created_at": "2026-01-16T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

## 5. 問い合わせAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/sales/inquiries` | GET | 問い合わせ一覧 |
| `/api/sales/inquiries` | POST | 問い合わせ作成 |
| `/api/sales/inquiries/{id}` | GET | 問い合わせ詳細 |
| `/api/sales/inquiries/{id}` | PUT | 問い合わせ更新 |
| `/api/sales/inquiries/{id}/responses` | GET | 対応履歴 |
| `/api/sales/inquiries/{id}/responses` | POST | 返信追加 |
| `/api/sales/inquiries/{id}/generate-response` | POST | AI回答生成 |
| `/api/sales/inquiries/stats` | GET | 統計情報 |
| `/api/sales/inquiries/channel-stats` | GET | チャネル別統計 |

## 6. パイプラインAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/sales/pipeline/deals` | GET | 商談一覧 |
| `/api/sales/pipeline/deals` | POST | 商談作成 |
| `/api/sales/pipeline/deals/{id}` | GET | 商談詳細 |
| `/api/sales/pipeline/deals/{id}` | PUT | 商談更新 |
| `/api/sales/pipeline/deals/{id}` | DELETE | 商談削除 |
| `/api/sales/pipeline/analytics` | GET | パイプライン分析 |
| `/api/sales/pipeline/forecast` | GET | 売上予測 |
| `/api/sales/pipeline/stalled-alerts` | GET | 滞留アラート |
| `/api/sales/pipeline/by-owner` | GET | 担当者別 |

#### GET /api/sales/pipeline/forecast

**レスポンス:**
```json
{
  "current_month": {
    "period": "2026-01",
    "total_amount": 15000000,
    "weighted_amount": 8500000,
    "high_probability": 5000000,
    "mid_probability": 2500000,
    "low_probability": 1000000,
    "deal_count": 12
  },
  "current_quarter": { ... },
  "total_pipeline": { ... }
}
```

## 7. 提案書API

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/proposals` | GET | 提案書一覧 |
| `/api/proposals` | POST | 提案書作成 |
| `/api/proposals/{id}` | GET | 提案書詳細 |
| `/api/proposals/{id}` | PUT | 提案書更新 |
| `/api/proposals/{id}/quote` | POST | 見積保存 |
| `/api/proposals/{id}/export/pdf` | GET | PDF出力 |
| `/api/proposals/{id}/export/pptx` | GET | PPTX出力 |
| `/api/proposals/templates` | GET | テンプレート一覧 |
| `/api/proposals/templates` | POST | テンプレート作成 |
| `/api/proposals/competitors` | GET | 競合一覧 |
| `/api/proposals/competitors` | POST | 競合作成 |
| `/api/proposals/won-proposals` | GET | 受注提案書一覧 |
| `/api/proposals/ai/generate-story` | POST | ストーリー生成 |
| `/api/proposals/ai/generate-quote` | POST | 見積自動生成 |
| `/api/proposals/ai/competitor-comparison` | POST | 競合比較生成 |

## 8. コーチAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/coach/employees` | GET | 社員一覧 |
| `/api/coach/employees/{id}/skills` | GET | スキル評価 |
| `/api/coach/employees/{id}/skills/assess` | POST | スキル自動評価 |
| `/api/coach/employees/{id}/compare-top-performers` | GET | トップ比較 |
| `/api/coach/meetings` | GET | 商談ログ一覧 |
| `/api/coach/meetings` | POST | 商談ログ作成 |
| `/api/coach/meetings/{id}` | GET | 商談ログ詳細 |
| `/api/coach/meetings/{id}/summarize` | POST | AI要約 |
| `/api/coach/meetings/{id}/detect-ng-words` | POST | NGワード検出 |
| `/api/coach/meetings/{id}/improve-talk` | POST | トーク改善 |
| `/api/coach/meetings/{id}/full-analysis` | POST | 総合分析 |
| `/api/coach/meetings/transcribe` | POST | 音声文字起こし |
| `/api/coach/best-practices` | GET | ベストプラクティス |
| `/api/coach/best-practices/{topic}` | GET | トピック詳細 |

## 9. アラートAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/alerts` | GET | アラート一覧 |
| `/api/alerts` | POST | アラート作成 |
| `/api/alerts/{id}/read` | PUT | 既読にする |
| `/api/alerts/{id}/dismiss` | PUT | 却下する |
| `/api/alerts/unread-count` | GET | 未読数 |
| `/api/alerts/generate` | POST | アラート自動生成 |
| `/api/alerts/rules` | GET | ルール一覧 |
| `/api/alerts/rules` | POST | ルール作成 |
| `/api/alerts/rules/{id}` | PUT | ルール更新 |
| `/api/alerts/rules/{id}` | DELETE | ルール削除 |

## 10. ナレッジベースAPI

| エンドポイント | Method | 説明 |
|--------------|--------|------|
| `/api/knowledge/memos` | GET | メモ一覧 |
| `/api/knowledge/memos` | POST | メモ作成 |
| `/api/knowledge/memos/{id}` | GET | メモ詳細 |
| `/api/knowledge/memos/{id}` | PUT | メモ更新 |
| `/api/knowledge/memos/{id}` | DELETE | メモ削除 |
| `/api/knowledge/search` | POST | 全文検索 |
| `/api/knowledge/extract` | POST | AI抽出プレビュー |
| `/api/knowledge/chat` | POST | 自然言語チャット |
| `/api/knowledge/users` | GET | ユーザー一覧 |
| `/api/knowledge/users` | POST | ユーザー追加 |
| `/api/knowledge/companies` | GET | 会社名一覧 |

#### POST /api/knowledge/memos

**リクエスト:**
```json
{
  "company_name": "株式会社ABC",
  "original_text": "2026年1月16日の商談メモ...",
  "memo_type": "meeting_note",
  "registered_user_name": "田中太郎"
}
```

**レスポンス:**
```json
{
  "id": 1,
  "company_name": "株式会社ABC",
  "original_text": "2026年1月16日の商談メモ...",
  "summary": "新規CRM導入について検討中。予算は500万円程度。",
  "decisions": ["次回デモ実施を決定"],
  "action_items": [
    {"owner": "田中", "task": "デモ資料準備", "deadline": "2026-01-20"}
  ],
  "next_actions": [
    {"action": "デモ実施", "date": "2026-01-23"}
  ],
  "meeting_date": "2026-01-16",
  "related_projects": ["CRM導入プロジェクト"],
  "created_at": "2026-01-16T10:00:00Z"
}
```

## 11. エラーレスポンス

### エラーフォーマット

```json
{
  "detail": "エラーメッセージ",
  "error_code": "ERROR_CODE",
  "timestamp": "2026-01-16T10:00:00Z"
}
```

### HTTPステータスコード

| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエストエラー |
| 404 | リソースが見つからない |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

## 12. ページネーション

### リクエスト

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|----------|------|
| page | number | 1 | ページ番号 |
| limit | number | 10 | 1ページの件数 |
| sort | string | -created_at | ソート順 |

### レスポンス

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10
}
```
