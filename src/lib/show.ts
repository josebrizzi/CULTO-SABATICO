import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────── Tipos ────────────────────────────── */

export type LayoutMode = "timer" | "script";
export type ShowStatus = "idle" | "running" | "paused" | "finished";
export type Role = "panel" | "stage";

export interface Segment {
  id: string;
  title: string;
  speaker: string;
  minutes: number;
  layout: LayoutMode;
  bullets: string[];
  script: string;
  color: ColorKey;
  /** Mostrar los puntos como tarjetas grandes, una por vez (ideal para anuncios) */
  cards: boolean;
}

export interface StageMessage {
  id: string;
  text: string;
  urgent: boolean;
}

export interface Settings {
  /** Minutos restantes en los que el contador se pone amarillo (0 = sin aviso) */
  warningMin: number;
  /** Parpadear cuando el tiempo está cumplido */
  blink: boolean;
  /** Al pasar al siguiente momento, arrancar el cronómetro automáticamente */
  autoAdvance: boolean;
  /** Mostrar los puntos clave en la pantalla cuando el momento está en modo contador */
  showBulletsOnTimer: boolean;
}

export interface ShowState {
  rev: number;
  serviceTitle: string;
  segments: Segment[];
  /** -1 = el culto no comenzó */
  currentIndex: number;
  status: ShowStatus;
  /** epoch ms del último arranque del cronómetro */
  startedAt: number | null;
  /** ms acumulados antes de la última pausa */
  elapsedBefore: number;
  message: StageMessage | null;
  settings: Settings;
  updatedAt: number;
}

export type StageAction = { type: "CLEAR_MESSAGE" };

type Wire =
  | { t: "state"; from: string; state: ShowState }
  | { t: "action"; from: string; action: StageAction }
  | { t: "ping"; from: string; role: Role }
  | { t: "hello"; from: string; role: Role };

/* ──────────────────────────── Colores ───────────────────────────── */

