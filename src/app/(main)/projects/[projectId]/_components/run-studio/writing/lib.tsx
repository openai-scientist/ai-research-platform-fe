"use client";
"use no memo";

// The writing run keeps its state in module variables (engine.ts) and re-renders on emit(); the React Compiler
// would memoise these components on their props and never show a change.
import {
  type AllHTMLAttributes,
  createElement,
  type ElementType,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { cn } from "cn";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleSlash,
  CornerDownRight,
  FileCheck,
  FileText,
  Flag,
  FlaskConical,
  Folder,
  Gauge,
  Gavel,
  GitCompare,
  Hash,
  Inbox,
  Info,
  Layers,
  Lightbulb,
  Link,
  List,
  Lock,
  type LucideIcon,
  MessageSquare,
  Minus,
  Package,
  PanelRight,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Swords,
  Table,
  Target,
  TextQuote,
  TriangleAlert,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { type OrbState, ThinkingOrb } from "thinking-orbs";

import { launchFlight } from "../run-bits";
import { AGENTS, isCode } from "./data/meta";

/* ===== the writing run's component language: the run studio's own parts, plus what the writing screens add ===== */

export { cn };
export const RM = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* A spring as a CSS linear() curve, so entrances overshoot like motion's springs. */
function spring(stiffness: number, damping: number, mass = 1) {
  const w0 = Math.sqrt(stiffness / mass);
  const z = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(Math.max(1e-6, 1 - z * z));
  const x = (t: number) =>
    z < 1
      ? 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t))
      : 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  let T = 0;
  for (let t = 0; t < 4; t += 1 / 120) if (Math.abs(1 - x(t)) > 0.003) T = t;
  T += 0.04;
  const pts: number[] = [];
  for (let i = 0; i <= 48; i++) pts.push(+x((T * i) / 48).toFixed(4));
  return { easing: `linear(${pts.join(",")})`, duration: Math.round(T * 1000) };
}
const SPRING_POP = spring(500, 22);
const SPRING_CURSOR = spring(140, 20, 0.8);
const SPRING_SHEET = spring(260, 30);

