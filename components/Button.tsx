// components/Button.tsx
import Link from "next/link";
import clsx from "clsx";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "purple" | "green" | "blue" | "gray" ;
};

export default function Button({ href, children, variant = "purple" }: Props) {
  const base = "rounded-lg px-6 py-3 text-white font-semibold shadow transition";
  const colors = {
    purple: "bg-purple-600 hover:bg-purple-500",
    green: "bg-green-600 hover:bg-green-500",
    blue: "bg-blue-600 hover:bg-blue-500",
    gray: "bg-gray-300 text-gray-900 hover:bg-gray-200",
  };

  return (
    <Link href={href} className={clsx(base, colors[variant])}>
      {children}
    </Link>
  );
}
