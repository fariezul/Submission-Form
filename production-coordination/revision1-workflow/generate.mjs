import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const directory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require('../../../animation-remake/node_modules/sharp');

const steps = [
  { label: 'Receiving', x: 170, y: 250, w: 220, row: 1 },
  { label: 'Storage', x: 445, y: 250, w: 220, row: 1 },
  { label: 'Kitting', x: 720, y: 250, w: 220, row: 1 },
  { label: 'Lay-up', x: 995, y: 250, w: 220, row: 1 },
  { label: 'Autoclave', x: 995, y: 430, w: 220, row: 2 },
  { label: 'Demould', x: 720, y: 430, w: 220, row: 2 },
  { label: 'Trimming', x: 445, y: 430, w: 220, row: 2 },
  { label: 'NDT', x: 170, y: 430, w: 220, row: 2 },
  { label: 'Mechanical Assembly', x: 100, y: 610, w: 210, row: 3 },
  { label: 'Painting', x: 345, y: 610, w: 210, row: 3 },
  { label: 'Final Inspection', x: 590, y: 610, w: 210, row: 3 },
  { label: 'Packing', x: 835, y: 610, w: 210, row: 3 },
  { label: 'Shipping', x: 1080, y: 610, w: 210, row: 3 },
];

const variants = [
  { number: 19, blank: [2, 3, 4] },
  { number: 20, blank: [5, 6, 7] },
  { number: 21, blank: [8, 9, 10] },
  { number: 22, blank: [1, 11, 13] },
  { number: 23, blank: [3, 6, 12] },
];

function escape(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function connector(a, b) {
  const ay = a.y + 54;
  const by = b.y + 54;
  let x1, y1, x2, y2;
  if (a.y === b.y) {
    const goesRight = b.x > a.x;
    x1 = goesRight ? a.x + a.w : a.x;
    x2 = goesRight ? b.x - 10 : b.x + b.w + 10;
    y1 = ay;
    y2 = by;
  } else {
    x1 = a.x + a.w / 2;
    y1 = a.y + 108;
    x2 = b.x + b.w / 2;
    y2 = b.y - 12;
  }
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#a88268" stroke-width="11" stroke-linecap="round" marker-end="url(#arrow)"/>`;
}

function box(step, index, letter) {
  const fill = step.row === 1 ? '#a28b69' : step.row === 2 ? '#a1785f' : '#986b5b';
  const isBlank = Boolean(letter);
  const rect = `<rect x="${step.x}" y="${step.y}" width="${step.w}" height="108" rx="13" fill="${isBlank ? '#ffffff' : fill}" stroke="${isBlank ? '#245b73' : 'none'}" stroke-width="${isBlank ? 4 : 0}" ${isBlank ? 'stroke-dasharray="10 7"' : ''}/>`;
  const number = `<text x="${step.x + 15}" y="${step.y + 24}" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="${isBlank ? '#245b73' : '#fff9ed'}" opacity="0.9">${index + 1}</text>`;
  if (isBlank) {
    return `<g>${rect}${number}<text x="${step.x + step.w / 2}" y="${step.y + 72}" text-anchor="middle" font-family="Arial, sans-serif" font-size="45" font-weight="800" fill="#245b73">${letter}</text></g>`;
  }
  const lines = step.label.split(' ');
  const text = lines.length === 2 && step.label !== 'Extra processing'
    ? `<text x="${step.x + step.w / 2}" y="${step.y + 49}" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="white"><tspan x="${step.x + step.w / 2}" dy="0">${escape(lines[0])}</tspan><tspan x="${step.x + step.w / 2}" dy="30">${escape(lines[1])}</tspan></text>`
    : `<text x="${step.x + step.w / 2}" y="${step.y + 70}" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="white">${escape(step.label)}</text>`;
  return `<g>${rect}${number}${text}</g>`;
}

function svgFor(variant) {
  const letters = new Map(variant.blank.map((step, i) => [step, 'ABC'[i]]));
  const edges = steps.slice(0, -1).map((step, i) => connector(step, steps[i + 1])).join('\n');
  const boxes = steps.map((step, i) => box(step, i, letters.get(i + 1))).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800" viewBox="0 0 1400 800" role="img" aria-label="Aerocomposite production workflow, question ${variant.number}, with three blank process steps A B and C">
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M1 1 L10 6 L1 11 Z" fill="#a88268"/></marker></defs>
  <rect width="1400" height="800" fill="#faf9f5"/>
  <text x="700" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#202a33">PRODUCTION PROCESS WORKFLOW</text>
  <text x="700" y="151" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" fill="#48525b">Fill in steps A, B and C in process order</text>
  ${edges}
  ${boxes}
  </svg>`;
}

await mkdir(directory, { recursive: true });
for (const variant of variants) {
  const base = join(directory, `workflow-q${variant.number}`);
  const svg = svgFor(variant);
  await writeFile(`${base}.svg`, svg, 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(`${base}.png`);
}