/* ---------- icons, by the short names the writing data uses ---------- */
const ICONS = {
  check: Check,
  flag: Flag,
  play: Play,
  down: ChevronDown,
  up: ChevronUp,
  right: ChevronRight,
  info: Info,
  alert: TriangleAlert,
  circleCheck: CircleCheck,
  x: X,
  lock: Lock,
  file: FileText,
  fileCheck: FileCheck,
  arrow: ArrowRight,
  back: ArrowLeft,
  rotate: RotateCcw,
  book: BookOpen,
  quote: TextQuote,
  link: Link,
  table: Table,
  shield: ShieldCheck,
  gauge: Gauge,
  users: Users,
  compare: GitCompare,
  layers: Layers,
  target: Target,
  flask: FlaskConical,
  bulb: Lightbulb,
  pen: PenLine,
  swords: Swords,
  undo: Undo2,
  corner: CornerDownRight,
  ban: Ban,
  package: Package,
  inbox: Inbox,
  folder: Folder,
  msg: MessageSquare,
  slash: CircleSlash,
  minus: Minus,
  hash: Hash,
  graph: Share2,
  list: List,
  panel: PanelRight,
  pause: Pause,
  gavel: Gavel,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof ICONS;

export function Icon({ n, className = "size-4", sw = 2 }: { n: string; className?: string; sw?: number }) {
  const Glyph = ICONS[n as IconName] ?? Info;
  return <Glyph aria-hidden className={cn("shrink-0", className)} strokeWidth={sw} />;
}

/* The FE's button, as classes, for the places that need a plain element. */

/* ---------- entrances on mount only: what is already there when a view opens shows at once ---------- */
export const ANIM = { ok: true, quietUntil: 0 };
/**
 * A view, tab or run that opens shows what is already there at once. The switch only schedules React's render, so the
 * entrances it would start are skipped for a short window rather than while a flag is briefly off.
 */
export function quiet(ms = 250) {
  ANIM.quietUntil = performance.now() + ms;
}
export const canEnter = () => ANIM.ok && performance.now() >= ANIM.quietUntil && !RM();
/** Runs `fn` once React has rendered and the browser has laid out what an `emit()` changed. */
export const afterPaint = (fn: () => void) => {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => requestAnimationFrame(fn));
};
const ENTER = {
  up: [
    { opacity: 0, transform: "translateY(8px)" },
    { opacity: 1, transform: "none" },
  ],
  up4: [
    { opacity: 0, transform: "translateY(4px)" },
    { opacity: 1, transform: "none" },
  ],
  up6: [
    { opacity: 0, transform: "translateY(6px)" },
    { opacity: 1, transform: "none" },
  ],
  card: [
    { opacity: 0, transform: "translateY(10px) scale(.98)" },
    { opacity: 1, transform: "none" },
  ],
  x: [
    { opacity: 0, transform: "translateX(-4px)" },
    { opacity: 1, transform: "none" },
  ],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  pop: [
    { opacity: 0, transform: "scale(.6)" },
    { opacity: 1, transform: "none" },
  ],
  pop8: [
    { opacity: 0, transform: "scale(.8)" },
    { opacity: 1, transform: "none" },
  ],
  grow: [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
  drop: [
    { opacity: 0, transform: "translateY(-10px) scale(.9)" },
    { opacity: 1, transform: "none" },
  ],
  sheet: [{ transform: "translateY(110%)" }, { transform: "none" }],
  pill: [
    { opacity: 0, transform: "translateY(20px)" },
    { opacity: 1, transform: "none" },
  ],
} satisfies Record<string, Keyframe[]>;
export type EnterKind = keyof typeof ENTER;

export function enter(el: Element | null | undefined, k: EnterKind, delay = 0, dur?: number) {
  if (!el || !canEnter()) return;
  const springy = k === "pop" || k === "pop8";
  const sheet = k === "sheet";
  el.animate(ENTER[k], {
    duration: dur ?? (springy ? SPRING_POP.duration : sheet ? SPRING_SHEET.duration : k === "grow" ? 800 : 450),
    delay: delay * 1000,
    easing: springy ? SPRING_POP.easing : sheet ? SPRING_SHEET.easing : EASE,
    fill: "backwards",
  });
}

type MProps = Omit<AllHTMLAttributes<HTMLElement>, "as"> & {
  as?: ElementType;
  in?: EnterKind;
  delay?: number;
  dur?: number;
  children?: ReactNode;
};
/** An element that enters on mount, as the run studio's motion entrances do. */
export function M({ as = "div", in: k = "up", delay = 0, dur, children, ...rest }: MProps) {
  const r = useRef<HTMLElement>(null);
  // Only the first mount enters; later renders leave it where it is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: entrance on mount only
  useLayoutEffect(() => enter(r.current, k, delay, dur), []);
  return createElement(as, { ref: r, ...rest }, children);
}

/** A value that changed gets a short bump, like motion keyed on the value. */
export function Bump({
  as = "span",
  k,
  children,
  ...rest
}: Omit<AllHTMLAttributes<HTMLElement>, "as"> & { as?: ElementType; k: unknown; children?: ReactNode }) {
  const r = useRef<HTMLElement>(null);
  // Compared with the last value, not counted from mount: a view that opens, or an effect run twice, bumps nothing.
  const last = useRef(k);
  useLayoutEffect(() => {
    if (Object.is(last.current, k)) return;
    last.current = k;
    if (!RM() && r.current)
      r.current.animate([{ transform: "scale(1.3)" }, { transform: "none" }], { duration: 350, easing: EASE });
  }, [k]);
  return createElement(as, { ref: r, ...rest }, children);
}

export function AgentAvatar({
  a,
  size = "md",
  className,
}: {
  a: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const g = AGENTS[a];
  return (
    <span
      title={g.name}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold ring-1 ring-inset",
        g.soft,
        g.text,
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-7 text-[10.5px]",
        size === "lg" && "size-9 text-xs",
        className,
      )}
    >
      {g.initials}
    </span>
  );
}

