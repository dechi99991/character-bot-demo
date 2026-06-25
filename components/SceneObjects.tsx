"use client";

import React, { useState } from "react";

interface SceneObjectConfig {
  id: string;
  src: string;
  alt: string;
  style: React.CSSProperties;
}

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
    },
  },
];

/** z-[8]: 背景オブジェクト層。SVG ファイルのアップロードで差し替え可。 */
export default function SceneObjects() {
  const [animating, setAnimating] = useState<Set<string>>(new Set());

  const handleClick = (id: string) => {
    if (animating.has(id)) return;
    setAnimating((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setAnimating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
  };

  return (
    <div className="absolute inset-0 z-[8] pointer-events-none hidden md:block">
      {SCENE_OBJECTS.map((obj) => (
        <div key={obj.id} style={obj.style} className="floating-animation">
          <img
            src={obj.src}
            alt={obj.alt}
            className={`w-full h-full object-contain cursor-pointer pointer-events-auto opacity-85 ${
              animating.has(obj.id) ? "wiggle-once" : ""
            }`}
            onClick={() => handleClick(obj.id)}
          />
        </div>
      ))}
    </div>
  );
}
