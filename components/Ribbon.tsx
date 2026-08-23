// components/Ribbon.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ComponentProps, ReactNode } from "react";

type Props = {
  /** Link destination when clicked (default: "/") */
  href?: string;
  /** Path to the logo image under public (e.g. "/yoyochi.jpg") */
  logoSrc: string;
  /** Alt text for the image (default: "Logo") */
  alt?: string;
  /**
   * Height class (default: h-20). Since this is a fixed header,
   * give the page the same amount of padding-top (e.g. pt-20)
   */
  heightClass?: string;
  /** Background color class (default: bg-[#F0E4D8]) */
  bgClass?: string;
  /** Extra class for the outer wrapper (used for animation) */
  containerClassName?: string;
  /** Logo width/height (for Next/Image layout) */
  logoWidth?: number;
  logoHeight?: number;
  /** Extra class for the logo (for fine-tuning size/effects) */
  logoClassName?: string;
  /** Props passed to Link (e.g. prefetch) */
  linkProps?: Partial<ComponentProps<typeof Link>>;
  /** Optional content shown on the right */
  rightContent?: ReactNode;
};

export default function Ribbon({
  href = "/",
  logoSrc,
  alt = "Logo",
  heightClass = "h-20",
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
      <Link
        href={href}
        className="flex items-center gap-1 rounded-full px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-black/5 active:bg-black/10"
        aria-label="Back to home"
        {...linkProps}
      >
        <ChevronLeft className="h-6 w-6 shrink-0 text-[#6B5A4E]" strokeWidth={3} aria-hidden="true" />
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

