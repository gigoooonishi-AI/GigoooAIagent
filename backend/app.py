from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv

# 環境変数をロード
load_dotenv()

app = Flask(__name__)
CORS(app)  # CORSを有効化してReactからのアクセスを許可

# OpenAIクライアントを初期化
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# エージェントごとのシステムプロンプト
AGENT_PROMPTS = {
    'general': '汎用AIアシスタントとして、一般的な質問に丁寧に回答してください。',
    'code': '営業担当として、顧客とのやり取りをサポートします。プロフェッショナルで親しみやすい対応を心がけてください。',
    'analysis': '社内スキル検索の専門家として、スキルシートを参照しながら適切な人材を提案してください。',
    'creative': 'クリエイティブなコンテンツ生成の専門家として、創造的で魅力的なアイデアを提供してください。',
}

@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェックエンドポイント"""
    return jsonify({'status': 'ok', 'message': 'API is running'})

@app.route('/api/chat', methods=['POST'])
def chat():
    """チャットエンドポイント"""
    try:
        data = request.json
        agent_id = data.get('agent_id', 'general')
        messages = data.get('messages', [])

        if not messages:
            return jsonify({'error': 'メッセージが必要です'}), 400

        # システムプロンプトを追加
        system_prompt = AGENT_PROMPTS.get(agent_id, AGENT_PROMPTS['general'])

        # OpenAI APIに送信するメッセージを構築
        api_messages = [{'role': 'system', 'content': system_prompt}]

        # ユーザーとアシスタントのメッセージを追加（システムメッセージは除外）
        for msg in messages:
            if msg['role'] != 'system':
                api_messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })

        # OpenAI APIを呼び出し
        response = client.chat.completions.create(
            model='gpt-4o-mini',  # または 'gpt-4o', 'gpt-3.5-turbo'
            messages=api_messages,
            temperature=0.7,
            max_tokens=1000
        )

        # レスポンスを返す
        assistant_message = response.choices[0].message.content

        return jsonify({
            'success': True,
            'message': assistant_message,
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/agents', methods=['GET'])
def get_agents():
    """利用可能なエージェントのリストを返す"""
    agents = [
        {'id': 'general', 'name': '汎用AI', 'description': '一般的な質問に対応'},
        {'id': 'code', 'name': '営業', 'description': '顧客とのやり取り'},
        {'id': 'analysis', 'name': '社内スキル検索', 'description': 'スキルシート参照'},
        {'id': 'creative', 'name': 'クリエイティブ', 'description': '創造的なコンテンツ生成'},
    ]
    return jsonify({'agents': agents})

if __name__ == '__main__':
    # 環境変数のチェック
    if not os.getenv('OPENAI_API_KEY'):
        print('警告: OPENAI_API_KEYが設定されていません。.envファイルを確認してください。')

    app.run(debug=True, port=5000, host='0.0.0.0')