export const COLOR_KEYS = [
  "emerald",
  "violet",
  "amber",
  "orange",
  "rose",
  "teal",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export interface ColorDef {
  label: string;
  dot: string;
  chipLight: string;
  chipDark: string;
}

export const COLORS: Record<ColorKey, ColorDef> = {
  emerald: {
    label: "Verde",
    dot: "bg-emerald-500",
    chipLight: "border-emerald-300 bg-emerald-100 text-emerald-800",
    chipDark: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  },
  violet: {
    label: "Violeta",
    dot: "bg-violet-500",
    chipLight: "border-violet-300 bg-violet-100 text-violet-800",
    chipDark: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  },
  amber: {
    label: "Ámbar",
    dot: "bg-amber-500",
    chipLight: "border-amber-300 bg-amber-100 text-amber-800",
    chipDark: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  },
  orange: {
    label: "Naranja",
    dot: "bg-orange-500",
    chipLight: "border-orange-300 bg-orange-100 text-orange-800",
    chipDark: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  },
  rose: {
    label: "Rosa",
    dot: "bg-rose-500",
    chipLight: "border-rose-300 bg-rose-100 text-rose-800",
    chipDark: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  },
  teal: {
    label: "Celeste",
    dot: "bg-teal-500",
    chipLight: "border-teal-300 bg-teal-100 text-teal-800",
    chipDark: "border-teal-400/40 bg-teal-500/15 text-teal-200",
  },
};

/* ─────────────────────── Plantilla de culto ──────────────────────── */

function seg(
  title: string,
  minutes: number,
  layout: LayoutMode,
  color: ColorKey,
  speaker: string,
  bullets: string[],
  script: string,
  cards = false,
): Segment {
  return { id: uid(), title, minutes, layout, color, speaker, bullets, script, cards };
}

export function defaultSegments(): Segment[] {
  return [
    seg("Escuela Sabática", 45, "script", "emerald", "Superintendente", [
      "Inicio",
      "Oración",
      "Misionero",
      "Oración del maestro",
      "Desarrollo de la clase",
      "Minutos misioneros",
      "Oración",
      "Cierre",
    ], "", true),
    seg("Avisos", 10, "script", "amber", "Anunciador", [
      "Culto de oración: martes 20:00",
      "Sociedad de jóvenes: martes 18:00 (puede cambiar en invierno/verano)",
      "Bienvenida a las visitas: quedate después del culto para conocernos",
      "Recordar la ofrenda del día",
    ], "No olvidar: mencionar el salón de niños y quién se encarga este sábado.\nCerrar pasando a la liturgia.", true),
    seg("Liturgia: Alabanza", 15, "timer", "violet", "Ministerio de alabanza", [], ""),
    seg("Liturgia: Ofrenda", 10, "script", "orange", "", [
      "Pasaje bíblico breve",
      "Oración por la ofrenda",
      "Recibir las ofrendas mientras se alaba",
    ], ""),
    seg("Liturgia: Mensaje", 35, "timer", "rose", "Predicador", [
      "Título del mensaje",
      "Punto 1",
      "Punto 2",
      "Aplicación y llamado final",
    ], ""),
    seg("Liturgia: Oración final", 5, "timer", "teal", "Pastor", [], ""),
  ];
}

/** Títulos y minutos de la plantilla vieja (para poder actualizarla sola). */
const OLD_TEMPLATE_SHAPE: [string, number][] = [
  ["Bienvenida", 5],
  ["Alabanza", 20],
  ["Anuncios", 10],
  ["Ofrenda", 10],
  ["Predicación", 35],
  ["Oración final", 5],
];

function isOldTemplate(segs: Segment[]): boolean {
  return (
    segs.length === OLD_TEMPLATE_SHAPE.length &&
    segs.every((s, i) => s.title === OLD_TEMPLATE_SHAPE[i][0] && s.minutes === OLD_TEMPLATE_SHAPE[i][1])
  );
}

export function defaultState(): ShowState {
  return {
    rev: 1,
    serviceTitle: "Culto de sábado",
    segments: defaultSegments(),
    currentIndex: -1,
    status: "idle",
    startedAt: null,
    elapsedBefore: 0,
    message: null,
    settings: {
      warningMin: 3,
      blink: true,
      autoAdvance: true,
      showBulletsOnTimer: true,
    },
    updatedAt: Date.now(),
  };
}

/* ─────────────────────────── Utilidades ──────────────────────────── */

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const asStr = (v: unknown, d: string): string => (typeof v === "string" ? v : d);
const asNum = (v: unknown, d: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const asBool = (v: unknown, d: boolean): boolean =>
  typeof v === "boolean" ? v : d;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Punto de la plantilla que mencionaba el domingo (se actualiza solo al cargar). */
const OLD_BULLET_DOMINGO =
  "No olvidar: mencionar el salón de niños y quién se encarga este domingo.";
const NEW_BULLET_SABADO =
  "No olvidar: mencionar el salón de niños y quién se encarga este sábado.";

/** Normaliza un estado leído de storage para evitar datos corruptos. */
function normalize(raw: unknown): ShowState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as {
    rev?: unknown;
    serviceTitle?: unknown;
    segments?: unknown;
    currentIndex?: unknown;
    status?: unknown;
    startedAt?: unknown;
    elapsedBefore?: unknown;
    message?: { id?: unknown; text?: unknown; urgent?: unknown } | null;
    settings?: {
      warningMin?: unknown;
      blink?: unknown;
      autoAdvance?: unknown;
      showBulletsOnTimer?: unknown;
    } | null;
    updatedAt?: unknown;
  };
  if (!Array.isArray(r.segments) || r.segments.length === 0) return null;
  // Migración puntual: la plantilla venía pensada para el domingo, pero el culto es sábado.
  const rawTitle = asStr(r.serviceTitle, "Culto de sábado");
  const serviceTitle = rawTitle === "Culto de domingo" ? "Culto de sábado" : rawTitle;

  const rawSegments = r.segments as Record<string, unknown>[];
  const segments: Segment[] = rawSegments.map((x) => ({
    id: asStr(x.id, uid()),
    title: asStr(x.title, "Momento"),
    speaker: asStr(x.speaker, ""),
    minutes: clamp(asNum(x.minutes, 5), 1, 600),
    layout: x.layout === "script" ? "script" : "timer",
    bullets: Array.isArray(x.bullets)
      ? x.bullets.map((b) =>
          b === OLD_BULLET_DOMINGO ? NEW_BULLET_SABADO : String(b),
        )
      : [],
    script: asStr(x.script, ""),
    color: (COLOR_KEYS as readonly string[]).includes(asStr(x.color, ""))
      ? (x.color as ColorKey)
      : "emerald",
    // Migración: los momentos llamados "Anuncios" pasan a tarjetas automáticamente
    cards: asBool(x.cards, /anunci/i.test(asStr(x.title, ""))),
  }));
  // Migración de plantilla: si el programa guardado sigue siendo el ejemplo viejo
  // (sin personalizar), traer el programa sabático nuevo.
  const finalSegments = isOldTemplate(segments) ? defaultSegments() : segments;
  const status = asStr(r.status, "idle");
  return {
    rev: asNum(r.rev, 1),
    serviceTitle,
    segments: finalSegments,
    currentIndex: Math.trunc(asNum(r.currentIndex, -1)),
    status: (["idle", "running", "paused", "finished"] as const).includes(
      status as ShowStatus,
    )
      ? (status as ShowStatus)
      : "idle",
    startedAt: typeof r.startedAt === "number" ? r.startedAt : null,
    elapsedBefore: asNum(r.elapsedBefore, 0),
    message:
      r.message && typeof r.message.text === "string"
        ? {
            id: asStr(r.message.id, uid()),
            text: String(r.message.text),
            urgent: asBool(r.message.urgent, false),
          }
        : null,
    settings: {
      warningMin: clamp(asNum(r.settings?.warningMin, 5), 0, 30),
      blink: asBool(r.settings?.blink, true),
      autoAdvance: asBool(r.settings?.autoAdvance, true),
      showBulletsOnTimer: asBool(r.settings?.showBulletsOnTimer, true),
    },
    updatedAt: asNum(r.updatedAt, Date.now()),
  };
}

/* ─────────────── Persistencia + sincronización entre ventanas ─────── */

const STORAGE_KEY = "culto-timer-state-v1";
const CHANNEL_NAME = "culto-timer-v1";

export function loadLocal(): ShowState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocal(s: ShowState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage no disponible */
  }
}

