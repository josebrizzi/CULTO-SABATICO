"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Himnos con música para la liturgia.
 *
 * - La biblioteca (MP3 + letra) se guarda en IndexedDB del navegador: los
 *   archivos del pendrive se cargan UNA vez y quedan guardados en esa compu.
 *   No hace falta ningún servidor ni Firebase.
 * - El panel elige el himno y controla el audio; la pantalla de proyección
 *   (#pantalla) recibe los comandos por BroadcastChannel y reproduce el MP3.
 */

/* ─────────────────────── Biblioteca en IndexedDB ─────────────────────── */

export interface HimnoRegistro {
  id: string;
  numero: number | null;
  titulo: string;
  estrofas: string[];
  blob: Blob;
  nombreArchivo: string;
  duracion: number | null;
}

const DB_NAME = "tiempos-culto-himnos";
const STORE = "himnos";

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txn<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrirDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function listarHimnos(): Promise<HimnoRegistro[]> {
  try {
    const todos = await txn<HimnoRegistro[]>("readonly", (s) => s.getAll());
    return todos.sort((a, b) => {
      const na = a.numero ?? 10000;
      const nb = b.numero ?? 10000;
      if (na !== nb) return na - nb;
      return a.titulo.localeCompare(b.titulo, "es");
    });
  } catch {
    return [];
  }
}

export async function obtenerHimno(id: string): Promise<HimnoRegistro | null> {
  try {
    const r = await txn<HimnoRegistro | undefined>("readonly", (s) => s.get(id));
    return r ?? null;
  } catch {
    return null;
  }
}

async function ponerHimno(h: HimnoRegistro): Promise<void> {
  await txn("readwrite", (s) => s.put(h));
}

export async function borrarHimno(id: string): Promise<void> {
  try {
    await txn("readwrite", (s) => s.delete(id));
  } catch {
    /* ignorar */
  }
}

export async function guardarEstrofas(id: string, estrofas: string[]): Promise<void> {
  const h = await obtenerHimno(id);
  if (!h) return;
  await ponerHimno({ ...h, estrofas });
}

/* ────────────── Nombres de archivo → número y título ────────────── */

export function extraerDeNombre(nombre: string): { numero: number | null; titulo: string } {
  const base = nombre.replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();
  // "001 - Alabad al Señor", "01 Alabad", "Himno 001 - Alabad", "12.mp3"
  const m1 = base.match(/^himno\s*(\d{1,4})\s*[-.)\]]*\s*(.*)$/i);
  const m2 = base.match(/^(\d{1,4})\s*[-.)\]]*\s*(.*)$/);
  const m = m1 ?? m2;
  if (m) {
    const numero = Math.trunc(Number(m[1]));
    const resto = (m[2] || "").replace(/\s*[-_.]\s*$/, "").trim();
    return {
      numero: Number.isFinite(numero) ? numero : null,
      titulo: resto || (Number.isFinite(numero) ? `Himno ${numero}` : base),
    };
  }
  return { numero: null, titulo: base };
}

/** La letra se escribe con estrofas separadas por una línea en blanco. */
export function partirEstrofas(texto: string): string[] {
  return texto
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function juntarEstrofas(estrofas: string[]): string {
  return estrofas.join("\n\n");
}

/* Medir la duración del MP3 al cargarlo (no bloquea: se actualiza después) */
function medirDuracion(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = new Audio();
      const listo = (v: number | null) => {
        URL.revokeObjectURL(url);
        resolve(v);
      };
      a.preload = "metadata";
      a.onloadedmetadata = () => listo(Number.isFinite(a.duration) ? a.duration : null);
      a.onerror = () => listo(null);
      a.src = url;
      window.setTimeout(() => listo(null), 8000);
    } catch {
      resolve(null);
    }
  });
}

let contadorHimno = 0;
export async function agregarHimnoDesdeArchivo(file: File): Promise<HimnoRegistro> {
  const { numero, titulo } = extraerDeNombre(file.name);
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || "audio/mpeg" });
  const reg: HimnoRegistro = {
    id: `h-${Date.now().toString(36)}-${(contadorHimno += 1)}-${Math.random().toString(36).slice(2, 6)}`,
    numero,
    titulo,
    estrofas: [],
    blob,
    nombreArchivo: file.name,
    duracion: null,
  };
  await ponerHimno(reg);
  // Duración aparte: no bloquea la carga de la lista
  medirDuracion(blob).then((d) => {
    if (d !== null) {
      obtenerHimno(reg.id).then((h) => {
        if (h) ponerHimno({ ...h, duracion: d });
      });
    }
  });
  return reg;
}

