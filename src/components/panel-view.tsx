"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Clock,
  FolderOpen,
  HelpCircle,
  MessageSquare,
  Minus,
  MonitorSpeaker,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
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
   Tema "Crema Elegante" — consola clara, sobria y delicada para la
   Iglesia Adventista del Séptimo Día. Fondo crema #F6F1E7, tarjetas
   blancas y letras oscuras (negro cálido #241E16, marrón #6B4A2F,
   blanco sobre los botones marrones), acentos dorado #B08D57. Orden del
   culto en vertical con conectores de minutos entre los bloques.
   Tipografías: Playfair Display (títulos), Lato (cuerpo), Roboto Mono
   (números y relojes). Todo scoping bajo .cns para NO tocar la pantalla
   del predicador.
   ═══════════════════════════════════════════════════════════════════════ */
const ESTILO_CONSOLA = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Lato:wght@400;700;900&family=Roboto+Mono:wght@500;600;700&display=swap');

/* Las variables se definen también en .cns-modal, .cns-pop y .cns-menu porque
   los modales y desplegables se renderizan en un portal FUERA del div .cns,
   y sin las variables los colores caerían al tema oscuro por defecto.
   Tema "Crema Elegante": fondo crema, tarjetas blancas, letras oscuras
   (negro cálido, marrón, blanco) y acentos dorado y marrón. */
.cns, .cns-modal, .cns-pop, .cns-menu{
  --paper:#F6F1E7; --paper-2:#F1EADC; --card:#FFFFFF; --card-soft:#FBF8F1;
  --ink:#241E16; --ink-2:#4A3E30; --ink-mut:#8A7A64;
  --marron:#6B4A2F; --marron-osc:#3A2C1A;
  --oro:#B08D57; --oro-lt:#D9C493; --oro-dim:rgba(176,141,87,.14);
  --ok:#4E7A52; --warn:#B98A2F; --danger:#B0452F;
  --line:#E4DCCB; --line-soft:#ECE5D5;
}
.cns{
  font-family:'Lato','Segoe UI',system-ui,-apple-system,sans-serif;
  color:var(--ink);
  background:
    radial-gradient(1200px 520px at 85% -10%, rgba(176,141,87,.10), transparent 60%),
    radial-gradient(900px 480px at -8% 110%, rgba(107,74,47,.07), transparent 55%),
    linear-gradient(180deg,#F8F4EC 0%,#F3EEE1 100%);
  background-attachment:fixed;
  height:100dvh;
}
.cns ::selection{ background:rgba(176,141,87,.30); }

/* ── Paneles de la consola ── */
.cns-panel{
  background:var(--card);
  border:1px solid var(--line);
  border-radius:16px;
  box-shadow:0 1px 2px rgba(90,70,40,.05), 0 10px 30px rgba(90,70,40,.07);
}
.cns-panel-active{ border-color:rgba(176,141,87,.60); }
.cns-eyebrow{
  display:flex;align-items:center;gap:8px;
  font-family:'Lato',system-ui,sans-serif;
  font-size:10.5px;font-weight:900;letter-spacing:.30em;text-transform:uppercase;
  color:#A3823F;
}
.cns-eyebrow::before{
  content:"";width:7px;height:7px;flex:none;background:var(--oro);
  border-radius:2px;
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
  background:rgba(252,250,244,.94);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line);
  box-shadow:0 8px 24px rgba(90,70,40,.08);
}
.cns-top::after{
  content:"";display:block;height:2px;
  background:linear-gradient(90deg,transparent 4%,var(--oro-lt) 22%,var(--oro) 50%,var(--oro-lt) 78%,transparent 96%);
  opacity:.8;
}
.cns-top-in{
  max-width:1440px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;
  gap:10px;padding:12px 18px;
}
.cns-logo{
  width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;
  color:#F5E9D2;background:linear-gradient(150deg,var(--marron) 0%,var(--marron-osc) 92%);
  border:1px solid var(--oro-lt);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 6px 16px rgba(58,44,26,.28);
}
.cns-iglesia{
  font-family:'Lato',system-ui,sans-serif;font-size:10px;font-weight:700;
  letter-spacing:.24em;text-transform:uppercase;color:#A3823F;
}
.cns-titulo{
  font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:var(--ink);line-height:1.15;
}
.cns-lema{
  font-family:'Lato',system-ui,sans-serif;font-size:12px;color:var(--ink-mut);
}
.cns-ver{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;color:var(--ink-mut);
  border:1px solid #E0D5BE;border-radius:7px;padding:3px 8px;
  background:#FFFFFF;
}

