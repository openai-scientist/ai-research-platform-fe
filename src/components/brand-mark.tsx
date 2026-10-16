import { cn } from "cn";

/**
 * The OpenAI Scientist mark, painted in the current text colour so it works on light, dark
 * and every theme preset. The shape comes from /brand/logo-mark.svg, used as a mask.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 shrink-0 bg-current [mask:url(/brand/logo-mark.svg)_center/contain_no-repeat]",
        className,
      )}
    />
  );
}
