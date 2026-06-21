"use client";

import React from "react";

interface SceneObjectConfig {
  id: string;
  /** /public/assets/objects/ 以下の SVG ファイルパス */
  src: string;
  alt: string;
  style: React.CSSProperties;
  className?: string;
}

/**
 * 背景オブジェクト定義。
 * 新オブジェクトを追加するときはここに1エントリ追加し、
 * /public/assets/objects/<name>.svg を配置する。
 * 既存オブジェクトの差し替えは SVG ファイルのアップロードのみで完結する。
 */
const SCENE_OBJECTS: SceneObjectConfig[] = [
  {
    id: "teapot",
    src: "/assets/objects/teapot.svg",
    alt: "急須",
    style: {
      position: "absolute",
      bottom: "28%",
      left: "4%",
      width: "90px",
      opacity: 0.85,
    },
    className: "floating-animation",
  },
];

/** z-[8]: Background(0) と ChatUI(10) の間に配置するオブジェクト層 */
export default function SceneObjects() {
  return (
    <div className="absolute inset-0 z-[8] pointer-events-none hidden md:block">
      {SCENE_OBJECTS.map((obj) => (
        <img
          key={obj.id}
          src={obj.src}
          alt={obj.alt}
          style={obj.style}
          className={obj.className}
        />
      ))}
    </div>
  );
}
