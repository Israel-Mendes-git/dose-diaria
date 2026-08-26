import dates from "../data/dates.json";
import type { CommemorativeType, DatesDataset } from "../types";

const dataset = dates as DatesDataset;
const DETAILS_PAGE = "src/details/index.html";
const NOTIFICATION_ID = "hoje-e-dia-de";

// O Firefox honra apenas type, title, message e iconUrl; o resto da API de
// notificações é ignorado em silêncio, e o tempo em tela fica a cargo do
// gerenciador de notificações do sistema. Sobra o texto — que por isso precisa
// caber numa lida rápida, sem depender de a notificação demorar a sumir.
const MAX_ENTRIES = 3;

// Datas nacionais e mundiais vêm antes das curiosidades: quando o dia tem mais
// entradas do que cabe, são elas que o leitor espera ocupando as vagas.
const TYPE_ORDER: Record<CommemorativeType, number> = {
  nacional: 0,
  mundial: 1,
  curiosidade: 2,
};

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function buildMessage(): string {
  const entries = dataset[dateKey(new Date())] ?? [];
  if (entries.length === 0) {
    return "Nenhuma data cadastrada hoje. Bom motivo pra inventar a sua.";
  }

  const ordered = [...entries].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  const shown = ordered.slice(0, MAX_ENTRIES);
  const hidden = entries.length - shown.length;

  const lines = shown.map((entry) => `• ${entry.title}`);
  if (hidden > 0) {
    lines.push(`+ ${hidden} ${hidden === 1 ? "outra" : "outras"} — clique para ver`);
  }
  return lines.join("\n");
}

function notifyToday(): void {
  chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: "Hoje é dia de...",
    message: buildMessage(),
  });
}

chrome.runtime.onStartup.addListener(notifyToday);
chrome.runtime.onInstalled.addListener(notifyToday);

chrome.notifications.onClicked.addListener((id) => {
  if (id !== NOTIFICATION_ID) return;
  chrome.tabs.create({ url: chrome.runtime.getURL(DETAILS_PAGE) });
  chrome.notifications.clear(id);
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL(DETAILS_PAGE) });
});
