"use client";

import React from "react";

interface BackgroundProps {
  children: React.ReactNode;
}

/**
 * 背景差し替えポイント。
 * children（GridBackground 等）を差し替えるだけで背景変更できる。
 */
export default function Background({ children }: BackgroundProps) {
  return <div className="absolute inset-0 z-0">{children}</div>;
}
