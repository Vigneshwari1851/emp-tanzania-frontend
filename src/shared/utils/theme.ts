export function hexToHsl(hex: string): string | null {
  if (!hex || typeof hex !== 'string') return null;
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return null;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

export function applyBrandTheme(primaryColor?: string, secondaryColor?: string) {
  if (primaryColor) {
    const primaryHsl = hexToHsl(primaryColor);
    if (primaryHsl) {
      document.documentElement.style.setProperty('--primary', primaryHsl);
      document.documentElement.style.setProperty('--ring', primaryHsl);
    }
    document.documentElement.style.setProperty('--brand-primary', primaryColor);
  }

  if (secondaryColor) {
    const secondaryHsl = hexToHsl(secondaryColor);
    if (secondaryHsl) {
      document.documentElement.style.setProperty('--secondary', secondaryHsl);
    }
    document.documentElement.style.setProperty('--brand-secondary', secondaryColor);
  }
}
