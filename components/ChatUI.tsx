"use client";

import React, { useEffect, useRef } from "react";
import { Send, Plus } from "lucide-react";
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full pl-4 md:pl-10 pr-4 py-8 max-w-3xl">
      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto pb-4 hide-scrollbar space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" ? (
              <div className="bg-white/95 backdrop-blur-sm border border-tea-mid rounded-2xl p-5 shadow-sm max-w-[85%] text-lg leading-relaxed text-gray-700 font-serif">
                {msg.content.split("\n").map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="bg-tea-dark text-white rounded-full py-3 px-6 shadow-md max-w-[85%] flex items-center gap-2">
                <span className="text-base tracking-wide">{msg.content}</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <TypingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="mt-auto shrink-0 w-full mb-4">
        <form onSubmit={handleSubmit}>
          <div className="bg-tea-panel/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-tea-panel-border">
            <div className="relative flex items-center bg-white/60 rounded-xl overflow-hidden h-24 md:h-32">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="一息ついて、お話ししましょう"
                className="w-full h-full p-4 bg-transparent resize-none outline-none text-gray-700 placeholder-gray-400 font-serif"
              />
            </div>
            <div className="flex justify-between items-center mt-3 px-2">
              <button
                type="button"
                className="p-2 hover:bg-black/5 rounded-full transition text-tea-dark"
                aria-label="添付"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 hover:bg-black/5 rounded-full transition text-tea-dark disabled:opacity-40"
                aria-label="送信"
              >
                <Send size={24} className="rotate-45" />
              </button>
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          ※ AIによる回答は参考情報です。詳しくは各詳細ページをご確認ください。
        </p>
      </div>
    </div>
  );
}
