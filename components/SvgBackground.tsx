"use client";

/**
 * SVGファイル参照背景。
 * /public/assets/background.svg をアップロードするだけで差し替え可能。
 */
export default function SvgBackground() {
  return (
    <img
      src="/assets/background.svg"
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
