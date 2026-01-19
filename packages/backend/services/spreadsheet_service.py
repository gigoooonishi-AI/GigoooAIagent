"""Google Spreadsheet連携サービス"""
import os
import json
import re
import requests
from typing import List, Dict, Optional, Any
from datetime import datetime

try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False

from config import settings


class SpreadsheetService:
    """Google Spreadsheet連携サービス"""

    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ]

    def __init__(self):
        self.client = None
        self.api_key = getattr(settings, 'GOOGLE_SHEETS_API_KEY', None)
        self.credentials_path = getattr(settings, 'GOOGLE_CREDENTIALS_PATH', None)
        self.use_api_key = False
        self._initialize()

    def _initialize(self):
        """初期化"""
        # まずサービスアカウント認証を試行
        if GSPREAD_AVAILABLE and self.credentials_path and os.path.exists(self.credentials_path):
            try:
                creds = Credentials.from_service_account_file(
                    self.credentials_path,
                    scopes=self.SCOPES
                )
                self.client = gspread.authorize(creds)
                print("Google Sheets API connected with service account")
                return
            except Exception as e:
                print(f"WARNING: Service account auth failed: {e}")

        # APIキーが設定されている場合はAPIキーモードで動作
        if self.api_key:
            self.use_api_key = True
            print("Google Sheets API connected with API key (read-only for public sheets)")
        else:
            print("WARNING: Google Sheets API not configured")

    def is_available(self) -> bool:
        """サービスが利用可能かどうか"""
        return self.client is not None or self.use_api_key

    def _extract_spreadsheet_id(self, url_or_id: str) -> str:
        """URLまたはIDからスプレッドシートIDを抽出"""
        # URLの場合
        match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url_or_id)
        if match:
            return match.group(1)
        # IDそのままの場合
        return url_or_id

    def get_spreadsheet(self, url_or_id: str):
        """スプレッドシートを取得（gspread使用時のみ）"""
        if not self.client:
            raise Exception("Service account not configured. Use API key methods instead.")

        spreadsheet_id = self._extract_spreadsheet_id(url_or_id)
        return self.client.open_by_key(spreadsheet_id)

    def _get_spreadsheet_metadata_via_api(self, spreadsheet_id: str) -> Dict:
        """APIキーを使用してスプレッドシートのメタデータを取得"""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}"
        params = {"key": self.api_key}
        response = requests.get(url, params=params)
        if response.status_code != 200:
            error_msg = response.json().get('error', {}).get('message', 'Unknown error')
            raise Exception(f"Failed to fetch spreadsheet: {error_msg}")
        return response.json()

    def _get_sheet_values_via_api(self, spreadsheet_id: str, range_name: str) -> List[List]:
        """APIキーを使用してシートのデータを取得"""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}"
        params = {"key": self.api_key}
        response = requests.get(url, params=params)
        if response.status_code != 200:
            error_msg = response.json().get('error', {}).get('message', 'Unknown error')
            raise Exception(f"Failed to fetch sheet data: {error_msg}")
        return response.json().get('values', [])

    def get_all_data(self, url_or_id: str, sheet_name: Optional[str] = None) -> List[Dict]:
        """スプレッドシートから全データを取得"""
        if not self.is_available():
            raise Exception("Google Sheets service not available")

        spreadsheet_id = self._extract_spreadsheet_id(url_or_id)

        # APIキーモードの場合
        if self.use_api_key:
            # シート名が指定されていない場合は最初のシートを使用
            if not sheet_name:
                metadata = self._get_spreadsheet_metadata_via_api(spreadsheet_id)
                sheets = metadata.get('sheets', [])
                if sheets:
                    sheet_name = sheets[0].get('properties', {}).get('title', 'Sheet1')
                else:
                    sheet_name = 'Sheet1'

            # データを取得
            values = self._get_sheet_values_via_api(spreadsheet_id, f"'{sheet_name}'")
            if not values:
                return []

            # ヘッダー行と データ行を辞書に変換
            headers = values[0] if values else []
            records = []
            for row in values[1:]:
                record = {}
                for i, header in enumerate(headers):
                    record[header] = row[i] if i < len(row) else ''
                records.append(record)
            return records

        # gspreadモードの場合
        spreadsheet = self.get_spreadsheet(url_or_id)
        if sheet_name:
            worksheet = spreadsheet.worksheet(sheet_name)
        else:
            worksheet = spreadsheet.sheet1
        return worksheet.get_all_records()

    def get_sheet_names(self, url_or_id: str) -> List[str]:
        """シート名一覧を取得"""
        if not self.is_available():
            raise Exception("Google Sheets service not available")

        spreadsheet_id = self._extract_spreadsheet_id(url_or_id)

        # APIキーモードの場合
        if self.use_api_key:
            metadata = self._get_spreadsheet_metadata_via_api(spreadsheet_id)
            sheets = metadata.get('sheets', [])
            return [sheet.get('properties', {}).get('title', '') for sheet in sheets]

        # gspreadモードの場合
        spreadsheet = self.get_spreadsheet(url_or_id)
        return [ws.title for ws in spreadsheet.worksheets()]

    # ========== リードインポート ==========
    def import_leads(self, url_or_id: str, sheet_name: Optional[str] = None, column_mapping: Optional[Dict] = None) -> List[Dict]:
        """スプレッドシートからリードデータをインポート"""
        data = self.get_all_data(url_or_id, sheet_name)

        # デフォルトのカラムマッピング
        default_mapping = {
            '会社名': 'company_name',
            '担当者': 'contact_name',
            'メール': 'contact_email',
            '電話': 'contact_phone',
            '業界': 'industry',
            '企業規模': 'company_size',
            '流入元': 'source',
            'ステータス': 'status',
            '優先度': 'priority',
            '想定金額': 'estimated_value',
            '温度': 'temperature',
            'スコア': 'score',
            'メモ': 'notes',
            '次アクション': 'next_action',
        }

        mapping = column_mapping or default_mapping
        leads = []

        for row in data:
            lead = {}
            for jp_col, en_col in mapping.items():
                if jp_col in row:
                    value = row[jp_col]
                    # 数値変換
                    if en_col in ['estimated_value', 'score']:
                        try:
                            # カンマや円記号を除去
                            value = str(value).replace(',', '').replace('円', '').replace('¥', '').strip()
                            value = float(value) if value else None
                        except:
                            value = None
                    lead[en_col] = value

            # 必須項目チェック
            if lead.get('company_name'):
                leads.append(lead)

        return leads

    def can_write(self) -> bool:
        """書き込み可能かどうか（サービスアカウント認証が必要）"""
        return self.client is not None

    # ========== 商談同期 ==========
    def sync_deals_from_sheet(self, url_or_id: str, sheet_name: Optional[str] = None, column_mapping: Optional[Dict] = None) -> List[Dict]:
        """スプレッドシートから商談データを取得"""
        data = self.get_all_data(url_or_id, sheet_name)

        default_mapping = {
            '案件名': 'title',
            'リードID': 'lead_id',
            'ステージ': 'stage',
            '金額': 'amount',
            '確度': 'probability',
            'クローズ予定日': 'expected_close_date',
            '説明': 'description',
            'メモ': 'notes',
        }

        mapping = column_mapping or default_mapping
        deals = []

        for row in data:
            deal = {}
            for jp_col, en_col in mapping.items():
                if jp_col in row:
                    value = row[jp_col]
                    # 数値変換
                    if en_col in ['amount', 'probability', 'lead_id']:
                        try:
                            value = str(value).replace(',', '').replace('円', '').replace('¥', '').replace('%', '').strip()
                            value = float(value) if value else None
                            if en_col in ['probability', 'lead_id']:
                                value = int(value) if value else None
                        except:
                            value = None
                    deal[en_col] = value

            if deal.get('title'):
                deals.append(deal)

        return deals

    def sync_deals_to_sheet(self, url_or_id: str, deals: List[Dict], sheet_name: str = "商談データ") -> bool:
        """商談データをスプレッドシートに同期"""
        if not self.can_write():
            raise Exception("書き込み機能にはサービスアカウント認証が必要です。APIキーモードでは読み取りのみ可能です。")
        spreadsheet = self.get_spreadsheet(url_or_id)

        # シートを取得または作成
        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            worksheet.clear()
        except gspread.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=100, cols=20)

        # ヘッダー
        headers = ['ID', '案件名', '会社名', 'ステージ', '金額', '確度', 'クローズ予定日', '作成日', '更新日']

        # データ整形
        rows = [headers]
        for deal in deals:
            rows.append([
                deal.get('id', ''),
                deal.get('title', ''),
                deal.get('company_name', ''),
                deal.get('stage', ''),
                deal.get('amount', 0),
                deal.get('probability', 0),
                deal.get('expected_close_date', ''),
                deal.get('created_at', ''),
                deal.get('updated_at', ''),
            ])

        worksheet.update('A1', rows)
        return True

    # ========== レポート出力 ==========
    def export_leads_report(self, url_or_id: str, leads: List[Dict], sheet_name: str = "リードレポート") -> bool:
        """リードレポートをスプレッドシートに出力"""
        if not self.can_write():
            raise Exception("書き込み機能にはサービスアカウント認証が必要です。APIキーモードでは読み取りのみ可能です。")
        spreadsheet = self.get_spreadsheet(url_or_id)

        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            worksheet.clear()
        except gspread.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=100, cols=20)

        headers = ['ID', '会社名', '担当者', 'メール', '業界', 'ステータス', '温度', 'スコア', '想定金額', '作成日']

        rows = [headers]
        for lead in leads:
            rows.append([
                lead.get('id', ''),
                lead.get('company_name', ''),
                lead.get('contact_name', ''),
                lead.get('contact_email', ''),
                lead.get('industry', ''),
                lead.get('status', ''),
                lead.get('temperature', ''),
                lead.get('score', 0),
                lead.get('estimated_value', 0),
                lead.get('created_at', ''),
            ])

        worksheet.update('A1', rows)
        return True

    def export_pipeline_report(self, url_or_id: str, deals: List[Dict], summary: Dict, sheet_name: str = "パイプラインレポート") -> bool:
        """パイプラインレポートをスプレッドシートに出力"""
        if not self.can_write():
            raise Exception("書き込み機能にはサービスアカウント認証が必要です。APIキーモードでは読み取りのみ可能です。")
        spreadsheet = self.get_spreadsheet(url_or_id)

        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            worksheet.clear()
        except gspread.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=100, cols=20)

        # サマリーセクション
        rows = [
            ['パイプラインレポート', '', '', '', f'作成日: {datetime.now().strftime("%Y-%m-%d %H:%M")}'],
            [],
            ['【サマリー】'],
            ['総案件数', summary.get('total_deals', 0)],
            ['パイプライン総額', f'¥{summary.get("total_amount", 0):,.0f}'],
            ['加重パイプライン', f'¥{summary.get("weighted_amount", 0):,.0f}'],
            [],
            ['【ステージ別】'],
        ]

        # ステージ別集計
        for stage_data in summary.get('by_stage', []):
            rows.append([
                stage_data.get('stage', ''),
                f'{stage_data.get("count", 0)}件',
                f'¥{stage_data.get("amount", 0):,.0f}'
            ])

        rows.extend([
            [],
            ['【案件一覧】'],
            ['ID', '案件名', '会社名', 'ステージ', '金額', '確度', 'クローズ予定日'],
        ])

        for deal in deals:
            rows.append([
                deal.get('id', ''),
                deal.get('title', ''),
                deal.get('company_name', ''),
                deal.get('stage', ''),
                f'¥{deal.get("amount", 0):,.0f}',
                f'{deal.get("probability", 0)}%',
                deal.get('expected_close_date', ''),
            ])

        worksheet.update('A1', rows)
        return True

    def export_inquiry_report(self, url_or_id: str, inquiries: List[Dict], stats: Dict, sheet_name: str = "問い合わせレポート") -> bool:
        """問い合わせレポートをスプレッドシートに出力"""
        if not self.can_write():
            raise Exception("書き込み機能にはサービスアカウント認証が必要です。APIキーモードでは読み取りのみ可能です。")
        spreadsheet = self.get_spreadsheet(url_or_id)

        try:
            worksheet = spreadsheet.worksheet(sheet_name)
            worksheet.clear()
        except gspread.WorksheetNotFound:
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=100, cols=20)

        rows = [
            ['問い合わせレポート', '', '', '', f'作成日: {datetime.now().strftime("%Y-%m-%d %H:%M")}'],
            [],
            ['【統計】'],
            ['総件数', stats.get('total', 0)],
            ['未対応', stats.get('open', 0)],
            ['対応中', stats.get('in_progress', 0)],
            ['完了', stats.get('resolved', 0)],
            ['SLA違反', stats.get('sla_breached', 0)],
            [],
            ['【問い合わせ一覧】'],
            ['ID', '顧客名', '件名', 'チャネル', 'ステータス', '優先度', '作成日'],
        ]

        for inq in inquiries:
            rows.append([
                inq.get('id', ''),
                inq.get('customer_name', ''),
                inq.get('subject', ''),
                inq.get('channel', ''),
                inq.get('status', ''),
                inq.get('priority', ''),
                inq.get('created_at', ''),
            ])

        worksheet.update('A1', rows)
        return True


# シングルトンインスタンス
spreadsheet_service = SpreadsheetService()
