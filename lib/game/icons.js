/* סט אייקונים של המשחק – מצוירים בקוד בסגנון אחיד:
   קו מתאר כהה ועבה, צבעים רוויים והבהקה לבנה. מחליפים את האימוג'ים בממשק. */

const O = '#2b1838';
const st = (w = 3) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const starPath = (cx, cy, r, k = .48) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r;
    d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
  }
  return d + 'Z';
};
const shine = (d, w = 3) => `<path d="${d}" stroke="#fff" stroke-width="${w}" stroke-linecap="round" fill="none" opacity=".75"/>`;

export const ICONS = {
  coin: `<circle cx="24" cy="24" r="19" fill="#ffc928"/><path d="M5.5 25a18.5 18.5 0 0 0 37 0a18.5 14 0 0 1-37 0z" fill="#ef9d0c"/>
    <circle cx="24" cy="24" r="19" fill="none" ${st()}/><circle cx="24" cy="24" r="12.5" fill="none" stroke="#d98a0b" stroke-width="2.5"/>
    <path d="${starPath(24, 24.5, 7.5)}" fill="#d98a0b"/>${shine('M12.5 16a13 13 0 0 1 8-6')}`,
  ticket: `<g transform="rotate(-12 24 24)"><path d="M7 13h34a3 3 0 0 1 3 3v4.5a3.5 3.5 0 0 0 0 7V32a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4.5a3.5 3.5 0 0 0 0-7V16a3 3 0 0 1 3-3z" fill="#ff5a7e" ${st()}/>
    <path d="M16 16.5v15" stroke="#ffd0db" stroke-width="2.2" stroke-dasharray="2.6 2.6"/><path d="${starPath(30, 24, 6.5)}" fill="#fff3c4"/>${shine('M8 17.5h5', 2.5)}</g>`,
  flame: `<path d="M24 3.5c2 7 12 11.5 12 23a12 12 0 0 1-24 0c0-5.5 2.6-8.8 5.4-11 0 4.4 1.6 6.6 3.8 7.2C20 15.8 21 9 24 3.5z" fill="#ff7a1a" ${st()}/>
    <path d="M24 23.5c1.6 3.7 6.4 5.4 6.4 10.1a6.4 6.4 0 0 1-12.8 0c0-3.2 2.1-5.8 3.7-6.9.5 2.1 1.6 3.2 2.7 3.2-.5-2.1 0-4.3 0-6.4z" fill="#ffd23f"/>`,
  home: `<rect x="10" y="21" width="28" height="20" rx="2.5" fill="#fff1d6" ${st()}/><path d="M5 24L24 7l19 17z" fill="#ff5a4e" ${st()}/>
    <rect x="20" y="28" width="8" height="13" rx="2" fill="#a35a2c" ${st(2.5)}/>${shine('M11 21.5l10-9', 2.5)}`,
  map: `<path d="M6 12l11-4 14 4 11-4v28l-11 4-14-4-11 4z" fill="#f6e2a6" ${st()}/><path d="M17 8l14 4v28l-14-4z" fill="#ead08a"/>
    <path d="M6 12l11-4 14 4 11-4v28l-11 4-14-4-11 4z" fill="none" ${st()}/><path d="M17 8v28M31 12v28" stroke="${O}" stroke-width="2" opacity=".35"/>
    <path d="M11 31c4-2 6-9 11-9s7 4 10-2" stroke="#e8453c" stroke-width="2.6" stroke-dasharray="3 3.2" fill="none" stroke-linecap="round"/>
    <path d="M34 14l5 5M39 14l-5 5" stroke="#e8453c" stroke-width="3.2" stroke-linecap="round"/>`,
  practice: `<g transform="rotate(-30 24 24)"><rect x="13" y="21" width="22" height="6" rx="2" fill="#b9c3d3" ${st()}/>
    <rect x="4.5" y="12" width="10" height="24" rx="3.5" fill="#3d8bff" ${st()}/><rect x="33.5" y="12" width="10" height="24" rx="3.5" fill="#3d8bff" ${st()}/>
    ${shine('M8 16v8', 2.5)}${shine('M37 16v8', 2.5)}</g>`,
  shop: `<path d="M17 18v-4a7 7 0 0 1 14 0v4" fill="none" ${st(3.4)}/><path d="M9 17h30l-2 23a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#9b5cff" ${st()}/>
    <path d="M10 17h28l-.4 4.5H10.4z" fill="#7a3fe0"/><path d="M9 17h30l-2 23a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="none" ${st()}/>
    <path d="${starPath(24, 30, 7.5)}" fill="#ffd23f" ${st(1.8)}/>`,
  cards: `<rect x="9" y="9" width="22" height="30" rx="4" fill="#5aa9ff" ${st()} transform="rotate(-13 20 24)"/>
    <rect x="17" y="9" width="22" height="30" rx="4" fill="#fff6dc" ${st()} transform="rotate(9 28 24)"/>
    <path d="${starPath(28.5, 24, 7)}" fill="#ffc928" ${st(1.8)} transform="rotate(9 28 24)"/>`,
  help: `<circle cx="24" cy="24" r="19" fill="#3d8bff" ${st()}/><path d="M18.5 19a5.5 5.5 0 1 1 8 4.9c-1.6.9-2.5 2-2.5 3.6v1" fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round"/>
    <circle cx="24" cy="34.5" r="2.8" fill="#fff"/>`,
  gear: [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="20.3" y="3.5" width="7.4" height="10" rx="2" fill="#c3cbdb" ${st(2.6)} transform="rotate(${a} 24 24)"/>`).join('')
    + `<circle cx="24" cy="24" r="14" fill="#c3cbdb" ${st()}/><circle cx="24" cy="24" r="5.5" fill="#6b7590" ${st(2.6)}/>`,
  star: `<path d="${starPath(24, 25, 20)}" fill="#ffd23f" ${st()}/>${shine('M17 19.5l3.5-.6', 2.6)}`,
  starOff: `<path d="${starPath(24, 25, 20)}" fill="#cbbf9e" ${st()} opacity=".55"/>`,
  lock: `<path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" ${st(3.6)}/><rect x="9.5" y="21" width="29" height="21" rx="5" fill="#ffc928" ${st()}/>
    <circle cx="24" cy="30" r="3.2" fill="${O}"/><rect x="22.5" y="30.5" width="3" height="6.5" rx="1.5" fill="${O}"/>${shine('M13.5 25.5v6', 2.5)}`,
  check: `<circle cx="24" cy="24" r="19" fill="#2fcf6f" ${st()}/><path d="M15 24.5l6 6 12-13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: `<circle cx="24" cy="24" r="19" fill="#ff5a4e" ${st()}/><path d="M17 17l14 14M31 17L17 31" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,
  letter: `<rect x="5" y="11" width="38" height="27" rx="4" fill="#fff" ${st()}/><path d="M6.5 13.5L24 26l17.5-12.5" fill="none" ${st()}/>
    <path d="M24 33.5s-6-3.6-6-7.4a3.2 3.2 0 0 1 6-1.6 3.2 3.2 0 0 1 6 1.6c0 3.8-6 7.4-6 7.4z" fill="#ff4d6d" ${st(2)}/>`,
  scroll: `<rect x="11" y="9" width="26" height="30" rx="2" fill="#f6e2a6" ${st()}/><rect x="7" y="5.5" width="34" height="7.5" rx="3.7" fill="#d9a55a" ${st()}/>
    <rect x="7" y="35" width="34" height="7.5" rx="3.7" fill="#d9a55a" ${st()}/><path d="M16 19h16M16 24h16M16 29h10" stroke="#b08a4a" stroke-width="2.6" stroke-linecap="round"/>`,
  trophy: `<path d="M14 11H8a6 6 0 0 0 7.5 9.5M34 11h6a6 6 0 0 1-7.5 9.5" fill="none" ${st()}/><path d="M14 7h20v11a10 10 0 0 1-20 0z" fill="#ffc928" ${st()}/>
    <rect x="21" y="27.5" width="6" height="7" fill="#ef9d0c" ${st(2.5)}/><rect x="14" y="34" width="20" height="8" rx="2.5" fill="#a35a2c" ${st()}/>${shine('M18.5 11v6', 2.6)}`,
  phone: `<circle cx="24" cy="24" r="19" fill="#2fcf6f" ${st()}/>
    <path d="M17.5 13.5c-2 .2-3.9 2.2-3.5 4.6 1.5 8 8.4 14.9 16.4 16.4 2.4.4 4.4-1.5 4.6-3.5l.2-2.4-5.3-2.2-2.6 2.5c-3-1.5-5.5-4-7-7l2.5-2.6-2.2-5.3z" fill="#fff"/>`,
  book: `<path d="M24 14c-5-4-12-4-18-2v26c6-2 13-2 18 2 5-4 12-4 18-2V12c-6-2-13-2-18 2z" fill="#3d8bff" ${st()} transform="translate(0 2.5)"/>
    <path d="M24 13c-5-4-12-4-18-2v26c6-2 13-2 18 2 5-4 12-4 18-2V11c-6-2-13-2-18 2z" fill="#fff6dc" ${st()}/><path d="M24 13v26" ${st(2.5)}/>
    <path d="M10 18c3-1 7-1 10 .5M10 23c3-1 7-1 10 .5M28 18.5c3-1.5 7-1.5 10-.5M28 23.5c3-1.5 7-1.5 10-.5" stroke="#b08a4a" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
  bulb: `<path d="M24 5.5a12.5 12.5 0 0 0-7.3 22.6V32h14.6v-3.9A12.5 12.5 0 0 0 24 5.5z" fill="#ffe14d" ${st()}/>
    <rect x="17.5" y="32" width="13" height="8" rx="2.5" fill="#b9c3d3" ${st()}/>${shine('M19 18a6 6 0 0 1 5-5', 2.8)}`,
  crown: `<path d="M7 34L5 14l10 8 9-13 9 13 10-8-2 20z" fill="#ffc928" ${st()}/><rect x="7" y="33" width="34" height="7" rx="2.5" fill="#ef9d0c" ${st()}/>
    <circle cx="24" cy="26" r="3.2" fill="#ff4d6d" ${st(2)}/>`,
  chest: `<path d="M6 22v-4a9 8 0 0 1 9-8h18a9 8 0 0 1 9 8v4z" fill="#d07a35" ${st()}/><rect x="6" y="22" width="36" height="19" rx="3" fill="#b0642c" ${st()}/>
    <rect x="6" y="20" width="36" height="5" fill="#ffc928" ${st(2.5)}/><rect x="20" y="22" width="8" height="10" rx="2" fill="#ffc928" ${st(2.5)}/><circle cx="24" cy="27" r="1.6" fill="${O}"/>`,
  math: `<rect x="10" y="4.5" width="28" height="39" rx="5.5" fill="#3d8bff" ${st()}/><rect x="14.5" y="9" width="19" height="9" rx="2" fill="#dff4ff" ${st(2.2)}/>
    ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${14.5 + c * 7}" y="${22 + r * 6.8}" width="5" height="4.6" rx="1.3" fill="${r === 2 && c === 2 ? '#ffc928' : '#fff'}"/>`).join('')).join('')}`,
  pencil: `<g transform="rotate(40 24 24)"><rect x="18" y="3" width="12" height="31" rx="2" fill="#ffc928" ${st()}/><path d="M18 34h12l-6 10.5z" fill="#f6d7a8" ${st()}/>
    <path d="M22.3 41.2h3.4L24 44.5z" fill="${O}"/><rect x="18" y="3" width="12" height="7" rx="2" fill="#ff7a9a" ${st()}/>${shine('M21.5 13v16', 2.4)}</g>`,
  puzzle: `<path d="M10 14h8a4 4 0 1 1 8 0h8v8a4 4 0 1 1 0 8v8h-8a4 4 0 1 0-8 0h-8v-8a4 4 0 1 0 0-8z" fill="#2fcf6f" ${st()} transform="translate(1 .5)"/>${shine('M14.5 18.5v5', 2.5)}`,
  moon: `<path d="M30 6a18 18 0 1 0 12.5 26.5A15 15 0 0 1 30 6z" fill="#ffe14d" ${st()}/><circle cx="19" cy="20" r="2.4" fill="#f0c020"/><circle cx="16" cy="30" r="3" fill="#f0c020"/>`,
  music: `<path d="M19 33V13l20-5.5V28" fill="none" ${st(3.4)}/><path d="M19 13l20-5.5v5.5L19 18.5z" fill="${O}"/>
    <ellipse cx="14" cy="33.5" rx="6.5" ry="5.2" fill="#a06bff" ${st()} transform="rotate(-18 14 33.5)"/><ellipse cx="34" cy="28.5" rx="6.5" ry="5.2" fill="#a06bff" ${st()} transform="rotate(-18 34 28.5)"/>`,
  soundOn: `<path d="M7 19h7l11-9v28l-11-9H7z" fill="#c3cbdb" ${st()}/><path d="M31 18a8 8 0 0 1 0 12M36 13a14 14 0 0 1 0 22" fill="none" ${st(3.2)}/>`,
  mute: `<path d="M7 19h7l11-9v28l-11-9H7z" fill="#c3cbdb" ${st()}/><path d="M32 19l9 10M41 19l-9 10" stroke="#ff5a4e" stroke-width="4.4" stroke-linecap="round"/>`,
  play: `<path d="M17 10.5l21 13.5-21 13.5z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`,
  next: `<path d="M29 11L16 24l13 13" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="M14 14l20 20M34 14L14 34" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>`,
  plus: `<path d="M24 12v24M12 24h24" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>`,
  minus: `<path d="M12 24h24" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>`,
  backspace: `<path d="M17 12h20a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H17L6 24z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M21 19l10 10M31 19L21 29" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`,
};

/** אייקון כ־SVG. cls נוסף לקלאס הבסיסי ico */
export const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true">${ICONS[name] || ''}</svg>`;
