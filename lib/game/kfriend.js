/* 🐣 חבר מהכפר: אות או מספר עם עיניים ולחיים (גן חובה) */
const COLORS = ['#ff5d73', '#4a9bff', '#ffc928', '#3fcf6a', '#a06bff', '#ff8a3d', '#22c1c3'];
const colorOf = ch => COLORS[String(ch).charCodeAt(0) % COLORS.length];
/** חבר מהכפר: אות או מספר עם עיניים ולחיים */
export function friendSVG(ch, o = {}) {
  const c = o.color || colorOf(ch), sad = o.sad;
  return `<svg viewBox="0 0 120 130" class="kd-friend-svg" aria-hidden="true">
    <ellipse cx="60" cy="124" rx="34" ry="5" fill="#000" opacity=".15"/>
    <text x="60" y="98" text-anchor="middle" font-size="112" font-weight="900" font-family="Rubik, Heebo, Arial, sans-serif" fill="${c}" stroke="#fff" stroke-width="7" paint-order="stroke">${ch}</text>
    <g transform="translate(60 44)">
      <circle cx="-15" cy="0" r="11" fill="#fff" stroke="#2b1d55" stroke-width="3"/><circle cx="15" cy="0" r="11" fill="#fff" stroke="#2b1d55" stroke-width="3"/>
      <circle cx="-13" cy="${sad ? 3 : 2}" r="5" fill="#2b1d55"/><circle cx="17" cy="${sad ? 3 : 2}" r="5" fill="#2b1d55"/>
      <circle cx="-11" cy="0" r="1.8" fill="#fff"/><circle cx="19" cy="0" r="1.8" fill="#fff"/>
      ${sad ? '<path d="M-22 -16l12 5M22 -16l-12 5" stroke="#2b1d55" stroke-width="3" stroke-linecap="round"/>' : ''}
      <circle cx="-26" cy="16" r="5" fill="#ff8fb1" opacity=".7"/><circle cx="26" cy="16" r="5" fill="#ff8fb1" opacity=".7"/>
      <path d="${sad ? 'M-8 22q8 -7 16 0' : 'M-9 16q9 10 18 0'}" stroke="#2b1d55" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </g></svg>`;
}

