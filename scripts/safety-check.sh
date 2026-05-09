#!/bin/bash
# PreToolUse Hook: 危険コマンドチェック（テンプレート版）
# - 危険なgit/削除コマンドをブロック
# - ~/.claude/ への書き込みをブロック（フィロソフィー保護）
# - .git ディレクトリの削除は許可

cmd=$(jq -r '.tool_input.command // ""')

# ~/.claude/ への書き込みをブロック（読み取りは許可）
if echo "$cmd" | grep -qE '~/\.claude/|\$HOME/\.claude/|/Users/[^/]+/\.claude/'; then
  if echo "$cmd" | grep -qE '\b(cat|head|tail|less|more|ls|find|grep|rg|git\s+log|git\s+status|git\s+diff)\b'; then
    echo '{"decision":"approve"}'
  else
    echo '{"decision":"block","reason":"~/.claude/ への変更はclaude-project-baseの /harness-insights を通じて行ってください。このプロジェクトから直接変更することはできません。"}'
  fi
  exit 0
fi

# .claude/settings.json への Bash 経由書き込みをブロック
# jq, sed, echo, cat 等で settings.json を書き換える迂回を検知
if echo "$cmd" | grep -qE '\.claude/settings\.json' && echo "$cmd" | grep -qE '\b(jq|sed|awk|echo|cat|tee|cp|mv)\b.*>|>\s*.*\.claude/settings\.json'; then
  echo '{"decision":"block","reason":".claude/settings.json への Bash 経由の書き込みがブロックされました。Edit/Write ツールを使用してください（それも deny されている場合は設計意図です）。"}'
  exit 0
fi

# curl/wget ブロック（外部通信によるデータ流出防止）
if echo "$cmd" | grep -qE '^\s*(curl|wget)\s'; then
  echo '{"decision":"block","reason":"外部通信コマンドはdenyルールでブロックされています。"}'
  exit 0
fi

# git の危険コマンド（常にブロック）
if echo "$cmd" | grep -qE '\bgit\s+push\s+--force\b|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-f'; then
  echo '{"decision":"block","reason":"危険なgitコマンドがブロックされました。"}'
  exit 0
fi

# 再帰削除のチェック
if echo "$cmd" | grep -qE '\brm\s+-(r|rf|fr)\b'; then
  # .git ディレクトリへの操作は許可（相対パス・絶対パス両対応）
  if echo "$cmd" | grep -qE '\brm\s+-(r|rf|fr)\s+\S*\.git\b'; then
    echo '{"decision":"approve"}'
  else
    echo '{"decision":"block","reason":"再帰削除がブロックされました。対象が安全か確認してください。"}'
  fi
  exit 0
fi

echo '{"decision":"approve"}'