function isNewer(a: ShowState, b: ShowState): boolean {
  return a.rev > b.rev || (a.rev === b.rev && a.updatedAt > b.updatedAt);
}

/**
 * Hook de estado compartido entre las ventanas del mismo navegador.
 * - `panel`: escribe el estado (localStorage + broadcast).
 * - `stage`: solo lectura; puede enviar acciones (p. ej. limpiar mensaje)
 *   y aplicar cambios locales optimistas.
 */
export function useShowChannel(role: Role): {
  state: ShowState;
  mutate: (fn: (s: ShowState) => ShowState) => void;
  applyLocal: (fn: (s: ShowState) => ShowState) => void;
  sendAction: (action: StageAction) => void;
  peerOnline: boolean;
} {
  const [state, setState] = useState<ShowState>(() => defaultState());
  const [peerOnline, setPeerOnline] = useState(false);
  const [clientId] = useState<string>(() => uid());

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const chRef = useRef<BroadcastChannel | null>(null);
  const loadedRef = useRef(false);
  const lastPersistedRef = useRef(0);
  const lastPeerRef = useRef(0);
  /** Evita que el efecto de persistencia guarde el estado inicial antes de cargar. */
  const skipPersistRef = useRef(true);

  const mutate = useCallback((fn: (s: ShowState) => ShowState) => {
    setState((prev) => {
      const base = fn(prev);
      return { ...base, rev: prev.rev + 1, updatedAt: Date.now() };
    });
  }, []);

  const applyLocal = useCallback((fn: (s: ShowState) => ShowState) => {
    setState((prev) => fn(prev));
  }, []);

  const sendAction = useCallback((action: StageAction) => {
    try {
      chRef.current?.postMessage({ t: "action", from: clientId, action });
    } catch {
      /* canal no disponible */
    }
  }, [clientId]);

  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      ch = null;
    }
    chRef.current = ch;
    const post = (m: Wire) => {
      try {
        ch?.postMessage(m);
      } catch {
        /* canal no disponible */
      }
    };

    const applyRemote = (s: ShowState) => {
      if (isNewer(s, stateRef.current)) setState(s);
    };

    const bc = ch;
    if (bc) {
      bc.onmessage = (ev: MessageEvent<Wire>) => {
      const m = ev.data;
      if (!m || typeof m !== "object" || m.from === clientId) return;
      if (m.t === "ping") {
        if (m.role !== role) {
          lastPeerRef.current = Date.now();
          setPeerOnline(true);
        }
        return;
      }
      if (m.t === "state") {
        applyRemote(m.state);
        return;
      }
      if (m.t === "hello" && role === "panel") {
        post({ t: "state", from: clientId, state: stateRef.current });
        return;
      }
      if (m.t === "action" && role === "panel") {
        if (m.action.type === "CLEAR_MESSAGE") {
          mutate((s) => ({ ...s, message: null }));
        }
      }
      };
    }

    // Cargar el estado guardado y anunciarse
    const local = loadLocal();
    let chosen = stateRef.current;
    if (local && isNewer(local, chosen)) chosen = local;
    loadedRef.current = true;
    lastPersistedRef.current = chosen.updatedAt;
    skipPersistRef.current = true;
    if (chosen !== stateRef.current) {
      window.setTimeout(() => setState(chosen), 0);
    }
    if (role === "panel") {
      saveLocal(chosen);
      post({ t: "state", from: clientId, state: chosen });
    } else {
      post({ t: "hello", from: clientId, role: "stage" });
    }

    const pingId = window.setInterval(() => {
      post({ t: "ping", from: clientId, role });
      if (lastPeerRef.current && Date.now() - lastPeerRef.current > 6500) {
        lastPeerRef.current = 0;
        setPeerOnline(false);
      }
    }, 2000);

    return () => {
      window.clearInterval(pingId);
      if (ch) ch.onmessage = null;
      try {
        ch?.close();
      } catch {
        /* ya cerrado */
      }
      chRef.current = null;
    };
  }, [role, mutate]);

  // El panel persiste y difunde cada cambio de estado
  useEffect(() => {
    if (role !== "panel") return;
    if (!loadedRef.current) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (state.updatedAt === lastPersistedRef.current) return;
    lastPersistedRef.current = state.updatedAt;
    saveLocal(state);
    try {
      chRef.current?.postMessage({ t: "state", from: clientId, state });
    } catch {
      /* canal no disponible */
    }
  }, [state, role, clientId]);

  return { state, mutate, applyLocal, sendAction, peerOnline };
}

