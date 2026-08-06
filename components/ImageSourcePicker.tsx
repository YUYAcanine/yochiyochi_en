"use client";

import React, { ChangeEvent } from "react";
import { Camera, Image as ImageIcon, Search } from "lucide-react";

type Props = {
  onPick: (file: File, source: "camera" | "file") => void;
  onGoSearch: () => void;
};

export default function ImageSourcePicker({ onPick, onGoSearch }: Props) {
  const handleChange =
    (source: "camera" | "file") => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onPick(file, source);

      // 同じファイルを連続で選べるようにクリア
      e.target.value = "";
    };

  return (
    <div className="flex flex-col flex-grow items-center justify-center">
      <div className="flex flex-col gap-8 items-center justify-center flex-grow mt-8">
        {/* カメラとアルバムを横並び */}
        <div className="flex gap-8 items-center justify-center">
          {/* カメラ */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[#6B5A4E] text-lg font-bold">カメラで撮る</p>
            <label
              htmlFor="camera-upload"
              className="w-32 h-32 bg-[#E8DCD0] border border-[#D3C5B9] flex items-center justify-center rounded-xl cursor-pointer"
            >
              <Camera className="w-10 h-10" />
              <input
                id="camera-upload"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleChange("camera")}
                className="hidden"
              />
            </label>
          </div>

          {/* ファイル */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[#6B5A4E] text-lg font-bold">アルバムから選ぶ</p>
            <label
              htmlFor="file-upload"
              className="w-32 h-32 bg-[#E8DCD0] border border-[#D3C5B9] flex items-center justify-center rounded-xl cursor-pointer"
            >
              <ImageIcon className="w-10 h-10" />
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleChange("file")}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 検索ボタン */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[#6B5A4E] text-lg font-bold">検索する</p>
          <button
            type="button"
            onClick={onGoSearch}
            className="w-32 h-32 bg-[#E8DCD0] border border-[#D3C5B9] flex items-center justify-center rounded-xl cursor-pointer hover:bg-[#D3C5B9] transition"
          >
            <Search className="w-10 h-10" />
          </button>
        </div>
      </div>
    </div>
  );
}
