# なにかな?クイズ — Claude 向けメモ

3歳児向けの画像クイズ SPA（Vite + React + TypeScript、pnpm）。仕様と使い方は README.md を参照。

## コミット・プッシュの前に必ずやること

`git commit` / `git push` の前に、次の順で確認する。ひとつでも失敗したらコミットしない。

1. `pnpm images:check` — `src/assets/quiz/` の画像がすべて **WebP・長辺 1200px 以内・400KB 以内** か確認する
   - 失敗したら `pnpm images:optimize` を実行する（JPG/PNG などを WebP に変換して元ファイルを置き換え、`credits.json` のキーも `.webp` に書き換える）
   - 変換後にもう一度 `pnpm images:check` が通ることを確認し、ブラウザで画像が表示されることを確かめる
2. `pnpm audio:check` — 読み上げ音声がすべて **.m4a・100KB 以内**で、ファイル名がそのジャンルの答えと一致するか確認する
   - 形式で失敗したら `pnpm audio:optimize` を実行する（WAV などを AAC の .m4a に変換して元ファイルを消す。macOS の afconvert を使う）
   - 名前で失敗したら、ファイル名を答え（画像のファイル名・colors.json のキー・text.json の文字）に合わせる
3. `pnpm typecheck` と `pnpm lint`
4. `pnpm build`
5. `git status` で、コミットに入るファイルを確認する。ユーザーが追加した画像が WebP 化されずに混ざっていないか特に見る

`.claude/settings.json` のフックが `git commit` / `git push` の前に `images:check` と `audio:check` を自動で実行し、失敗したらブロックする。フックに止められたら、上の手順で直してから再実行する（フックを外したり回避したりしない）。

## 画像のルール

- 置き場所: `src/assets/quiz/<ジャンル>/<答え>.webp`。フォルダ名＝ジャンル、ファイル名＝答え
- `default.webp` はジャンルのカード画像（出題されない）
- ユーザーは JPG/PNG のまま画像を追加することがある。そのままコミットせず、必ず `pnpm images:optimize` で変換する
- 色の問題は画像を置かず、ジャンルフォルダの `colors.json`（`{ "答え": "#RRGGBB" }`）に書く。`colors.json` は images:check / optimize の対象外
- 文字の問題（ひらがな など）は `text.json`（`{ "pick": 20, "items": ["あ", ...] }`）に書く。pick は1回に出す数（省略で全問）。読みを決めたい項目は `{ "text": "a", "read": "A" }`。`"lang": "en-US"` でそのジャンルを英語で読み上げる。これも images:check / optimize の対象外
- `credits.json` のキーは拡張子つきのファイル名（`りんご.webp`）。`default` は `ジャンル/default.webp` で書く

## 読み上げ音声のルール

- 置き場所: `src/assets/quiz/<ジャンル>/<答え>.m4a`。問題以外の言葉（おしまい）は `src/assets/voice/<言葉>.m4a`
- ユーザーは WAV で置く。そのままコミットせず、必ず `pnpm audio:optimize` で変換する（`*.wav` は .gitignore 済み）
- 音声がある問題は Web Audio API で鳴らし（Media Session を出さないため `<audio>` は使わない）、ない問題・鳴らせないときは Web Speech API で読む
