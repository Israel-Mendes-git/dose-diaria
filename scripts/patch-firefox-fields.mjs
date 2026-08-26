import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const manifestPath = path.join(distDir, "manifest.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const serviceWorker = manifest.background?.service_worker;

if (!serviceWorker) {
  throw new Error("manifest.json não tem background.service_worker — build inesperado.");
}
if (!existsSync(path.join(distDir, serviceWorker))) {
  throw new Error(`service worker apontado no manifest não existe em dist/: ${serviceWorker}`);
}

// Chrome/Opera leem service_worker; Firefox lê scripts. Cada um ignora a chave do outro.
manifest.background.scripts = [serviceWorker];

// data_collection_permissions só existe no Firefox para Android a partir da 142.
manifest.browser_specific_settings.gecko_android = { strict_min_version: "142.0" };

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Firefox: background.scripts apontando para ${serviceWorker}`);
