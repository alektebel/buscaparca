/** Paleta y tipografia. Alto contraste y numeros grandes: esto se lee conduciendo. */

export const colors = {
  bg: '#0d1117',
  surface: '#161b22',
  surfaceAlt: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textDim: '#8b949e',
  accent: '#1f6feb',
  good: '#2ea043',
  warn: '#d29922',
  bad: '#da3633',
};

/** Color de un tramo segun su probabilidad de hueco. Verde = para aqui. */
export function heatColor(p: number): string {
  if (p >= 0.45) return '#2ea043';
  if (p >= 0.28) return '#7bb750';
  if (p >= 0.16) return '#d29922';
  if (p >= 0.08) return '#e06c2f';
  return '#da3633';
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
