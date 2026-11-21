# なにかな?クイズ

3歳くらいの子ども向けの、画像あてクイズ Web アプリです。
ジャンル（くだもの・どうぶつ など）を選ぶと、そのジャンルの画像がシャッフルされて1枚ずつ出てきます。
画像をタップすると答えが大きく表示され、読み上げられます。

- Vite + React + TypeScript、CSS Modules
- バックエンド・ログイン・外部通信・分析ツールはありません
- PWA 対応（ホーム画面に追加でき、オフラインでも動きます）
- 見た目は bow-house デザインシステム（四角・太い線・赤 / 青 / 黄）に合わせています。フォントは外部から読み込まず、端末の日本語フォントを使います

## 使い方（開発）

```bash
pnpm install
```

```bash
pnpm dev
```

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | 開発サーバーを起動（http://localhost:5173） |
| `pnpm build` | 型チェック + 本番ビルド（`dist/` に出力） |
| `pnpm preview` | ビルド結果をローカルで確認（PWA の動作確認はこちらで） |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript の型チェックのみ |

## ジャンルの追加方法

`src/assets/quiz/` の下にフォルダを作るだけです。**フォルダ名がそのままジャンル名**になります。

```
src/assets/quiz/
├─ くだもの/
├─ どうぶつ/
└─ のりもの/      ← フォルダを作って画像を入れると「のりもの」ジャンルが増える
```

- ジャンル名はひらがなにしてください（子どもが読むため）
- ジャンルの並び順はあいうえお順です
- ジャンル選択画面のカード画像には、そのフォルダの **`default`** という名前の画像（例: `default.webp`）が使われます。`default` は出題されません
- `default` がないときは、あいうえお順で最初の画像がカードに使われます
- 出題する画像が1枚もないフォルダ（`default` だけのフォルダなど）は表示されません
- コードの変更は不要です

## 画像の追加方法

ジャンルのフォルダに画像を置くだけです。**ファイル名（拡張子を除く）がそのまま答え**になり、表示と読み上げに使われます。

```
src/assets/quiz/くだもの/りんご.webp   → 答えは「りんご」
```

- 対応形式: `.png` `.jpg` `.jpeg` `.webp`（おすすめは `.webp`）
- ファイル名はひらがなにしてください
- 正方形に近い画像がきれいに見えます（サムネイルは正方形に切り抜かれます。クイズ画面では全体が表示されます）
- 1枚あたり 200KB 程度までにしておくと、読み込みが速く、オフライン用のキャッシュも軽くなります
- 画像は `import.meta.glob` で自動的に集められるので、コードの変更は不要です
- 開発サーバーの起動中に追加した場合は、ブラウザを再読み込みしてください

いま入っている画像（`くだもの/` と `どうぶつ/` の `.png`）は動作確認用のダミーです。本物の画像に差し替えて、ダミーは削除してください。

## クレジットの書き方

Wikipedia / Wikimedia Commons の画像には、ライセンス（CC BY-SA など）にもとづく表示義務があります。
`src/assets/quiz/credits.json` に、画像ごとの作者・ライセンス・出典 URL を書いてください。
ジャンル選択画面の下の「がぞうについて」から、保護者向けのクレジット一覧で確認できます。

```json
{
  "りんご.webp": {
    "author": "Taro Yamada",
    "license": "CC BY-SA 4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg"
  },
  "くだもの/みかん.webp": {
    "author": "Hanako Suzuki",
    "license": "CC BY 2.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Example2.jpg"
  }
}
```

- キーは**拡張子つきのファイル名**です（例: `りんご.webp`）
- `default` の画像はどのジャンルにもあるので、`くだもの/default.webp` のように**ジャンル名つき**で書いてください
- 同じファイル名の画像が別のジャンルにもある場合は、`ジャンル名/ファイル名`（例: `くだもの/みかん.webp`）で書けます。こちらが優先されます
- `author`（作者）、`license`（ライセンス名）、`sourceUrl`（Commons のファイルページの URL）を書きます
- Commons のファイルページの「このファイルを再利用する」（Use this file）に、作者とライセンスの表記がまとまっています
- credits.json に書かれていない画像があると、**開発サーバー（`pnpm dev`）のブラウザのコンソール**に警告が出ます。ビルドは止まりません

## デプロイ（Vercel）

Vercel にリポジトリをつなぐだけで、自動で `pnpm build` され `dist/` が公開されます。`vercel.json` は不要です。
（Framework Preset は「Vite」が自動で選ばれます）

## ファイル構成

```
src/
├─ App.tsx                 画面の切り替え（ルーティングライブラリは使わない）
├─ components/
│   ├─ GenreSelect.tsx     ジャンル選択画面
│   ├─ Quiz.tsx            クイズ画面
│   ├─ Result.tsx          おしまい画面
│   ├─ Credits.tsx         画像クレジット一覧（保護者向け）
│   ├─ Button.tsx / HomeButton.tsx / Shapes.tsx
├─ lib/
│   ├─ loadAssets.ts       画像の自動収集
│   ├─ shuffle.ts          Fisher-Yates シャッフル（純粋関数）
│   ├─ credits.ts          クレジットの照合と開発時の警告
│   ├─ speak.ts            読み上げ（Web Speech API、非対応なら何もしない）
│   └─ preload.ts          次の画像の先読み
├─ styles/global.css       デザイントークンと共通スタイル
└─ assets/quiz/            クイズ画像と credits.json
public/                    PWA アイコン
```
