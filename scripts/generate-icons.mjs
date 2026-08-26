/**
 * Gera os PNGs do ícone sem depender de nenhuma biblioteca: o arquivo é
 * montado chunk a chunk, com o zlib do próprio Node comprimindo os pixels.
 *
 * O desenho é descrito em coordenadas de 0 a 1 e amostrado quatro vezes por
 * eixo em cada pixel. Essa média é o que dá o antialiasing — sem ela, as
 * bordas arredondadas e as argolas saem serradas em 16px, que é justamente
 * onde o ícone mais precisa ser reconhecível.
 */

import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BLUE = [0x25, 0x63, 0xeb];
const NAVY = [0x1e, 0x3a, 0x8a];
const PAGE = [0xf8, 0xfa, 0xfc];
const TRANSPARENT = [0, 0, 0, 0];

const SUPERSAMPLE = 4;

/** Um ponto está dentro do retângulo de cantos arredondados? */
function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + 1e-9;
}

/** Cor do desenho no ponto (u, v), ambos entre 0 e 1. */
function sample(u, v) {
  // As duas argolas no topo: é o que faz o ícone ser lido como calendário.
  for (const cx of [0.32, 0.68]) {
    if (insideRoundedRect(u, v, cx - 0.045, 0.04, cx + 0.045, 0.2, 0.045)) {
      return [...NAVY, 255];
    }
  }
  if (!insideRoundedRect(u, v, 0.06, 0.12, 0.94, 0.94, 0.14)) return TRANSPARENT;
  if (v < 0.34) return [...NAVY, 255];
  if (!insideRoundedRect(u, v, 0.14, 0.42, 0.86, 0.86, 0.04)) return [...BLUE, 255];
  // A folha fica em branco de propósito: o dia do mês é carimbado em runtime
  // por chrome.action.setIcon, para o ícone da barra mostrar a data de hoje.
  return [...PAGE, 255];
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function buildIcon(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      // Média das amostras, com a cor ponderada pelo alfa: sem isso, as
      // amostras transparentes puxariam a borda para preto.
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const u = (x + (sx + 0.5) / SUPERSAMPLE) / size;
          const v = (y + (sy + 0.5) / SUPERSAMPLE) / size;
          const [sr, sg, sb, sa] = sample(u, v);
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }
      const offset = y * stride + 1 + x * 4;
      if (a > 0) {
        raw[offset] = r / a;
        raw[offset + 1] = g / a;
        raw[offset + 2] = b / a;
      }
      raw[offset + 3] = a / SUPERSAMPLE ** 2;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = buildIcon(size);
  const filePath = path.join(outDir, `icon${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Gerado ${filePath} (${png.length} bytes)`);
}
