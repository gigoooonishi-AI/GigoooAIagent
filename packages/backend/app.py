from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
from sales_features import SalesFeatures

# 環境変数をロード
load_dotenv()

app = Flask(__name__)
CORS(app)  # CORSを有効化してReactからのアクセスを許可

# OpenAIクライアントを初期化
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# 営業機能を初期化
sales = SalesFeatures(client)

# エージェントごとのシステムプロンプト
AGENT_PROMPTS = {
    'analysis': '社内スキル検索の専門家として、スキルシートを参照しながら適切な人材を提案してください。',
    'leads': '見込み客管理の専門家として、リード情報を分析し、優先度判定、ネクストアクション、フォローアップ計画を提案してください。具体的で実行可能なアドバイスを提供してください。',
    'progress': '営業進捗管理の専門家として、案件の進捗状況を分析し、ボトルネックの特定、次のステップ提案、リスク対策を提供してください。',
    'inquiry': 'カスタマーサポートの専門家として、顧客からの問い合わせに対してプロフェッショナルで親しみやすい回答を作成してください。明確で有益な情報を提供してください。',
    'proposal': 'ビジネス提案書作成の専門家として、顧客のニーズに合わせた説得力のある提案内容を作成してください。課題解決に焦点を当ててください。',
    'coach': 'ベテラン営業コーチとして、営業活動のアドバイス、ベストプラクティス、具体的な話し方や質問例を提供してください。実践的で具体的なアドバイスをしてください。',
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
        agent_id = data.get('agent_id', 'analysis')
        messages = data.get('messages', [])

        if not messages:
            return jsonify({'error': 'メッセージが必要です'}), 400

        # システムプロンプトを追加
        system_prompt = AGENT_PROMPTS.get(agent_id, AGENT_PROMPTS['analysis'])

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
        {'id': 'analysis', 'name': '社内スキル検索', 'description': 'スキルシート参照'},
        {'id': 'leads', 'name': '見込み客管理', 'description': '優先度分析・アクション提案'},
        {'id': 'progress', 'name': '進捗管理', 'description': 'ボトルネック特定・対策提案'},
        {'id': 'inquiry', 'name': '問い合わせ対応', 'description': '回答案自動作成'},
        {'id': 'proposal', 'name': '提案資料作成', 'description': '提案書の自動生成'},
        {'id': 'coach', 'name': '営業コーチ', 'description': 'アドバイス・ベストプラクティス'},
    ]
    return jsonify({'agents': agents})

# 営業機能エンドポイント

@app.route('/api/sales/leads', methods=['POST'])
def analyze_leads():
    """見込み客管理"""
    try:
        data = request.json
        lead_data = data.get('lead_data', {})
        action = data.get('action', 'analyze')

        result = sales.manage_leads(lead_data, action)

        return jsonify({
            'success': True,
            'analysis': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sales/progress', methods=['POST'])
def track_progress():
    """進捗管理"""
    try:
        data = request.json
        deal_info = data.get('deal_info', {})

        result = sales.track_progress(deal_info)

        return jsonify({
            'success': True,
            'analysis': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sales/inquiry', methods=['POST'])
def handle_inquiry():
    """問い合わせ対応"""
    try:
        data = request.json
        inquiry_text = data.get('inquiry', '')
        context = data.get('context', '')

        result = sales.handle_inquiry(inquiry_text, context)

        return jsonify({
            'success': True,
            'response': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sales/proposal', methods=['POST'])
def generate_proposal():
    """提案資料自動作成"""
    try:
        data = request.json
        client_info = data.get('client_info', {})
        product_info = data.get('product_info', {})

        result = sales.generate_proposal(client_info, product_info)

        return jsonify({
            'success': True,
            'proposal': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sales/coach', methods=['POST'])
def sales_coaching():
    """営業コーチ機能"""
    try:
        data = request.json
        situation = data.get('situation', '')
        question = data.get('question', '')

        result = sales.sales_coaching(situation, question)

        return jsonify({
            'success': True,
            'advice': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # 環境変数のチェック
    if not os.getenv('OPENAI_API_KEY'):
        print('警告: OPENAI_API_KEYが設定されていません。.envファイルを確認してください。')

    app.run(debug=True, port=5000, host='0.0.0.0')
