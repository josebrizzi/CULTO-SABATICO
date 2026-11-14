"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  HelpCircle,
  MessageSquare,
  Minus,
  MonitorSpeaker,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings as SettingsIcon,
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
import {
  BIBLIA_URL_DEFECTO,
  VersoBiblia,
  guardarUrlBiblia,
  urlBibliaGuardada,
  useBibliaSocket,
} from "@/lib/biblia";
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
.cns, .cns-modal, .cns-pop, .cns-menu{
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
  height:100dvh;
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

/* ── Canales de la secuencia (tira compacta, se arrastra con el cursor) ── */
.cns-seq{ touch-action:pan-y; }
.cns-seq.dragging{ cursor:grabbing;user-select:none; }
.cns-chip{
  position:relative;width:158px;flex:none;display:flex;align-items:center;gap:8px;
  border-radius:10px;border:1px solid var(--line-soft);
  background:linear-gradient(180deg,rgba(29,53,87,.30),rgba(9,20,38,.45));
  padding:6px 8px;cursor:pointer;
  transition:border-color .25s ease-in-out,box-shadow .25s ease-in-out;
}
.cns-chip:hover{ border-color:var(--gold-soft); }
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
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:11px;font-weight:700;
  color:var(--gold);
}
.cns-chip-min{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:21px;font-weight:700;
  color:var(--gold-lt);line-height:1;
}
.cns-chip-minlab{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:8px;
  letter-spacing:.18em;text-transform:uppercase;color:var(--ink-mut);
}
.cns-chip-title{ font-size:12px;font-weight:800;color:var(--ink); }

/* ── Menú de los tres puntitos ── */
.cns-menu{
  position:absolute;top:calc(100% + 4px);right:2px;z-index:60;min-width:168px;
  border-radius:10px;border:1px solid var(--line-soft);background:#12233D;
  box-shadow:0 18px 40px rgba(2,6,14,.65);padding:4px;display:flex;flex-direction:column;
}
.cns-menu button{
  display:block;border-radius:7px;padding:7px 10px;
  font-size:12.5px;font-weight:700;color:var(--ink-2);text-align:left;
}
.cns-menu button:hover{ background:var(--gold-dim);color:var(--gold-lt); }
.cns-menu button:disabled{ opacity:.35;pointer-events:none; }

/* ── Etiquetas chiquitas de los ajustes en línea ── */
.cns-setlab{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mut);
}

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

