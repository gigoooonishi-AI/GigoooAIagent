"""
営業機能モジュール
見込み客管理、進捗管理、問い合わせ対応、提案資料作成、営業コーチ機能
"""

from openai import OpenAI
import json
from datetime import datetime

class SalesFeatures:
    def __init__(self, openai_client):
        self.client = openai_client

    def manage_leads(self, lead_data, action='analyze'):
        """
        見込み客管理
        - リードの優先順位付け
        - ネクストアクション提案
        - フォローアップスケジュール
        """
        prompt = f"""
あなたは経験豊富な営業マネージャーです。以下の見込み客情報を分析してください。

見込み客情報:
{json.dumps(lead_data, ensure_ascii=False, indent=2)}

以下の項目について分析してください:
1. 優先度（A/B/C）とその理由
2. 推奨される次のアクション
3. フォローアップのタイミング
4. 成約確度の評価
5. 注意点やリスク

具体的で実行可能なアドバイスを提供してください。
"""

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': '営業マネージャーとして見込み客を分析します。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )

        return response.choices[0].message.content

    def track_progress(self, deal_info):
        """
        進捗管理
        - 案件の進捗状況分析
        - ボトルネックの特定
        - 次のステップ提案
        """
        prompt = f"""
営業案件の進捗を分析してください。

案件情報:
{json.dumps(deal_info, ensure_ascii=False, indent=2)}

以下について分析してください:
1. 現在のステージと進捗状況
2. ボトルネックや課題
3. 次に取るべきアクション
4. 成約までのタイムライン予測
5. リスクと対策

実用的なアドバイスを提供してください。
"""

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': '営業進捗管理の専門家として分析します。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )

        return response.choices[0].message.content

    def handle_inquiry(self, inquiry_text, context=''):
        """
        問い合わせ対応
        - 顧客の質問に対する回答案作成
        - 適切なトーンとスタイル
        """
        prompt = f"""
以下の顧客からの問い合わせに対して、プロフェッショナルで親しみやすい回答を作成してください。

問い合わせ内容:
{inquiry_text}

背景情報:
{context if context else '特になし'}

以下を含む回答を作成してください:
1. 質問への明確な回答
2. 追加の有益な情報
3. 次のステップの提案
4. 適切な締めくくり

顧客満足度を高める回答を心がけてください。
"""

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'カスタマーサポートの専門家として回答します。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        return response.choices[0].message.content

    def generate_proposal(self, client_info, product_info):
        """
        提案資料自動作成
        - 顧客ニーズに合わせた提案書
        - 価値提案の作成
        """
        prompt = f"""
以下の情報を基に、説得力のある提案資料の内容を作成してください。

顧客情報:
{json.dumps(client_info, ensure_ascii=False, indent=2)}

提案する製品・サービス:
{json.dumps(product_info, ensure_ascii=False, indent=2)}

以下の構成で提案内容を作成してください:
1. エグゼクティブサマリー
2. 顧客の課題と目標
3. 提案ソリューション
4. 期待される効果とROI
5. 実装計画
6. 価格と条件
7. 次のステップ

顧客の課題解決に焦点を当てた説得力のある提案を作成してください。
"""

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'ビジネス提案書作成の専門家として提案を作成します。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        return response.choices[0].message.content

    def sales_coaching(self, situation, question=''):
        """
        営業コーチ機能
        - 営業スキル向上のアドバイス
        - ロールプレイのフィードバック
        - ベストプラクティスの提案
        """
        prompt = f"""
営業コーチとして、以下の状況についてアドバイスをください。

状況:
{situation}

質問:
{question if question else '最適なアプローチを教えてください'}

以下を含むアドバイスを提供してください:
1. 状況の分析
2. 推奨されるアプローチ
3. 具体的な話し方や質問例
4. 避けるべきポイント
5. 成功のためのヒント

実践的で具体的なアドバイスをお願いします。
"""

        response = self.client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[
                {'role': 'system', 'content': 'ベテラン営業コーチとしてアドバイスします。'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )

        return response.choices[0].message.content
