"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Message } from "@ai-sdk/react";

type ChatUIProps = {
  messages: Message[];
  input: string;
  isLoading: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/95 border border-tea-mid rounded-2xl px-5 py-3 text-sm text-gray-500 font-serif">
        お茶を淹れています...🍵
      </div>
    </div>
  );
}

export default function ChatUI({
  messages,
  input,
  isLoading,
  handleInputChange,
  handleSubmit,
}: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  // Safari 対策: compositionend 直後 300ms の Enter をブロック
  const [enterGuard, setEnterGuard] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 入力内容に応じて textarea を自動リサイズ
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing && // Chrome/Edge の IME チェック
      !isComposing &&                // state でも二重チェック
      !enterGuard                    // Safari の遅延 Enter ガード
    ) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
    setEnterGuard(true);
    setTimeout(() => setEnterGuard(false), 300);
  };

  return (
    <div className="flex-1 flex flex-col h-full px-4 md:pl-10 md:pr-4 py-4 md:py-8 max-w-3xl">
      {/* モバイルのみ表示するヘッダー */}
      <div className="md:hidden shrink-0 flex items-center justify-center pb-3 mb-2 border-b border-tea-mid/20">
        <span className="text-sm font-serif text-tea-dark tracking-widest">
          tayumano お茶室
        </span>
      </div>

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto pb-4 hide-scrollbar space-y-4 md:space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" ? (
              <div className="bg-white/95 backdrop-blur-sm border border-tea-mid rounded-2xl p-4 md:p-5 shadow-sm max-w-[90%] md:max-w-[85%] text-base md:text-lg leading-relaxed text-gray-700 font-serif">
                {msg.content.split("\n").map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="bg-tea-dark text-white rounded-full py-2 md:py-3 px-5 md:px-6 shadow-md max-w-[90%] md:max-w-[85%] flex items-center gap-2">
                <span className="text-sm md:text-base tracking-wide">
                  {msg.content}
                </span>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <TypingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア（iOS safe-area 対応） */}
      <div
        className="mt-auto shrink-0 w-full mb-2 md:mb-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <form onSubmit={handleSubmit}>
          <div className="bg-tea-panel/90 backdrop-blur-md rounded-2xl p-3 md:p-4 shadow-sm border border-tea-panel-border">
            {/* autoResize textarea：固定高さなし・最大160px */}
            <div className="relative flex items-end bg-white/60 rounded-xl overflow-hidden">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={handleCompositionEnd}
                placeholder="一息ついて、お話ししましょう"
                rows={1}
                disabled={isLoading}
                className="w-full p-4 bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400 font-serif overflow-y-auto disabled:opacity-60"
                style={{ minHeight: "52px", maxHeight: "160px" }}
              />
            </div>
            {/* 送信ボタン：モバイルでも44px以上のタップ領域を確保 */}
            <div className="flex justify-end items-center mt-2 md:mt-3 px-2">
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 hover:bg-black/5 rounded-full transition text-tea-dark disabled:opacity-40"
                aria-label="送信"
              >
                <Send size={22} className="rotate-45" />
              </button>
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500 mt-2 md:mt-4">
          ※ AIによる回答は参考情報です。詳しくは各詳細ページをご確認ください。
        </p>
      </div>
    </div>
  );
}
