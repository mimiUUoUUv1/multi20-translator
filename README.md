# Multi20 Back Translator

GitHub Pages向けの静的な「20言語・往復逆翻訳」サイトです。

## 動作

原文
→ 選択した20言語を順番に翻訳（往路）
→ 20言語を逆順に翻訳
→ 原文の言語へ復帰

「往復回数」を2以上にすると、この往復を繰り返します。

## 翻訳API

このサイトはブラウザから翻訳APIへ `POST /translate` を送ります。
初期設定は `https://libretranslate.com` です。APIキーが必要な場合は画面から入力できます。

画面上では21言語を候補として用意し、原文と同じ言語を除いた20言語を初期ルートにします。

LibreTranslateの公式ドキュメントでは、`/translate` に `q`, `source`, `target`, `format`, `api_key` などを送る方式が案内されています。
公式:
- https://docs.libretranslate.com/api/operations/translate/
- https://docs.libretranslate.com/guides/api_usage/

### 注意

GitHub Pagesは静的ホスティングなので、秘密のAPIキーを安全に隠す場所としては使えません。
公開サイトとして運用するなら、APIキーをフロントエンドに固定せず、自分で管理するバックエンド/プロキシを用意する構成を推奨します。

また、1回の往復で20言語を往路＋20言語を復路するため、40回の翻訳リクエストが発生します。
API側のレート制限・文字数制限・料金を確認してください。

## GitHub Pages公開

1. GitHubで新しいリポジトリを作る
2. この3ファイル（`index.html`, `style.css`, `script.js`）と `README.md` をpush
3. Repository Settings → Pages から公開元を設定
4. 公開後は `https://ユーザー名.github.io/リポジトリ名/` でアクセス

GitHub Pagesはリポジトリから静的サイトを公開できます。
https://docs.github.com/en/pages/quickstart

## ファイル

- `index.html` : 画面
- `style.css` : デザイン
- `script.js` : 20言語往復翻訳ロジック
- `README.md` : 設定・公開方法
