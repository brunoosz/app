export const BRAND = {
  bg: "#0B0F1A",
  surface: "#1A1F2E",
  primary: "#4F8CFF",
  secondary: "#A78BFA",
  text: "#F8FAFC",
  muted: "#94A3B8",
  tagline: "APRENDA · INVISTA · EVOLUA",
};

export const LOGO_BARS = [
  { x: 7, y: 36, w: 14, h: 24 },
  { x: 24.5, y: 27, w: 14, h: 33 },
  { x: 42, y: 19, w: 14, h: 43 },
];

export const LOGO_SKEW = -15;

export function logoMarkSvg(size = 64, id = "investa-g", mono?: string): string {
  const fill = mono ?? `url(#${id})`;
  const bars = LOGO_BARS.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3.6"/>`).join("");
  const defs = mono
    ? ""
    : `<defs><linearGradient id="${id}" x1="6" y1="60" x2="58" y2="4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5AB0FF"/><stop offset="0.45" stop-color="#4F8CFF"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${defs}<g transform="skewY(${LOGO_SKEW})" fill="${fill}">${bars}</g></svg>`;
}

export function appIconSvg(size = 1024): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#232B45"/>
      <stop offset="0.55" stop-color="#121729"/>
      <stop offset="1" stop-color="#0B0F1A"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="#4F8CFF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#4F8CFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bars" x1="6" y1="60" x2="58" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5AB0FF"/>
      <stop offset="0.45" stop-color="#4F8CFF"/>
      <stop offset="1" stop-color="#A78BFA"/>
    </linearGradient>
  </defs>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#bgg)"/>
  <rect x="33" y="33" width="958" height="958" rx="223" fill="none" stroke="url(#rim)" stroke-width="4"/>
  <rect x="32" y="32" width="960" height="960" rx="224" fill="url(#glow)"/>
  <g transform="translate(192 180) scale(10)">
    <g transform="skewY(${LOGO_SKEW})" fill="url(#bars)">
      ${LOGO_BARS.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3.6"/>`).join("")}
    </g>
  </g>
</svg>`;
}
