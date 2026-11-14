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