export function Pane({
  title,
  aside,
  action,
  children,
  className,
  ...rest
}: Omit<AllHTMLAttributes<HTMLElement>, "title" | "as"> & {
  title: ReactNode;
  aside?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <M
      as="section"
      className={cn("min-w-0 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10", className)}
      {...rest}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <b className="font-semibold">{title}</b>
        {aside != null && <span className="ml-auto text-muted-foreground text-xs">{aside}</span>} {action}
      </header>
      {children}
    </M>
  );
}

/** A decision left in the scene, by you or by an agent. */
export function SceneNote({ actor, text, note }: { actor: string; text: string; note?: string }) {
  const who = actor === "you" ? "You" : isCode(actor) ? "Code check" : AGENTS[actor].name;
  const ok =
    /^(Approved|Accepted|Locked|Signed|Started|Chose|Narrowed|Took|Published|Tightened|Kept|Used|Had|Named|Edited|Restarted|Fixed|Declared|Dropped)/.test(
      text,
    );
  const back = /^(Sent|Asked|Held|Kept back|Stopped|Left|Reverted|Moved)/.test(text);
  const verb = /^[A-Z][a-z]+ed\b/.test(text);
  return (
    <M in="fade" className="flex max-w-2xl items-start gap-2 border-t pt-2.5 text-muted-foreground text-sm">
      <Icon
        n={ok ? "circleCheck" : back ? "undo" : "corner"}
        className={cn(
          "mt-0.5 size-4",
          ok ? "text-emerald-600 dark:text-emerald-400" : back ? "text-amber-600 dark:text-amber-400" : "",
        )}
      />
      <div className="min-w-0">
        <p>
          <span className="font-medium text-foreground">{who}</span>
          {verb ? ` ${text.charAt(0).toLowerCase()}${text.slice(1)}` : ` · ${text}`}
        </p>
        {note && <p className="mt-1 border-l-2 pl-2 text-xs italic">“{note}”</p>}
      </div>
    </M>
  );
}

/** Text struck through in red; the strike fades in so the change is noticed. */
export function Strike({ children, className }: { children?: ReactNode; className?: string }) {
  return <span className={cn("strike-in line-through decoration-1 decoration-rose-500", className)}>{children}</span>;
}

