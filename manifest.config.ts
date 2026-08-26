import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Hoje é dia de...",
  description:
    "Avisa, ao abrir o navegador, quais datas comemorativas e curiosidades correspondem ao dia de hoje.",
  version: packageJson.version,
  icons: {
    16: "public/icons/icon16.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
  },
  permissions: ["notifications"],
  background: {
    service_worker: "src/background/main.ts",
    type: "module",
  },
  action: {
    default_title: "Ver a data comemorativa de hoje",
  },
  browser_specific_settings: {
    gecko: {
      id: "hoje-e-dia-de@israelmendes.dev",
      strict_min_version: "140.0",
      data_collection_permissions: {
        required: ["none"],
      },
    },
  },
});