/* ── Píldoras de estado y leds ── */
.cns-pill{
  display:inline-flex;align-items:center;gap:7px;border-radius:999px;
  padding:5px 12px;font-size:11px;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;border:1px solid var(--line);
  color:var(--ink-2);background:#FFFFFF;white-space:nowrap;
}
.cns-pill-live{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
.cns-pill-danger{ background:#F9EDE8;border-color:rgba(176,69,47,.40);color:#8A3A26; }
.cns-pill-warn{ background:#F8F0DC;border-color:#E0C98C;color:#8A6A1F; }
.cns-pill-ok{ background:#EAF0E6;border-color:#C2D0B4;color:#3E6B4A; }
.cns-pill-dim{ color:var(--ink-mut); }
.cns-led{ width:8px;height:8px;flex:none;border-radius:999px;background:#B4A78E; }
.cns-led-blink{ background:var(--danger);animation:cns-pulse 1.1s ease-in-out infinite; }
.cns-pill-live .cns-led{ background:#A3823F;animation:cns-pulse 1.1s ease-in-out infinite; }
.cns-led-ok{ background:var(--ok);animation:cns-pulse 2s ease-in-out infinite; }
.cns-led-warn{ background:var(--warn); }
@keyframes cns-pulse{ 0%,100%{opacity:1} 50%{opacity:.35} }

/* ── Botones ── */
.cns .cns-btn-gold{
  background:linear-gradient(135deg,#7A563A 0%,#5C4327 100%);color:#FFFFFF;
  border:1px solid rgba(217,196,147,.65);font-weight:800;letter-spacing:.03em;
  box-shadow:0 6px 18px rgba(92,67,39,.28), inset 0 1px 0 rgba(255,255,255,.18);
}
.cns .cns-btn-gold:hover{ background:linear-gradient(135deg,#8A6444 0%,#6B4E30 100%);color:#FFFFFF; }
.cns .cns-btn-line{
  background:#FFFFFF;border:1px solid #D5C7A9;
  color:var(--marron);font-weight:700;
}
.cns .cns-btn-line:hover{ background:#F6EFDD;border-color:#C9B68C;color:#5C4327; }
.cns .cns-btn-ghost{ color:var(--ink-mut); }
.cns .cns-btn-ghost:hover{ background:var(--paper-2);color:#5C4327; }
.cns .cns-icobtn{ color:var(--ink-mut); }
.cns .cns-icobtn:hover{ background:var(--paper-2);color:#5C4327; }

/* ── Orden del culto: cajas grandes en vertical con conectores ── */
.cns-box{
  position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,auto) auto;
  align-items:center;gap:12px;
  border-radius:14px;border:1px solid var(--line);
  background:var(--card);padding:13px 14px 13px 12px;cursor:pointer;
  box-shadow:0 1px 2px rgba(90,70,40,.05), 0 5px 14px rgba(90,70,40,.05);
  transition:border-color .25s ease-in-out,box-shadow .25s ease-in-out;
}
.cns-box:hover{
  border-color:#D3C5A8;
  box-shadow:0 2px 4px rgba(90,70,40,.06), 0 8px 20px rgba(90,70,40,.09);
}
.cns-box-done{ opacity:.55; }
.cns-box-done .cns-box-title{ text-decoration:line-through; }
.cns-box-now{
  border-color:var(--oro);
  background:linear-gradient(180deg,#FFFDF6 0%,#FFFFFF 100%);
  box-shadow:0 0 0 1px var(--oro-lt), 0 10px 26px rgba(176,141,87,.22);
}
.cns-box-num{
  width:34px;height:34px;flex:none;display:grid;place-items:center;
  border-radius:10px;border:1px solid var(--line);
  background:var(--paper);color:var(--marron);
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:13px;font-weight:700;
}
.cns-box-now .cns-box-num{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
.cns-box-title{
  font-size:15.5px;font-weight:700;color:var(--ink);letter-spacing:.01em;line-height:1.25;
}
.cns-box-speaker{ font-size:11.5px;font-weight:400;color:var(--ink-mut); }
/* Puntos de la tarjeta, en el espacio de la derecha de cada caja: el
   operador ve de un golpe qué viene en ese momento y cuántos min tiene */
.cns-box-side{
  display:flex;min-width:0;align-items:center;justify-content:flex-end;gap:12px;
}
.cns-box-puntos{
  display:flex;flex-direction:column;gap:1px;min-width:0;max-width:300px;
}
.cns-box-punto{
  display:flex;align-items:center;gap:6px;min-width:0;
  font-size:11px;line-height:1.45;color:var(--ink-mut);
}
.cns-box-punto::before{
  content:"";width:4.5px;height:4.5px;flex:none;border-radius:999px;background:var(--oro);
}
.cns-box-punto > span{ overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.cns-box-punto-mas{ font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--oro); }
.cns-box-punto-mas::before{ display:none; }
.cns-box-now .cns-box-punto{ color:var(--ink-2); }
.cns-minchip{
  flex:none;font-family:'Roboto Mono',ui-monospace,monospace;font-size:11px;font-weight:700;
  color:var(--marron);background:var(--paper);border:1px solid #E0D5BE;border-radius:999px;
  padding:3px 9px;white-space:nowrap;
}
.cns-box-now .cns-minchip{ background:#F6EFDD;border-color:var(--oro-lt);color:#7A5A28; }
@media (max-width:880px){
  .cns-box{ grid-template-columns:auto minmax(0,1fr) auto; }
  .cns-box-side{ display:none; }
}
.cns-tipo{
  display:inline-flex;align-items:center;border-radius:999px;
  padding:2.5px 9px;font-size:9.5px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;border:1px solid;
  white-space:nowrap;
}
.cns-tipo-inicio{ background:#F6EFDD;border-color:#E0CFA8;color:#7A5A28; }
.cns-tipo-sermon{ background:#F0E7DA;border-color:#D8C4A8;color:#5C4327; }
.cns-tipo-ninos{ background:#EBEFE3;border-color:#C9D4BA;color:#4E6647; }
.cns-tipo-general{ background:#F3EFE6;border-color:#DED4C0;color:#6B5844; }
.cns-connector{ position:relative;height:34px; }
.cns-connector::before{
  content:"";position:absolute;left:28px;top:2px;bottom:2px;width:2px;
  border-radius:2px;background:#DCD0B6;
}
.cns-connector-pill{
  position:absolute;left:28px;top:50%;transform:translate(-50%,-50%);z-index:1;
  display:inline-flex;align-items:center;
  background:var(--card);border:1px solid #E0D5BE;border-radius:999px;
  padding:3px 10px;
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;
  color:var(--marron);box-shadow:0 1px 3px rgba(90,70,40,.10);white-space:nowrap;
}
.cns-box-add{
  display:flex;align-items:center;justify-content:center;gap:8px;
  border-radius:14px;border:1.5px dashed #D3C5A8;background:transparent;
  padding:12px 14px;margin-top:2px;
  font-size:12.5px;font-weight:700;color:var(--ink-mut);
  transition:border-color .25s ease-in-out,color .25s ease-in-out,background .25s ease-in-out;
}
.cns-box-add:hover{ border-color:var(--oro);color:var(--marron);background:var(--oro-dim); }

/* ── Franja horaria a la par del orden ── */
.cns-franja{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;
  border:1px solid var(--line);background:var(--paper);
  border-radius:12px;padding:8px 12px;margin:4px 12px 0;
}
.cns-franja-lab{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  letter-spacing:.10em;text-transform:uppercase;color:var(--ink-mut);
  white-space:nowrap;
}
.cns-franja-lab b{ color:var(--ink-2);font-weight:700;letter-spacing:0; }
.cns-franja input{
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:12px;color:var(--ink);
  height:28px;width:88px;padding:0 6px;background:#FFFFFF;
}
.cns-franja input:focus{
  outline:none;border-color:#C9B68C;box-shadow:0 0 0 3px rgba(176,141,87,.20);
}
.cns-hora{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  font-family:'Roboto Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;
  color:#A3823F;white-space:nowrap;
}
.cns-hora small{
  font-size:8.5px;font-weight:900;letter-spacing:.12em;color:var(--marron);
}
.cns-hora-now span{ color:var(--marron); }
.cns-fin{
  display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;
  border:1px solid var(--line);background:var(--card-soft);
  border-radius:14px;padding:10px 14px;
}
.cns-fin-titulo{
  font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;
  color:var(--ink);
}

/* ── Menú de los tres puntitos ── */
.cns-menu{
  position:absolute;top:calc(100% + 4px);right:2px;z-index:60;min-width:168px;
  width:max-content;max-width:min(260px,92vw);
  border-radius:12px;border:1px solid #E0D5BE;background:#FFFFFF;
  box-shadow:0 18px 40px rgba(60,45,25,.20);
  padding:4px;display:flex;flex-direction:column;
}
.cns-menu button{
  display:block;border-radius:8px;padding:7px 10px;
  font-size:12.5px;font-weight:700;color:var(--ink-2);text-align:left;
}
.cns-menu button:hover{ background:var(--paper-2);color:#5C4327; }
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
  font-family:'Lato',system-ui,sans-serif;font-size:10px;font-weight:900;
  letter-spacing:.3em;text-transform:uppercase;color:#A3823F;text-align:center;
}
.cns-kbd{
  display:inline-block;font-family:'Roboto Mono',ui-monospace,monospace;font-size:10px;
  border:1px solid #E0D5BE;border-bottom-width:2px;border-radius:5px;
  padding:1px 6px;background:#FAF6EC;color:var(--ink-2);
}
.cns-alert-danger{
  display:flex;gap:10px;align-items:flex-start;border-radius:12px;
  border:1px solid rgba(176,69,47,.35);background:#F9EDE8;
  padding:12px 14px;font-size:13px;color:#7C3A26;
}

/* ── Campos ── */
.cns .cns-in, .cns-modal .cns-in{
  background:#FFFFFF;border:1px solid #DCD2BE;
  color:var(--ink) !important;border-radius:10px;
}
.cns .cns-in::placeholder, .cns-modal .cns-in::placeholder{ color:#A89878; }
.cns .cns-in:focus-visible, .cns-modal .cns-in:focus-visible,
.cns .cns-in:focus, .cns-modal .cns-in:focus{
  border-color:#C9B68C;box-shadow:0 0 0 3px rgba(176,141,87,.20);
}
.cns button[role="switch"], .cns-modal button[role="switch"]{
  border-color:#DCD2BE;
}
.cns button[role="switch"][data-state="unchecked"],
.cns-modal button[role="switch"][data-state="unchecked"]{
  background:#DDD3BC !important;border-color:#CFC3A8 !important;
}
.cns button[role="switch"][data-state="checked"],
.cns-modal button[role="switch"][data-state="checked"]{
  background:var(--marron) !important;border-color:var(--marron) !important;
}
.cns button[role="switch"] > span, .cns-modal button[role="switch"] > span{
  background:#FFFFFF !important;
}
.cns button[role="switch"][data-state="checked"] > span,
.cns-modal button[role="switch"][data-state="checked"] > span{
  background:#FFFFFF !important;
}

/* ── Modales y desplegables (se renderizan fuera de .cns, en un portal) ── */
.cns-modal{
  background:linear-gradient(180deg,#FFFFFF,#FBF7EE);
  border:1px solid #E0D5BE;color:var(--ink);border-radius:16px;
  box-shadow:0 30px 70px rgba(60,45,25,.30);
}
.cns-modal label{ color:var(--ink-2) !important;font-weight:700; }
.cns-modal .text-muted-foreground{ color:var(--ink-mut) !important; }
.cns-modal [data-slot="dialog-close"], .cns-modal button.dialog-close{ color:var(--ink-mut); }
.cns-pop{
  background:#FFFFFF;border:1px solid #E0D5BE;border-radius:12px;
  color:var(--ink);box-shadow:0 18px 40px rgba(60,45,25,.20);
  font-family:'Lato','Segoe UI',system-ui,sans-serif;
}
.cns-pop [role="option"]{ color:var(--ink-2) !important; }
.cns-pop [role="option"][data-highlighted]{ background:var(--paper-2);color:#5C4327; }

/* ── Detalles ── */
.cns-sep{ height:1px;background:var(--line-soft); }
.cns-note{
  border:1px solid var(--line);background:var(--paper);
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

/* ──────────── Tipo de momento (deducido del título) ──────────── */

/** Etiqueta del bloque al que pertenece el momento, deducida del título:
    inicio, escuela sabática, sermón de niños, sermón (adultos), alabanza,
    ofrenda, oración, avisos… Sirve para distinguir de un golpe de vista
    las partes del culto en el orden vertical. */
function tipoDeMomento(titulo: string): { label: string; tone: string } {
  const t = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/nin[oa]/.test(t)) {
    return /sermon|predic|mensaje|palabra|reflexion/.test(t)
      ? { label: "Sermón niños", tone: "cns-tipo-ninos" }
      : { label: "Niños", tone: "cns-tipo-ninos" };
  }
  if (/sermon|predic|mensaje|palabra|reflexion/.test(t)) {
    return { label: "Sermón adultos", tone: "cns-tipo-sermon" };
  }
  if (/escuela/.test(t)) return { label: "Escuela sabática", tone: "cns-tipo-inicio" };
  if (/inicio|bienvenida|entrada|apertura|intro/.test(t)) {
    return { label: "Inicio", tone: "cns-tipo-inicio" };
  }
  if (/alabanz|adoracion|himno|canto|musica/.test(t)) {
    return { label: "Alabanza", tone: "cns-tipo-general" };
  }
  if (/ofrend/.test(t)) return { label: "Ofrenda", tone: "cns-tipo-general" };
  if (/oracion/.test(t)) return { label: "Oración", tone: "cns-tipo-general" };
  if (/aviso|anunci/.test(t)) return { label: "Avisos", tone: "cns-tipo-general" };
  if (/bendic/.test(t)) return { label: "Bendición", tone: "cns-tipo-general" };
  return { label: "Momento", tone: "cns-tipo-general" };
}

/* ────────────────── Franja horaria (utilidades) ────────────────── */

/** "09:30" → 570 (minutos desde medianoche); null si el dato no es válido. */
function minDeHora(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 570 → "09:30" (da la vuelta a las 24 h si el culto cruza medianoche). */
function fmtHora(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Un programa guardado: los momentos de un tipo de culto con su franja horaria. */
type ProgramaGuardado = {
  id: string;
  nombre: string;
  inicio: string;
  limite: string;
  segments: Segment[];
  creado: number;
};

export default function PanelView() {
  const { state, mutate, peerOnline } = useShowChannel("panel");
  const now = useNow(500);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const [menuIdx, setMenuIdx] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  /* Franja horaria: hora de inicio y límite (se guarda en este navegador) */
  const [franja, setFranja] = useState({ inicio: "09:30", limite: "12:00" });
  useEffect(() => {
    try {
      const raw = localStorage.getItem("culto-franja-v1");
      if (raw) {
        const p = JSON.parse(raw) as { inicio?: string; limite?: string };
        if (typeof p.inicio === "string" && typeof p.limite === "string") {
          setFranja({ inicio: p.inicio, limite: p.limite });
        }
      }
    } catch {
      /* sin datos guardados: quedan los valores por defecto */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("culto-franja-v1", JSON.stringify(franja));
    } catch {
      /* almacenamiento no disponible: la franja solo vive en esta sesión */
    }
  }, [franja]);

  /* Programas guardados: cada tipo de culto (mañana, evangelismo, jóvenes,
     oración…) con sus momentos y su franja horaria predefinida */
  const [programas, setProgramas] = useState<ProgramaGuardado[]>([]);
  const [progOpen, setProgOpen] = useState(false);
  const [progNombre, setProgNombre] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("culto-programas-v1");
      if (raw) {
        const arr = JSON.parse(raw) as ProgramaGuardado[];
        if (Array.isArray(arr)) {
          setProgramas(
            arr.filter(
              (p) =>
                p &&
                typeof p.id === "string" &&
                typeof p.nombre === "string" &&
                Array.isArray(p.segments),
            ),
          );
        }
      }
    } catch {
      /* sin programas guardados: la lista arranca vacía */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("culto-programas-v1", JSON.stringify(programas));
    } catch {
      /* almacenamiento no disponible: los programas solo viven en esta sesión */
    }
  }, [programas]);

  /* ── Nube: los programas también se guardan en un servidor, con un
        código de sincronización. Así la lista no queda atrapada en una
        computadora: en otra máquina se pega el mismo código y aparecen
        los mismos programas. Sin internet, queda la copia local. ── */
  const NUBE_URL = "https://textdb.dev/api/data/";
  const NUBE_LSK = "culto-nube-v1";
  const [nubeCodigo, setNubeCodigo] = useState<string | null>(null);
  const [nubeEstado, setNubeEstado] = useState<
    "ok" | "conectando" | "sinconexion" | "local"
  >("local");
  const [nubeEntrada, setNubeEntrada] = useState("");
  const nubeCodigoRef = useRef<string | null>(null);

  const validarProgramas = (arr: unknown): ProgramaGuardado[] =>
    Array.isArray(arr)
      ? arr.filter(
          (p): p is ProgramaGuardado =>
            !!p &&
            typeof (p as ProgramaGuardado).id === "string" &&
            typeof (p as ProgramaGuardado).nombre === "string" &&
            Array.isArray((p as ProgramaGuardado).segments),
        )
      : [];

  const pushANube = async (codigo: string, lista: ProgramaGuardado[]) => {
    setNubeEstado("conectando");
    try {
      await fetch(`${NUBE_URL}${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ app: "culto-tiempos", v: 1, programas: lista }),
      });
      setNubeEstado("ok");
    } catch {
      setNubeEstado("sinconexion");
    }
  };

  const cargarDeNube = async (codigo: string): Promise<boolean> => {
    setNubeEstado("conectando");
    try {
      const r = await fetch(`${NUBE_URL}${encodeURIComponent(codigo)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = (await r.text()).trim();
      if (!txt) {
        /* Código nuevo, todavía vacío en el servidor: se sube lo que haya acá */
        setNubeEstado("ok");
        const local = validarProgramas(
          (() => {
            try {
              return JSON.parse(localStorage.getItem("culto-programas-v1") ?? "[]");
            } catch {
              return [];
            }
          })(),
        );
        if (local.length > 0) await pushANube(codigo, local);
        return true;
      }
      const data = JSON.parse(txt) as { programas?: unknown };
      if (Array.isArray(data?.programas)) {
        setProgramas(validarProgramas(data.programas));
      }
      setNubeEstado("ok");
      return true;
    } catch {
      setNubeEstado("sinconexion");
      return false;
    }
  };

  /* Primer código propio: se genera acá, queda en el navegador y en la
     dirección de la página (?nube=…) para poder copiarla a otra compu */
  const asegurarCodigoNube = (): string => {
    let codigo = nubeCodigoRef.current;
    if (!codigo) {
      codigo = `culto-${Math.random().toString(36).slice(2, 8)}${Date.now()
        .toString(36)
        .slice(-4)}`;
      nubeCodigoRef.current = codigo;
      try {
        localStorage.setItem(NUBE_LSK, codigo);
      } catch {
        /* sin localStorage: el código vive en esta sesión */
      }
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("nube", codigo);
        window.history.replaceState(null, "", u);
      } catch {
        /* la dirección no es crítica */
      }
      setNubeCodigo(codigo);
    }
    return codigo;
  };

  /* Al abrir la página: si hay código (en la dirección o en este navegador),
     se trae del servidor la lista guardada */
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const deUrl = u.searchParams.get("nube");
      const guardado = localStorage.getItem(NUBE_LSK);
      const codigo = (deUrl || guardado || "").trim();
      if (!codigo) return;
      localStorage.setItem(NUBE_LSK, codigo);
      nubeCodigoRef.current = codigo;
      setNubeCodigo(codigo);
      if (!deUrl) {
        u.searchParams.set("nube", codigo);
        window.history.replaceState(null, "", u);
      }
      void cargarDeNube(codigo);
    } catch {
      /* sin URL o sin almacenamiento: queda el guardado local */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectarNube = async () => {
    const codigo = nubeEntrada.trim();
    if (!codigo) return;
    nubeCodigoRef.current = codigo;
    setNubeCodigo(codigo);
    setNubeEntrada("");
    try {
      localStorage.setItem(NUBE_LSK, codigo);
    } catch {
      /* sin localStorage: el código vive en esta sesión */
    }
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("nube", codigo);
      window.history.replaceState(null, "", u);
    } catch {
      /* la dirección no es crítica */
    }
    await cargarDeNube(codigo);
  };

  const copiarNubeCodigo = async () => {
    const codigo = nubeCodigoRef.current;
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      window.prompt("Copiá el código de la nube:", codigo);
    }
  };

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Auto-scroll del orden del culto: centra el momento en curso */
  const currentChipRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    currentChipRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "center",
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

  /* ─────────────── Programas guardados por tipo de culto ─────────────── */

  const guardarPrograma = () => {
    const nombre = progNombre.trim();
    if (!nombre) return;
    const lista: ProgramaGuardado[] = [
      {
        id: uid(),
        nombre,
        inicio: franja.inicio,
        limite: franja.limite,
        segments: state.segments.map((x) => ({ ...x, bullets: [...x.bullets] })),
        creado: Date.now(),
      },
      ...programas.filter((y) => y.nombre.toLowerCase() !== nombre.toLowerCase()),
    ];
    setProgramas(lista);
    setProgNombre("");
    /* El guardado viaja al servidor: si todavía no hay código, se genera uno */
    void pushANube(asegurarCodigoNube(), lista);
  };

  const cargarPrograma = (pr: ProgramaGuardado) => {
    const arr = pr.segments.map((x, i) => ({
      ...x,
      id: uid(),
      bullets: [...x.bullets],
      color: (x.color || COLOR_KEYS[i % COLOR_KEYS.length]) as ColorKey,
    }));
    mutate((p) => ({ ...resetService(p), segments: arr }));
    setFranja({ inicio: pr.inicio, limite: pr.limite });
    setProgOpen(false);
  };

  const borrarPrograma = (id: string) => {
    if (window.confirm("¿Eliminar este programa guardado?")) {
      const lista = programas.filter((y) => y.id !== id);
      setProgramas(lista);
      if (nubeCodigoRef.current) void pushANube(nubeCodigoRef.current, lista);
    }
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

  /* ── Franja horaria: hora de cada momento, fin planificado y margen ── */
  const enMarcha = state.currentIndex >= 0 && state.status !== "finished";
  const inicioMin = minDeHora(franja.inicio) ?? 570; // 09:30 si falta el dato
  const limiteMin = minDeHora(franja.limite) ?? 720; // 12:00 si falta el dato
  const inicios = useMemo(() => {
    const arr: number[] = [];
    let acc = inicioMin;
    for (const x of state.segments) {
      arr.push(acc);
      acc += x.minutes;
    }
    return arr;
  }, [state.segments, inicioMin]);
  const finPlanMin = inicioMin + totalMin;
  const margen = limiteMin - finPlanMin;
  const ahoraDate = now > 0 ? new Date(now) : null;
  const ahoraTxt = ahoraDate
    ? `${String(ahoraDate.getHours()).padStart(2, "0")}:${String(
        ahoraDate.getMinutes(),
      ).padStart(2, "0")}`
    : "--:--";
  const finEstMin =
    ahoraDate && enMarcha
      ? ahoraDate.getHours() * 60 + ahoraDate.getMinutes() + plannedRemain
      : null;
  const franjaEstado = (() => {
    const base = enMarcha && finEstMin !== null ? limiteMin - finEstMin : margen;
    if (base < 0) {
      return {
        text: `Te pasás ${-base} min del límite`,
        pill: "cns-pill-danger",
        led: "cns-led cns-led-blink",
      };
    }
    if (base <= 10) {
      return {
        text: `Margen ajustado: ${base} min`,
        pill: "cns-pill-warn",
        led: "cns-led cns-led-warn",
      };
    }
    return {
      text: `Margen ${base} min`,
      pill: "cns-pill-ok",
      led: "cns-led cns-led-ok",
    };
  })();

  const editingSeg = state.segments.find((x) => x.id === editingId) ?? null;

  /* Estado del guardado en el servidor, para la píldora de Programas */
  const nubePill =
    nubeEstado === "ok"
      ? "cns-pill-ok"
      : nubeEstado === "conectando"
        ? "cns-pill-warn"
        : nubeEstado === "sinconexion"
          ? "cns-pill-danger"
          : "cns-pill-dim";
  const nubeLed =
    nubeEstado === "ok"
      ? "cns-led cns-led-ok"
      : nubeEstado === "conectando"
        ? "cns-led"
        : nubeEstado === "sinconexion"
          ? "cns-led cns-led-blink"
          : "cns-led";
  const nubeTexto =
    nubeEstado === "ok"
      ? "En el servidor"
      : nubeEstado === "conectando"
        ? "Sincronizando…"
        : nubeEstado === "sinconexion"
          ? "Sin conexión: solo esta compu"
          : "Solo en esta compu";

  const counterColor =
    phase === "overtime"
      ? "text-[#B0452F]"
      : phase === "warning"
        ? "text-[#B98A2F]"
        : "text-[#241E16]";

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
        <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(330px,380px)]">
          {/* ═══ Orden del culto: cajas grandes en vertical; entre bloque y
                 bloque, el lapso en minutos como conector ═══ */}
          <section className="cns-panel cns-rise order-2 flex min-h-0 flex-col lg:order-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-2.5">
              <div className="cns-eyebrow">Programa</div>
              <h2 className="cns-h2 text-base">Orden del culto</h2>
              <p className="cns-sub min-w-0 flex-1 truncate">
                {state.segments.length} momentos · {fmtMin(totalMin)} · un clic salta
                al momento · doble clic lo edita
              </p>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="cns-btn-ghost h-7 shrink-0 text-xs"
                  title="Guardar los tiempos de este culto con un nombre y cargar otros programas guardados"
                  aria-label="Programas guardados"
                  onClick={() => setProgOpen(true)}
                >
                  <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" /> Programas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cns-btn-ghost h-7 shrink-0 text-xs"
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
            </div>
            {/* Franja horaria: la hora real a la par del programa */}
            <div className="cns-franja mt-1.5">
              <Clock
                className="h-3.5 w-3.5 shrink-0 text-[#A3823F]"
                aria-hidden="true"
              />
              <span className="cns-franja-lab">Franja horaria</span>
              <label className="flex items-center gap-1.5">
                <span className="cns-franja-lab">Inicio</span>
                <input
                  type="time"
                  className="cns-in"
                  value={franja.inicio}
                  aria-label="Hora de inicio del culto"
                  onChange={(e) =>
                    setFranja((f) => ({ ...f, inicio: e.target.value || f.inicio }))
                  }
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="cns-franja-lab">Límite</span>
                <input
                  type="time"
                  className="cns-in"
                  value={franja.limite}
                  aria-label="Hora límite del culto"
                  onChange={(e) =>
                    setFranja((f) => ({ ...f, limite: e.target.value || f.limite }))
                  }
                />
              </label>
              <span
                className="cns-franja-lab"
                title="Hora en que termina el culto según el programa"
              >
                Fin <b>{fmtHora(finPlanMin)}</b>
              </span>
              {enMarcha && finEstMin !== null ? (
                <span
                  className="cns-franja-lab"
                  title="Hora en que terminarías si seguís así: hora actual + lo que queda"
                >
                  Fin est. <b>{fmtHora(finEstMin)}</b>
                </span>
              ) : null}
              <span className="cns-franja-lab">
                Ahora <b>{ahoraTxt}</b>
              </span>
              <span className={cn("cns-pill ml-auto", franjaEstado.pill)}>
                <span className={franjaEstado.led} /> {franjaEstado.text}
              </span>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5 pb-3 pt-2.5">
              <div className="flex flex-col">
                {state.segments.map((x, i) => {
                  const isCurrent =
                    i === state.currentIndex && state.status !== "finished";
                  const isDone = state.currentIndex >= 0 && i < state.currentIndex;
                  const tipo = tipoDeMomento(x.title);
                  return (
                    <Fragment key={x.id}>
                      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-2.5">
                        <div
                          className={cn(
                            "cns-hora",
                            isCurrent && "cns-hora-now",
                            isDone && "cns-box-done",
                          )}
                          aria-hidden="true"
                        >
                          <span>{fmtHora(inicios[i])}</span>
                          {isCurrent ? <small>AHORA {ahoraTxt}</small> : null}
                        </div>
                        <div
                          ref={isCurrent ? currentChipRef : undefined}
                          onClick={() => {
                            if (i !== state.currentIndex) mutate((p) => jumpTo(p, i));
                            setMenuIdx(null);
                          }}
                          onDoubleClick={() => setEditingId(x.id)}
                          title="Un clic: saltar a este momento · doble clic: editarlo"
                          className={cn(
                            "cns-box",
                            isCurrent && "cns-box-now",
                            isDone && "cns-box-done",
                          )}
                        >
                          <span className="cns-box-num">{i + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="cns-box-title block truncate">
                              {x.title}
                            </span>
                            <span className="mt-1 flex min-w-0 items-center gap-2">
                              <span className={cn("cns-tipo", tipo.tone)}>
                                {tipo.label}
                              </span>
                              {x.speaker ? (
                                <span className="cns-box-speaker truncate">
                                  {x.speaker}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          {/* A la derecha: los puntos de este momento (lo que
                              viene) y cuántos minutos dispone */}
                          <span className="cns-box-side">
                            {x.bullets.length > 0 ? (
                              <span className="cns-box-puntos">
                                {x.bullets.slice(0, 3).map((b, j) => (
                                  <span key={j} className="cns-box-punto">
                                    <span>{b}</span>
                                  </span>
                                ))}
                                {x.bullets.length > 3 ? (
                                  <span className="cns-box-punto cns-box-punto-mas">
                                    +{x.bullets.length - 3} puntos más
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                            <span className="cns-minchip">{x.minutes} min</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Más opciones de ${x.title}`}
                            title="Más opciones"
                            className="cns-icobtn grid h-8 w-8 shrink-0 place-items-center rounded-lg"
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
                      </div>
                      {/* El lapso hasta el próximo bloque: los minutos de este
                          momento, como conector de la línea de tiempo */}
                      <div className="cns-connector" aria-hidden="true">
                        <span className="cns-connector-pill">{x.minutes} min</span>
                      </div>
                    </Fragment>
                  );
                })}
                {/* Fin del culto según la franja horaria */}
                <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-2.5">
                  <div className="cns-hora" aria-hidden="true">
                    <span>{fmtHora(finPlanMin)}</span>
                  </div>
                  <div className="cns-fin">
                    <span className="cns-fin-titulo">Fin del culto</span>
                    <span className="cns-sub">
                      Límite {franja.limite} · Ahora {ahoraTxt}
                    </span>
                    <span className={cn("cns-pill ml-auto", franjaEstado.pill)}>
                      <span className={franjaEstado.led} /> {franjaEstado.text}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSegment}
                  aria-label="Agregar momento"
                  className="cns-box-add shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Agregar momento
                </button>
              </div>
            </div>
          </section>

          {/* ═══ Columna derecha: mesa de control + mensajes ═══ */}
          <div className="order-1 flex min-h-0 flex-col gap-2.5 overflow-y-auto scrollbar-thin lg:order-2">
            {/* ── Mesa de control: el momento en curso ── */}
            <section
              className={cn(
                "cns-panel cns-rise shrink-0",
                active && "cns-panel-active",
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
                        planificados · {fmtHora(inicioMin)} → {fmtHora(finPlanMin)}
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

                    {/* Medidor de avance */}
                    <Progress
                      value={totalMs > 0 ? Math.min(100, (elapsed / totalMs) * 100) : 0}
                      className={cn(
                        "mt-2 h-1.5 bg-[#EDE4D0]",
                        phase === "overtime"
                          ? "[&>div]:bg-[#B0452F]"
                          : phase === "warning"
                            ? "[&>div]:bg-[#C08A2E]"
                            : "[&>div]:bg-[#7A5A3A]",
                      )}
                    />
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-center font-mono text-muted-foreground">
                      <div className="min-w-0">
                        <div className="text-[9px] tracking-[0.14em]">
                          TRANSCURRIDO
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#4A3E30]">
                          {fmtHMS(Math.floor(elapsed / 1000))}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] tracking-[0.14em]">
                          RESTANTE CULTO
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#4A3E30]">
                          {fmtMin(plannedRemain)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] tracking-[0.14em]">
                          PLANIFICADO
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold text-[#4A3E30]">
                          {seg?.minutes} MIN
                        </div>
                      </div>
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

                    {/* Controles de la consola: dos filas compactas */}
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
                        className="cns-btn-line h-9 min-w-0 flex-1 text-xs"
                        onClick={doAdvance}
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />{" "}
                        Siguiente
                      </Button>
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 min-w-0 flex-1 justify-center"
                        title="Reiniciar el cronómetro de este momento (R)"
                        aria-label="Reiniciar el cronómetro de este momento"
                        onClick={doReset}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 min-w-0 flex-1 justify-center"
                        title="Momento anterior"
                        aria-label="Momento anterior"
                        onClick={doBack}
                      >
                        <SkipBack className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 min-w-0 flex-[1.4] justify-center text-xs"
                        title="Restar 1 minuto al momento"
                        onClick={() => adjustMinutes(-1)}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" /> 1 min
                      </Button>
                      <Button
                        variant="ghost"
                        className="cns-btn-ghost h-9 min-w-0 flex-[1.4] justify-center text-xs"
                        title="Sumar 1 minuto al momento"
                        onClick={() => adjustMinutes(1)}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 1 min
                      </Button>
                    </div>

                    {seg && seg.cards ? (
                      <div className="mt-3 space-y-2 rounded-xl border-2 border-dashed border-[rgba(176,141,87,0.45)] bg-[rgba(176,141,87,0.08)] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A6A30]">
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
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#DCD2BE] bg-[#F6F1E6] p-2.5">
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

      {/* Programas guardados: cada tipo de culto con sus tiempos */}
      <Dialog open={progOpen} onOpenChange={setProgOpen}>
        <DialogContent className="cns-modal max-w-lg">
          <DialogHeader>
            <DialogTitle>Programas guardados</DialogTitle>
            <DialogDescription>
              Guardá los tiempos de cada tipo de culto (mañana, evangelismo, jóvenes,
              oración…) y cargalos cuando quieras: después los ajustás en vivo. Todo
              viaja a un <b>servidor</b>: con el código, la misma lista aparece en
              cualquier computadora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="prog-nombre" className="text-xs">
                  Guardar el programa actual como
                </Label>
                <Input
                  id="prog-nombre"
                  className="cns-in"
                  value={progNombre}
                  placeholder="Ej.: Culto joven"
                  onChange={(e) => setProgNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") guardarPrograma();
                  }}
                />
              </div>
              <Button
                className="cns-btn-gold h-9 shrink-0"
                onClick={guardarPrograma}
              >
                <Save className="h-4 w-4" aria-hidden="true" /> Guardar
              </Button>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Se guarda con la franja horaria actual (Inicio {franja.inicio} · Límite{" "}
              {franja.limite}) y los {state.segments.length} momentos de la lista, con
              sus puntos. Si guardás con un nombre que ya existe, lo reemplaza.
            </p>
            {/* Guardado en el servidor: código de sincronización entre computadoras */}
            <div
              className="space-y-2 rounded-xl border p-2.5"
              style={{ borderColor: "rgba(180,160,120,.35)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Guardado en el servidor</Label>
                <span className={cn("cns-pill", nubePill)}>
                  <span className={nubeLed} /> {nubeTexto}
                </span>
              </div>
              {nubeCodigo ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Código de esta lista:
                  </span>
                  <code className="cns-kbd">{nubeCodigo}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cns-btn-line h-7 text-xs"
                    onClick={() => void copiarNubeCodigo()}
                  >
                    Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Cuando guardes el primer programa se genera el código; anotalo para
                  la otra computadora.
                </p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  className="cns-in h-9 min-w-0 flex-1"
                  value={nubeEntrada}
                  placeholder="¿En otra compu? Pegá acá el código…"
                  aria-label="Código de la nube para conectar"
                  onChange={(e) => setNubeEntrada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void conectarNube();
                  }}
                />
                <Button
                  size="sm"
                  className="cns-btn-gold h-9 shrink-0"
                  disabled={!nubeEntrada.trim()}
                  onClick={() => void conectarNube()}
                >
                  Conectar
                </Button>
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Cada vez que guardás o borrás un programa, el cambio va al servidor
                enseguida. En otra computadora: abrí esta página, tocá{" "}
                <b>Programas</b>, pegá el mismo código y tocá <b>Conectar</b> —
                aparece la misma lista. Si no hay internet, queda guardado en esta
                computadora nomás.
              </p>
            </div>
            <div className="cns-sep" />
            {programas.length === 0 ? (
              <p className="cns-sub">
                Todavía no guardaste ningún programa. Configurá los momentos y las
                horas, ponle un nombre arriba y tocá <b>Guardar</b>.
              </p>
            ) : (
              <ul className="space-y-2">
                {programas.map((pr) => {
                  const total = pr.segments.reduce((a, x) => a + x.minutes, 0);
                  const ini = minDeHora(pr.inicio) ?? 570;
                  return (
                    <li
                      key={pr.id}
                      className="flex items-center justify-between gap-2 rounded-xl border p-2.5"
                      style={{ borderColor: "rgba(180,160,120,.35)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#241E16]">
                          {pr.nombre}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {pr.segments.length} momentos · {fmtMin(total)} ·{" "}
                          {fmtHora(ini)} → {fmtHora(ini + total)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cns-btn-line h-8 text-xs"
                          onClick={() => {
                            const enCurso = state.status !== "idle";
                            if (
                              window.confirm(
                                `¿Cargar el programa “${pr.nombre}”? Se reemplazan los momentos actuales${
                                  enCurso ? " y el contador se reinicia" : ""
                                }.`,
                              )
                            ) {
                              cargarPrograma(pr);
                            }
                          }}
                        >
                          Cargar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="cns-icobtn h-8 w-8 shrink-0"
                          aria-label={`Eliminar el programa ${pr.nombre}`}
                          title="Eliminar este programa"
                          onClick={() => borrarPrograma(pr.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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

      <div className="flex items-start justify-between gap-2 rounded-lg border p-2.5" style={{ borderColor: "rgba(180,160,120,.35)" }}>
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
              className="text-[#B0452F] hover:text-[#B0452F]"
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
            Volvé a esta ventana y manejá el culto desde el <b>orden del culto</b> en
            vertical: la lista se <b>desplaza con la rueda del mouse</b>, un{" "}
            <b>clic</b> salta a un momento y un <b>doble clic</b> lo edita (también
            con los <b>tres puntitos</b>). Entre bloque y bloque se ve el{" "}
            <b>lapso en minutos</b> de cada momento, como conectores de la línea de
            tiempo, y cada caja muestra a la derecha <b>los puntos</b> de ese momento
            y <b>cuántos minutos</b> dispone. Mensajes al orador en la columna de la
            derecha.
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
          <li>
            · La <b>franja horaria</b> arriba del orden del culto: poné la{" "}
            <b>hora de inicio</b> (ej. 9:30) y la <b>hora límite</b> (ej. 12:00).
            Cada momento muestra su horario al costado y la píldora te avisa el{" "}
            <b>margen</b> que te queda — o si te pasás del límite — mientras
            ajustás los minutos.
          </li>
          <li>
            · El botón <b>Programas</b> guarda los tiempos de cada tipo de culto{" "}
            (mañana, evangelismo, jóvenes, oración): configurá los momentos y las
            horas, guardalo con un nombre y cargalo cuando lo necesites. Siempre
            queda editable: cambiás minutos y horas igual que antes.
          </li>
          <li>
            · Los programas se guardan <b>en el servidor</b>, no solo en la compu:{" "}
            <b>Programas</b> te da un <b>código</b>. En otra computadora abrí la
            página, tocá <b>Programas</b>, pegá el código y <b>Conectar</b>: aparece
            la misma lista, lista para ajustar.
          </li>
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
            · El contador pasa de claro a ámbar en los minutos finales y a rojo
            cuando se cumple el tiempo.
          </li>
          <li>
            · Los puntos y los minutos de cada momento también quedan guardados con
            cada programa. Los datos de la pantalla van de una ventana a la otra; si
            no hay internet, lo último queda en este navegador.
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
