import { getApiBaseUrl } from "@/lib/api/config";

export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function resolveAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  return new URL(path, new URL(getApiBaseUrl()).origin).href;
}

export async function prepareAvatar(file: File): Promise<File> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Your image must be no larger than 4 MiB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be opened. Please choose another image.");
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    if (side < 1) throw new Error("This image is empty. Please choose another image.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(512, side);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare your image.");
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("This image could not be prepared. Please try another image."));
        },
        file.type,
        0.9,
      ),
    );
    const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
    return new File([blob], `avatar.${extension}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
