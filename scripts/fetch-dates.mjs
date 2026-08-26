/**
 * Gera src/data/dates.json a partir dos artigos "dia do ano" da Wikipédia em português.
 *
 * Cada artigo (ex: "26 de agosto") traz as seções "Feriados e eventos cíclicos"
 * (subdividida em Internacional / Brasil / Cristianismo) e "Eventos históricos".
 * O conteúdo da Wikipédia é licenciado em CC BY-SA — ver atribuição no README.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "data", "dates.json");
const sourcesPath = path.join(__dirname, "..", "src", "data", "sources.json");

const USER_AGENT =
  "dose-diaria/1.0 (https://github.com/Israel-Mendes-git/dose-diaria) generator";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Remove marcação de wikitexto, deixando texto puro. */
function cleanWikitext(raw) {
  let s = raw;
  // <ref>...</ref> e <ref ... />
  s = s.replace(/<ref[^>]*\/>/g, "");
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
  // templates simples, aplicados repetidamente por causa de aninhamento
  for (let i = 0; i < 5; i++) s = s.replace(/\{\{[^{}]*\}\}/g, "");
  // [[alvo|texto]] -> texto ; [[alvo]] -> alvo
  s = s.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1");
  s = s.replace(/\[\[([^\]]*)\]\]/g, "$1");
  // links externos [url texto] -> texto
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, "$1");
  s = s.replace(/\[https?:\/\/\S+\]/g, "");
  // negrito/itálico
  s = s.replace(/'''''|'''|''/g, "");
  // tags html restantes
  s = s.replace(/<[^>]+>/g, "");
  return s.replace(/\s+/g, " ").trim();
}

/** Extrai o corpo de uma seção pelo título, respeitando o nível de cabeçalho. */
function sectionBody(wikitext, title, level) {
  const marker = "=".repeat(level);
  const re = new RegExp(`^${marker}\\s*${title}\\s*${marker}\\s*$`, "m");
  const start = wikitext.search(re);
  if (start === -1) return "";
  const after = wikitext.slice(start);
  const bodyStart = after.indexOf("\n");
  const rest = after.slice(bodyStart);
  // próxima seção de nível igual ou superior
  const next = rest.search(new RegExp(`^={2,${level}}[^=]`, "m"));
  return next === -1 ? rest : rest.slice(0, next);
}

/** Itens de lista ("* ...") de um bloco, ignorando imagens e linhas vazias. */
function listItems(body) {
  return body
    .split("\n")
    .filter((line) => /^\*\s*[^*]/.test(line))
    .map((line) => cleanWikitext(line.replace(/^\*\s*/, "")))
    .filter((line) => line.length > 2 && !/^(Imagem|Ficheiro|Categoria):/i.test(line));
}

/** Aniversários de município são ruído para esta extensão. */
function isMunicipalAnniversary(text) {
  return /^Anivers[áa]rio (do|dos|da|das) (munic[íi]pio|cidade)/i.test(text);
}

const TITULO_MAX = 110;

/**
 * Normaliza um item de lista em entrada do dataset. Alguns verbetes trazem
 * parágrafos inteiros na lista; nesses casos a primeira frase vira o título e o
 * restante vira descrição. Devolve null para sobras de marcação.
 */
function normalizeEntry(text, type) {
  let title = text.trim();
  // sub-itens soltos ("- Armênia") e sobras que não começam com letra/número
  if (!/^[\p{L}\p{N}]/u.test(title)) return null;

  let description;
  if (title.length > TITULO_MAX) {
    const [first, ...rest] = title.split(/(?<=\.)\s+/);
    if (first.length <= TITULO_MAX) {
      title = first;
      if (rest.length > 0) description = rest.join(" ").trim();
    } else {
      // Sem ponto final útil. Cortar no meio da frase produziria uma descrição
      // começando em minúscula, então o texto inteiro vira descrição e o título
      // fica reticente.
      description = title;
      const at = title.lastIndexOf(" ", TITULO_MAX);
      title = `${title.slice(0, at > 30 ? at : TITULO_MAX).trim()}…`;
    }
  }

  title = title.replace(/\s*\.$/, "").trim();
  if (title.length < 6) return null;

  return description ? { title, type, description } : { title, type };
}

/** "1969 — O homem chega à Lua." -> { year, text } */
function parseHistoricalEvent(line) {
  const m = line.match(/^(\d{1,4}(?:\s*a\.?C\.?)?)\s*[—–-]\s*(.+)$/);
  if (!m) return null;
  const year = m[1].trim();
  let text = m[2].trim();
  if (!/[.!?]$/.test(text)) text += ".";
  return { year, text };
}

