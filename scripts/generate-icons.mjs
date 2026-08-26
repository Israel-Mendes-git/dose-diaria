import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BLUE = [0x25, 0x63, 0xeb, 0xff];
const NAVY = [0x1e, 0x3a, 0x8a, 0xff];
const PAGE = [0xf5, 0xf5, 0xf5, 0xff];
const ORANGE = [0xb4, 0x53, 0x0e, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

function insideRoundedRect(x, y, size, radius) {
  const min = 0;
  const max = size - 1;
  const inCornerZone =
    (x < radius && y < radius) ||
    (x > max - radius && y < radius) ||
    (x < radius && y > max - radius) ||
    (x > max - radius && y > max - radius);

  if (!inCornerZone) return true;

  const cx = x < radius ? radius : max - radius;
  const cy = y < radius ? radius : max - radius;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function buildIcon(size) {
  const radius = Math.max(2, Math.round(size * 0.18));
  const headerHeight = Math.round(size * 0.32);
  const margin = Math.max(1, Math.round(size * 0.12));
  const markerSize = Math.max(1, Math.round(size * 0.16));

  const pixels = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      if (!insideRoundedRect(x, y, size, radius)) {
        row.push(TRANSPARENT);
        continue;
      }
      if (y < headerHeight) {
        row.push(NAVY);
        continue;
      }
      const inBody =
        x >= margin && x < size - margin && y < size - margin;
      if (!inBody) {
        row.push(BLUE);
        continue;
      }
      const inMarker =
        x >= size - margin - markerSize &&
        y >= size - margin - markerSize;
      row.push(inMarker ? ORANGE : PAGE);
    }
    pixels.push(row);
  }

  const bytesPerPixel = 4;
  const stride = size * bytesPerPixel + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixels[y][x];
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  const idatData = deflateSync(raw);

  function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, "ascii");
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crcValue = crc32(crcInput);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crcValue >>> 0, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return png;
}

for (const size of [16, 48, 128]) {
  const png = buildIcon(size);
  const filePath = path.join(outDir, `icon${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Gerado ${filePath} (${png.length} bytes)`);
}
