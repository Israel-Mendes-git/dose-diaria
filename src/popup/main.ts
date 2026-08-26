import {
  TYPE_LABELS,
  element,
  entriesFor,
  formatShortDate,
  resolveTargetDate,
} from "../shared/dates";
import type { CommemorativeDate } from "../types";

const DETAILS_PAGE = "src/details/index.html";

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

function renderFooter(): HTMLElement {
  const footer = element("footer", "footer");
  const link = element("button", "footer__link", "Ver a página completa →");
  link.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL(DETAILS_PAGE) });
    window.close();
  });
  footer.append(link);
  return footer;
}

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const target = resolveTargetDate(window.location.search);
  const entries = entriesFor(target);

  const header = element("header", "header");
  header.append(
    element("p", "header__eyebrow", "Hoje é dia de..."),
    element("h1", "header__date", formatShortDate(target)),
  );
  app.replaceChildren(header);

  if (entries.length > 0) {
    const list = element("ul", "entries");
    list.append(...entries.map(renderEntry));
    app.append(list, renderFooter());
  } else {
    app.append(
      element(
        "p",
        "empty-state",
        "Nenhuma data cadastrada hoje. Bom motivo pra inventar a sua.",
      ),
      renderFooter(),
    );
  }
}

render();