/** Um título curto a partir da frase do evento histórico. */
function eventTitle(text) {
  const firstSentence = text.split(/(?<=\.)\s/)[0].replace(/\.$/, "");
  if (firstSentence.length <= 80) return firstSentence;
  return `${firstSentence.slice(0, 77).trimEnd()}...`;
}

async function fetchWikitext(page) {
  const url =
    "https://pt.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=" +
    encodeURIComponent(page);
  let lastError = "sem resposta";
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        const json = await res.json();
        const text = json?.parse?.wikitext?.["*"];
        if (text) return text;
        lastError = "resposta sem wikitext";
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (err) {
      lastError = err.message;
    }
    // backoff exponencial: a API limita a taxa em rajadas longas
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
  throw new Error(`falha ao buscar "${page}": ${lastError}`);
}

function buildEntries(wikitext) {
  const feriados = sectionBody(wikitext, "Feriados e eventos cíclicos", 2);
  const entries = [];

  for (const text of listItems(sectionBody(feriados, "Internacional", 3))) {
    const entry = normalizeEntry(text, "mundial");
    if (entry) entries.push(entry);
  }
  for (const text of listItems(sectionBody(feriados, "Brasil", 3))) {
    if (isMunicipalAnniversary(text)) continue;
    const entry = normalizeEntry(text, "nacional");
    if (entry) entries.push(entry);
  }

  // completa dias magros com efemérides — sempre garantindo pelo menos uma entrada
  const alvo = 3;
  if (entries.length < alvo) {
    const eventos = listItems(sectionBody(wikitext, "Eventos históricos", 2))
      .map(parseHistoricalEvent)
      .filter(Boolean)
      .filter((e) => !/a\.?C/i.test(e.year) && Number(e.year) >= 1500)
      .filter((e) => e.text.length <= 160)
      .sort((a, b) => a.text.length - b.text.length)
      .slice(0, alvo - entries.length);

    for (const ev of eventos) {
      entries.push({
        title: eventTitle(ev.text),
        type: "curiosidade",
        description: `${ev.text.replace(/\.$/, "")}, em ${ev.year}.`,
      });
    }
  }

  return entries;
}

async function main() {
  const jobs = [];
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= DIAS_NO_MES[m]; d++) {
      const key = `${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      jobs.push({ key, page: `${d} de ${MESES[m]}` });
    }
  }

  const dataset = {};
  const sources = {};
  const failures = [];
  const CONCURRENCY = 2;
  let done = 0;

  async function worker() {
    while (jobs.length > 0) {
      const job = jobs.shift();
      try {
        const wikitext = await fetchWikitext(job.page);
        const entries = buildEntries(wikitext);
        if (entries.length > 0) {
          dataset[job.key] = entries;
          sources[job.key] = `https://pt.wikipedia.org/wiki/${encodeURIComponent(job.page)}`;
        }
      } catch (err) {
        failures.push({ ...job, error: err.message });
      }
      done++;
      if (done % 30 === 0) process.stdout.write(`  ${done} dias...\n`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failures.length > 0) {
    console.log(`\n${failures.length} dias falharam; tentando novamente em série...`);
    for (const job of failures.slice()) {
      try {
        const wikitext = await fetchWikitext(job.page);
        const entries = buildEntries(wikitext);
        if (entries.length > 0) {
          dataset[job.key] = entries;
          sources[job.key] = `https://pt.wikipedia.org/wiki/${encodeURIComponent(job.page)}`;
        }
        failures.splice(failures.indexOf(job), 1);
      } catch {
        // permanece na lista de falhas
      }
    }
  }

  const ordered = {};
  const orderedSources = {};
  for (const key of Object.keys(dataset).sort()) {
    ordered[key] = dataset[key];
    orderedSources[key] = sources[key];
  }

  writeFileSync(outPath, `${JSON.stringify(ordered, null, 2)}\n`);
  writeFileSync(sourcesPath, `${JSON.stringify(orderedSources, null, 2)}\n`);

  const dias = Object.keys(ordered).length;
  const total = Object.values(ordered).flat().length;
  console.log(`\n${dias} dias, ${total} entradas -> ${outPath}`);
  console.log(`procedência de cada dia -> ${sourcesPath}`);
  if (failures.length > 0) {
    console.log(`FALHARAM (${failures.length}): ${failures.map((f) => f.key).join(", ")}`);
  }
  const faltando = 366 - dias - failures.length;
  if (faltando > 0) console.log(`atenção: ${faltando} dias sem nenhuma entrada extraída`);
}

await main();