/* ───────────── Canal de comandos de audio (panel ↔ pantallas) ───────────── */

export type AudioAccion = "play" | "pause" | "stop" | "volume";

export interface AudioCmd {
  accion: AudioAccion;
  himnoId?: string;
  time?: number;
  volume?: number;
}

export interface AudioEstado {
  himnoId: string;
  playing: boolean;
  time: number;
  dur: number | null;
}

type AudioWire =
  | { t: "cmd"; from: string; cmd: AudioCmd }
  | { t: "estado"; from: string; estado: AudioEstado };

const AUDIO_CHANNEL = "culto-audio-v1";

/** Panel: manda un comando de audio a todas las pantallas. */
export function sendAudioCmd(cmd: AudioCmd): void {
  try {
    const ch = new BroadcastChannel(AUDIO_CHANNEL);
    ch.postMessage({ t: "cmd", from: "panel", cmd } satisfies AudioWire);
    ch.close();
  } catch {
    /* canal no disponible */
  }
}

/** Pantalla: reporta el estado del reproductor al panel (fire & forget). */
export function sendAudioEstado(estado: AudioEstado): void {
  try {
    const ch = new BroadcastChannel(AUDIO_CHANNEL);
    ch.postMessage({ t: "estado", from: "stage", estado } satisfies AudioWire);
    ch.close();
  } catch {
    /* canal no disponible */
  }
}

/** Panel: escucha el estado del reproductor que reporta la pantalla. */
export function useAudioEstado(): AudioEstado | null {
  const [estado, setEstado] = useState<AudioEstado | null>(null);
  const lastRef = useRef(0);
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(AUDIO_CHANNEL);
    } catch {
      return;
    }
    ch.onmessage = (ev: MessageEvent<AudioWire>) => {
      const m = ev.data;
      if (!m || typeof m !== "object" || m.t !== "estado") return;
      // Throttle: solo aceptar un estado por segundo para re-render
      if (Date.now() - lastRef.current < 900) return;
      lastRef.current = Date.now();
      setEstado(m.estado);
    };
    return () => {
      if (ch) ch.onmessage = null;
      try {
        ch?.close();
      } catch {
        /* ya cerrado */
      }
    };
  }, []);
  return estado;
}

/**
 * Pantalla (#pantalla): recibe los comandos de audio.
 * Devuelve el último comando pendiente + un flag de gesto del usuario
 * (los navegadores exigen al menos un toque en la página para sonar).
 */
export function useAudioStage(onCmd: (cmd: AudioCmd) => void): boolean {
  const [armado, setArmado] = useState(false);
  const onCmdRef = useRef(onCmd);
  useEffect(() => {
    onCmdRef.current = onCmd;
  }, [onCmd]);

  // Un toque en la página habilita el sonido (política de autoplay)
  useEffect(() => {
    const arm = () => setArmado(true);
    window.addEventListener("pointerdown", arm, { once: false });
    window.addEventListener("keydown", arm, { once: false });
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  // Comandos por canal; si llega un play antes del gesto, se ejecuta al armar
  const pendienteRef = useRef<AudioCmd | null>(null);
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(AUDIO_CHANNEL);
    } catch {
      return;
    }
    ch.onmessage = (ev: MessageEvent<AudioWire>) => {
      const m = ev.data;
      if (!m || typeof m !== "object" || m.t !== "cmd") return;
      if (m.cmd.accion === "play") {
        if (!armado) {
          pendienteRef.current = m.cmd;
          return;
        }
      }
      onCmdRef.current(m.cmd);
    };
    return () => {
      if (ch) ch.onmessage = null;
      try {
        ch?.close();
      } catch {
        /* ya cerrado */
      }
    };
  }, [armado]);

  // Al armarse, ejecutar el play que quedó pendiente
  useEffect(() => {
    if (!armado) return;
    const p = pendienteRef.current;
    if (p) {
      pendienteRef.current = null;
      onCmdRef.current(p);
    }
  }, [armado]);

  return armado;
}
