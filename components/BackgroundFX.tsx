"use client";

interface BackgroundFXProps {
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * 背景クリックインタラクション用透明オーバーレイ（z-[5]）。
 * 波紋・茶葉浮遊等のエフェクトはここに実装する。
 */
export default function BackgroundFX({ onClick }: BackgroundFXProps) {
  return (
    <div
      className="absolute inset-0 z-[5] pointer-events-auto"
      onClick={onClick}
    />
  );
}
