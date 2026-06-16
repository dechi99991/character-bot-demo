"use client";

import React from "react";

const HINTS = [
  "煎茶の茶葉をつかったお茶の淹れ方のバリエーションは何がある？",
  "夜、ぐっすり寝たい時にオススメの茶葉はどれ？",
  "お茶クイズを出題してみて",
];

// デフォルトのモックキャラクターSVG。後日Lottie等に差し替え可。
function DefaultCharacterSvg() {
  return (
    <svg
      viewBox="0 0 200 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full filter drop-shadow-lg"
    >
      <path
        d="M60 150 C 40 200, 40 300, 50 400 L 150 400 C 160 300, 160 200, 140 150 Z"
        fill="white"
        stroke="black"
        strokeWidth="3"
      />
      <path
        d="M55 200 Q 100 220, 145 200 L 150 250 Q 100 270, 50 250 Z"
        fill="#e8f0e8"
        stroke="black"
        strokeWidth="2"
      />
      <path d="M45 280 Q 100 310, 155 280" stroke="black" strokeWidth="2" />
      <path d="M48 320 Q 100 300, 152 320" stroke="black" strokeWidth="2" />
      <circle cx="100" cy="150" r="25" fill="white" stroke="black" strokeWidth="3" />
      <circle cx="90" cy="165" r="3" fill="black" />
      <circle cx="110" cy="165" r="3" fill="black" />
      <path
        d="M65 110 C 65 70, 135 70, 135 110 C 145 130, 120 145, 100 145 C 80 145, 55 130, 65 110 Z"
        fill="white"
        stroke="black"
        strokeWidth="3"
      />
      <path
        d="M50 100 C 60 50, 140 50, 150 100 C 160 80, 130 30, 100 30 C 70 30, 40 80, 50 100 Z"
        fill="#1a1a1a"
      />
      <circle cx="70" cy="50" r="15" fill="#1a1a1a" />
      <circle cx="100" cy="40" r="20" fill="#1a1a1a" />
      <circle cx="130" cy="50" r="15" fill="#1a1a1a" />
      <circle cx="55" cy="80" r="15" fill="#1a1a1a" />
      <circle cx="145" cy="80" r="15" fill="#1a1a1a" />
      <circle cx="85" cy="110" r="10" fill="none" stroke="black" strokeWidth="2" />
      <circle cx="115" cy="110" r="10" fill="none" stroke="black" strokeWidth="2" />
      <line x1="95" y1="110" x2="105" y2="110" stroke="black" strokeWidth="2" />
      <circle cx="85" cy="110" r="2" fill="black" />
      <circle cx="115" cy="110" r="2" fill="black" />
      <path d="M95 130 Q 100 135, 105 130" stroke="black" strokeWidth="2" fill="none" />
      <path
        d="M140 160 C 180 170, 190 220, 170 260"
        fill="none"
        stroke="black"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M60 160 C 20 170, 20 100, 40 80"
        fill="none"
        stroke="black"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M35 85 L 30 60 L 45 65"
        fill="none"
        stroke="black"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M70 400 L 70 450" stroke="black" strokeWidth="20" strokeLinecap="square" />
      <path d="M130 400 L 130 450" stroke="black" strokeWidth="20" strokeLinecap="square" />
      <ellipse cx="65" cy="460" rx="25" ry="10" fill="white" stroke="black" strokeWidth="3" />
      <ellipse cx="135" cy="460" rx="25" ry="10" fill="white" stroke="black" strokeWidth="3" />
    </svg>
  );
}

type CharacterViewProps = {
  onHintClick: (text: string) => void;
  /** 差し替え用キャラクターSVG。省略時はデフォルトモックSVGを使用 */
  characterSvg?: React.ReactNode;
};

export default function CharacterView({ onHintClick, characterSvg }: CharacterViewProps) {
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
          {/* 吹き出しのしっぽ */}
          <div className="absolute -bottom-3 right-10 w-6 h-6 bg-white border-b-2 border-r-2 border-tea-mid transform rotate-45" />
        </div>
      </div>

      {/* キャラクター */}
      <div className="relative z-20 w-[300px] h-[500px] breathing-animation">
        {characterSvg ?? <DefaultCharacterSvg />}
      </div>
    </div>
  );
}