/* ─────────────────────── Lógica del cronómetro ───────────────────── */

export function currentSegment(s: ShowState): Segment | null {
  if (s.currentIndex < 0 || s.currentIndex >= s.segments.length) return null;
  return s.segments[s.currentIndex];
}

/* ─────────────── Tarjeta grande del momento (una sola) ─────────────── */

/** El momento actual muestra su tarjeta grande con todos los puntos? */
export function cardsActive(seg: Segment | null | undefined): boolean {
  return !!seg && seg.cards && seg.bullets.length > 0;
}

export function nextSegment(s: ShowState): Segment | null {
  const idx = s.currentIndex + 1;
  if (idx < 0 || idx >= s.segments.length) return null;
  return s.segments[idx];
}

/** ms transcurridos en el momento actual */
export function elapsedCurrent(s: ShowState, now: number): number {
  if (s.currentIndex < 0) return 0;
  if (s.status === "running" && s.startedAt) {
    return s.elapsedBefore + Math.max(0, now - s.startedAt);
  }
  return s.elapsedBefore;
}

export function remainingCurrent(s: ShowState, now: number): number {
  const seg = currentSegment(s);
  if (!seg) return 0;
  return seg.minutes * 60000 - elapsedCurrent(s, now);
}

export type Phase = "idle" | "normal" | "warning" | "overtime";

export function phaseOf(remaining: number, warningMin: number): Phase {
  if (remaining <= 0) return "overtime";
  if (warningMin > 0 && remaining <= warningMin * 60000) return "warning";
  return "normal";
}

/** mm:ss (o h:mm:ss) a partir de segundos */
export function fmtHMS(totalSec: number): string {
  const abs = Math.max(0, Math.abs(totalSec));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMin(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  if (m >= 60) {
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
  }
  return `${m} min`;
}

export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ───────────────────── Transiciones del programa ─────────────────── */

export function start(s: ShowState, now: number): ShowState {
  if (s.status === "running" || s.segments.length === 0) return s;
  if (s.currentIndex < 0) {
    return {
      ...s,
      currentIndex: 0,
      status: "running",
      startedAt: now,
      elapsedBefore: 0,
    };
  }
  return { ...s, status: "running", startedAt: now };
}

export function pause(s: ShowState, now: number): ShowState {
  if (s.status !== "running" || !s.startedAt) return s;
  return {
    ...s,
    status: "paused",
    startedAt: null,
    elapsedBefore: s.elapsedBefore + Math.max(0, now - s.startedAt),
  };
}

export function resetCurrent(s: ShowState, now: number): ShowState {
  if (s.currentIndex < 0) return s;
  const running = s.status === "running";
  return { ...s, startedAt: running ? now : null, elapsedBefore: 0 };
}

export function advance(s: ShowState, now: number): ShowState {
  if (s.currentIndex < 0) return s;
  const nextIdx = s.currentIndex + 1;
  if (nextIdx >= s.segments.length) return { ...s, status: "finished" };
  const auto = s.settings.autoAdvance;
  return {
    ...s,
    currentIndex: nextIdx,
    status: auto ? "running" : "paused",
    startedAt: auto ? now : null,
    elapsedBefore: 0,
  };
}

export function back(s: ShowState): ShowState {
  const idx = Math.max(-1, Math.min(s.currentIndex - 1, s.segments.length - 1));
  return {
    ...s,
    currentIndex: idx,
    status: idx < 0 ? "idle" : "paused",
    startedAt: null,
    elapsedBefore: 0,
  };
}

export function jumpTo(s: ShowState, idx: number): ShowState {
  if (idx < 0 || idx >= s.segments.length) return s;
  return {
    ...s,
    currentIndex: idx,
    status: "paused",
    startedAt: null,
    elapsedBefore: 0,
  };
}

export function resetService(s: ShowState): ShowState {
  return {
    ...s,
    currentIndex: -1,
    status: "idle",
    startedAt: null,
    elapsedBefore: 0,
    message: null,
  };
}
