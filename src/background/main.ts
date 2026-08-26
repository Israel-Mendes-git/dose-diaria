import { entriesFor } from "../shared/dates";
import type { CommemorativeType } from "../types";

const DETAILS_PAGE = "src/details/index.html";
const NOTIFICATION_ID = "hoje-e-dia-de";
const DAILY_ALARM = "virada-do-dia";

// O Firefox honra apenas type, title, message e iconUrl na notificação; o
// resto da API é ignorado em silêncio, e o tempo em tela fica a cargo do
// gerenciador de notificações do sistema. Por isso a notificação só resume, e
// quem mostra a lista inteira é o popup.
const MAX_ENTRIES = 3;

// Datas nacionais e mundiais vêm antes das curiosidades: quando o dia tem mais
// entradas do que cabe, são elas que o leitor espera ocupando as vagas.
const TYPE_ORDER: Record<CommemorativeType, number> = {
  nacional: 0,
  mundial: 1,
  curiosidade: 2,
};

function buildMessage(): string {
  const entries = entriesFor(new Date());
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

/** Selo com quantas datas o dia tem, sobre o ícone da barra de ferramentas. */
async function updateBadge(): Promise<void> {
  const total = entriesFor(new Date()).length;
  await chrome.action.setBadgeText({ text: total > 0 ? String(total) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  // Sem isso o Firefox escolhe sozinho, e em tema claro o branco some.
  await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
}

/**
 * Carimba o dia do mês na folha do calendário, para o ícone dizer a data como
 * um ícone de calendário de verdade. Se qualquer peça faltar — canvas fora de
 * alcance, fonte indisponível — o ícone estático do manifest continua valendo.
 */
async function updateIcon(): Promise<void> {
  try {
    const size = 32;
    const response = await fetch(chrome.runtime.getURL("icons/icon128.png"));
    const bitmap = await createImageBitmap(await response.blob());

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(bitmap, 0, 0, size, size);

    const day = String(new Date().getDate());
    // A folha branca vai de 42% a 86% da altura; o número fica centrado nela.
    ctx.fillStyle = "#1e3a8a";
    ctx.font = `700 ${Math.round(size * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(day, size / 2, size * 0.66, size * 0.6);

    await chrome.action.setIcon({ imageData: { [size]: ctx.getImageData(0, 0, size, size) } });
  } catch {
    // Ícone estático já é um calendário legível: não vale derrubar o worker
    // por causa do carimbo do dia.
  }
}

async function refresh(): Promise<void> {
  await Promise.all([updateBadge(), updateIcon()]);
}

/** Agenda o próximo refresh para o primeiro minuto do dia seguinte. */
function scheduleDailyRefresh(): void {
  const meianoite = new Date();
  meianoite.setHours(24, 0, 5, 0);
  chrome.alarms.create(DAILY_ALARM, {
    when: meianoite.getTime(),
    periodInMinutes: 24 * 60,
  });
}

function onStart(): void {
  notifyToday();
  void refresh();
  scheduleDailyRefresh();
}

chrome.runtime.onStartup.addListener(onStart);
chrome.runtime.onInstalled.addListener(onStart);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DAILY_ALARM) void refresh();
});

chrome.notifications.onClicked.addListener((id) => {
  if (id !== NOTIFICATION_ID) return;
  chrome.tabs.create({ url: chrome.runtime.getURL(DETAILS_PAGE) });
  chrome.notifications.clear(id);
});

// Com default_popup declarado, o clique no ícone abre o popup e action.onClicked
// não dispara — o worker só precisa manter selo e ícone em dia.
