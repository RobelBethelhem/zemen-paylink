import type { CSSProperties } from "react";

// The prototype styles every element with a CSS declaration string. Keeping those
// strings verbatim and parsing them here means the ported markup stays a
// character-for-character match with the original design.

const cache = new Map<string, CSSProperties>();

// Split on top-level `;` only, so values like rgba(...) / gradients stay intact.
function splitDeclarations(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      out.push(css.slice(start, i));
      start = i + 1;
    }
  }
  out.push(css.slice(start));
  return out;
}

function toCamelCase(property: string): string {
  if (property.startsWith("--")) return property; // custom properties stay as-is
  return property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function s(css: string): CSSProperties {
  const hit = cache.get(css);
  if (hit) return hit;

  const style: Record<string, string> = {};
  for (const declaration of splitDeclarations(css)) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!property || !value) continue;
    style[toCamelCase(property)] = value;
  }

  const frozen = style as CSSProperties;
  cache.set(css, frozen);
  return frozen;
}
