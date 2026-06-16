"use client";

import { useState } from "react";

type NorenProps = {
  onEnter: () => void;
};

export default function Noren({ onEnter }: NorenProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    if (isOpen) return;
    setIsOpen(true);
    setTimeout(onEnter, 1200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex cursor-pointer transition-opacity duration-1000 ${isOpen ? "pointer-events-none" : ""}`}
      onClick={handleOpen}
    >
      {/* 左パネル */}
      <div
        className={`w-1/2 h-full bg-tea-green border-r border-tea-border flex items-center justify-end pr-4 transition-all duration-1000 ease-in-out origin-top ${
          isOpen
            ? "scale-y-75 -skew-x-6 opacity-0"
            : "scale-y-100 skew-x-0 opacity-100"
        }`}
        style={{ boxShadow: "2px 0 10px rgba(0,0,0,0.3)" }}
      >
        <div className="w-12 h-3/4 border-2 border-tea-light rounded-sm flex items-center justify-start pt-20 opacity-80 writing-vertical-rl text-white text-xl md:text-2xl font-serif tracking-widest">
          茶室
        </div>
      </div>

      {/* 右パネル */}
      <div
        className={`w-1/2 h-full bg-tea-green border-l border-tea-border flex items-center justify-start pl-4 transition-all duration-1000 ease-in-out origin-top ${
          isOpen
            ? "scale-y-75 skew-x-6 opacity-0"
            : "scale-y-100 skew-x-0 opacity-100"
        }`}
        style={{ boxShadow: "-2px 0 10px rgba(0,0,0,0.3)" }}
      >
        <div className="w-12 h-3/4 border-2 border-tea-light rounded-sm flex flex-col items-center justify-start opacity-80 text-white text-xl md:text-2xl font-serif tracking-widest pt-20">
          案内
        </div>
      </div>

      {/* 中央ボタン */}
      <div
        className={`absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
          isOpen ? "opacity-0" : "opacity-100 animate-pulse"
        }`}
      >
        <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full border border-white/50 text-base md:text-lg font-serif tracking-widest hover:bg-white/30 transition">
          のれんをくぐる
        </button>
      </div>
    </div>
  );
}
