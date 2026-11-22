"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "cn";

/** Colours the frame borrows from the page, read from real elements so light and dark both follow the app. */
interface FrameTheme {
  dark: boolean;
  font: string;
  fg: string;
  muted: string;
  card: string;
  border: string;
  tint: string;
}

const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

function readTheme(probe: HTMLElement): FrameTheme {
  const root = getComputedStyle(probe);
  const quiet = getComputedStyle(probe.firstElementChild as HTMLElement);
  return {
    dark: document.documentElement.classList.contains("dark"),
    font: root.fontFamily,
    fg: root.color,
    muted: quiet.color,
    card: root.backgroundColor,
    border: root.borderTopColor,
    tint: getComputedStyle(probe.lastElementChild as HTMLElement).backgroundColor,
  };
}

/** Follows the app's light/dark switch and returns the probe to render once, hidden, beside the frames. */
function useFrameTheme() {
  const probe = useRef<HTMLSpanElement>(null);
  const [theme, setTheme] = useState<FrameTheme | null>(null);
  useEffect(() => {
    const read = () => probe.current && setTheme(readTheme(probe.current));
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    return () => watch.disconnect();
  }, []);
  return { probe, theme };
}

/** Hidden elements the theme is read from. Render once per view. */
export function ThemeProbe({ probe }: { probe: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <span
      ref={probe}
      aria-hidden
      className="pointer-events-none absolute size-0 overflow-hidden border-border border-t bg-card text-foreground"
    >
      <span className="text-muted-foreground" />
      <span className="bg-muted" />
    </span>
  );
}

const SHEET = (t: FrameTheme) => `
*{box-sizing:border-box}
html,body{margin:0;background:transparent;color:${t.fg};font:14px/1.6 ${t.font}}
body{overflow-wrap:break-word;display:flow-root}
h3{font-size:14px;font-weight:600;margin:18px 0 4px}
h4{font-size:13px;font-weight:600;margin:14px 0 4px}
p,li{margin:6px 0;max-width:76ch}
a{color:inherit;text-decoration:underline}
.scroll{overflow-x:auto;margin:8px 0 14px}
table{border-collapse:collapse;width:max-content;min-width:100%;font-size:12.5px;font-variant-numeric:tabular-nums}
th,td{padding:6px 10px;text-align:left;vertical-align:top;border-bottom:1px solid ${t.border};overflow-wrap:normal;word-break:normal;min-width:5.5rem;max-width:24rem}
th{font-weight:500;font-size:12px;color:${t.muted};background:${t.tint}}
.caption{font-size:12.5px;color:${t.muted};margin:10px 0 2px}
.cover{background:${t.tint};border:1px solid ${t.border};border-radius:12px;padding:6px 14px;margin:4px 0}
.cover p{margin:9px 0}
.label{font-weight:600}
.model{border-left:3px solid ${t.dark ? "#f0c27a" : "#7a4a00"};margin:12px 0;padding:2px 14px}
.model::before{content:"Written by the model, not computed";display:block;font-size:11.5px;font-weight:600;color:${t.dark ? "#f0c27a" : "#7a4a00"}}
ol.refs{padding-left:20px;font-size:13px}
svg{display:block;width:100%;max-width:34rem;height:auto}
html body .lg{--bg:${t.card};--ink:${t.fg};--mute:${t.muted};--rule:${t.border};--band:${t.dark ? "#223a55" : "#d6e6f7"};--mark:${t.dark ? "#7db7f5" : "#0b5cad"};--box:${t.tint}}
`;

/** The document a frame shows: a policy that allows no script and no network, the sheet and the markup. */
export function frameDocument(markup: string, theme: FrameTheme): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><base target="_blank"><style>${SHEET(theme)}</style></head><body>${markup}</body></html>`;
}

/**
 * Shows markup from the Platform in an iframe that runs nothing: its sandbox grants no script, no form, no popup and
 * no top navigation, and the page inside carries a policy that forbids script and network. Only `allow-same-origin`
 * is granted, which with scripts off lets this component read the finished height.
 */
export function ReportFrame({
  markup,
  label,
  ratio,
  className,
  theme,
}: {
  markup: string;
  label: string;
  /** Width over height when the markup is a drawing whose shape is known. */
  ratio?: number | null;
  className?: string;
  theme: FrameTheme;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const measure = useCallback(() => {
    const doc = frame.current?.contentDocument;
    // The body, not the root: the root is never shorter than the frame, so it would only ever grow.
    const next = doc?.body ? Math.ceil(doc.body.getBoundingClientRect().height) : 0;
    if (next) setHeight((was) => (was !== null && Math.abs(was - next) < 2 ? was : next));
  }, []);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const watch = new ResizeObserver(measure);
    watch.observe(element);
    return () => watch.disconnect();
  }, [measure]);
  return (
    <iframe
      ref={frame}
      title={label}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      loading="lazy"
      srcDoc={frameDocument(markup, theme)}
      onLoad={measure}
      style={height === null && ratio ? { aspectRatio: String(ratio) } : height === null ? { height: 120 } : { height }}
      className={cn("block w-full border-0 bg-transparent", className)}
    />
  );
}

export type { FrameTheme };
export { useFrameTheme };
