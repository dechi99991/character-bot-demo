"use client";

import { useState } from "react";

const HINTS = [
  "煎茶の茶葉をつかったお茶の淹れ方のバリエーションは何がある？",
  "夜、ぐっすり寝たい時にオススメの茶葉はどれ？",
  "お茶クイズを出題してみて",
];

type CharacterViewProps = {
  onHintClick: (text: string) => void;
};

export default function CharacterView({ onHintClick }: CharacterViewProps) {
  const [isPopping, setIsPopping] = useState(false);

  const handleCharacterClick = () => {
    if (isPopping) return;
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 550);
  };

  return (
    <div className="hidden md:flex flex-1 relative justify-center items-end pointer-events-none pb-10">
      {/* HINT吹き出し */}
      <div className="absolute top-16 right-1/4 z-30 pointer-events-auto w-72">
        <div className="bg-white/95 backdrop-blur-md border-2 border-tea-mid rounded-2xl p-5 shadow-xl relative floating-animation">
          <p className="text-[#3a5a4a] text-sm tracking-widest mb-2 font-bold text-center border-b border-tea-mid/30 pb-2">
            H I N T
          </p>
          <ul className="space-y-3 mt-3">
            {HINTS.map((hint, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer hover:text-tea-dark hover:bg-tea-panel/50 p-2 rounded transition-colors"
                onClick={() => onHintClick(hint)}
              >
                <span className="text-tea-mid mt-0.5 text-xs">▶︎</span>
                <span className="leading-tight">{hint}</span>
              </li>
            ))}
          </ul>
          <div className="absolute -bottom-3 right-10 w-6 h-6 bg-white border-b-2 border-r-2 border-tea-mid transform rotate-45" />
        </div>
      </div>

      {/* キャラクター — /public/assets/character.svg を参照。差し替えはファイルのアップロードのみ */}
      <div className="relative z-20 w-[300px] h-[500px] breathing-animation">
        <img
          src="/assets/character.svg"
          alt="お茶キャラクター"
          className={`w-full h-full object-contain filter drop-shadow-lg cursor-pointer pointer-events-auto ${
            isPopping ? "pop-once" : ""
          }`}
          onClick={handleCharacterClick}
        />
      </div>
    </div>
  );
}
