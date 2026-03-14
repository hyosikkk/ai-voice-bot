# AI 吹き替えサービス

音声・動画ファイルをアップロードするだけで、AIが自動的に別の言語へ吹き替えるWebサービスです。

**🚀 Demo**: https://ai-voice-bot-rose.vercel.app

[한국어](./README.md) | [English](./README.en.md) | **日本語** | [Español](./README.es.md)

---

## 主な機能

- **自動吹き替えパイプライン**: 音声認識(STT) → 翻訳 → 音声合成(TTS) の3ステップを自動処理
- **多言語対応**: 韓国語・英語・日本語・スペイン語の相互吹き替え
- **多様なファイル形式**: MP3、WAV、MP4、WebMなど（最大100MB）
- **動画比較プレーヤー**: 動画アップロード時、オリジナルと吹き替え動画を並べて同時再生
- **吹き替え動画ダウンロード**: ffmpeg.wasmを使いブラウザ上でオリジナル映像＋吹き替え音声をMP4に合成
- **自動同期調整**: 吹き替え音声のplaybackRateをオリジナル映像の長さに合わせて自動計算・調整
- **Googleログイン**: Google OAuth認証 ＋ ホワイトリストによるアクセス制御
- **ドラッグ＆ドロップ**: ファイルのドラッグアップロード対応
- **ステップ別進行表示**: アップロード → STT → 翻訳 → TTS の各処理をリアルタイムアニメーション表示

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 認証 | NextAuth.js v4 + Google OAuth |
| データベース | Turso (libSQL) — ホワイトリスト管理 |
| ファイルストレージ | Vercel Blob |
| 音声認識(STT) | ElevenLabs Scribe v1 |
| 翻訳 | Google Cloud Translation API v2 |
| 音声合成(TTS) | ElevenLabs Multilingual v2 |
| 映像処理 | ffmpeg.wasm (ブラウザサイド) |
| デプロイ | Vercel |

---

## 処理フロー

```
ファイルアップロード（音声/動画）
        ↓
ElevenLabs Scribe v1 — 音声認識 (STT)
        ↓
Google Cloud Translation API — 翻訳
        ↓
ElevenLabs Multilingual v2 — 吹き替え生成 (TTS)
        ↓
結果出力
  ├── 音声: MP3再生・ダウンロード
  └── 動画: オリジナル/吹き替え並べて比較再生 + MP4ダウンロード
```

---

## ローカル実行方法

### 1. クローン・依存パッケージインストール

```bash
git clone https://github.com/hyosikkk/ai-voice-bot.git
cd ai-voice-bot
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成して以下を記入:

```env
# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # My VoicesからVoice IDを取得

# Google Translate (https://console.cloud.google.com)
GOOGLE_TRANSLATE_API_KEY=   # Cloud Translation APIを有効化後に発行、月50万文字まで無料

# Turso DB (https://turso.tech)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_SECRET=            # openssl rand -base64 32 で生成
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob (https://vercel.com/dashboard → Storage)
BLOB_READ_WRITE_TOKEN=
```

### 3. ホワイトリスト登録

`lib/db.ts` の `INITIAL_WHITELIST` 配列に許可するメールアドレスを追加。サーバー初回起動時に自動登録されます。

### 4. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセス

> ホワイトリストに登録されたGoogleアカウントのみログイン可能です。

---

## デプロイ済みURL

**https://ai-voice-bot-rose.vercel.app**

> Googleアカウントでログイン後、ホワイトリスト登録ユーザーのみ利用可能です。

---

## 今後の改善予定

| 機能 | 説明 |
|------|------|
| **リップシンク** | 吹き替え音声に合わせて話者の口の動きをAIで再生成（Wav2Lip、HeyGenなど活用） |
| **BGM・話者音声分離** | BGMを含む動画から話者の音声のみを分離して吹き替え、BGMはオリジナルを維持 |
| **複数話者の識別吹き替え** | 複数人が話す動画で話者ごとに音声を識別し、それぞれ異なる声で吹き替え |
| **声質の保持** | 元話者の声の特徴（トーン・感情）を吹き替え音声にも反映するVoice Cloning |
| **字幕同期** | STT結果と翻訳テキストをタイムスタンプ付き字幕として映像に合成 |
| **細粒度の同期調整** | 発話区間ごとの個別同期調整（現在は全体の長さ比率のみ） |
| **対応言語の拡張** | フランス語、ドイツ語、中国語、アラビア語などを追加 |

---

## Claude Code（AIコーディングエージェント）の活用

このプロジェクトは **Claude Code**（AnthropicのAIコーディングエージェント）を主体的に活用して開発されました。

### エージェントで対応した作業

- **アーキテクチャ設計**: Next.js App Router構造と吹き替えパイプラインの設計
- **外部API統合**: ElevenLabs STT/TTS、Google Translate、NextAuth、Turso DBの統合
- **UI開発**: ダークグラスモーフィズムデザイン、サウンドウェーブアニメーション、並列動画比較プレーヤー
- **映像処理**: ffmpeg.wasmを使ったブラウザサイドの映像＋音声合成
- **同期ロジック**: playbackRateの自動計算・調整
- **デバッグ**: エラーログから即座に原因分析・修正
- **デプロイ設定**: Vercel設定、GitHub自動デプロイ連携

### AIコーディングエージェント活用のコツ

1. **エラーログをそのまま貼り付ける** — 長い説明より実際のエラーメッセージが最速の解決策
2. **具体的にリクエストする** — 「API作って」より「FormDataでファイルを受け取る/api/dub POSTルートを作って」
3. **一度に一つずつ** — 複数機能の同時リクエストは競合の原因になりやすい
4. **コードは必ず確認する** — 特に認証・セキュリティ関連のコードは自分で確認必須
5. **機密情報に注意** — `.env.local`の内容をチャットに直接貼り付けないこと
