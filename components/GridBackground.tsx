"use client";

/**
 * 現行モック背景（障子グリッド + 畳グラデーション）。
 * デザイアドライン社から /public/assets/background.svg が届いたら
 * このコンポーネントの中身を差し替える（または SvgBackground に置き換える）。
 */
export default function GridBackground() {
  return (
    <div className="absolute inset-0 opacity-50">
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
  );
}