/** Lee un texto de localStorage sin romperse si no está disponible. */
function lsTexto(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/* Temas de fondo que difunde Biblia Sincronizada (los mismos ids que el admin). */
const TEMAS_BIBLIA: { id: string; nombre: string }[] = [
  { id: "claro", nombre: "Claro" },
  { id: "doodle-claro", nombre: "Doodle claro" },
  { id: "sepia", nombre: "Sepia" },
  { id: "oscuro", nombre: "Oscuro" },
  { id: "doodle-oscuro", nombre: "Doodle oscuro" },
  { id: "azul", nombre: "Azul" },
];

export default function PanelView() {
  const { state, mutate, peerOnline, bibliaProyectada } = useShowChannel("panel");
  const now = useNow(500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const [menuIdx, setMenuIdx] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  /* ───────── Biblia Sincronizada: el panel también proyecta ─────────
     Misma conexión que el admin del teléfono: el panel manda versículos,
     citas y temas al mismo servidor, y la letra aparece en la proyección
     y en la pantalla del predicador como si la mandara el teléfono. */
  const [bibliaUrlConf, setBibliaUrlConf] = useState<string | null>(null);
  const [confBibliaAbierta, setConfBibliaAbierta] = useState(false);
  const [inputUrlBiblia, setInputUrlBiblia] = useState(BIBLIA_URL_DEFECTO);
  const [refDraft, setRefDraft] = useState<string>(() => lsTexto("culto-biblia-ref"));
  const [txtDraft, setTxtDraft] = useState<string>(() => lsTexto("culto-biblia-texto"));
  const [citaDraft, setCitaDraft] = useState("");
  const [temaBiblia, setTemaBiblia] = useState("");
  /** Último versículo enviado: se reenvía con otra parte al avanzar/retroceder. */
  const [versoActivo, setVersoActivo] = useState<VersoBiblia | null>(null);
  useEffect(() => {
    setBibliaUrlConf(urlBibliaGuardada());
  }, []);
  const urlBiblia = bibliaUrlConf ?? BIBLIA_URL_DEFECTO;
  const biblia = useBibliaSocket(urlBiblia);
  const bibliaConectado = biblia.estado === "conectado";
  // El borrador sobrevive una recarga de la página a mitad del culto.
  useEffect(() => {
    try {
      localStorage.setItem("culto-biblia-ref", refDraft);
      localStorage.setItem("culto-biblia-texto", txtDraft);
    } catch {
      /* sin storage */
    }
  }, [refDraft, txtDraft]);

  /* ── Secuencia: arrastre con el cursor y rueda del mouse ── */
  const seqRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ activo: false, moved: false, startX: 0, startScroll: 0 });
  useEffect(() => {
    const el = seqRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragStateRef.current = { activo: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    };
    const move = (e: PointerEvent) => {
      const d = dragStateRef.current;
      if (!d.activo) return;
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) > 5) {
        d.moved = true;
        el.classList.add("dragging");
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* sin captura: igual arrastra mientras el botón esté apretado */
        }
        el.scrollLeft = d.startScroll - dx;
      }
    };
    const up = (e: PointerEvent) => {
      const d = dragStateRef.current;
      if (!d.activo) return;
      d.activo = false;
      el.classList.remove("dragging");
      try {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch {
        /* nada que soltar */
      }
    };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

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

  /* ─────────────── Acciones de Biblia Sincronizada ─────────────── */

  /** Manda el versículo del borrador al servidor de Biblia Sincronizada.
   *  La pantalla del predicador lo corta en partes y muestra la pedida. */
  const proyectarVerso = (partePedida = 0) => {
    const ref = refDraft.trim();
    const texto = txtDraft.trim().replace(/\s+/g, " ");
    if (!bibliaConectado || !ref || !texto) return;
    const m = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+))?$/);
    const verso: VersoBiblia = {
      bookName: m ? m[1] : ref,
      chapter: m ? Number(m[2]) || 0 : 0,
      verse: m && m[3] ? Number(m[3]) || 0 : 0,
      version: "",
      part: Math.max(0, Math.trunc(partePedida)),
      bookNumber: null,
      pid: Math.floor(Date.now() / 1000) % 100000,
      words: texto.split(" "),
      label: ref,
    };
    biblia.enviar({ type: "verse", ...verso });
    setVersoActivo(verso);
  };

  /** Avanza o retrocede la parte del versículo en pantalla: reenvía el mismo
   *  versículo con otra parte, igual que hacía el admin del teléfono. */
  const cambiarParteBiblia = (delta: number) => {
    if (!versoActivo) return;
    const total = Math.max(1, bibliaProyectada?.totalPartes ?? 1);
    const actual = Math.max(1, bibliaProyectada?.parte ?? 1);
    const nueva = Math.min(total, Math.max(1, actual + delta));
    if (nueva === actual) return;
    const verso = { ...versoActivo, part: nueva - 1 };
    biblia.enviar({ type: "verse", ...verso });
    setVersoActivo(verso);
  };

  /** Texto libre (cita) en la proyección, con saltos de línea seguros. */
  const proyectarCita = () => {
    const t = citaDraft.trim();
    if (!bibliaConectado || !t) return;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = t
      .split(/\n+/)
      .filter((l) => l.trim())
      .map((l) => `<p>${esc(l.trim())}</p>`)
      .join("");
    biblia.enviar({ type: "freeText", html });
  };

  /** Oculta la letra en la proyección y en la pantalla del predicador. */
  const ocultarBiblia = () => {
    biblia.enviar({ type: "clear" });
    setVersoActivo(null);
  };

  const enviarTemaBiblia = (fondo: string) => {
    setTemaBiblia(fondo);
    if (fondo) biblia.enviar({ type: "theme", fondo });
  };

  const guardarUrlBibliaPanel = () => {
    const limpia = inputUrlBiblia.trim();
    if (!limpia) return;
    guardarUrlBiblia(limpia);
    setBibliaUrlConf(limpia);
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
    <div className="cns flex h-dvh flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_CONSOLA }} />

      {/* Clic afuera cierra el menú de los tres puntitos */}
      {menuIdx !== null ? (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setMenuIdx(null)}
        />
      ) : null}

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
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
            {/* Ajustes de la pantalla, en línea (antes eran una columna) */}
            <div
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1"
              title="Ajustes de la pantalla del predicador"
            >
              <span className="cns-setlab">Pantalla</span>
              <Select
                value={String(state.settings.warningMin)}
                onValueChange={(v) => setSettings({ warningMin: Number(v) })}
              >
                <SelectTrigger
                  aria-label="Minutos del aviso amarillo"
                  title="Aviso amarillo antes de que se cumpla el tiempo"
                  className="cns-in h-8 w-[112px] text-xs"
                >
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
              <Switch
                id="set-blink"
                checked={state.settings.blink}
                onCheckedChange={(v) => setSettings({ blink: v })}
                aria-label="Parpadear cuando el tiempo está cumplido"
              />
              <label htmlFor="set-blink" className="cns-setlab cursor-pointer">
                Parpadeo
              </label>
              <Switch
                id="set-auto"
                checked={state.settings.autoAdvance}
                onCheckedChange={(v) => setSettings({ autoAdvance: v })}
                aria-label="Auto-iniciar el siguiente momento"
              />
              <label htmlFor="set-auto" className="cns-setlab cursor-pointer">
                Auto
              </label>
              <Switch
                id="set-bullets"
                checked={state.settings.showBulletsOnTimer}
                onCheckedChange={(v) => setSettings({ showBulletsOnTimer: v })}
                aria-label="Mostrar puntos clave en modo contador"
              />
              <label htmlFor="set-bullets" className="cns-setlab cursor-pointer">
                Puntos
              </label>
            </div>
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

      <main className="mx-auto flex w-full max-w-[1440px] min-h-0 flex-1 flex-col gap-3 px-4 py-3">
        {/* ═══ Secuencia del culto: tira compacta (arrastrable con el cursor) ═══ */}
        <section className="cns-panel cns-rise shrink-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-2.5">
            <div className="cns-eyebrow">Programa</div>
            <h2 className="cns-h2 text-base">Secuencia del culto</h2>
            <p className="cns-sub min-w-0 flex-1 truncate">
              {state.segments.length} momentos · {fmtMin(totalMin)} · un clic salta
              al momento · doble clic lo edita
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="cns-btn-ghost ml-auto h-7 shrink-0 text-xs"
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
          <div className="px-3 pb-2 pt-1.5">
            <div
              ref={seqRef}
              className="cns-seq scrollbar-thin flex gap-2 overflow-x-auto pb-1"
            >
              {state.segments.map((x, i) => {
                const isCurrent =
                  i === state.currentIndex && state.status !== "finished";
                const isDone = state.currentIndex >= 0 && i < state.currentIndex;
                return (
                  <div
                    key={x.id}
                    ref={isCurrent ? currentChipRef : undefined}
                    onClick={() => {
                      if (dragStateRef.current.moved) {
                        dragStateRef.current.moved = false;
                        return;
                      }
                      if (i !== state.currentIndex) mutate((p) => jumpTo(p, i));
                      setMenuIdx(null);
                    }}
                    onDoubleClick={() => setEditingId(x.id)}
                    title="Un clic: saltar a este momento · doble clic: editarlo"
                    className={cn(
                      "cns-chip",
                      isCurrent && "cns-chip-now",
                      isDone && "cns-chip-done",
                    )}
                  >
                    <span className="cns-chip-num w-4 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="flex shrink-0 flex-col items-center leading-none">
                      <span className="cns-chip-min">{x.minutes}</span>
                      <span className="cns-chip-minlab mt-0.5">min</span>
                    </span>
                    <span
                      className={cn(
                        "cns-chip-title min-w-0 flex-1 truncate",
                        isDone && "line-through opacity-60",
                      )}
                    >
                      {x.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Más opciones de ${x.title}`}
                      title="Más opciones"
                      className="cns-icobtn grid h-7 w-7 shrink-0 place-items-center rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ x: r.right, y: r.bottom + 4 });
                        setMenuIdx(menuIdx === i ? null : i);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {menuIdx === i
                      ? createPortal(
                          <div
                            className="cns-menu"
                            style={{
                              position: "fixed",
                              top: menuPos.y,
                              left: menuPos.x,
                              transform: "translateX(-100%)",
                            }}
                            onClick={(e2) => e2.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(x.id);
                                setMenuIdx(null);
                              }}
                            >
                              Editar momento
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                mutate((p) => jumpTo(p, i));
                                setMenuIdx(null);
                              }}
                            >
                              Ir a este momento
                            </button>
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => {
                                moveSegment(i, -1);
                                setMenuIdx(null);
                              }}
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              disabled={i === state.segments.length - 1}
                              onClick={() => {
                                moveSegment(i, 1);
                                setMenuIdx(null);
                              }}
                            >
                              Bajar
                            </button>
                          </div>,
                          document.body,
                        )
                      : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addSegment}
                aria-label="Agregar momento"
                className="cns-chip w-[158px] shrink-0 cursor-pointer justify-center gap-1.5 border-dashed py-2 text-[#8FA0B8]"
              >
                <Plus className="h-4 w-4 text-[#C6A45B]" aria-hidden="true" />
                <span className="text-xs font-bold">Agregar</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,340px)]">
          {/* ═══ Columna central (arriba en móvil) ═══ */}
          <div className="scrollbar-thin flex min-h-0 flex-col gap-2.5 overflow-y-auto">
            {/* ── Mesa de control: el momento en curso ── */}
            <section
              className={cn(
                "cns-panel cns-rise shrink-0",
                active && "border-[rgba(198,164,91,0.30)]",
              )}
            >
              <div className="flex items-center justify-between gap-2 px-4 pt-2.5">
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span className="cns-eyebrow">Mesa</span>
                  <h2 className="cns-h2 min-w-0 truncate text-lg">
                    {active ? `Ahora · ${seg?.title}` : "Ahora"}
                  </h2>
                </div>
                {statusPill}
              </div>
              {active && (seg?.speaker || next) ? (
                <p className="cns-sub px-4 pt-0.5 text-[11px]">
                  {seg?.speaker ? `Orador: ${seg.speaker}` : null}
                  {seg?.speaker && next ? " · " : null}
                  {next ? `Siguiente: ${next.title} (${next.minutes} min)` : null}
                </p>
              ) : null}

              <div className="px-4 pb-3 pt-1.5">
                {state.status === "finished" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="cns-h2 text-lg">Culto finalizado</div>
                      <p className="cns-sub mt-0.5">
                        Reiniciá para comenzar un nuevo culto.
                      </p>
                    </div>
                    <Button
                      className="cns-btn-line h-10 shrink-0"
                      variant="outline"
                      onClick={doRestartService}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
                      todo
                    </Button>
                  </div>
                ) : !active ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="cns-h2 text-lg">El culto no comenzó</div>
                      <p className="cns-sub mt-0.5">
                        {state.segments.length} momentos · {fmtMin(totalMin)}{" "}
                        planificados
                      </p>
                    </div>
                    <Button
                      className="cns-btn-gold h-12 shrink-0 px-8 text-base"
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
                          "cns-timer mt-0.5 text-5xl tabular-nums md:text-6xl",
                          counterColor,
                        )}
                      >
                        {live
                          ? phase === "overtime"
                            ? `+${fmtHMS(Math.floor(overtimeMs / 1000))}`
                            : fmtHMS(Math.ceil(remaining / 1000))
                          : "--:--"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {phase === "overtime"
                          ? "Tiempo cumplido — excedente"
                          : `de ${seg?.minutes} min planificados`}
                      </div>
                    </div>

                    {/* Medidor VU */}
                    <Progress
                      value={totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0}
                      className={cn(
                        "mt-2 h-1.5 bg-black/50",
                        phase === "overtime"
                          ? "[&>div]:bg-[#E2604F]"
                          : phase === "warning"
                            ? "[&>div]:bg-[#EAC97A]"
                            : "[&>div]:bg-[#C6A45B]",
                      )}
                    />
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                      <span>
                        TRANSCURRIDO {fmtHMS(Math.floor(elapsed / 1000))}
                      </span>
                      <span>RESTANTE CULTO {fmtMin(plannedRemain)}</span>
                      <span>PLANIFICADO {seg?.minutes} MIN</span>
                    </div>

                    {phase === "overtime" ? (
                      <div className="cns-alert-danger mt-2.5">
                        <AlertTriangle
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        Se cumplió el tiempo hace{" "}
                        {fmtHMS(Math.floor(overtimeMs / 1000))}. Considerá pasar al
                        siguiente momento.
                      </div>
                    ) : null}

                    {/* Controles de la consola: una sola fila */}
                    <div className="mt-2.5 flex gap-1.5">
                      <Button
                        className={cn(
                          "h-9 min-w-0 flex-[1.4] text-sm",
                          state.status === "running"
                            ? "cns-btn-line"
                            : "cns-btn-gold",
                        )}
                        onClick={toggleStartPause}
                      >
                        {state.status === "running" ? (
                          <>
                            <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" aria-hidden="true" />{" "}
                            {state.elapsedBefore > 0 ? "Reanudar" : "Iniciar"}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="cns-btn-line h-9 shrink-0 text-xs"
                        onClick={doAdvance}
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />{" "}
                        Siguiente
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 w-9 shrink-0"
                        title="Reiniciar el cronómetro de este momento (R)"
                        aria-label="Reiniciar el cronómetro de este momento"
                        onClick={doReset}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 w-9 shrink-0"
                        title="Momento anterior"
                        aria-label="Momento anterior"
                        onClick={doBack}
                      >
                        <SkipBack className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 shrink-0 text-xs"
                        title="Restar 1 minuto al momento"
                        onClick={() => adjustMinutes(-1)}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" /> 1 min
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 shrink-0 text-xs"
                        title="Sumar 1 minuto al momento"
                        onClick={() => adjustMinutes(1)}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 1 min
                      </Button>
                    </div>

                    {seg && seg.cards ? (
                      <div className="mt-3 space-y-2 rounded-xl border-2 border-dashed border-[rgba(198,164,91,0.45)] bg-[rgba(198,164,91,0.06)] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E6D5A8]">
                            Tarjeta en pantalla · editable
                          </div>
                          <Switch
                            checked={!!seg.cards}
                            onCheckedChange={(v) => updateSegment(seg.id, { cards: v })}
                            aria-label="Desactivar la tarjeta grande en este momento"
                          />
                        </div>

                        <div className="scrollbar-thin max-h-[100px] space-y-1.5 overflow-y-auto pr-0.5">
                          {seg.bullets.map((b, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <Textarea
                                value={b}
                                rows={2}
                                aria-label={`Editar punto ${i + 1}`}
                                placeholder={`Punto ${i + 1}…`}
                                className="cns-in min-h-0 flex-1 rounded-xl text-sm font-bold leading-snug"
                                onChange={(e) => {
                                  const arr = [...seg.bullets];
                                  arr[i] = e.target.value;
                                  updateSegment(seg.id, { bullets: arr });
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cns-icobtn h-8 w-7 shrink-0"
                                aria-label={`Quitar punto ${i + 1}`}
                                disabled={seg.bullets.length <= 1}
                                onClick={() =>
                                  updateSegment(seg.id, {
                                    bullets: seg.bullets.filter((_, j) => j !== i),
                                  })
                                }
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="cns-btn-line h-7"
                            onClick={() =>
                              updateSegment(seg.id, { bullets: [...seg.bullets, ""] })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                            Agregar punto
                          </Button>
                        </div>
                      </div>
                    ) : seg ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[rgba(143,160,184,0.35)] bg-black/20 p-2.5">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Tarjeta en pantalla
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            ¿Avisos o puntos? Mostralos en una sola tarjeta con letra
                            grande.
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
                  </>
                )}
              </div>
            </section>

            {/* ── Mensajes al orador ── */}
            <section className="cns-panel cns-rise shrink-0">
              <div className="space-y-2 px-4 pb-2.5 pt-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="cns-eyebrow">
                    <MessageSquare
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />{" "}
                    Intercomunicador
                  </div>
                  {state.message ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 max-w-[210px] truncate text-xs text-muted-foreground">
                        En pantalla: <b>“{state.message.text}”</b>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="cns-btn-line h-7 shrink-0 text-xs"
                        onClick={() => mutate((p) => ({ ...p, message: null }))}
                      >
                        <X className="h-3 w-3" aria-hidden="true" /> Limpiar
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Sale gigante en la pantalla del predicador
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Mensaje personalizado"
                    placeholder="Escribir mensaje…"
                    value={msgDraft}
                    className="cns-in h-9 min-w-0 flex-1"
                    onChange={(e) => setMsgDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage(msgDraft, msgUrgent);
                        setMsgDraft("");
                      }
                    }}
                  />
                  <Switch
                    id="msg-urgent"
                    checked={msgUrgent}
                    onCheckedChange={setMsgUrgent}
                    aria-label="Mensaje urgente (rojo)"
                  />
                  <Label
                    htmlFor="msg-urgent"
                    className="cns-setlab shrink-0 cursor-pointer"
                  >
                    Urgente
                  </Label>
                  <Button
                    size="icon"
                    aria-label="Enviar mensaje"
                    className="cns-btn-gold h-9 w-9 shrink-0"
                    onClick={() => {
                      sendMessage(msgDraft, msgUrgent);
                      setMsgDraft("");
                    }}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </section>
          </div>

          {/* ═══ Columna derecha ═══ */}
          <div className="scrollbar-thin flex min-h-0 flex-col gap-2.5 overflow-y-auto">
            {/* ── Monitor de salida (mini pantalla en vivo) ── */}
            <section className="cns-panel cns-rise shrink-0">
              <div className="px-4 pt-2.5">
                <div className="cns-eyebrow">
                  <MonitorSpeaker
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />{" "}
                  Monitor de salida · pantalla del predicador
                </div>
              </div>
              <div className="p-2.5">
                <div
                  title="Abrir la pantalla del predicador"
                  onClick={openPreacherWindow}
                  className="cns-bezel cursor-pointer"
                >
                  <MiniPantalla state={state} now={now} biblia={bibliaViva} />
                </div>
              </div>
            </section>

            {/* ── Biblia Sincronizada: el panel maneja la proyección ── */}
            <section className="cns-panel cns-rise shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
                <div className="cns-eyebrow">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Biblia
                  sincronizada
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "cns-pill",
                      biblia.estado === "conectado"
                        ? "cns-pill-ok"
                        : biblia.estado === "conectando"
                          ? "cns-pill-dim"
                          : "cns-pill-danger",
                    )}
                  >
                    <span
                      className={cn(
                        "cns-led",
                        biblia.estado === "conectado" && "cns-led-ok",
                        biblia.estado === "desconectado" && "cns-led-blink",
                      )}
                    />
                    {biblia.estado === "conectado"
                      ? "Conectada"
                      : biblia.estado === "conectando"
                        ? "Conectando…"
                        : "Sin conexión"}
                  </span>
                  <button
                    type="button"
                    aria-label="Reintentar conexión de la biblia"
                    title="Reintentar conexión"
                    className="cns-icobtn grid h-7 w-7 place-items-center rounded-md"
                    onClick={biblia.reintentar}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cambiar el servidor de la biblia"
                    title="Cambiar el servidor de la biblia"
                    className={cn(
                      "cns-icobtn grid h-7 w-7 place-items-center rounded-md",
                      confBibliaAbierta &&
                        "bg-[rgba(198,164,91,.16)] text-[#E6D5A8]",
                    )}
                    onClick={() => setConfBibliaAbierta((v) => !v)}
                  >
                    <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 px-4 pb-2 pt-2">
                {confBibliaAbierta ? (
                  <div className="flex gap-1.5">
                    <Input
                      aria-label="Dirección del servidor de Biblia Sincronizada"
                      placeholder="Servidor (https://…)"
                      value={inputUrlBiblia}
                      className="cns-in h-8 min-w-0 flex-1 text-xs"
                      onChange={(e) => setInputUrlBiblia(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") guardarUrlBibliaPanel();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="cns-btn-line h-8 shrink-0"
                      onClick={guardarUrlBibliaPanel}
                    >
                      Guardar
                    </Button>
                  </div>
                ) : null}
                <div className="flex gap-1.5">
                  <Input
                    aria-label="Referencia del versículo"
                    placeholder="Referencia · ej.: Juan 3:16"
                    value={refDraft}
                    className="cns-in h-9 min-w-0 flex-1"
                    onChange={(e) => setRefDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") proyectarVerso(0);
                    }}
                  />
                  <Button
                    size="sm"
                    className="cns-btn-gold h-9 shrink-0"
                    disabled={
                      !bibliaConectado || !refDraft.trim() || !txtDraft.trim()
                    }
                    onClick={() => proyectarVerso(0)}
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" /> Proyectar
                  </Button>
                </div>
                <Textarea
                  aria-label="Texto del versículo"
                  placeholder="Texto del versículo: escribelo o pegalo acá…"
                  value={txtDraft}
                  rows={2}
                  className="cns-in min-h-0 text-xs leading-snug"
                  onChange={(e) => setTxtDraft(e.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="cns-btn-line h-8 w-8 shrink-0"
                    aria-label="Parte anterior del versículo"
                    title="Parte anterior"
                    disabled={!versoActivo}
                    onClick={() => cambiarParteBiblia(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span className="min-w-0 flex-1 text-center text-xs text-muted-foreground">
                    {bibliaViva && bibliaViva.totalPartes > 1
                      ? `Parte ${bibliaViva.parte} de ${bibliaViva.totalPartes}`
                      : bibliaViva
                        ? "Versículo completo"
                        : "—"}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="cns-btn-line h-8 w-8 shrink-0"
                    aria-label="Parte siguiente del versículo"
                    title="Parte siguiente"
                    disabled={!versoActivo}
                    onClick={() => cambiarParteBiblia(1)}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cns-btn-line h-8 shrink-0"
                    disabled={!bibliaConectado}
                    onClick={ocultarBiblia}
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Ocultar
                  </Button>
                </div>
                <div className="cns-sep" />
                <div className="flex gap-1.5">
                  <Input
                    aria-label="Cita libre"
                    placeholder="Cita libre (texto en la pantalla)…"
                    value={citaDraft}
                    className="cns-in h-8 min-w-0 flex-1 text-xs"
                    onChange={(e) => setCitaDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") proyectarCita();
                    }}
                  />
                  <Button
                    size="icon"
                    aria-label="Proyectar la cita libre"
                    title="Proyectar cita"
                    className="cns-btn-line h-8 w-8 shrink-0"
                    disabled={!bibliaConectado || !citaDraft.trim()}
                    onClick={proyectarCita}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Select value={temaBiblia} onValueChange={enviarTemaBiblia}>
                    <SelectTrigger
                      aria-label="Tema de fondo de la proyección"
                      title="Tema de fondo de la proyección"
                      className="cns-in h-8 w-[104px] shrink-0 text-xs"
                    >
                      <SelectValue placeholder="Tema" />
                    </SelectTrigger>
                    <SelectContent className="cns-pop">
                      {TEMAS_BIBLIA.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            de arriba: la tira se <b>arrastra con el cursor</b> (o con la rueda del
            mouse), un <b>clic</b> salta a un momento y un <b>doble clic</b> lo edita
            (también con los <b>tres puntitos</b>). Mensajes al orador en la columna de
            la derecha.
          </li>
        </ol>
        <div className="cns-sep" />
        <div className="cns-note">
          <b>Avisos en una sola tarjeta:</b> en la sección <b>“Ahora”</b> activá el
          interruptor <b>Tarjetas</b> y escribí los puntos ahí mismo: todos se ven
          juntos en <b>una sola tarjeta gigante</b> en la pantalla del predicador, y los
          vas editando en vivo. Los avisos de un momento futuro se preparan con{" "}
          <b>doble clic</b> sobre ese momento en la secuencia.
        </div>
        <div className="cns-sep" />
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>· Las ventanas se sincronizan solas, en tiempo real.</li>
          <li>
            · Los versículos de <b>Biblia Sincronizada</b> se mandan desde el admin del
            teléfono o desde el <b>panel</b> (sección <b>Biblia sincronizada</b>:
            referencia + texto, partes ◀ ▶, cita libre, ocultar y temas de fondo).
            Aparecen en vivo con el contador abajo, cortados en partes de 4 renglones
            igual que la proyección: tocá el texto o usá ← → para cambiar de parte. El
            servidor se cambia con el engranaje.
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
