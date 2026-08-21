/**
 * Generuje ikony PNG dla manifestu PWA — bez zewnętrznych zależności.
 * Uruchom po zmianie wyglądu ikony:  node scripts/make-icons.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const BG = [0x05, 0x08, 0x0d];
const TRACK = [0x20, 0x30, 0x3f];
const ACCENT = [0xff, 0x8c, 0x1f];

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, radius) {
  if (radius <= 0) return true;
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** Jeden podpiksel -> [r,g,b,a]; scale kurczy grafikę (safe zone dla maskable). */
function sample(x, y, { corner, scale }) {
  if (!insideRoundedRect(x, y, corner)) return null;

  const dx = (x - 0.5) / scale;
  const dy = (y - 0.5) / scale;
  const r = Math.hypot(dx, dy);

  if (r <= 0.078) return ACCENT;

  if (r >= 0.31 - 0.047 && r <= 0.31 + 0.047) {
    const angle = Math.atan2(dy, dx);
    // ćwiartka od góry w prawo = postęp sesji
    if (angle >= -Math.PI / 2 && angle <= 0) return ACCENT;
    return TRACK;
  }

  return BG;
}

function render(size, opts) {
  const SS = 4; // supersampling
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const c = sample(x, y, opts);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      const alpha = a / n;
      // kolory premultiplikowane przez pokrycie -> dzielimy z powrotem
      const cover = alpha === 0 ? 1 : a / 255;
      pixels[i] = Math.round(r / cover);
      pixels[i + 1] = Math.round(g / cover);
      pixels[i + 2] = Math.round(b / cover);
      pixels[i + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, pixels);
}

const outDir = path.join(process.cwd(), "public");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, corner: 0.22, scale: 1 },
  { file: "icon-512.png", size: 512, corner: 0.22, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, corner: 0, scale: 0.72 },
  { file: "apple-touch-icon.png", size: 180, corner: 0, scale: 1 },
];

for (const t of targets) {
  const buf = render(t.size, { corner: t.corner, scale: t.scale });
  fs.writeFileSync(path.join(outDir, t.file), buf);
  console.log(`${t.file}  ${t.size}x${t.size}  ${(buf.length / 1024).toFixed(1)} kB`);
}
