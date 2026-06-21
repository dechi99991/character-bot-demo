"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import Noren from "@/components/Noren";
import ChatUI from "@/components/ChatUI";
import CharacterView from "@/components/CharacterView";
import Background from "@/components/Background";
import GridBackground from "@/components/GridBackground";
import BackgroundFX from "@/components/BackgroundFX";
import SceneObjects from "@/components/SceneObjects";

export default function Page() {
  const [showNoren, setShowNoren] = useState(true);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } =
    useChat();

  const handleEnter = () => {
    setTimeout(() => setShowNoren(false), 1000);
  };

  const handleHintClick = (text: string) => {
    append({ role: "user", content: text });
  };

  return (
    <div className="w-full h-screen bg-black">
      {/* 茶室 — 暖簾の裏で先にレンダリング */}
      <div className="relative w-full h-screen overflow-hidden font-sans text-gray-800 flex justify-center bg-tea-bg">
        {/* z-0: 背景（差し替えポイント: GridBackground → SvgBackground へ） */}
        <Background>
          <GridBackground />
        </Background>

        {/* z-[5]: 背景クリックインタラクション層 */}
        <BackgroundFX />

        {/* z-[8]: 背景オブジェクト層（急須等 — SVG ファイルのアップロードで差し替え可） */}
        <SceneObjects />

        {/* z-10: チャットUI + キャラクター */}
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

      {/* z-50: 暖簾レイヤー */}
      {showNoren && <Noren onEnter={handleEnter} />}
    </div>
  );
}
