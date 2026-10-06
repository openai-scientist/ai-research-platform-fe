import { describe, expect, it, vi } from "vitest";

import { AVATAR_MAX_BYTES, prepareAvatar, resolveAvatarUrl } from "./avatar";

describe("avatar preparation", () => {
  it("resolves the API origin and keeps the cache version", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api/v1");
    expect(resolveAvatarUrl("/api/v1/users/u/avatar?v=version-2")).toBe(
      "https://api.example.com/api/v1/users/u/avatar?v=version-2",
    );
    expect(resolveAvatarUrl(null)).toBeUndefined();
  });
  it("rejects unsupported files and files larger than 4 MiB before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    await expect(prepareAvatar(new File(["data"], "image.svg", { type: "image/svg+xml" }))).rejects.toThrow(
      "PNG, JPEG, or WebP",
    );
    await expect(
      prepareAvatar(new File([new Uint8Array(AVATAR_MAX_BYTES + 1)], "image.png", { type: "image/png" })),
    ).rejects.toThrow("4 MiB");
    expect(decode).not.toHaveBeenCalled();
  });
  it.each([
    { width: 1200, height: 800, x: 200, y: 0 },
    { width: 800, height: 1200, x: 0, y: 200 },
  ])("crops a $width by $height image to a square and closes the bitmap", async ({ width, height, x, y }) => {
    const bitmap = { width, height, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(["image"], { type: "image/png" })),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const file = await prepareAvatar(new File(["image"], "large.png", { type: "image/png" }));
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(bitmap, x, y, 800, 800, 0, 0, 512, 512);
    expect(file.type).toBe("image/png");
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it("releases the bitmap if canvas preparation fails", async () => {
    const bitmap = { width: 20, height: 20, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    await expect(prepareAvatar(new File(["image"], "image.png", { type: "image/png" }))).rejects.toThrow(
      "could not prepare",
    );
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
