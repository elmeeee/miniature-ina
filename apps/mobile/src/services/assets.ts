import manifest from '../../../../assets/characters/manifest.json';

export type Expression = 'neutral' | 'serious' | 'thinking' | 'agree' | 'disagree' | 'angry' | 'disappointed' | 'optimistic';
type Portrait = { portrait?: string; expressions?: Partial<Record<Expression, string>> };

export function portraitUrl(assetId: string, expression?: Expression): string | undefined {
  const entries: Record<string, Portrait> = manifest.characters;
  if (!Object.hasOwn(entries, assetId)) return undefined;
  const entry = entries[assetId];
  const path = (expression && entry.expressions?.[expression]) || entry.portrait;
  return path ? '/' + path : undefined;
}
