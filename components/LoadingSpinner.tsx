// components/LoadingSpinner.tsx
"use client";

import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
      <Loader2 className="h-12 w-12 animate-spin text-gray-600" />
    </div>
  );
}