import { writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

const colors = {
  amber: [244, 196, 89, 255],
  cream: [247, 243, 234, 255],
  darkBackground: [16, 32, 29, 255],
  darkCream: [255, 249, 240, 255],
  green: [47, 111, 100, 255],
  greenDark: [22, 76, 69, 255],
  greenLight: [131, 207, 193, 255],
  mint: [131, 207, 193, 255],
  saffron: [229, 184, 94, 255],
  coral: [193, 92, 59, 255],
  coralLight: [223, 128, 87, 255],
  white: [255, 249, 240, 255]
};

function createCanvas(width, height, fill) {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
  }
  return { width, height, data };
}

function drawCircle(canvas, cx, cy, radius, color) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(canvas.width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(canvas.height - 1, Math.ceil(cy + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(canvas, x, y, color);
      }
    }
  }
}

function drawEllipse(canvas, cx, cy, rx, ry, color) {
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(canvas.width - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(canvas.height - 1, Math.ceil(cy + ry));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(canvas, x, y, color);
      }
    }
  }
}

function drawRect(canvas, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(canvas, px, py, color);
    }
  }
}

function setPixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return;
  }
  const index = (y * canvas.width + x) * 4;
  canvas.data[index] = color[0];
  canvas.data[index + 1] = color[1];
  canvas.data[index + 2] = color[2];
  canvas.data[index + 3] = color[3];
}

const lightPalette = {
  outer: colors.green,
  inner: colors.white,
  yolk: colors.saffron,
  rightLeaf: colors.mint,
  leftLeaf: colors.coral,
  base: colors.greenDark
};

const darkPalette = {
  outer: colors.greenLight,
  inner: colors.darkBackground,
  yolk: colors.amber,
  rightLeaf: colors.darkCream,
  leftLeaf: colors.coralLight,
  base: colors.greenLight
};

function drawMark(canvas, palette, scale = 1, offsetY = 0) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + offsetY;
  drawCircle(canvas, cx, cy, 326 * scale, palette.outer);
  drawCircle(canvas, cx, cy - 10 * scale, 197 * scale, palette.inner);
  drawCircle(canvas, cx, cy + 4 * scale, 130 * scale, palette.yolk);
  drawEllipse(canvas, cx + 88 * scale, cy - 230 * scale, 70 * scale, 128 * scale, palette.rightLeaf);
  drawEllipse(canvas, cx - 90 * scale, cy - 226 * scale, 72 * scale, 130 * scale, palette.leftLeaf);
  drawRect(canvas, Math.round(cx - 262 * scale), Math.round(cy + 236 * scale), Math.round(524 * scale), Math.round(64 * scale), palette.base);
}

function encodePng(canvas) {
  const scanlineLength = canvas.width * 4 + 1;
  const raw = new Uint8Array(scanlineLength * canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    const rawOffset = y * scanlineLength;
    const dataOffset = y * canvas.width * 4;
    raw[rawOffset] = 0;
    raw.set(canvas.data.subarray(dataOffset, dataOffset + canvas.width * 4), rawOffset + 1);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr(canvas.width, canvas.height)),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeAsset(path, width, height, scale, offsetY = 0, background = colors.cream, palette = lightPalette) {
  const canvas = createCanvas(width, height, background);
  drawMark(canvas, palette, scale, offsetY);
  writeFileSync(path, encodePng(canvas));
}

writeAsset("assets/icon.png", 1024, 1024, 1);
writeAsset("assets/adaptive-icon.png", 1024, 1024, 1);
writeAsset("assets/splash.png", 1242, 2436, 0.74, -80);
writeAsset("assets/favicon.png", 64, 64, 0.054);
writeAsset("assets/icon-dark.png", 1024, 1024, 1, 0, colors.darkBackground, darkPalette);
writeAsset("assets/logo-dark.png", 1024, 1024, 1, 0, colors.darkBackground, darkPalette);
writeAsset("assets/splash-dark.png", 1242, 2436, 0.74, -80, colors.darkBackground, darkPalette);
