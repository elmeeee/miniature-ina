import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { characters } from '@republik/game-data';

const source = 'assets/source/characters-sheet.png';
const output = 'assets/characters';
const expressions = ['neutral', 'serious', 'thinking', 'agree', 'disagree', 'angry', 'disappointed', 'optimistic'];
const categories: Record<string, string> = {
  president: 'presidents', vice_president: 'presidents', minister: 'ministers',
  advisor: 'advisors', journalist: 'civilians', civil_society: 'civilians',
};
type Crop = { characterId: string; variant: string; left: number; top: number; width: number; height: number; reviewed: boolean };
type Manifest = Record<string, { portrait?: string; expressions?: Record<string, string> }>;
type Finding = { file: string; transparent: boolean; hasOpaquePixels: boolean; width: number; height: number };

const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
async function optionalFile(path: string) {
  try { return await readFile(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return undefined;
  }
}

async function inspect(data: Buffer, file: string): Promise<Finding & { pixelHash: string }> {
  const image = sharp(data);
  const { format } = await image.metadata();
  if (format !== 'png') throw new Error(file + ' must be a PNG.');
  const { data: pixels, info } = await image.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = false;
  let hasOpaquePixels = false;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] < 255) transparent = true;
    if (pixels[offset] === 255) hasOpaquePixels = true;
    if (pixels[offset] === 0) pixels.fill(0, offset - 3, offset);
  }
  return { file, transparent, hasOpaquePixels, width: info.width, height: info.height, pixelHash: hash(pixels) };
}

function pathFor(crop: Crop) {
  if (!Object.hasOwn(characters, crop.characterId) || crop.reviewed !== true) throw new Error('Each crop needs a known character and identity/boundary review.');
  if (crop.variant !== 'portrait' && !expressions.includes(crop.variant)) throw new Error('Unknown variant: ' + crop.variant);
  const category = categories[characters[crop.characterId].role] ?? 'politicians';
  return category + '/' + crop.characterId + '/' + (crop.variant === 'portrait' ? 'portrait' : 'expressions/' + crop.variant) + '.png';
}

async function extract(sheet: Buffer) {
  const plan: { sourceSha256: string; crops: Crop[] } = JSON.parse(await readFile('assets/source/extraction-plan.json', 'utf8'));
  if (plan.sourceSha256 !== hash(sheet) || !plan.crops.length) throw new Error('Add reviewed crops and the source SHA-256 to extraction-plan.json.');
  const metadata = await sharp(sheet).metadata();
  const manifest: Manifest = {};
  const pending = new Map<string, Buffer>();
  const plannedFiles = new Set<string>();
  const pixels = new Map<string, string>();
  for (const crop of plan.crops) {
    const file = pathFor(crop);
    const { left, top, width, height } = crop;
    if (![left, top, width, height].every(Number.isSafeInteger) || left < 0 || top < 0 || width < 64 || height < 64
      || left + width > metadata.width || top + height > metadata.height || plannedFiles.has(file)) throw new Error('Invalid, undersized or duplicate crop: ' + file);
    plannedFiles.add(file);
    const data = await sharp(sheet).extract({ left, top, width, height }).png().toBuffer();
    const finding = await inspect(data, file);
    if (!finding.hasOpaquePixels) throw new Error('Crop has no fully opaque pixels: ' + file);
    const previous = pixels.get(finding.pixelHash);
    if (previous) throw new Error('Duplicate pixels: ' + previous + ' and ' + file);
    pixels.set(finding.pixelHash, file);
    const existing = await optionalFile(join(output, file));
    if (existing && (await inspect(existing, file)).pixelHash !== finding.pixelHash) throw new Error('Refusing to overwrite ' + file);
    if (!existing) pending.set(file, data);
    const entry = manifest[crop.characterId] ??= {};
    if (crop.variant === 'portrait') entry.portrait = file;
    else (entry.expressions ??= {})[crop.variant] = file;
  }
  for (const [file, data] of pending) {
    const target = join(output, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  }
  return manifest;
}

async function main() {
  const sheet = await optionalFile(source);
  const extraction = process.argv.includes('--extract');
  if (extraction && !sheet) throw new Error('Missing ' + source + '. Add the original sheet before extraction.');
  const manifestPath = join(output, 'manifest.json');
  const previous: { version: number; characters: Manifest } = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (previous.version !== 1) throw new Error('Unsupported asset manifest version.');
  const manifest = sheet && extraction ? await extract(sheet) : previous.characters;
  if (extraction) {
    for (const [id, old] of Object.entries(previous.characters)) {
      const next = manifest[id] ??= {};
      next.portrait ??= old.portrait;
      next.expressions = { ...old.expressions, ...next.expressions };
    }
  }
  const findings: Finding[] = [];
  const warnings: string[] = [];
  const pixelOwners = new Map<string, string>();
  let invalid = false;
  if (!sheet) warnings.push('Original character sheet absent. Faces, boundaries and transparency cannot be reviewed.');
  else {
    const { pixelHash, ...finding } = await inspect(sheet, source);
    findings.push(finding);
    warnings.push('Source SHA-256: ' + hash(sheet) + ' (pixel SHA-256: ' + pixelHash + ')');
  }
  for (const id of Object.keys(manifest)) {
    if (!Object.hasOwn(characters, id)) throw new Error('Unknown manifest character: ' + id);
  }
  for (const id of Object.keys(characters)) {
    const entry = manifest[id];
    if (!entry?.portrait) warnings.push(id + ': portrait missing (uses initials).');
    if (characters[id].role === 'president') {
      const missing = expressions.filter(variant => !entry?.expressions?.[variant]);
      if (missing.length) warnings.push(id + ': expressions missing (' + missing.join(', ') + ').');
    }
    for (const [variant, file] of Object.entries({ ...entry?.expressions, ...(entry?.portrait ? { portrait: entry.portrait } : {}) })) {
      if (file !== pathFor({ characterId: id, variant, reviewed: true } as Crop)) throw new Error('Invalid asset path: ' + file);
      const data = await optionalFile(join(output, file));
      if (!data) { warnings.push(file + ': file missing.'); invalid = true; continue; }
      const { pixelHash, ...finding } = await inspect(data, file);
      const duplicate = pixelOwners.get(pixelHash);
      if (duplicate) { warnings.push(file + ': duplicate pixels from ' + duplicate); invalid = true; }
      pixelOwners.set(pixelHash, file);
      if (!finding.hasOpaquePixels || finding.width < 64 || finding.height < 64) {
        warnings.push(file + ': insufficient size or opaque pixels.');
        invalid = true;
      }
      findings.push(finding);
    }
  }
  if (extraction && !invalid) await writeFile(manifestPath, JSON.stringify({ version: 1, characters: manifest }, null, 2) + '\n');
  await writeFile('docs/production/asset-validation.json', JSON.stringify({ findings, warnings }, null, 2) + '\n');
  console.log(warnings.join('\n'));
  if (invalid) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
