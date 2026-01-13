# GitHubセットアップガイド

GIGOOO AIエージェントサービスをGitHubで管理し、社内共有するための手順

## 1. GitHubリポジトリの作成

### オプションA: プライベートリポジトリ（社内限定）

1. [GitHub](https://github.com) にログイン
2. 右上の「+」→「New repository」をクリック
3. 以下の設定を行う：
   - **Repository name**: `GIGOOO_AIagent`
   - **Description**: `GIGOOO AI Agent Service - 社内AIエージェントサービス`
   - **Visibility**: `Private` (社内のみアクセス可能)
   - **Initialize this repository with**: 何もチェックしない（すでにローカルにリポジトリがあるため）
4. 「Create repository」をクリック

### オプションB: パブリックリポジトリ（一般公開）

上記と同じ手順で、Visibilityを`Public`に設定

## 2. ローカルリポジトリとGitHubを接続

GitHubでリポジトリを作成すると、以下のようなURLが表示されます：

```
https://github.com/your-username/GIGOOO_AIagent.git
```

このURLを使って、以下のコマンドを実行してください：

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/your-username/GIGOOO_AIagent.git

# ブランチ名をmainに変更
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

## 3. 社内メンバーを招待（プライベートリポジトリの場合）

1. GitHubのリポジトリページで「Settings」タブをクリック
2. 左メニューから「Collaborators」を選択
3. 「Add people」をクリック
4. 社内メンバーのGitHubユーザー名またはメールアドレスを入力
5. 権限レベルを選択：
   - **Read**: 閲覧のみ
   - **Write**: 編集可能
   - **Admin**: 管理者権限

## 4. チームメンバー向けのセットアップ手順

社内メンバーがプロジェクトをセットアップする手順：

### クローン

```bash
git clone https://github.com/your-username/GIGOOO_AIagent.git
cd GIGOOO_AIagent
```

### フロントエンドのセットアップ

```bash
npm install
npm run dev
```

### バックエンドのセットアップ

```bash
cd backend
python -m venv venv

# Windowsの場合
venv\Scripts\activate

# Mac/Linuxの場合
source venv/bin/activate

pip install -r requirements.txt

# 環境変数ファイルの作成
copy .env.example .env  # Windows
# または
cp .env.example .env    # Mac/Linux

# .envファイルを編集してOpenAI APIキーを設定
# OPENAI_API_KEY=sk-proj-xxxxx

# サーバー起動
python app.py
```

## 5. 機密情報の管理

### ⚠️ 重要：APIキーの管理

- `.env`ファイルは**絶対にGitにコミットしない**
- `.gitignore`に既に含まれているため自動的に除外されます
- チームメンバーには以下を共有：
  - `.env.example`ファイルをコピーして`.env`を作成する手順
  - OpenAI APIキーの取得方法
  - 各自のAPIキーを`.env`に設定する方法

### APIキーの共有方法（社内）

社内で共有のAPIキーを使用する場合：
- **Slack/Teams等で直接共有**（推奨しません）
- **1Password/LastPass等のパスワード管理ツール**（推奨）
- **AWS Secrets Manager等のシークレット管理サービス**（推奨）

## 6. 継続的な開発

### 変更をコミット＆プッシュ

```bash
# 変更を確認
git status

# ファイルを追加
git add .

# コミット
git commit -m "変更内容の説明"

# GitHubにプッシュ
git push
```

### 他のメンバーの変更を取得

```bash
# 最新の変更を取得
git pull
```

## 7. ブランチ戦略（推奨）

大規模な変更の場合：

```bash
# 新しいブランチを作成
git checkout -b feature/new-feature

# 変更をコミット
git add .
git commit -m "新機能の追加"

# GitHubにプッシュ
git push -u origin feature/new-feature

# GitHub上でプルリクエストを作成し、レビュー後にmainにマージ
```

## トラブルシューティング

### 認証エラー

GitHub認証にはPersonal Access Token (PAT)が必要な場合があります：

1. GitHub → Settings → Developer settings → Personal access tokens
2. 「Generate new token」をクリック
3. 必要な権限を選択（repo, workflow等）
4. トークンをコピー
5. Gitの認証時にパスワードの代わりにトークンを使用

### プッシュエラー

```bash
# 最新の変更を取得してから再プッシュ
git pull --rebase origin main
git push
```

## 参考リンク

- [GitHub Docs](https://docs.github.com)
- [Git公式ドキュメント](https://git-scm.com/doc)
- [OpenAI Platform](https://platform.openai.com/)
