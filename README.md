# GIGOOO AIエージェントサービス

OpenAI APIを使用したAIエージェントサービスのフルスタックアプリケーション

## プロジェクト構成

```
GIGOOO_AIagent/
├── backend/          # Python + Flask + OpenAI API
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── src/              # React フロントエンド
│   └── main.tsx
├── index.tsx         # メインコンポーネント
├── package.json
└── README.md
```

## セットアップ手順

### 1. バックエンド（Python）のセットアップ

#### 1.1 Python環境の準備

```bash
cd backend
python -m venv venv

# Windowsの場合
venv\Scripts\activate

# Mac/Linuxの場合
source venv/bin/activate
```

#### 1.2 依存関係のインストール

```bash
pip install -r requirements.txt
```

#### 1.3 OpenAI APIキーの設定

1. [OpenAI Platform](https://platform.openai.com/api-keys) でAPIキーを取得
2. `.env.example`を`.env`にコピー

```bash
# Windowsの場合
copy .env.example .env

# Mac/Linuxの場合
cp .env.example .env
```

3. `.env`ファイルを編集してAPIキーを設定

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

#### 1.4 バックエンドサーバーの起動

```bash
python app.py
```

サーバーは `http://localhost:5000` で起動します。

### 2. フロントエンド（React）のセットアップ

新しいターミナルを開いて、プロジェクトのルートディレクトリで：

```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm run dev
```

フロントエンドは `http://localhost:5174` で起動します（ポートが使用中の場合は別のポートになる可能性があります）。

## 使用方法

1. バックエンドサーバー（Python）を起動
2. フロントエンドサーバー（React）を起動
3. ブラウザで `http://localhost:5174` にアクセス
4. 左サイドバーからエージェントを選択
5. メッセージを入力してAIと会話

## 利用可能なエージェント

- **汎用AI**: 一般的な質問に対応
- **営業**: 顧客とのやり取りをサポート
- **社内スキル検索**: スキルシート参照
- **クリエイティブ**: 創造的なコンテンツ生成

各エージェントは専用のシステムプロンプトを持ち、異なる特性で応答します。

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite

### バックエンド
- Python 3
- Flask
- OpenAI API (gpt-4o-mini)
- Flask-CORS

## APIエンドポイント

### GET /api/health
ヘルスチェック

### GET /api/agents
利用可能なエージェントのリストを取得

### POST /api/chat
チャットメッセージを送信

## トラブルシューティング

### バックエンドに接続できない

1. バックエンドサーバーが起動しているか確認
2. `.env`ファイルにOpenAI APIキーが正しく設定されているか確認
3. ファイアウォールでポート5000がブロックされていないか確認

### OpenAI APIエラー

1. APIキーが有効か確認
2. OpenAIアカウントに十分なクレジットがあるか確認
3. レート制限に達していないか確認

### CORSエラー

バックエンドでFlask-CORSが正しくインストールされているか確認してください。

## 開発

### モデルの変更

`backend/app.py` の以下の部分を編集：

```python
response = client.chat.completions.create(
    model='gpt-4o-mini',  # ここを変更
    messages=api_messages,
    temperature=0.7,
    max_tokens=1000
)
```

利用可能なモデル：
- `gpt-4o-mini`: 高速で低コスト（推奨）
- `gpt-4o`: 高性能
- `gpt-3.5-turbo`: バランス型

### エージェントの追加

1. `backend/app.py` の `AGENT_PROMPTS` に新しいエージェントを追加
2. `index.tsx` の `agents` 配列に新しいエージェントを追加
3. `agentChats` の初期状態に新しいエージェントのチャットを追加

## ライセンス

MIT