/** Counts up from zero after a delay. */
export function CountUp({
  value,
  delay = 0,
  className,
  fmt = (v: number) => v.toLocaleString("en-US"),
}: {
  value: number;
  delay?: number;
  className?: string;
  fmt?: (v: number) => string;
}) {
  const anim = useRef(canEnter());
  const [v, setV] = useState(anim.current ? 0 : value);
  useEffect(() => {
    if (!anim.current) {
      setV(value);
      return;
    }
    let raf = 0;
    const t = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / 700);
        setV(Math.round(value * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay * 1000);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [value, delay]);
  return <span className={cn("tabular-nums", className)}>{fmt(v)}</span>;
}

/** The run studio's dotted orb. Sizes between its presets use the nearer one. */
export function WorkOrb({
  state = "working",
  size = 20,
  className,
}: {
  state?: string;
  size?: number;
  className?: string;
}) {
  return (
    <ThinkingOrb
      state={state as OrbState}
      size={size <= 24 ? 20 : size <= 44 ? 32 : 64}
      aria-label={state === "listening" ? "Waiting for you" : "Working"}
      className={cn("shrink-0", className)}
    />
  );
}

/* ---------- an agent's pointer, gliding to whatever carries its data-cursor ---------- */
export function AgentCursor({
  agent,
  host,
  target,
  version,
}: {
  agent: string | null | undefined;
  host: RefObject<HTMLElement | null>;
  target: string | null | undefined;
  version?: unknown;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number; o?: number } | null>(null);
  useLayoutEffect(() => {
    void version;
    const box = host.current;
    const t = target && box ? box.querySelector(`[data-cursor="${CSS.escape(target)}"]`) : null;
    if (!box || !t) {
      setPos(null);
      return;
    }
    const measure = () => {
      const a = t.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (!a.width && !a.height) return;
      setPos({ x: a.left - b.left + Math.min(a.width * 0.55, 90), y: a.top - b.top + Math.min(a.height * 0.6, 22) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [host, target, version]);
  const px = pos?.x;
  const py = pos?.y;
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || px == null || py == null) {
      last.current = null;
      return;
    }
    const from = last.current ?? { x: px + 40, y: py + 30, o: 0 };
    last.current = { x: px, y: py };
    if (RM()) return;
    node.animate(
      [
        { transform: `translate(${from.x}px,${from.y}px)`, opacity: from.o ?? 1 },
        { transform: `translate(${px}px,${py}px)`, opacity: 1 },
      ],
      { duration: SPRING_CURSOR.duration, easing: SPRING_CURSOR.easing },
    );
  }, [px, py]);
  // Code check is not an agent with a hand on the page, as in the run studio.
  if (!agent || isCode(agent) || !pos) return null;
  const g = AGENTS[agent];
  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-20 flex items-start"
      style={{ transform: `translate(${pos.x}px,${pos.y}px)` }}
    >
      <svg aria-hidden="true" viewBox="0 0 18 18" className={cn("size-[18px] drop-shadow-sm", g.text)}>
        <path
          d="M2.5 1.8 15.5 8.2 9.4 9.6 6.9 16z"
          className="fill-current stroke-background"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "mt-3 -ml-1 whitespace-nowrap rounded-[2px_8px_8px_8px] px-1.5 py-1 font-semibold text-[11px] text-background leading-none shadow-sm",
          g.solid,
        )}
      >
        {g.name}
      </span>
    </div>
  );
}

/* ---------- flights: a chip that travels from where a value lives to where it is used ---------- */
export const q = (sel: string, root: ParentNode = document) =>
  typeof document === "undefined" ? null : root.querySelector<HTMLElement>(sel);
export const fly = (fromSel: string, toSel: string, label: string, tone?: string) =>
  // What it flies between may only be drawn by the render the last change asked for.
  afterPaint(() => {
    const from = q(fromSel);
    const to = q(toSel);
    if (!from || !to) return;
    // Only between things on screen: a chip that flies in from out of view says nothing.
    const vh = window.innerHeight;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    if (a.bottom < 0 || a.top > vh || b.bottom < 0 || b.top > vh) return;
    launchFlight(from, to, label, tone);
  });

/* ---------- odds and ends the scenes share ---------- */
/** Scenario controls and the console hooks exist only while developing. */
export const DEV = process.env.NODE_ENV !== "production";
/** The app's own theme, which the canvas drawings follow. */
export const isDark = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");

/** Digits that spin and then settle on the value, as a recomputed number would. */
export function RollNumber({ value, className }: { value: string; className?: string }) {
  const anim = useRef(canEnter());
  const [shown, setShown] = useState(anim.current ? value.replace(/\d/g, "0") : value);
  const [settled, setSettled] = useState(!anim.current);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the roll plays once, on mount
  useEffect(() => {
    if (!anim.current) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = (now - t0) / 650;
      if (p >= 1) {
        setShown(value);
        setSettled(true);
        return;
      }
      let i = 0;
      setShown(
        value.replace(/\d/g, (d) => {
          i += 1;
          return p > i / 12 + 0.35 ? d : String(Math.floor(Math.random() * 10));
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span
      className={cn(
        "font-mono tabular-nums transition-colors duration-300",
        settled ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {shown}
    </span>
  );
}

/** Whether a media query matches, kept up to date. */
export function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [query]);
  return on;
}
