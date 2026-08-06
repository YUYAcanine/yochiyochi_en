/**
 * useImageInput
 *
 * 画像ファイル入力に関する副作用処理をまとめたカスタムフック。
 *
 * - 画像の圧縮（browser-image-compression）
 * - File / Blob を DataURL に変換
 *
 * UIコンポーネント側では File を渡すだけで済むようにし、
 * 画像処理の詳細を隠蔽することを目的としている。
**/

"use client";

import imageCompression from "browser-image-compression";

export function useImageInput() {
  const toDataURL = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const pickImageAsDataUrl = async (file: File) => {
    let compressed: File = file;

    try {
      compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });
    } catch {
      compressed = file;
    }

    return await toDataURL(compressed);
  };

  return { pickImageAsDataUrl };
}
