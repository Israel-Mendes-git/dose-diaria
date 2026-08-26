import dates from "../data/dates.json";
import type { DatesDataset } from "../types";

const dataset = dates as DatesDataset;
const DETAILS_PAGE = "src/details/index.html";
const NOTIFICATION_ID = "hoje-e-dia-de";

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
  return entries.map((entry) => entry.title).join(" · ");
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
