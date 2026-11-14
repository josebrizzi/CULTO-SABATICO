"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  MessageSquare,
  Minus,
  MonitorSpeaker,
  Pencil,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  advance,
  back,
  BibliaDisplay,
  cardsActive,
  COLORS,
  COLOR_KEYS,
  ColorKey,
  currentSegment,
  defaultSegments,
  elapsedCurrent,
  fmtHMS,
  fmtMin,
  jumpTo,
  nextSegment,
  pause,
  phaseOf,
  remainingCurrent,
  resetCurrent,
  resetService,
  Segment,
  Settings,
  ShowState,
  start,
  uid,
  useNow,
  useShowChannel,
} from "@/lib/show";
import { VERSION_APP } from "@/lib/version";

/* ═══════════════════════════════════════════════════════════════════════
   Tema "Azul Noche Profesional" — consola de estudio de grabación.
   Paleta de la iglesia: azul noche #101F38 / #1D3557 / #091426, dorado
   #C6A45B / #E6D5A8, textos sobre fondo claro #F3F2EE, semáforo verde
   #347653 · ámbar #D5A13A · rojo #B84236. Tipografías: Playfair Display
   (títulos), Lato (cuerpo), Roboto Mono (números y relojes). Todo scoping
   bajo .cns para NO tocar las pantallas de proyección ni el mini monitor.
   ═══════════════════════════════════════════════════════════════════════ */
const ESTILO_CONSOLA = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,500;1,600&family=Lato:ital,wght@0,400;0,700;0,900;1,400&family=Roboto+Mono:wght@400;500;700&display=swap');

/* Las variables se definen también en .cns-modal y .cns-pop porque los
   modales y desplegables se renderizan en un portal FUERA del div .cns,
   y sin las variables los colores caerían a negro. */
