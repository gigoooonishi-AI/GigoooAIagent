# GIGOOO AI Agent Backend

OpenAI APIを使用したAIエージェントサービスのバックエンド

## セットアップ

### 1. Python環境の準備

```bash
cd backend
python -m venv venv

# Windowsの場合
venv\Scripts\activate

# Mac/Linuxの場合
source venv/bin/activate
```

### 2. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 3. 環境変数の設定

`.env.example`を`.env`にコピーして、OpenAI APIキーを設定：

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

APIキーは [OpenAI Platform](https://platform.openai.com/api-keys) から取得できます。

### 4. サーバーの起動

```bash
python app.py
```

サーバーは `http://localhost:5000` で起動します。

## APIエンドポイント

### GET /api/health
ヘルスチェック

### GET /api/agents
利用可能なエージェントのリストを取得

### POST /api/chat
チャットメッセージを送信

リクエスト例：
```json
{
  "agent_id": "general",
  "messages": [
    {"role": "user", "content": "こんにちは"}
  ]
}
```

レスポンス例：
```json
{
  "success": true,
  "message": "こんにちは！どのようにお手伝いできますか？",
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

## 使用モデル

デフォルトでは `gpt-4o-mini` を使用しています。必要に応じて `app.py` で変更できます。

- `gpt-4o-mini`: 高速で低コスト
- `gpt-4o`: 高性能
- `gpt-3.5-turbo`: バランス型
