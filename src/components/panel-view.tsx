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