.cns, .cns-modal, .cns-pop{
  --nv-950:#060D1A; --nv-900:#091426; --nv-800:#0D1B31; --nv-700:#101F38;
  --nv-600:#1D3557; --nv-500:#27436E;
  --gold:#C6A45B; --gold-lt:#E6D5A8; --gold-soft:rgba(198,164,91,.35);
  --gold-dim:rgba(198,164,91,.12);
  --ink:#F3F2EE; --ink-2:#C9D2E0; --ink-mut:#8FA0B8;
  --ok:#57C08A; --warn:#D5A13A; --warn-lt:#EAC97A; --danger-lt:#E2604F;
  --line:rgba(198,164,91,.22); --line-soft:rgba(140,165,200,.18);
}
.cns{
  font-family:'Lato','Segoe UI',system-ui,-apple-system,sans-serif;
  color:var(--ink);
  background:
    radial-gradient(1100px 480px at 80% -8%, rgba(39,67,110,.50), transparent 62%),
    radial-gradient(900px 420px at 8% 108%, rgba(198,164,91,.06), transparent 55%),
    linear-gradient(180deg,#0A1628 0%,#101F38 52%,#0B1830 100%);
  background-attachment:fixed;
  min-height:100vh;
}
.cns ::selection{ background:rgba(198,164,91,.35); }

/* ── Paneles de la consola ── */
.cns-panel{
  background:linear-gradient(180deg,rgba(29,53,87,.34),rgba(13,27,49,.55));
  border:1px solid var(--line-soft);
  border-radius:14px;
  box-shadow:0 12px 32px rgba(3,8,18,.42), inset 0 1px 0 rgba(255,255,255,.045);
}
.cns-eyebrow{
  display:flex;align-items:center;gap:8px;
  font-family:'Roboto Mono',ui-monospace,monospace;
  font-size:10px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;
  color:var(--gold);
}
.cns-eyebrow::before{
  content:"";width:7px;height:7px;flex:none;background:var(--gold);
  border-radius:2px;box-shadow:0 0 8px rgba(198,164,91,.55);
}
.cns-h2{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;font-weight:700;letter-spacing:.01em;color:var(--ink);
  line-height:1.2;
}
.cns-sub{ font-size:12.5px;color:var(--ink-mut);line-height:1.5; }
.cns .text-muted-foreground{ color:var(--ink-mut) !important; }

/* ── Barra superior ── */
.cns-top{
  position:sticky;top:0;z-index:40;
  background:linear-gradient(180deg,rgba(6,13,26,.97),rgba(9,20,38,.94));
  backdrop-filter:blur(8px);
  border-bottom:1px solid rgba(198,164,91,.16);
  box-shadow:0 10px 30px rgba(2,6,14,.5);
}
.cns-top::after{
  content:"";display:block;height:2px;
  background:linear-gradient(90deg,transparent,var(--gold) 18%,var(--gold-lt) 50%,var(--gold) 82%,transparent);
  opacity:.75;
}
.cns-top-in{
  max-width:1440px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;
  gap:10px;padding:12px 18px;
}
.cns-logo{
  width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;
  color:var(--gold-lt);background:linear-gradient(180deg,var(--nv-600),var(--nv-800));
  border:1px solid var(--gold-soft);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 14px rgba(198,164,91,.18);
}
.cns-iglesia{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.24em;text-transform:uppercase;color:var(--gold);
}
.cns-titulo{
  font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:800;
  letter-spacing:.07em;text-transform:uppercase;color:var(--ink);line-height:1.15;
}
.cns-lema{
  font-family:'Playfair Display',Georgia,serif;font-style:italic;
  font-size:12px;color:var(--ink-mut);
}
.cns-ver{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;color:var(--ink-mut);
  border:1px solid var(--line-soft);border-radius:6px;padding:3px 7px;
}

/* ── Píldoras de estado y leds ── */
.cns-pill{
  display:inline-flex;align-items:center;gap:7px;border-radius:999px;
  padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid var(--line-soft);
  color:var(--ink-2);background:rgba(9,20,38,.5);white-space:nowrap;
}
.cns-pill-live{ background:rgba(199,81,69,.16);border-color:rgba(226,96,79,.55);color:#F3C1BB; }
.cns-pill-danger{ background:rgba(199,81,69,.2);border-color:rgba(226,96,79,.6);color:#F6C8C2; }
.cns-pill-warn{ background:rgba(213,161,58,.14);border-color:rgba(213,161,58,.5);color:var(--warn-lt); }
.cns-pill-ok{ background:rgba(78,155,114,.14);border-color:rgba(78,155,114,.45);color:#9ED4B6; }
.cns-pill-dim{ color:var(--ink-mut); }
.cns-led{ width:8px;height:8px;flex:none;border-radius:999px;background:#5B6B84;box-shadow:0 0 6px rgba(0,0,0,.4); }
.cns-led-blink{ background:var(--danger-lt);box-shadow:0 0 10px rgba(242,96,79,.8);animation:cns-pulse 1.1s ease-in-out infinite; }
.cns-led-ok{ background:var(--ok);box-shadow:0 0 10px rgba(87,192,138,.7);animation:cns-pulse 2s ease-in-out infinite; }
@keyframes cns-pulse{ 0%,100%{opacity:1} 50%{opacity:.35} }

/* ── Botones ── */
.cns .cns-btn-gold{
  background:linear-gradient(180deg,#DCBC74,#C6A45B);color:#091426;
  border:1px solid rgba(230,213,168,.7);font-weight:800;letter-spacing:.03em;
  box-shadow:0 6px 18px rgba(198,164,91,.28), inset 0 1px 0 rgba(255,255,255,.45);
}
.cns .cns-btn-gold:hover{ background:linear-gradient(180deg,#E8CF8E,#D0AC64);color:#091426; }
.cns .cns-btn-line{
  background:rgba(9,20,38,.45);border:1px solid var(--gold-soft);
  color:var(--gold-lt);font-weight:700;
}
.cns .cns-btn-line:hover{ background:var(--gold-dim);border-color:var(--gold);color:var(--gold-lt); }
.cns .cns-btn-ghost{ color:var(--ink-mut); }
.cns .cns-btn-ghost:hover{ background:var(--gold-dim);color:var(--gold-lt); }
.cns .cns-icobtn{ color:var(--ink-mut); }
.cns .cns-icobtn:hover{ background:var(--gold-dim);color:var(--gold-lt); }

/* ── Canales de la secuencia ── */
.cns-chip{
  position:relative;width:172px;flex:none;display:flex;flex-direction:column;gap:6px;
  border-radius:12px;border:1px solid var(--line-soft);
  background:linear-gradient(180deg,rgba(29,53,87,.30),rgba(9,20,38,.45));
  padding:10px 12px;cursor:pointer;
  transition:border-color .25s ease-in-out,box-shadow .25s ease-in-out,transform .25s ease-in-out;
}
.cns-chip:hover{ border-color:var(--gold-soft);transform:translateY(-1px); }
.cns-chip-done{ opacity:.5; }
.cns-chip-now{
  border-color:rgba(198,164,91,.75);
  background:linear-gradient(180deg,rgba(198,164,91,.14),rgba(9,20,38,.5));
  animation:cns-glow 2.6s ease-in-out infinite;
}
@keyframes cns-glow{
  0%,100%{ box-shadow:0 0 0 1px rgba(198,164,91,.35),0 0 22px rgba(198,164,91,.13); }
  50%{ box-shadow:0 0 0 1px rgba(198,164,91,.5),0 0 30px rgba(198,164,91,.24); }
}
.cns-chip-num{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:12px;font-weight:700;
  color:var(--gold);
}
.cns-chip-min{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:11px;color:var(--ink-mut);
}
.cns-chip-title{ font-size:13px;font-weight:800;color:var(--ink); }

/* ── Reloj y medidor ── */
.cns-timer{
  font-family:'Roboto Mono',ui-monospace,monospace;font-weight:700;
  letter-spacing:-0.01em;line-height:.95;
}
.cns-timer-label{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.3em;text-transform:uppercase;color:var(--gold);text-align:center;
}
.cns-kbd{
  display:inline-block;font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  border:1px solid var(--line-soft);border-bottom-width:2px;border-radius:5px;
  padding:1px 6px;background:rgba(9,20,38,.6);color:var(--ink-2);
}
.cns-alert-danger{
  display:flex;gap:10px;align-items:flex-start;border-radius:12px;
  border:1px solid rgba(226,96,79,.45);background:rgba(199,81,69,.12);
  padding:12px 14px;font-size:13px;color:#F6C8C2;
}

/* ── Campos ── */
.cns .cns-in, .cns-modal .cns-in{
  background:rgba(6,13,26,.65);border:1px solid var(--line-soft);
  color:var(--ink) !important;border-radius:10px;
}
.cns .cns-in::placeholder, .cns-modal .cns-in::placeholder{ color:#6E7F99; }
.cns .cns-in:focus-visible, .cns-modal .cns-in:focus-visible,
.cns .cns-in:focus, .cns-modal .cns-in:focus{
  border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(198,164,91,.12);
}
.cns button[role="switch"], .cns-modal button[role="switch"]{
  border-color:var(--line-soft);
}
.cns button[role="switch"][data-state="unchecked"],
.cns-modal button[role="switch"][data-state="unchecked"]{
  background:rgba(6,13,26,.7) !important;border-color:var(--line-soft) !important;
}
.cns button[role="switch"][data-state="checked"],
.cns-modal button[role="switch"][data-state="checked"]{
  background:var(--gold) !important;border-color:var(--gold) !important;
}
.cns button[role="switch"] > span, .cns-modal button[role="switch"] > span{
  background:#E8ECF3 !important;
}
.cns button[role="switch"][data-state="checked"] > span,
.cns-modal button[role="switch"][data-state="checked"] > span{
  background:#0D1B31 !important;
}

/* ── Modales y desplegables (se renderizan fuera de .cns, en un portal) ── */
.cns-modal{
  background:linear-gradient(180deg,#12233D,#0C1930);
  border:1px solid var(--line-soft);color:var(--ink);border-radius:16px;
  box-shadow:0 30px 70px rgba(2,6,14,.7);
}
.cns-modal label{ color:var(--ink-2) !important;font-weight:700; }
.cns-modal .text-muted-foreground{ color:var(--ink-mut) !important; }
.cns-modal [data-slot="dialog-close"], .cns-modal button.dialog-close{ color:var(--ink-mut); }
.cns-pop{
  background:#12233D;border:1px solid var(--line-soft);border-radius:12px;
  color:var(--ink);box-shadow:0 18px 40px rgba(2,6,14,.6);
  font-family:'Lato','Segoe UI',system-ui,sans-serif;
}
.cns-pop [role="option"]{ color:var(--ink-2) !important; }
.cns-pop [role="option"][data-highlighted]{ background:var(--gold-dim);color:var(--gold-lt); }

/* ── Detalles ── */
.cns-bezel{
  border-radius:14px;padding:8px;background:#040A14;
  border:1px solid var(--line-soft);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 10px 26px rgba(0,0,0,.55);
}
.cns-tag{
  display:inline-flex;align-items:center;gap:6px;border-radius:999px;
  border:1px solid var(--gold-soft);background:var(--gold-dim);
  color:var(--gold-lt);padding:4px 10px;font-size:11px;white-space:nowrap;
}
.cns-sep{ height:1px;background:var(--line-soft); }
.cns-note{
  border:1px solid var(--line-soft);background:rgba(198,164,91,.07);
  border-radius:12px;padding:12px 14px;font-size:13px;color:var(--ink-2);
}
.cns-rise{ animation:cns-rise .28s ease-in-out both; }
@keyframes cns-rise{ from{ opacity:0;transform:translateY(6px); } to{ opacity:1;transform:none; } }
@media (prefers-reduced-motion: reduce){
  .cns *, .cns-modal *{
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
}
`;

export default function PanelView() {
  const { state, mutate, peerOnline, bibliaProyectada } = useShowChannel("panel");
  const now = useNow(500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Auto-scroll de la secuencia horizontal: centra el momento en curso */
  const currentChipRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    currentChipRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [state.currentIndex]);

  const seg = currentSegment(state);
  const next = nextSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const live = now > 0 && active;

  /* ───────────────────────── Acciones ───────────────────────── */

  const toggleStartPause = () => {
    const s = stateRef.current;
    if (s.status === "running") mutate((p) => pause(p, Date.now()));
    else if (s.status !== "finished") mutate((p) => start(p, Date.now()));
  };
  const doAdvance = () => {
    if (stateRef.current.currentIndex >= 0 && stateRef.current.status !== "finished") {
      mutate((p) => advance(p, Date.now()));
    }
  };
  const doBack = () => mutate((p) => back(p));
  const doReset = () => {
    if (stateRef.current.currentIndex >= 0) mutate((p) => resetCurrent(p, Date.now()));
  };
  const doRestartService = () => {
    if (window.confirm("¿Reiniciar todo el culto? Se pierden los tiempos del momento actual.")) {
      mutate((p) => resetService(p));
    }
  };

  const adjustMinutes = (delta: number) => {
    const s = stateRef.current;
    const cur = currentSegment(s);
    if (!cur) return;
    mutate((p) => ({
      ...p,
      segments: p.segments.map((x) =>
        x.id === cur.id
          ? { ...x, minutes: Math.min(600, Math.max(1, x.minutes + delta)) }
          : x,
      ),
    }));
  };

  const updateSegment = (id: string, patch: Partial<Segment>) => {
    mutate((p) => ({
      ...p,
      segments: p.segments.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  };

  const addSegment = () => {
    mutate((p) => ({
      ...p,
      segments: [
        ...p.segments,
        {
          id: uid(),
          title: "Nuevo momento",
          speaker: "",
          minutes: 5,
          layout: "timer",
          bullets: [],
          script: "",
          color: COLOR_KEYS[p.segments.length % COLOR_KEYS.length] as ColorKey,
          cards: false,
        },
      ],
    }));
  };

  const removeSegment = (id: string) => {
    mutate((p) => {
      const idx = p.segments.findIndex((x) => x.id === id);
      if (idx < 0 || p.segments.length <= 1) return p;
      const arr = p.segments.filter((x) => x.id !== id);
      if (idx < p.currentIndex) {
        return { ...p, segments: arr, currentIndex: p.currentIndex - 1 };
      }
      if (idx === p.currentIndex) {
        const ci = Math.min(idx, arr.length - 1);
        return {
          ...p,
          segments: arr,
          currentIndex: ci,
          status: "paused",
          startedAt: null,
          elapsedBefore: 0,
        };
      }
      return { ...p, segments: arr };
    });
  };

  const moveSegment = (idx: number, dir: -1 | 1) => {
    mutate((p) => {
      const j = idx + dir;
      if (j < 0 || j >= p.segments.length) return p;
      const arr = [...p.segments];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      let ci = p.currentIndex;
      if (ci === idx) ci = j;
      else if (ci === j) ci = idx;
      return { ...p, segments: arr, currentIndex: ci };
    });
  };

  const setSettings = (patch: Partial<Settings>) => {
    mutate((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  };

  const sendMessage = (text: string, urgent: boolean) => {
    const t = text.trim();
    if (!t) return;
    mutate((p) => ({ ...p, message: { id: uid(), text: t, urgent } }));
  };

  /* ────────────── Pantalla del predicador ────────────── */

  const openPreacherWindow = () => {
    const base = window.location.href.split("#")[0];
    window.open(`${base}#predicador`, "culto-predicador", "width=1040,height=680");
  };

  /* ───────────────────── Atajos de teclado ──────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const s = stateRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (s.status === "running") mutate((p) => pause(p, Date.now()));
        else if (s.status !== "finished") mutate((p) => start(p, Date.now()));
      } else if (e.code === "KeyN") {
        if (s.currentIndex >= 0 && s.status !== "finished") {
          mutate((p) => advance(p, Date.now()));
        }
      } else if (e.code === "KeyR") {
        if (s.currentIndex >= 0) mutate((p) => resetCurrent(p, Date.now()));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mutate]);

  /* ─────────────────────── Cálculos varios ──────────────────── */

  const totalMin = useMemo(
    () => state.segments.reduce((a, x) => a + x.minutes, 0),
    [state.segments],
  );

  const plannedRemain = useMemo(() => {
    if (state.status === "finished") return 0;
    if (state.currentIndex < 0) return totalMin;
    let m = 0;
    state.segments.forEach((x, i) => {
      if (i < state.currentIndex) return;
      if (i === state.currentIndex) {
        m += active ? Math.max(0, Math.ceil(remaining / 60000)) : x.minutes;
      } else {
        m += x.minutes;
      }
    });
    return m;
  }, [state, totalMin, active, remaining]);

  const upcoming = useMemo(
    () =>
      state.segments
        .map((x, i) => ({ x, i }))
        .filter(({ i }) => i > state.currentIndex)
        .slice(0, 4),
    [state.segments, state.currentIndex],
  );

  const editingSeg = state.segments.find((x) => x.id === editingId) ?? null;

  /* Espejo de la letra bíblica que proyecta la pantalla del predicador.
     La pantalla del predicador lo publica por el canal; se considera
     válido si llegó hace menos de 10 segundos (si esa ventana se cerró,
     la mini pantalla vuelve al culto solo). */
  const bibliaViva = useMemo(() => {
    if (!bibliaProyectada) return null;
    if (now > 0 && Date.now() - bibliaProyectada.ts > 10000) return null;
    return bibliaProyectada;
  }, [bibliaProyectada, now]);

  const counterColor =
    phase === "overtime"
      ? "text-[#E2604F]"
      : phase === "warning"
        ? "text-[#EAC97A]"
        : "text-[#F3F2EE]";

  const statusPill = (() => {
    if (state.status === "finished") {
      return (
        <span className="cns-pill cns-pill-dim">
          <span className="cns-led" /> Finalizado
        </span>
      );
    }
    if (!active) {
      return (
        <span className="cns-pill cns-pill-dim">
          <span className="cns-led" /> En espera
        </span>
      );
    }
    if (phase === "overtime") {
      return (
        <span className="cns-pill cns-pill-danger">
          <span className="cns-led cns-led-blink" /> Tiempo cumplido
        </span>
      );
    }
    if (state.status === "running") {
      return (
        <span className="cns-pill cns-pill-live">
          <span className="cns-led cns-led-blink" /> En vivo
        </span>
      );
    }
    return (
      <span className="cns-pill cns-pill-warn">
        <span className="cns-led" /> En pausa
      </span>
    );
  })();

  /* ─────────────────────────── Render ───────────────────────── */

  return (
    <div className="cns min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_CONSOLA }} />

      {/* ═══ Barra superior de la consola ═══ */}
      <header className="cns-top">
        <div className="cns-top-in">
          <div className="flex min-w-0 items-center gap-3">
            <div className="cns-logo">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="cns-iglesia truncate">
                Iglesia Adventista del Séptimo Día · José C. Paz Centro
              </div>
              <div className="cns-titulo">Tiempos del Culto</div>
              <div className="cns-lema hidden sm:block">
                “Adoremos en espíritu y en verdad”
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="cns-ver">{VERSION_APP}</span>
            <span
              className={cn(
                "cns-pill hidden md:inline-flex",
                peerOnline ? "cns-pill-ok" : "cns-pill-dim",
              )}
            >
              <span className={cn("cns-led", peerOnline && "cns-led-ok")} />
              {peerOnline ? "Pantalla conectada" : "Sin pantallas abiertas"}
            </span>
            <Button size="sm" className="cns-btn-gold" onClick={openPreacherWindow}>
              <MonitorSpeaker className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Abrir pantalla del predicador</span>
            </Button>
            <HelpDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5">
        {/* ═══ Secuencia del culto: tira de canales ═══ */}
        <section className="cns-panel cns-rise">
          <div className="flex flex-wrap items-start justify-between gap-2 px-5 pb-1 pt-4">
            <div className="min-w-0">
              <div className="cns-eyebrow">Programa</div>
              <h2 className="cns-h2 mt-1">Secuencia del culto</h2>
              <p className="cns-sub mt-0.5">
                {state.segments.length} momentos · {fmtMin(totalMin)} en total · tocá
                un momento para saltar a él
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="cns-btn-ghost h-8 shrink-0"
              title="Cargar de nuevo el programa sabático de ejemplo (reemplaza los momentos actuales)"
              aria-label="Cargar plantilla sabática"
              onClick={() => {
                if (
                  window.confirm(
                    "¿Cargar de nuevo el programa sabático de ejemplo? Se reemplazan los momentos actuales.",
                  )
                ) {
                  mutate((p) => ({ ...p, segments: defaultSegments() }));
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Plantilla
            </Button>
          </div>
          <div className="px-5 pb-4 pt-2">
            <div className="scrollbar-thin flex gap-2.5 overflow-x-auto pb-1.5">
              {state.segments.map((x, i) => {
                const isCurrent =
                  i === state.currentIndex && state.status !== "finished";
                const isDone = state.currentIndex >= 0 && i < state.currentIndex;
                const sub = [
                  x.speaker,
                  x.cards && x.bullets.length > 0
                    ? "tarjeta"
                    : x.layout === "script"
                      ? "guion"
                      : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={x.id}
                    ref={isCurrent ? currentChipRef : undefined}
                    onClick={() => {
                      if (i !== state.currentIndex) mutate((p) => jumpTo(p, i));
                    }}
                    className={cn(
                      "cns-chip",
                      isCurrent && "cns-chip-now",
                      isDone && "cns-chip-done",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isDone ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-[#57C08A]"
                          aria-hidden="true"
                        />
                      ) : isCurrent ? (
                        <Play
                          className="h-4 w-4 shrink-0 text-[#E6D5A8]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="cns-chip-num w-4 shrink-0 text-center">
                          {i + 1}
                        </span>
                      )}
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          COLORS[x.color].dot,
                        )}
                        aria-hidden="true"
                      />
                      <span className="cns-chip-min ml-auto shrink-0">
                        {x.minutes} min
                      </span>
                    </div>
                    <div
                      className={cn(
                        "cns-chip-title truncate",
                        isDone && "line-through opacity-60",
                      )}
                    >
                      {x.title}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {sub || "\u00A0"}
                    </div>
                    {isCurrent ? (
                      <Progress
                        value={
                          totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0
                        }
                        className={cn(
                          "h-1.5 bg-black/50",
                          phase === "overtime"
                            ? "[&>div]:bg-[#E2604F]"
                            : phase === "warning"
                              ? "[&>div]:bg-[#EAC97A]"
                              : "[&>div]:bg-[#C6A45B]",
                        )}
                      />
                    ) : (
                      <div className="h-1.5" />
                    )}
                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="cns-icobtn h-7 w-7"
                        aria-label={`Editar ${x.title}`}
                        title="Editar"
                        onClick={() => setEditingId(x.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <button
                        type="button"
                        aria-label={`Subir ${x.title}`}
                        title="Subir"
                        disabled={i === 0}
                        onClick={() => moveSegment(i, -1)}
                        className="cns-icobtn grid h-7 w-7 place-items-center rounded-md disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar ${x.title}`}
                        title="Bajar"
                        disabled={i === state.segments.length - 1}
                        onClick={() => moveSegment(i, 1)}
                        className="cns-icobtn grid h-7 w-7 place-items-center rounded-md disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addSegment}
                aria-label="Agregar momento"
                className="cns-chip flex w-[172px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 border-dashed p-2.5 text-[#8FA0B8]"
              >
                <Plus className="h-5 w-5 text-[#C6A45B]" aria-hidden="true" />
                <span className="text-sm font-bold">Agregar momento</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,370px)]">
          {/* ═══ Columna central (arriba en móvil) ═══ */}
          <div className="space-y-5">
            {/* ── Mesa de control: el momento en curso ── */}
            <section
              className={cn(
                "cns-panel cns-rise",
                active && "border-[rgba(198,164,91,0.30)]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
                <div className="min-w-0">
                  <div className="cns-eyebrow">Mesa de control</div>
                  <h2 className="cns-h2 mt-1 truncate">
                    {active ? `Ahora · ${seg?.title}` : "Ahora"}
                  </h2>
                </div>
                {statusPill}
              </div>
              {active && (seg?.speaker || next) ? (
                <p className="cns-sub px-5 pt-1">
                  {seg?.speaker ? `Orador: ${seg.speaker}` : null}
                  {seg?.speaker && next ? " · " : null}
                  {next ? `Siguiente: ${next.title} (${next.minutes} min)` : null}
                </p>
              ) : null}

              <div className="px-5 pb-5 pt-4">
                {state.status === "finished" ? (
                  <div className="py-8 text-center">
                    <div className="cns-h2 text-3xl">Culto finalizado</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Reiniciá para comenzar un nuevo culto.
                    </p>
                    <Button
                      className="cns-btn-line mt-4"
                      variant="outline"
                      onClick={doRestartService}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
                      todo
                    </Button>
                  </div>
                ) : !active ? (
                  <div className="py-6 text-center">
                    <div className="cns-h2 text-2xl">El culto no comenzó</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {state.segments.length} momentos · {fmtMin(totalMin)}{" "}
                      planificados
                    </p>
                    <Button
                      size="lg"
                      className="cns-btn-gold mt-4 h-14 px-10 text-lg"
                      onClick={() => mutate((p) => start(p, Date.now()))}
                    >
                      <Play className="h-5 w-5" aria-hidden="true" /> Iniciar culto
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Reloj principal */}
                    <div className="text-center">
                      <div className="cns-timer-label">
                        {phase === "overtime" ? "Excedente" : "Tiempo restante"}
                      </div>
                      <div
                        className={cn(
                          "cns-timer mt-1.5 text-7xl tabular-nums md:text-8xl",
                          counterColor,
                        )}
                      >
                        {live
                          ? phase === "overtime"
                            ? `+${fmtHMS(Math.floor(overtimeMs / 1000))}`
                            : fmtHMS(Math.ceil(remaining / 1000))
                          : "--:--"}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {phase === "overtime"
                          ? "Tiempo cumplido — excedente"
                          : `de ${seg?.minutes} min planificados`}
                      </div>
                    </div>

                    {/* Medidor VU */}
                    <Progress
                      value={totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0}
                      className={cn(
                        "mt-4 h-3 bg-black/50",
                        phase === "overtime"
                          ? "[&>div]:bg-[#E2604F]"
                          : phase === "warning"
                            ? "[&>div]:bg-[#EAC97A]"
                            : "[&>div]:bg-[#C6A45B]",
                      )}
                    />
                    <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                      <span>
                        TRANSCURRIDO {fmtHMS(Math.floor(elapsed / 1000))}
                      </span>
                      <span>PLANIFICADO {seg?.minutes} MIN</span>
                    </div>

                    {phase === "overtime" ? (
                      <div className="cns-alert-danger mt-3">
                        <AlertTriangle
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        Se cumplió el tiempo hace{" "}
                        {fmtHMS(Math.floor(overtimeMs / 1000))}. Considerá pasar al
                        siguiente momento.
                      </div>
                    ) : null}

                    {/* Controles de la consola */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <Button
                        size="lg"
                        className={cn(
                          "col-span-2 h-14 text-lg",
                          state.status === "running"
                            ? "cns-btn-line"
                            : "cns-btn-gold",
                        )}
                        onClick={toggleStartPause}
                      >
                        {state.status === "running" ? (
                          <>
                            <Pause className="h-5 w-5" aria-hidden="true" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5" aria-hidden="true" />{" "}
                            {state.elapsedBefore > 0 ? "Reanudar" : "Iniciar momento"}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="cns-btn-line h-11"
                        onClick={doReset}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
                      </Button>
                      <Button
                        variant="outline"
                        className="cns-btn-line h-11"
                        onClick={doAdvance}
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />{" "}
                        Siguiente
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-10"
                        onClick={() => adjustMinutes(-1)}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" /> 1 min
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-10"
                        onClick={() => adjustMinutes(1)}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" /> 1 min
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost col-span-2 h-9"
                        onClick={doBack}
                      >
                        <SkipBack className="h-4 w-4" aria-hidden="true" /> Momento
                        anterior
                      </Button>
                    </div>

                    {seg && seg.cards ? (
                      <div className="mt-4 space-y-2.5 rounded-xl border-2 border-dashed border-[rgba(198,164,91,0.45)] bg-[rgba(198,164,91,0.06)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#E6D5A8]">
                            Tarjeta en pantalla · editable
                          </div>
                          <Switch
                            checked={!!seg.cards}
                            onCheckedChange={(v) => updateSegment(seg.id, { cards: v })}
                            aria-label="Desactivar la tarjeta grande en este momento"
                          />
                        </div>

                        <div className="space-y-1.5">
                          {seg.bullets.map((b, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <Textarea
                                value={b}
                                rows={2}
                                aria-label={`Editar punto ${i + 1}`}
                                placeholder={`Punto ${i + 1}…`}
                                className="cns-in min-h-0 flex-1 rounded-xl text-base font-bold leading-snug sm:text-lg"
                                onChange={(e) => {
                                  const arr = [...seg.bullets];
                                  arr[i] = e.target.value;
                                  updateSegment(seg.id, { bullets: arr });
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cns-icobtn h-9 w-8 shrink-0"
                                aria-label={`Quitar punto ${i + 1}`}
                                disabled={seg.bullets.length <= 1}
                                onClick={() =>
                                  updateSegment(seg.id, {
                                    bullets: seg.bullets.filter((_, j) => j !== i),
                                  })
                                }
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="cns-btn-line h-8"
                            onClick={() =>
                              updateSegment(seg.id, { bullets: [...seg.bullets, ""] })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                            Agregar punto
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Una sola tarjeta por momento: lo que escribís acá se ve al
                          instante en la pantalla, con letra gigante, todos los puntos
                          juntos.
                        </p>
                      </div>
                    ) : seg ? (
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[rgba(143,160,184,0.35)] bg-black/20 p-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Tarjeta en pantalla
                          </div>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                            ¿Este momento tiene avisos o puntos? Mostralos en una sola
                            tarjeta, con letra grande (ideal para anuncios).
                          </p>
                        </div>
                        <Switch
                          checked={!!seg.cards}
                          onCheckedChange={(v) => updateSegment(seg.id, { cards: v })}
                          aria-label="Activar la tarjeta grande en este momento"
                          className="shrink-0"
                        />
                      </div>
                    ) : null}

                    <p className="pt-3 text-center text-xs text-muted-foreground">
                      Atajos: <span className="cns-kbd">Espacio</span> iniciar/pausar ·{" "}
                      <span className="cns-kbd">N</span> siguiente ·{" "}
                      <span className="cns-kbd">R</span> reiniciar
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* ── Cronómetro general del culto ── */}
            <section className="cns-panel cns-rise">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="cns-eyebrow">Cronómetro general</div>
                  <div className="cns-timer mt-1.5 text-3xl text-[#E6D5A8]">
                    {fmtMin(plannedRemain)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Tiempo restante planificado
                  </div>
                </div>
                <div className="flex max-w-[55%] flex-wrap justify-end gap-1.5">
                  {upcoming.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Último momento
                    </span>
                  ) : (
                    upcoming.map(({ x, i }) => (
                      <span key={x.id} className="cns-tag">
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            COLORS[x.color].dot,
                          )}
                          aria-hidden="true"
                        />
                        {i + 1}. {x.title} · {x.minutes} min
                      </span>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ═══ Columna derecha ═══ */}
          <div className="space-y-5">
            {/* ── Monitor de salida (mini pantalla en vivo) ── */}
            <section className="cns-panel cns-rise">
              <div className="px-5 pt-4">
                <div className="cns-eyebrow">Monitor de salida</div>
                <h2 className="cns-h2 mt-1 flex items-center gap-2">
                  <MonitorSpeaker
                    className="h-4 w-4 shrink-0 text-[#C6A45B]"
                    aria-hidden="true"
                  />{" "}
                  Pantalla del predicador
                </h2>
                <p className="cns-sub mt-0.5">
                  Mini pantalla en vivo: se ve acá lo mismo que se proyecta ahora
                  mismo. Tocala para abrirla en grande.
                </p>
              </div>
              <div className="p-4">
                <div
                  title="Abrir la pantalla del predicador"
                  onClick={openPreacherWindow}
                  className="cns-bezel cursor-pointer"
                >
                  <MiniPantalla state={state} now={now} biblia={bibliaViva} />
                </div>
              </div>
            </section>

            {/* ── Mensajes al orador ── */}
            <section className="cns-panel cns-rise">
              <div className="px-5 pt-4">
                <div className="cns-eyebrow">Intercomunicador</div>
                <h2 className="cns-h2 mt-1 flex items-center gap-2">
                  <MessageSquare
                    className="h-4 w-4 shrink-0 text-[#C6A45B]"
                    aria-hidden="true"
                  />{" "}
                  Mensajes al orador
                </h2>
                <p className="cns-sub mt-0.5">
                  En la pantalla del predicador se ve SOLO el mensaje, gigante y sin
                  leyendas
                </p>
              </div>
              <div className="space-y-3 px-5 pb-5 pt-3">
                <div className="flex gap-2">
                  <Input
                    aria-label="Mensaje personalizado"
                    placeholder="Escribir mensaje…"
                    value={msgDraft}
                    className="cns-in"
                    onChange={(e) => setMsgDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage(msgDraft, msgUrgent);
                        setMsgDraft("");
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    aria-label="Enviar mensaje"
                    className="cns-btn-gold h-10 w-10 shrink-0"
                    onClick={() => {
                      sendMessage(msgDraft, msgUrgent);
                      setMsgDraft("");
                    }}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="msg-urgent"
                    checked={msgUrgent}
                    onCheckedChange={setMsgUrgent}
                  />
                  <Label htmlFor="msg-urgent" className="text-sm font-normal">
                    Urgente (rojo, para llamar la atención)
                  </Label>
                </div>
                <div className="cns-sep" />
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {state.message ? (
                      <span className="line-clamp-2">
                        En pantalla: <b>“{state.message.text}”</b>
                      </span>
                    ) : (
                      "Sin mensaje en pantalla"
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cns-btn-line h-8 shrink-0"
                    disabled={!state.message}
                    onClick={() => mutate((p) => ({ ...p, message: null }))}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Limpiar
                  </Button>
                </div>
              </div>
            </section>

            {/* ── Ajustes de la pantalla ── */}
            <section className="cns-panel cns-rise">
              <div className="px-5 pt-4">
                <div className="cns-eyebrow">Configuración</div>
                <h2 className="cns-h2 mt-1">Ajustes de la pantalla</h2>
              </div>
              <div className="space-y-4 px-5 pb-5 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="warning-min" className="text-sm font-normal">
                    Aviso amarillo
                  </Label>
                  <Select
                    value={String(state.settings.warningMin)}
                    onValueChange={(v) => setSettings({ warningMin: Number(v) })}
                  >
                    <SelectTrigger id="warning-min" className="cns-in w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="cns-pop">
                      <SelectItem value="0">Sin aviso</SelectItem>
                      <SelectItem value="1">1 min antes</SelectItem>
                      <SelectItem value="2">2 min antes</SelectItem>
                      <SelectItem value="3">3 min antes</SelectItem>
                      <SelectItem value="5">5 min antes</SelectItem>
                      <SelectItem value="10">10 min antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="set-blink" className="text-sm font-normal">
                    Parpadear cuando el tiempo está cumplido
                  </Label>
                  <Switch
                    id="set-blink"
                    checked={state.settings.blink}
                    onCheckedChange={(v) => setSettings({ blink: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="set-auto" className="text-sm font-normal">
                    Auto-iniciar el siguiente momento
                  </Label>
                  <Switch
                    id="set-auto"
                    checked={state.settings.autoAdvance}
                    onCheckedChange={(v) => setSettings({ autoAdvance: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="set-bullets" className="text-sm font-normal">
                    Mostrar puntos clave en modo contador
                  </Label>
                  <Switch
                    id="set-bullets"
                    checked={state.settings.showBulletsOnTimer}
                    onCheckedChange={(v) => setSettings({ showBulletsOnTimer: v })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada momento puede mostrarse en modo “Contador grande” o “Guion +
                  contador abajo” (se cambia en la edición del momento).
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Editor de momento (modal) */}
      <Dialog
        open={!!editingSeg}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="cns-modal max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar momento</DialogTitle>
            <DialogDescription>
              Los cambios se ven al instante en la pantalla del predicador.
            </DialogDescription>
          </DialogHeader>
          {editingSeg ? (
            <SegmentEditor
              seg={editingSeg}
              canDelete={state.segments.length > 1}
              onUpdate={(patch) => updateSegment(editingSeg.id, patch)}
              onDelete={() => {
                removeSegment(editingSeg.id);
                setEditingId(null);
              }}
              onJump={() => {
                const idx = state.segments.findIndex((s) => s.id === editingSeg.id);
                if (idx >= 0) mutate((p) => jumpTo(p, idx));
                setEditingId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────── Editor de momento ─────────────────────── */

function SegmentEditor({
  seg,
  onUpdate,
  onDelete,
  onJump,
  canDelete,
}: {
  seg: Segment;
  onUpdate: (patch: Partial<Segment>) => void;
  onDelete: () => void;
  onJump: () => void;
  canDelete: boolean;
}) {
  const [bulletDraft, setBulletDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const addBullet = () => {
    const t = bulletDraft.trim();
    if (!t) return;
    onUpdate({ bullets: [...seg.bullets, t] });
    setBulletDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label htmlFor={`t-${seg.id}`} className="text-xs">
            Título
          </Label>
          <Input
            id={`t-${seg.id}`}
            className="cns-in"
            value={seg.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`s-${seg.id}`} className="text-xs">
            Orador
          </Label>
          <Input
            id={`s-${seg.id}`}
            className="cns-in"
            value={seg.speaker}
            placeholder="Ej.: Anunciador"
            onChange={(e) => onUpdate({ speaker: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`m-${seg.id}`} className="text-xs">
            Duración (min)
          </Label>
          <Input
            id={`m-${seg.id}`}
            className="cns-in"
            type="number"
            min={1}
            max={600}
            value={seg.minutes}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onUpdate({ minutes: Math.min(600, Math.max(1, Math.round(v))) });
            }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Cómo se muestra en la pantalla</Label>
        <Select
          value={seg.layout}
          onValueChange={(v) => onUpdate({ layout: v === "script" ? "script" : "timer" })}
        >
          <SelectTrigger className="cns-in">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="cns-pop">
            <SelectItem value="timer">Contador grande</SelectItem>
            <SelectItem value="script">Guion + contador abajo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start justify-between gap-2 rounded-lg border p-2.5" style={{ borderColor: "rgba(140,165,200,.18)" }}>
        <div className="min-w-0">
          <Label htmlFor={`c-${seg.id}`} className="text-xs font-medium">
            Tarjeta grande en pantalla
          </Label>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Muestra todos los puntos juntos en una sola tarjeta, con letra grande
            (ideal para los anuncios; anula el guion y el contador grande).
          </p>
        </div>
        <Switch
          id={`c-${seg.id}`}
          checked={seg.cards}
          onCheckedChange={(v) => onUpdate({ cards: v })}
          className="mt-0.5 shrink-0"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          {seg.cards ? "Puntos de la tarjeta" : "Puntos clave"}
        </Label>
        {seg.bullets.map((b, i) => (
        <div key={i} className="flex gap-1.5">
            {seg.cards ? (
              <Textarea
                className="cns-in"
                value={b}
                rows={2}
                aria-label={`Punto ${i + 1}`}
                onChange={(e) => {
                  const arr = [...seg.bullets];
                  arr[i] = e.target.value;
                  onUpdate({ bullets: arr });
                }}
              />
            ) : (
              <Input
                className="cns-in"
                value={b}
                aria-label={`Punto ${i + 1}`}
                onChange={(e) => {
                  const arr = [...seg.bullets];
                  arr[i] = e.target.value;
                  onUpdate({ bullets: arr });
                }}
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              className="cns-icobtn h-10 w-9 shrink-0 self-start"
              aria-label={`Quitar punto ${i + 1}`}
              onClick={() => onUpdate({ bullets: seg.bullets.filter((_, j) => j !== i) })}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <Input
            className="cns-in"
            value={bulletDraft}
            placeholder="Agregar punto…"
            aria-label="Nuevo punto clave"
            onChange={(e) => setBulletDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addBullet();
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="cns-btn-line h-10 w-9 shrink-0"
            aria-label="Agregar punto"
            onClick={addBullet}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Guion extendido (se muestra en la pantalla del predicador)
          {seg.cards ? " — queda anulado mientras la tarjeta esté activa" : ""}
        </Label>
        <Textarea
          className="cns-in"
          value={seg.script}
          rows={4}
          placeholder="Texto más largo que se muestra en la pantalla del predicador…"
          onChange={(e) => onUpdate({ script: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={onJump}>
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" /> Ir a este momento
        </Button>
        {canDelete ? (
          confirmDelete ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirmar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-[#E2604F] hover:text-[#E2604F]"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────────────── Ayuda ─────────────────────────────── */

function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="cns-icobtn" aria-label="Ayuda de uso">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="cns-modal max-w-lg">
        <DialogHeader>
          <DialogTitle>Cómo usar con el proyector</DialogTitle>
          <DialogDescription>
            Sistema de control de tiempos para el culto: contador, tarjetas y mensajes
            al orador.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2.5 pl-5 text-sm">
          <li>
            Tocá <b>“Abrir pantalla del predicador”</b>: es la única pantalla — hace
            de proyección y de pantalla del predicador a la vez. Con un solo monitor,
            abrí esa y listo: muestra el contador, las tarjetas de avisos, la letra
            bíblica y los mensajes.
          </li>
          <li>
            Ponela en pantalla completa con el botón de la esquina (o con <b>F11</b>)
            y proyectala al monitor o TV de la iglesia.
          </li>
          <li>
            Volvé a esta ventana y manejá el culto desde la <b>secuencia horizontal</b>{" "}
            de arriba: tocá un momento para saltar a él, y editá cada uno con el{" "}
            <b>lápiz</b>. Mensajes al orador en la columna de la derecha.
          </li>
        </ol>
        <div className="cns-sep" />
        <div className="cns-note">
          <b>Avisos en una sola tarjeta:</b> en la sección <b>“Ahora”</b> activá el
          interruptor <b>Tarjetas</b> y escribí los puntos ahí mismo: todos se ven
          juntos en <b>una sola tarjeta gigante</b> en la pantalla del predicador, y los
          vas editando en vivo. Los avisos de un momento futuro se preparan con el
          lápiz de ese momento en la secuencia.
        </div>
        <div className="cns-sep" />
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>· Las ventanas se sincronizan solas, en tiempo real.</li>
          <li>
            · Los versículos de <b>Biblia Sincronizada</b> (elegidos en su{" "}
            <b>admin.html</b>) aparecen en vivo con el contador abajo, cortados en
            partes de 4 renglones igual que la proyección: tocá el texto o usá ← →
            para cambiar de parte. El servidor se cambia con el engranaje de esa
            pantalla.
          </li>
          <li>
            · Los mensajes del operador también salen en esta pantalla, encima de
            todo lo demás: solo se ve el mensaje (rojo si es urgente, amarillo si
            no), sin títulos ni leyendas.
          </li>
          <li>
            · La <b>mini pantalla</b> de la columna derecha muestra en vivo lo que
            se ve en la pantalla del predicador (letra bíblica, tarjeta, contador
            y mensajes).
          </li>
          <li>
            · El contador pasa de claro a ámbar en los minutos finales y a rojo
            cuando se cumple el tiempo.
          </li>
          <li>· Los datos quedan guardados en este navegador.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────── Mini pantalla del predicador (incrustada) ────────────── */

/* Tamaño de diseño de la mini pantalla: 320×180 (16:9). Todo lo de adentro
   se dibuja en píxeles de este espacio y después se escala al ancho real de
   la tarjeta, así la replica se ve igual en cualquier ancho de columna. */
const MINI_ANCHO = 320;
const MINI_ALTO = 180;

/** Mide el ancho disponible y devuelve cuánto hay que escalar el diseño. */
function useFitScale(base: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / base);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base]);
  return { ref, scale };
}

/* Barra inferior en chico: momento a la izquierda + contador a la derecha. */
function MiniBarra({
  seg,
  counterText,
  counterColor,
  progressValue,
  progressClass,
  paused,
  grande,
}: {
  seg: Segment;
  counterText: string;
  counterColor: string;
  progressValue: number;
  progressClass: string;
  paused: boolean;
  /** true = como en el modo biblia: contador bien grande a la derecha */
  grande?: boolean;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 pb-1">
          <div
            className={cn(
              "min-w-0 max-w-[46%] truncate rounded-full border-2 px-2 font-black uppercase leading-none tracking-wide",
              COLORS[seg.color].chipDark,
            )}
            style={{ fontSize: 8, paddingTop: 3, paddingBottom: 3 }}
          >
            {seg.title}
          </div>
          {paused ? (
            <div
              className="shrink-0 rounded-full bg-amber-400 px-1.5 font-bold uppercase tracking-widest text-amber-950"
              style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
            >
              Pausa
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "shrink-0 font-mono font-bold tabular-nums leading-none",
            counterColor,
          )}
          style={{ fontSize: grande ? 32 : 22 }}
        >
          {counterText}
        </div>
      </div>
      <Progress
        value={progressValue}
        className={cn("mt-1 h-[3px] bg-white/10", progressClass)}
      />
    </div>
  );
}

/** Réplica en chico de la pantalla del predicador: muestra lo mismo que se
    proyecta en ese momento — letra bíblica, tarjeta de avisos, guion,
    contador grande y mensajes del operador. */
function MiniPantalla({
  state,
  now,
  biblia,
}: {
  state: ShowState;
  now: number;
  biblia: BibliaDisplay | null;
}) {
  const { ref, scale } = useFitScale(MINI_ANCHO);

  const seg = currentSegment(state);
  const active = state.currentIndex >= 0 && seg !== null;
  const totalMs = (seg?.minutes ?? 0) * 60000;
  const elapsed = active ? elapsedCurrent(state, now) : 0;
  const remaining = active ? totalMs - elapsed : 0;
  const overtimeMs = active ? Math.max(0, elapsed - totalMs) : 0;
  const phase = active ? phaseOf(remaining, state.settings.warningMin) : "idle";
  const live = now > 0 && active;
  const cardsOn = active && cardsActive(seg);
  const mode = seg?.layout ?? "timer";
  const paused = state.status === "paused";

  const counterText = live
    ? phase === "overtime"
      ? `+${fmtHMS(Math.floor(overtimeMs / 1000))}`
      : fmtHMS(Math.ceil(remaining / 1000))
    : "--:--";
  const counterColor =
    phase === "overtime"
      ? "text-red-500"
      : phase === "warning"
        ? "text-amber-300"
        : "text-white";
  const progressValue = totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0;
  const progressClass =
    phase === "overtime"
      ? "[&>div]:bg-red-500"
      : phase === "warning"
        ? "[&>div]:bg-amber-400"
        : "[&>div]:bg-white/80";

  const msg = state.message;

  /* Contenido: lo mismo que muestra la pantalla del predicador, en chico */
  let contenido: ReactNode = null;

  if (msg) {
    // Mensaje del operador: SOLO el texto (rojo o amarillo), como en grande
    const len = msg.text.length;
    contenido = (
      <div className="absolute inset-0 flex items-center justify-center p-2.5">
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-2xl px-2.5 text-center font-black leading-[1.1]",
            msg.urgent ? "bg-red-600 text-white" : "bg-amber-400 text-zinc-950",
          )}
        >
          <span style={{ fontSize: len <= 24 ? 36 : len <= 60 ? 26 : 19 }}>
            {msg.text}
          </span>
        </div>
      </div>
    );
  } else if (biblia) {
    // Letra bíblica (con el tiempo abajo si el culto está en marcha)
    contenido = (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-1 pt-2.5">
          <div className="flex items-end justify-between gap-1.5">
            <div
              className="min-w-0 truncate font-bold uppercase tracking-wider text-amber-300"
              style={{ fontSize: 10 }}
            >
              {biblia.ref}
              {biblia.version ? (
                <span

                  className="font-semibold tracking-normal text-amber-200/70"
                  style={{ fontSize: 8 }}
                >
                  {" · "}
                  {biblia.version}
                </span>
              ) : null}
            </div>
            {biblia.totalPartes > 1 ? (
              <div
                className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/10 px-1.5 font-bold text-amber-200"
                style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
              >
                Parte {biblia.parte} de {biblia.totalPartes}
              </div>
            ) : null}
          </div>
          <div
            className="mt-1 min-h-0 flex-1 overflow-hidden font-semibold leading-[1.28] text-white [&_em]:text-amber-200 [&_strong]:text-amber-200"
            style={{ fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: biblia.html }}
          />
        </div>
        {active && seg ? (
          <div className="shrink-0 px-4 pb-2">
            <MiniBarra
              seg={seg}
              counterText={counterText}
              counterColor={counterColor}
              progressValue={progressValue}
              progressClass={progressClass}
              paused={paused}
              grande
            />
          </div>
        ) : null}
      </div>
    );
  } else if (state.status === "finished") {
    contenido = (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="font-bold text-white" style={{ fontSize: 16 }}>
          Culto finalizado
        </div>
        <div className="mt-1 text-zinc-500" style={{ fontSize: 8 }}>
          Reiniciá desde el panel para un nuevo culto.
        </div>
      </div>
    );
  } else if (!active) {
    const first = state.segments[0];
    contenido = (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <div className="font-bold leading-tight text-white" style={{ fontSize: 13 }}>
          El culto comienza pronto
        </div>
        {first ? (
          <div className="mt-1.5 text-zinc-400" style={{ fontSize: 8 }}>
            Primer momento: <b>{first.title}</b> · {first.minutes} min
          </div>
        ) : null}
      </div>
    );
  } else if (cardsOn && seg) {
    // Tarjeta grande de avisos: todos los puntos juntos
    const bullets = seg.bullets;
    const fuente =
      bullets.length <= 1 ? 30 : bullets.length <= 3 ? 21 : bullets.length <= 5 ? 15 : bullets.length <= 7 ? 11 : 9;
    contenido = (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center gap-1.5 px-4 pt-3">
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", COLORS[seg.color].dot)}
          />
          <div className="truncate font-bold text-zinc-200" style={{ fontSize: 9 }}>
            {seg.title}
          </div>
          {paused ? (
            <div
              className="ml-auto shrink-0 rounded-full bg-amber-400 px-1.5 font-bold uppercase tracking-widest text-amber-950"
              style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
            >
              En pausa
            </div>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-3">
          <div className="text-center font-bold leading-[1.3] text-white">
            {bullets.map((b, i) => (
              <div key={i} style={{ fontSize: fuente }}>
                {b}
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-2">
          <MiniBarra
            seg={seg}
            counterText={counterText}
            counterColor={counterColor}
            progressValue={progressValue}
            progressClass={progressClass}
            paused={paused}
          />
        </div>
      </div>
    );
  } else if (mode === "script" && seg) {
    // Guion + contador abajo (si no hay guion, los puntos numerados)
    const lineas = seg.script.split("\n").filter((l) => l.trim());
    const nLineas = Math.max(1, lineas.length || seg.bullets.length || 1);
    const fuente = Math.min(22, Math.max(8, ((60 / nLineas - 3.2) / 1.35) * 1.8));
    contenido = (
      <div className="absolute inset-0 flex flex-col">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-1.5">
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", COLORS[seg.color].dot)}
            />
            <div className="truncate font-bold text-zinc-200" style={{ fontSize: 9 }}>
              {seg.title}
            </div>
            {paused ? (
              <div
                className="ml-auto shrink-0 rounded-full bg-amber-400 px-1.5 font-bold uppercase tracking-widest text-amber-950"
                style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
              >
                En pausa
              </div>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 pt-2">
          {lineas.length > 0 ? (
            lineas.slice(0, 6).map((line, i) => (
              <p
                key={i}
                className="mb-1.5 font-medium text-zinc-100"
                style={{ fontSize: fuente, lineHeight: 1.35 }}
              >
                {line}
              </p>
            ))
          ) : seg.bullets.length > 0 ? (
            seg.bullets.slice(0, 6).map((b, i) => (
              <p
                key={i}
                className="mb-1.5 font-bold text-zinc-100"
                style={{ fontSize: Math.max(fuente, 10), lineHeight: 1.3 }}
              >
                {i + 1}. {b}
              </p>
            ))
          ) : (
            <p className="text-zinc-600" style={{ fontSize: 8 }}>
              El guion de este momento está vacío.
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-2">
          <MiniBarra
            seg={seg}
            counterText={counterText}
            counterColor={counterColor}
            progressValue={progressValue}
            progressClass={progressClass}
            paused={paused}
          />
        </div>
      </div>
    );
  } else if (seg) {
    // Contador grande
    contenido = (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 pb-3 text-center">
        <div className="font-bold tracking-wide text-zinc-200" style={{ fontSize: 10 }}>
          {seg.title}
        </div>
        {paused ? (
          <div
            className="mt-1 rounded-full bg-amber-400 px-2 font-bold uppercase tracking-widest text-amber-950"
            style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
          >
            En pausa
          </div>
        ) : null}
        <div
          className={cn(
            "mt-1 font-mono font-bold tabular-nums leading-none",
            counterColor,
          )}
          style={{ fontSize: 52 }}
        >
          {counterText}
        </div>
        <div className="mt-2 w-3/4">
          <Progress
            value={progressValue}
            className={cn("h-[3px] bg-white/10", progressClass)}
          />
        </div>
        {state.settings.showBulletsOnTimer && seg.bullets.length > 0 ? (
          <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-center gap-1">
            {seg.bullets.slice(0, 3).map((b, i) => (
              <span
                key={i}
                className={cn(
                  "max-w-[45%] truncate rounded-full border px-1.5",
                  COLORS[seg.color].chipDark,
                )}
                style={{ fontSize: 7, paddingTop: 2, paddingBottom: 2 }}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative w-full select-none overflow-hidden rounded-xl border-2 border-white/15 bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: MINI_ANCHO,
          height: MINI_ALTO,
          transform: scale > 0 ? `scale(${scale})` : undefined,
          opacity: scale > 0 ? 1 : 0,
        }}
      >
        {contenido}
      </div>
    </div>
  );
}
