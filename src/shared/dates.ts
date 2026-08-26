/**
 * O que a página de detalhes e o popup têm em comum: achar a data de hoje,
 * ler o dataset e formatar o que sai na tela.
 */

import dates from "../data/dates.json";
import type { CommemorativeDate, CommemorativeType, DatesDataset } from "../types";

export const dataset = dates as DatesDataset;

export const TYPE_LABELS: Record<CommemorativeType, string> = {
  nacional: "Nacional",
  mundial: "Mundial",
  curiosidade: "Curiosidade",
};

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function entriesFor(date: Date): CommemorativeDate[] {
  return dataset[dateKey(date)] ?? [];
}

/**
 * A query string `?data=MM-DD` existe para inspecionar outro dia sem mexer no
 * relógio do sistema. Sem ela, vale hoje.
 */
export function resolveTargetDate(search: string): Date {
  const override = new URLSearchParams(search).get("data");
  if (override && /^\d{2}-\d{2}$/.test(override)) {
    const [month, day] = override.split("-").map(Number);
    const today = new Date();
    return new Date(today.getFullYear(), month - 1, day);
  }
  return new Date();
}

export function formatFullDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Versão curta, para o cabeçalho estreito do popup. */
export function formatShortDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
