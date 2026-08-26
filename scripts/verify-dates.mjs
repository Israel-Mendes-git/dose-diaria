/**
 * Confere uma amostra do dataset contra os artigos da Wikipédia que o originaram.
 *
 * Para cada dia sorteado, baixa o artigo de novo e verifica se cada título do
 * dataset aparece de fato no texto do verbete. Serve para pegar erro de extração
 * (marcação mal removida, item do dia errado), não para auditar a Wikipédia.
 *
 * Uso: node scripts/verify-dates.mjs [amostra]
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(path.join(__dirname, "..", "src", "data", "dates.json"), "utf8"),
);
const sources = JSON.parse(
  readFileSync(path.join(__dirname, "..", "src", "data", "sources.json"), "utf8"),
);

const USER_AGENT =
  "hoje-e-dia-de/1.0 (https://github.com/Israel-Mendes-git/hoje-e-dia-de) verifier";

const SAMPLE = Number(process.argv[2] ?? 24);

/** Normaliza para comparação: sem acento, minúsculo, só letras e números. */
function fold(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Baixa o HTML renderizado pela própria Wikipédia e reduz a texto puro.
 * Usar o render (e não o wikitexto) mantém a checagem independente do parser
 * do gerador: compara-se com o artigo como uma pessoa o lê.
 */
async function fetchPlainText(pageUrl) {
  const page = decodeURIComponent(pageUrl.split("/wiki/")[1]);
  const url =
    "https://pt.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=" +
    encodeURIComponent(page);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${page}`);
  const json = await res.json();
  const html = json?.parse?.text?.["*"] ?? "";
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Sorteio determinístico, para o resultado ser reprodutível. */
function pickSample(keys, count) {
  const step = Math.max(1, Math.floor(keys.length / count));
  const out = [];
  for (let i = 0; i < keys.length && out.length < count; i += step) out.push(keys[i]);
  return out;
}

const keys = pickSample(Object.keys(dataset).sort(), SAMPLE);
let checked = 0;
let missing = 0;
const problems = [];

for (const key of keys) {
  const wikitext = fold(await fetchPlainText(sources[key]));
  for (const entry of dataset[key]) {
    checked++;
    // compara pelo miolo do título, tolerando cortes feitos na normalização
    const needle = fold(entry.title).slice(0, 45);
    if (needle.length >= 8 && !wikitext.includes(needle)) {
      missing++;
      problems.push(`${key} | ${entry.title}`);
    }
  }
  process.stdout.write(".");
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\n\ndias amostrados: ${keys.length}`);
console.log(`entradas conferidas: ${checked}`);
console.log(`não encontradas no verbete: ${missing}`);
if (problems.length > 0) {
  console.log("\nproblemas:");
  for (const p of problems) console.log(`  ${p}`);
}
process.exitCode = missing > 0 ? 1 : 0;
