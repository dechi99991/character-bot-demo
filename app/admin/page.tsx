"use client";

import { useState, useEffect, useCallback } from "react";
import type { Topic, SalesRule } from "@/lib/db";

// ============================================================
// 管理画面（プロトタイプ）
// 認証なし。Cloudflare Workers 移行時に Cloudflare Access 等で保護する。
// ============================================================

type TopicForm = { title: string; body: string; enabled: boolean };
type RuleForm = {
  keywords: string;
  recommendProduct: string;
  recommendMessage: string;
  priority: number;
  enabled: boolean;
};

const EMPTY_TOPIC: TopicForm = { title: "", body: "", enabled: true };
const EMPTY_RULE: RuleForm = {
  keywords: "",
  recommendProduct: "",
  recommendMessage: "",
  priority: 100,
  enabled: true,
};

export default function AdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [rules, setRules] = useState<SalesRule[]>([]);
  const [topicForm, setTopicForm] = useState<TopicForm>(EMPTY_TOPIC);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チャット画面の overflow:hidden をリセット（admin は通常スクロール）
  useEffect(() => {
    document.body.style.overflowY = "auto";
    return () => { document.body.style.overflowY = ""; };
  }, []);

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        fetch("/api/topics").then((res) => res.json()),
        fetch("/api/sales-rules").then((res) => res.json()),
      ]);
      setTopics(t.items);
      setRules(r.items);
    } catch {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Topics ----

  async function addTopic() {
    if (!topicForm.title.trim() || !topicForm.body.trim()) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(topicForm),
    });
    const topic = await res.json();
    setTopics((prev) => [...prev, topic]);
    setTopicForm(EMPTY_TOPIC);
  }

  async function toggleTopic(topic: Topic) {
    const res = await fetch(`/api/topics/${topic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !topic.enabled }),
    });
    const updated = await res.json();
    setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function deleteTopic(id: number) {
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  // ---- Sales Rules ----

  async function addRule() {
    if (
      !ruleForm.keywords.trim() ||
      !ruleForm.recommendProduct.trim() ||
      !ruleForm.recommendMessage.trim()
    )
      return;
    const res = await fetch("/api/sales-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ruleForm),
    });
    const rule = await res.json();
    setRules((prev) => [...prev, rule]);
    setRuleForm(EMPTY_RULE);
  }

  async function toggleRule(rule: SalesRule) {
    const res = await fetch(`/api/sales-rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function deleteRule(id: number) {
    await fetch(`/api/sales-rules/${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-dvh text-gray-400 text-sm">
        読み込み中...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-dvh text-red-500 text-sm">
        {error}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
      <h1 className="text-xl font-semibold text-gray-800">
        tayumano Bot 管理画面
        <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          プロトタイプ（認証なし）
        </span>
      </h1>

      {/* ---- 話題 ---- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-700 border-b pb-1">
          ① 話題・雑談トピック
        </h2>

        {/* 一覧 */}
        <ul className="space-y-2">
          {topics.length === 0 && (
            <li className="text-sm text-gray-400">話題はまだありません</li>
          )}
          {topics.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                t.enabled ? "bg-white" : "bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">{t.title}</p>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                  {t.body}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 mt-0.5">
                <button
                  onClick={() => toggleTopic(t)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {t.enabled ? "無効化" : "有効化"}
                </button>
                <button
                  onClick={() => deleteTopic(t.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* 追加フォーム */}
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">新しい話題を追加</p>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            placeholder="タイトル（例: 梅雨の過ごし方）"
            value={topicForm.title}
            onChange={(e) =>
              setTopicForm((f) => ({ ...f, title: e.target.value }))
            }
          />
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            placeholder="本文（プロンプトに注入される雑談のフック）"
            rows={3}
            value={topicForm.body}
            onChange={(e) =>
              setTopicForm((f) => ({ ...f, body: e.target.value }))
            }
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={topicForm.enabled}
                onChange={(e) =>
                  setTopicForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              有効
            </label>
            <button
              onClick={addTopic}
              disabled={!topicForm.title.trim() || !topicForm.body.trim()}
              className="bg-green-600 text-white text-xs px-4 py-1.5 rounded disabled:opacity-40 hover:bg-green-700 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      </section>

      {/* ---- 営業ルール ---- */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-700 border-b pb-1">
          ② 営業ルール（キーワード × レコメンド）
        </h2>

        {/* 一覧 */}
        <ul className="space-y-2">
          {rules.length === 0 && (
            <li className="text-sm text-gray-400">
              営業ルールはまだありません
            </li>
          )}
          {rules.map((r) => (
            <li
              key={r.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                r.enabled ? "bg-white" : "bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-medium text-gray-800">
                  {r.recommendProduct}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    優先度 {r.priority}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  キーワード: {r.keywords}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {r.recommendMessage}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 mt-0.5">
                <button
                  onClick={() => toggleRule(r)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {r.enabled ? "無効化" : "有効化"}
                </button>
                <button
                  onClick={() => deleteRule(r.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* 追加フォーム */}
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">
            新しい営業ルールを追加
          </p>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            placeholder="キーワード（カンマ区切り）例: 疲れた,しんどい"
            value={ruleForm.keywords}
            onChange={(e) =>
              setRuleForm((f) => ({ ...f, keywords: e.target.value }))
            }
          />
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            placeholder="レコメンド商品名 例: Midnight Roaster"
            value={ruleForm.recommendProduct}
            onChange={(e) =>
              setRuleForm((f) => ({ ...f, recommendProduct: e.target.value }))
            }
          />
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            placeholder="レコメンドトーク（プロンプトに注入される）"
            rows={3}
            value={ruleForm.recommendMessage}
            onChange={(e) =>
              setRuleForm((f) => ({ ...f, recommendMessage: e.target.value }))
            }
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <span>優先度</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                  value={ruleForm.priority}
                  onChange={(e) =>
                    setRuleForm((f) => ({
                      ...f,
                      priority: parseInt(e.target.value, 10) || 100,
                    }))
                  }
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={ruleForm.enabled}
                  onChange={(e) =>
                    setRuleForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                有効
              </label>
            </div>
            <button
              onClick={addRule}
              disabled={
                !ruleForm.keywords.trim() ||
                !ruleForm.recommendProduct.trim() ||
                !ruleForm.recommendMessage.trim()
              }
              className="bg-green-600 text-white text-xs px-4 py-1.5 rounded disabled:opacity-40 hover:bg-green-700 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-400 text-center pb-4">
        ※ データはサーバー再起動でリセットされます（プロトタイプ仕様）
      </p>
    </div>
  );
}
