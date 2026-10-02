# Multi20 Google Translation + Cloudflare Worker

## 構成

GitHub Pages
→ Cloudflare Worker
→ Google Cloud Translation Basic v2

ブラウザからGoogle APIへ直接アクセスしないので、GitHub Pagesで発生するCORS問題を避けます。
Google APIキーはCloudflare WorkerのSecret `GOOGLE_TRANSLATE_API_KEY` に保存します。

Cloudflare WorkersのSecretsは暗号化された値としてWorkerに渡せます。
https://developers.cloudflare.com/workers/configuration/secrets/

## 1. Cloudflare Workerを作成

Cloudflare Dashboard → Workers & Pages → Create → Worker

`worker.js` の内容を貼り付けてDeployします。

## 2. Google APIキーをSecretに登録

Workerの設定から Variables and Secrets → Add → Secret

名前:
GOOGLE_TRANSLATE_API_KEY

値:
Google Cloudで作成したAPIキー

またはWrangler:
npx wrangler secret put GOOGLE_TRANSLATE_API_KEY

## 3. GitHub Pages側

このZIPの `script.js` をGitHubリポジトリのものと交換します。

画面の「翻訳API」欄には、Cloudflare WorkerのURLを入力します。

例:
https://multi20-translate.xxxx.workers.dev

必要なら末尾に `/translate` を付けても構いません。
このWorkerはPOSTをルートでも受けるため、現在のコードではそのままWorker URLで使用できます。

## 4. 重要

Google APIキーを `script.js` に書かないでください。
GitHub Pagesは公開されるため、キーが閲覧者に見えてしまいます。
