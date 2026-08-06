// components/Ribbon.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ComponentProps, ReactNode } from "react";

type Props = {
  /** クリック時に戻るリンク先（既定: "/"） */
  href?: string;
  /** public 配下のロゴ画像パス（例: "/yoyochi.jpg"） */
  logoSrc: string;
  /** 画像の代替テキスト（既定: "Logo"） */
  alt?: string;
  /**
   * 高さクラス（既定: h-24）。固定ヘッダなので
   * ページ側は同じ高さ分の padding-top をつけてね（例: pt-24）
   */
  heightClass?: string;
  /** 背景色クラス（既定: bg-[#F0E4D8]） */
  bgClass?: string;
  /** 外側ラッパの追加クラス（アニメ用に使う） */
  containerClassName?: string;
  /** ロゴの幅/高さ（Next/Image のレイアウト用） */
  logoWidth?: number;
  logoHeight?: number;
  /** ロゴの追加クラス（サイズやエフェクトの微調整に） */
  logoClassName?: string;
  /** Link に渡す props（prefetch など） */
  linkProps?: Partial<ComponentProps<typeof Link>>;
  /** 右側に表示する任意コンテンツ */
  rightContent?: ReactNode;
};

export default function Ribbon({
  href = "/",
  logoSrc,
  alt = "Logo",
  heightClass = "h-24",
  bgClass = "bg-[#F0E4D8]",
  containerClassName = "",
  logoWidth = 240,
  logoHeight = 90,
  logoClassName = "h-20 w-auto object-contain",
  linkProps,
  rightContent,
}: Props) {
  return (
    <div
      className={`fixed top-0 left-0 w-full ${heightClass} ${bgClass} flex items-center justify-between px-3 z-50 shadow-md ${containerClassName}`}
    >
      <Link href={href} className="flex items-center" {...linkProps}>
        <Image
          src={logoSrc}
          alt={alt}
          width={logoWidth}
          height={logoHeight}
          className={logoClassName}
          priority
        />
      </Link>
      {rightContent && <div className="pr-2">{rightContent}</div>}
    </div>
  );
}

