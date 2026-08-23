/**
 * useImageInput
 *
 * A custom hook that bundles side-effect handling for image file input.
 *
 * - Image compression (browser-image-compression)
 * - Converting a File / Blob to a DataURL
 *
 * The goal is to let UI components just pass a File, hiding the
 * details of image processing from them.
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
