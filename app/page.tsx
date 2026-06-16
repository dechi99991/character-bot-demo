"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import Noren from "@/components/Noren";
import ChatUI from "@/components/ChatUI";
import CharacterView from "@/components/CharacterView";

export default function Page() {
  const [hasEntered, setHasEntered] = useState(false);
  const [showNoren, setShowNoren] = useState(true);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat();

  const handleEnter = () => {
    setHasEntered(true);
    setTimeout(() => setShowNoren(false), 1000);
  };

  const handleHintClick = (text: string) => {
    append({ role: "user", content: text });
  };

  return (
    <div className="w-full h-screen bg-black">
      {/* 茶室 — 暖簾の裏で先にレンダリング */}
      <div className="relative w-full h-screen overflow-hidden font-sans text-gray-800 flex justify-center bg-tea-bg">
        {/* 背景: 障子グリッド + 畳グラデーション */}
        <div className="absolute inset-0 z-0 opacity-50">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--color-tea-tatami, #d0d0c0) 1px, transparent 1px),
                linear-gradient(to bottom, var(--color-tea-tatami, #d0d0c0) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-tea-tatami via-tea-tatami/50 to-transparent opacity-70" />
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 w-full max-w-5xl h-full flex flex-col md:flex-row">
          <ChatUI
            messages={messages}
            input={input}
            isLoading={isLoading}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
          />
          <CharacterView onHintClick={handleHintClick} />
        </div>
      </div>

      {/* 暖簾レイヤー */}
      {showNoren && <Noren onEnter={handleEnter} />}
    </div>
  );
}
