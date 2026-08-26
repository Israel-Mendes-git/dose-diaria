/**
 * Envia a extensão para assinatura na Mozilla (AMO).
 *
 * Como o pacote é gerado por um bundler, a Mozilla exige o código-fonte legível
 * junto da submissão. O arquivo de fonte sai de `git archive`, que inclui
 * exatamente os arquivos versionados — sem node_modules, sem dist, sem sobras
 * locais.
 *
 * Credenciais vêm do ambiente (o web-ext lê estas variáveis sozinho):
 *   WEB_EXT_API_KEY     issuer JWT de addons.mozilla.org
 *   WEB_EXT_API_SECRET  segredo JWT
 *
 * Uso: npm run sign            (canal listed, o padrão do projeto)
 *      npm run sign -- --channel unlisted
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const artifacts = path.join(root, "web-ext-artifacts");

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const argv = process.argv.slice(2);
const channelFlag = argv.indexOf("--channel");
const channel = channelFlag === -1 ? "listed" : argv[channelFlag + 1];

if (!["listed", "unlisted"].includes(channel)) {
  console.error(`Canal inválido: ${channel}. Use "listed" ou "unlisted".`);
  process.exit(1);
}

if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
  console.error(
    [
      "Faltam as credenciais da AMO.",
      "",
      "Gere-as em https://addons.mozilla.org/developers/addon/api/key/ e defina:",
      "  WEB_EXT_API_KEY     (JWT issuer, começa com \"user:\")",
      "  WEB_EXT_API_SECRET  (JWT secret)",
      "",
      "Nunca versione esses valores.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(path.join(root, "dist", "manifest.json"))) {
  console.error("dist/ não encontrado. Rode `npm run build` antes de assinar.");
  process.exit(1);
}

// O código-fonte precisa refletir o que está publicado: um repositório sujo
// geraria um arquivo que não corresponde ao dist/ enviado.
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (dirty.trim()) {
  console.error("Há mudanças não commitadas. Commit antes de assinar:\n" + dirty);
  process.exit(1);
}

mkdirSync(artifacts, { recursive: true });
const sourceZip = path.join(artifacts, `${pkg.name}-v${pkg.version}-source.zip`);

console.log("Empacotando o código-fonte para revisão...");
execFileSync("git", ["archive", "--format=zip", "-o", sourceZip, "HEAD"], {
  cwd: root,
  stdio: "inherit",
});
console.log(`  ${sourceZip}`);

console.log(`\nEnviando para assinatura no canal "${channel}"...`);
execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "web-ext",
    "sign",
    "--source-dir",
    "dist",
    "--artifacts-dir",
    artifacts,
    "--channel",
    channel,
    "--upload-source-code",
    sourceZip,
  ],
  { cwd: root, stdio: "inherit" },
);
