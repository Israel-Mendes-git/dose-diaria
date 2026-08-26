import dates from "../data/dates.json";
import type { CommemorativeDate, DatesDataset } from "../types";

const dataset = dates as DatesDataset;

const TYPE_LABELS: Record<CommemorativeDate["type"], string> = {
  nacional: "Nacional",
  mundial: "Mundial",
  curiosidade: "Curiosidade",
};

function resolveTargetDate(): Date {
  const override = new URLSearchParams(window.location.search).get("data");
  if (override && /^\d{2}-\d{2}$/.test(override)) {
    const [month, day] = override.split("-").map(Number);
    const today = new Date();
    return new Date(today.getFullYear(), month - 1, day);
  }
  return new Date();
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function formatFullDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderHeader(target: Date): HTMLElement {
  const header = element("header", "header");
  header.append(
    element("p", "header__eyebrow", "Hoje é dia de..."),
    element("h1", "header__date", formatFullDate(target)),
  );
  return header;
}

function renderEntry(entry: CommemorativeDate): HTMLElement {
  const item = element("li", `entry entry--${entry.type}`);
  item.append(
    element("span", "entry__badge", TYPE_LABELS[entry.type]),
    element("h2", "entry__title", entry.title),
  );
  if (entry.description) {
    item.append(element("p", "entry__description", entry.description));
  }
  return item;
}

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const target = resolveTargetDate();
  const entries = dataset[dateKey(target)] ?? [];

  app.replaceChildren(renderHeader(target));

  if (entries.length > 0) {
    const list = element("ul", "entries");
    list.append(...entries.map(renderEntry));
    app.append(list);
  } else {
    app.append(
      element(
        "p",
        "empty-state",
        "Nenhuma data comemorativa cadastrada por aqui ainda. Mais um motivo pra inventar a sua própria comemoração hoje.",
      ),
    );
  }
}

render();
