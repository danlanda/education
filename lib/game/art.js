/* איורים – מצוירים בקוד (SVG), בלי קבצי תמונה */

let GID = 0;
function rng(seed){ let s = 7; for(const c of seed) s = (s*31 + c.charCodeAt(0)) >>> 0; return ()=>{ s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; }
export const star4 = (x,y,r,fill='#fff6c8',op=1)=>`<path d="M${x} ${y-r}L${x+r*.22} ${y-r*.22}L${x+r} ${y}L${x+r*.22} ${y+r*.22}L${x} ${y+r}L${x-r*.22} ${y+r*.22}L${x-r} ${y}L${x-r*.22} ${y-r*.22}Z" fill="${fill}" opacity="${op}"/>`;

export function sky(id, night, top, bottom, seed, sun){
  const t = night ? '#0b0a2a' : top, b = night ? '#3a2c70' : bottom;
  let s = `<defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="${id}glow"><stop offset="0" stop-color="#fff7c2" stop-opacity=".95"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="320" fill="url(#${id}sky)"/>`;
  if(night){
    const r = rng(seed);
    for(let i=0;i<46;i++) s += `<circle cx="${(r()*800).toFixed(0)}" cy="${(r()*190).toFixed(0)}" r="${(r()*1.6+.5).toFixed(1)}" fill="#fff" opacity="${(r()*.6+.4).toFixed(2)}"/>`;
    s += `<circle cx="660" cy="80" r="80" fill="url(#${id}glow)" opacity=".5"/><circle cx="660" cy="80" r="28" fill="#fdf3c4"/><circle cx="650" cy="74" r="5" fill="#efe2a8"/><circle cx="668" cy="90" r="4" fill="#efe2a8"/>`;
  } else if(sun){
    s += `<circle cx="${sun[0]}" cy="${sun[1]}" r="120" fill="url(#${id}glow)" opacity=".8"/><circle cx="${sun[0]}" cy="${sun[1]}" r="38" fill="#fff4b8"/>`;
  }
  return s;
}
export function eraserFig(x,y,s=1,op=1){
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op}">
    <ellipse cx="0" cy="48" rx="46" ry="7" fill="#000" opacity=".35"/>
    <path d="M0 -72C-24 -72 -36 -50 -36 -28L-50 46Q0 58 50 46L36 -28C36 -50 24 -72 0 -72Z" fill="#0d0716"/>
    <path d="M-36 -10Q-60 10 -52 40L-40 40Q-44 14 -30 0Z" fill="#160c24"/><path d="M36 -10Q60 10 52 40L40 40Q44 14 30 0Z" fill="#160c24"/>
    <path d="M0 -62C-15 -62 -22 -48 -22 -34Q0 -20 22 -34C22 -48 15 -62 0 -62Z" fill="#000"/>
    <ellipse cx="-8" cy="-40" rx="7" ry="4" fill="#ff4d6d" opacity=".35"/><ellipse cx="8" cy="-40" rx="7" ry="4" fill="#ff4d6d" opacity=".35"/>
    <ellipse cx="-8" cy="-40" rx="3.4" ry="1.8" fill="#ff8095"/><ellipse cx="8" cy="-40" rx="3.4" ry="1.8" fill="#ff8095"/>
  </g>`;
}
function boat(x,y,k,sail){
  return `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-34 0L34 0L26 14Q0 20 -26 14Z" fill="#6b3f22" stroke="#3a2414" stroke-width="2.5"/>
    <path d="M0 0V-46" stroke="#3a2414" stroke-width="3"/><path d="M-22 -40H22V-8H-22Z" fill="${sail}" stroke="#3a2414" stroke-width="1.5" opacity=".95"/></g>`;
}
function camel(x,y,s,c){
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}">
    <ellipse cx="0" cy="0" rx="24" ry="11"/><ellipse cx="3" cy="-9" rx="11" ry="10"/>
    <path d="M-18 -4Q-27 -10 -28 -25L-22 -27Q-20 -13 -11 -6Z"/><ellipse cx="-30" cy="-27" rx="8" ry="4.5"/>
    <rect x="-17" y="5" width="3.5" height="24" rx="1.5"/><rect x="-10" y="5" width="3.5" height="24" rx="1.5"/>
    <rect x="9" y="5" width="3.5" height="24" rx="1.5"/><rect x="15" y="5" width="3.5" height="24" rx="1.5"/>
    <path d="M23 -2Q30 4 27 12" stroke="${c}" stroke-width="2" fill="none"/>
    <rect x="-4" y="-24" width="14" height="8" rx="3" fill="#b03a2e" opacity=".85"/></g>`;
}
function roof(cx,y,w,h,fill){
  return `<path d="M${cx-w/2-14} ${y-14}Q${cx-w/2+w*.08} ${y+2} ${cx-w/2+w*.2} ${y}L${cx+w/2-w*.2} ${y}Q${cx+w/2-w*.08} ${y+2} ${cx+w/2+14} ${y-14}L${cx+w*.3} ${y-h}L${cx-w*.3} ${y-h}Z" fill="${fill}"/>
    <path d="M${cx-w*.3} ${y-h}L${cx+w*.3} ${y-h}" stroke="#f0c35a" stroke-width="4"/>`;
}
function facade(x,y,w,h,color,night,seed){
  const r = rng(seed); let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/><rect x="${x}" y="${y}" width="${w}" height="8" fill="#000" opacity=".12"/>`;
  const cols = Math.max(2, Math.floor(w/30)), gap = w/cols;
  for(let ry=y+26; ry<y+h-40; ry+=46) for(let c=0;c<cols;c++){
    const wx = x + c*gap + gap/2 - 7, lit = night && r()>.35;
    s += `<path d="M${wx} ${ry+26}V${ry+8}A7 7 0 0 1 ${wx+14} ${ry+8}V${ry+26}Z" fill="${lit?'#ffd36b':night?'#1a1433':'#5a3524'}"/>`;
  }
  return s;
}

const SCENES = {
  alexandria(id,o){
    let s = sky(id,o.night,'#f7b98c','#ffe9bd','alx',[150,88]);
    const sea = o.night ? '#1d2a5e' : '#2f8fc7', stone = o.night ? '#cfc6e0' : '#f4ead2', line = '#b9a37a';
    s += `<rect y="212" width="800" height="108" fill="${sea}"/>`;
    for(let i=0;i<16;i++) s += `<rect x="${(i*61)%780}" y="${226+(i*13)%80}" width="${16+(i%4)*7}" height="2.5" rx="1" fill="#fff" opacity=".4"/>`;
    // הספרייה הגדולה
    s += `<path d="M0 218Q160 196 330 210L330 236L0 236Z" fill="${o.night?'#4b4166':'#d8bf86'}"/>`;
    s += `<path d="M28 132L170 92L312 132Z" fill="${stone}" stroke="${line}" stroke-width="2"/><rect x="36" y="132" width="268" height="12" fill="${stone}" stroke="${line}" stroke-width="2"/>`;
    for(let c=0;c<8;c++) s += `<rect x="${48+c*33}" y="144" width="13" height="56" fill="${stone}" stroke="${line}" stroke-width="1.5"/>`;
    s += `<rect x="30" y="200" width="280" height="12" fill="${o.night?'#bdb3d2':'#e6d7b2'}" stroke="${line}" stroke-width="2"/>`;
    s += `<circle cx="170" cy="118" r="9" fill="#e8b84a"/>`;
    // המגדלור של אלכסנדריה
    s += `<path d="M560 216Q650 196 770 216Z" fill="${o.night?'#4b4166':'#c9b07a'}"/>`;
    if(!o.night) s += ''; 
    s += `<g transform="translate(0 38) scale(1 .9)">`;
    s += `<circle cx="664" cy="40" r="58" fill="#ffd96a" opacity="${o.night?'.45':'.28'}"/>`;
    s += `<rect x="622" y="146" width="84" height="64" fill="${stone}" stroke="${line}" stroke-width="2"/><rect x="637" y="92" width="54" height="54" fill="${stone}" stroke="${line}" stroke-width="2"/>`;
    s += `<rect x="649" y="58" width="30" height="34" fill="${stone}" stroke="${line}" stroke-width="2"/><path d="M645 58L664 40L683 58Z" fill="#c98d1e"/>`;
    s += `<path d="M664 22q11 12 0 24q-11-12 0-24z" fill="#ff7a1a"/><path d="M664 30q5 6 0 12q-5-6 0-12z" fill="#ffd23f"/>`;
    [[640,164],[676,164],[652,110],[664,70]].forEach(([x,y])=> s += `<rect x="${x}" y="${y}" width="10" height="16" rx="5" fill="${o.night?'#ffd36b':'#5a3524'}"/>`);
    s += `</g>`;
    s += boat(430,236,1.1,'#fff8e6') + boat(530,262,.8,'#ffd9a0') + boat(360,270,.7,'#f3c6c6');
    return s;
  },
  harbor(id,o){
    let s = sky(id,o.night,'#8fd0f2','#fff0c2','hrb',[640,80]);
    s += `<rect y="214" width="800" height="106" fill="${o.night?'#1d2a5e':'#2f8fc7'}"/>`;
    for(let i=0;i<14;i++) s += `<rect x="${(i*67)%790}" y="${232+(i*11)%70}" width="${18+(i%3)*8}" height="2.5" rx="1" fill="#fff" opacity=".4"/>`;
    s += `<path d="M560 220Q680 196 800 204L800 320L540 320Z" fill="${o.night?'#4b4166':'#d8bf86'}"/>`;
    // הספינה הענקית – סירקוסיה
    s += `<path d="M70 196L470 196L440 250Q270 268 100 250Z" fill="#7a4b2a" stroke="#4a2c18" stroke-width="3"/>`;
    s += `<path d="M84 206H456" stroke="#a8743f" stroke-width="5"/><path d="M92 220H448" stroke="#5c3a1e" stroke-width="2"/>`;
    for(let i=0;i<14;i++) s += `<circle cx="${110+i*24}" cy="232" r="4" fill="#3a2414"/>`;
    [[150,70],[270,46],[390,80]].forEach(([x,top])=>{ s += `<path d="M${x} 196V${top}" stroke="#4a2c18" stroke-width="5"/><path d="M${x-40} ${top+16}Q${x} ${top+40} ${x+40} ${top+16}L${x+36} ${top+96}Q${x} ${top+112} ${x-36} ${top+96}Z" fill="#fff8e6" stroke="#c9b07a" stroke-width="2"/>`; });
    // גן על הסיפון
    [[120,186],[134,182],[330,186],[344,182],[420,186]].forEach(([x,y])=> s += `<circle cx="${x}" cy="${y}" r="9" fill="#5d9a4a"/>`);
    s += `<path d="M150 70l18 6-18 6z" fill="#c0392b"/>`;
    // הגלגלות של ארכימדס והחבל
    s += `<path d="M470 204Q560 196 640 176" stroke="#c9a46b" stroke-width="3" fill="none"/>`;
    s += `<rect x="630" y="118" width="10" height="80" fill="#6b4a2b"/><rect x="690" y="118" width="10" height="80" fill="#6b4a2b"/><rect x="624" y="112" width="82" height="10" fill="#7a5530"/>`;
    [[650,140],[668,150],[686,140]].forEach(([x,y])=> s += `<circle cx="${x}" cy="${y}" r="9" fill="#d8bf86" stroke="#6b4a2b" stroke-width="3"/>`);
    s += `<path d="M650 131L686 131M650 149L686 149M659 140L677 140" stroke="#c9a46b" stroke-width="2"/>`;
    // ארכימדס יושב ומושך ביד אחת
    s += `<g transform="translate(728 196)"><ellipse cx="0" cy="-30" rx="15" ry="20" fill="#f3e2bb"/><circle cx="0" cy="-56" r="10" fill="#e8b48a"/><path d="M-10 -60Q0 -72 10 -60" fill="#d8d8d8"/><path d="M-6 -48Q0 -40 6 -48L4 -42Q0 -38 -4 -42Z" fill="#eee"/><path d="M-12 -34L-40 -48" stroke="#e8b48a" stroke-width="5" stroke-linecap="round"/><rect x="-18" y="-12" width="36" height="12" rx="3" fill="#7a5530"/></g>`;
    s += `<path d="M688 150Q700 150 690 148L688 148" stroke="#c9a46b" stroke-width="2"/><path d="M686 150L688 148" stroke="#c9a46b"/>`;
    return s;
  },
  siege(id,o){
    let s = sky(id,o.night,'#f29b6b','#ffd9a8','sg',[690,70]);
    s += `<rect y="214" width="800" height="106" fill="${o.night?'#1d2a5e':'#2d7fb8'}"/>`;
    for(let i=0;i<16;i++) s += `<rect x="${280+(i*53)%520}" y="${228+(i*13)%80}" width="${16+(i%3)*8}" height="2.5" rx="1" fill="#fff" opacity=".4"/>`;
    // חומות סירקוזה
    const W = o.night ? '#8e86a8' : '#c9b48a', D = o.night ? '#6e6688' : '#a8936a';
    s += `<rect x="0" y="120" width="250" height="110" fill="${W}"/><rect x="0" y="120" width="250" height="110" fill="url(#${id}sky)" opacity=".08"/>`;
    for(let i=0;i<9;i++) s += `<rect x="${i*28}" y="108" width="16" height="14" fill="${W}"/>`;
    for(let r=0;r<4;r++) for(let c=0;c<9;c++) s += `<rect x="${(c*28)+(r%2?14:0)}" y="${132+r*24}" width="26" height="22" fill="none" stroke="${D}" stroke-width="1.5"/>`;
    s += `<rect x="170" y="74" width="62" height="156" fill="${W}" stroke="${D}" stroke-width="2"/>`;
    for(let i=0;i<3;i++) s += `<rect x="${172+i*22}" y="62" width="14" height="14" fill="${W}"/>`;
    s += `<rect x="190" y="104" width="12" height="20" rx="6" fill="#3a2a1a"/>`;
    // הצבת של ארכימדס: זרוע ענקית, שרשרת וטופר
    s += `<path d="M228 92L520 40" stroke="#6b4a2b" stroke-width="12" stroke-linecap="round"/><path d="M228 92L520 40" stroke="#8a6238" stroke-width="5" stroke-linecap="round"/>`;
    s += `<circle cx="228" cy="92" r="12" fill="#5a3a1e"/><path d="M520 40V120" stroke="#3a3a3a" stroke-width="4" stroke-dasharray="6 3"/>`;
    s += `<path d="M500 120Q520 108 540 120L548 140Q540 132 534 136L520 130L506 136Q500 132 492 140Z" fill="#4a4a4a" stroke="#222" stroke-width="2"/>`;
    // ספינה רומאית מורמת מהמים
    s += `<g transform="translate(520 156) rotate(-32)"><path d="M-80 0L80 0L66 26Q0 36 -66 26Z" fill="#6b3f22" stroke="#3a2414" stroke-width="3"/><path d="M0 0V-64" stroke="#3a2414" stroke-width="4"/><path d="M-30 -56H30V-14H-30Z" fill="#c0392b" stroke="#7a1f16" stroke-width="2"/><circle cx="0" cy="-35" r="8" fill="none" stroke="#ffd96a" stroke-width="3"/><circle cx="0" cy="-35" r="2.5" fill="#ffd96a"/></g>`;
    s += `<path d="M470 214q10-22 22 0q10-18 22 0q12-22 24 0" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/>`;
    for(let i=0;i<6;i++) s += `<circle cx="${480+i*14}" cy="${196-(i%3)*14}" r="${3+i%2}" fill="#bfe6ff"/>`;
    // ספינות רומיות נוספות
    s += boat(660,246,1,'#c0392b') + boat(750,268,.8,'#c0392b');
    // אבנים מעופפות מהקטפולטות
    s += `<path d="M240 130Q400 20 600 200" stroke="#fff" stroke-width="2" stroke-dasharray="4 8" fill="none" opacity=".6"/><circle cx="430" cy="74" r="9" fill="#7a6a5a" stroke="#4a3a2a" stroke-width="2"/>`;
    return s;
  },
  library(id,o){
    const r = rng('lib');
    let s = `<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26173f"/><stop offset="1" stop-color="#4a2c4f"/></linearGradient>
      <radialGradient id="${id}bk"><stop offset="0" stop-color="#ffe9a3" stop-opacity="${o.eraser?.45:.95}"/><stop offset=".5" stop-color="#ffc94d" stop-opacity="${o.eraser?.12:.35}"/><stop offset="1" stop-color="#ffc94d" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="320" fill="url(#${id}w)"/>
      <path d="M330 40Q400 -8 470 40V185H330Z" fill="#100c38"/>`;
    for(let i=0;i<14;i++) s += `<circle cx="${(340+r()*120).toFixed(0)}" cy="${(30+r()*140).toFixed(0)}" r="${(r()*1.4+.5).toFixed(1)}" fill="#fff" opacity=".8"/>`;
    s += `<circle cx="438" cy="72" r="15" fill="#fdf3c4"/>
      <path d="M330 40Q400 -8 470 40V185H330Z" fill="none" stroke="#6b4a2b" stroke-width="9"/><path d="M400 18V185M330 105H470" stroke="#6b4a2b" stroke-width="6"/>`;
    const colors = ['#8e3b46','#2e6b8a','#c48a2c','#3f7d4f','#6a4c93','#b5523b','#2f4858','#d1a54b'];
    [[16,262],[538,784]].forEach(([x0,x1])=>{
      s += `<rect x="${x0-6}" y="30" width="${x1-x0+12}" height="250" fill="#3a2416"/>`;
      [96,176,256].forEach(sy=>{
        let x = x0;
        while(x < x1-8){ const w = 9+r()*10, h = 46+r()*22; s += `<rect x="${x.toFixed(0)}" y="${(sy-h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="1.5" fill="${colors[Math.floor(r()*colors.length)]}"/><rect x="${x.toFixed(0)}" y="${(sy-h+8).toFixed(0)}" width="${w.toFixed(0)}" height="3" fill="#f0c35a" opacity=".6"/>`; x += w+1.5; }
        s += `<rect x="${x0-6}" y="${sy}" width="${x1-x0+12}" height="9" fill="#5b3a24"/>`;
      });
    });
    s += `<rect y="276" width="800" height="44" fill="#22142c"/>
      <circle cx="400" cy="185" r="190" fill="url(#${id}bk)"/>
      <rect x="372" y="226" width="56" height="52" fill="#5b3a24"/><rect x="338" y="218" width="124" height="11" rx="3" fill="#7a5034"/>
      <path d="M298 216Q350 200 400 212Q450 200 502 216V226Q450 211 400 223Q350 211 298 226Z" fill="#7a2c34"/>
      <path d="M304 213Q350 196 400 208V146Q350 132 304 150Z" fill="#fff8e1"/>
      <path d="M496 213Q450 196 400 208V146Q450 132 496 150Z" fill="#fff1cc"/>`;
    for(let k=0;k<4;k++) s += `<path d="M318 ${163+k*11}Q352 ${153+k*11} 388 ${161+k*11}" stroke="#c9b48a" stroke-width="2.4" fill="none" ${o.eraser&&k>1?'opacity=".15"':''}/><path d="M412 ${161+k*11}Q448 ${153+k*11} 482 ${163+k*11}" stroke="#c9b48a" stroke-width="2.4" fill="none" ${o.eraser&&k%2?'opacity=".15"':''}/>`;
    if(!o.eraser){ s += star4(300,120,11)+star4(505,105,14)+star4(455,70,7)+star4(345,85,6)+star4(400,128,8,'#fff'); }
    else {
      s += eraserFig(170,232,1.35);
      [[250,150,20],[280,110,-30],[230,95,45],[320,70,-12]].forEach(([x,y,a],i)=> s += `<rect x="${x}" y="${y}" width="26" height="34" rx="2" fill="#fff8e1" opacity="${.85-i*.17}" transform="rotate(${a} ${x+13} ${y+17})"/>`);
    }
    return s;
  },

  syracuse(id,o){
    let s = sky(id,o.night,'#86cdf0','#ffe2a6','syr',[610,105]);
    s += `<defs><linearGradient id="${id}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.night?'#23306b':'#2f95cf'}"/><stop offset="1" stop-color="${o.night?'#141a40':'#185a96'}"/></linearGradient></defs>
      <rect y="206" width="800" height="114" fill="url(#${id}sea)"/>`;
    for(let i=0;i<14;i++) s += `<rect x="${420+((i*53)%360)}" y="${222+(i*17)%80}" width="${18+(i%3)*8}" height="2.5" rx="1" fill="#fff" opacity=".45"/>`;
    s += `<path d="M0 212Q130 140 320 168Q450 186 540 214Z" fill="${o.night?'#4b4166':'#c2ab6f'}"/>
      <path d="M0 212Q90 170 200 180Q300 190 380 214Z" fill="${o.night?'#3d3456':'#b09658'}"/>`;
    const H = o.night ? '#d8d2e8' : '#fbf6ea', R = o.night ? '#8a5a6a' : '#c8643c';
    [[40,186,30,22],[78,178,26,28],[262,182,34,24],[302,190,26,20],[345,196,28,18]].forEach(([x,y,w,h])=>{
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${H}"/><path d="M${x-3} ${y}L${x+w/2} ${y-10}L${x+w+3} ${y}Z" fill="${R}"/><rect x="${x+w/2-3}" y="${y+h-11}" width="6" height="11" fill="#6b4a2b" opacity=".6"/>`;
    });
    s += `<rect x="128" y="150" width="128" height="10" fill="${H}"/><rect x="134" y="142" width="116" height="8" fill="${H}"/>`;
    for(let c=0;c<7;c++) s += `<rect x="${140+c*17}" y="104" width="8" height="38" fill="${H}"/>`;
    s += `<rect x="132" y="96" width="120" height="9" fill="${H}"/><path d="M128 96L192 70L256 96Z" fill="${H}"/><path d="M146 92L192 76L238 92Z" fill="#000" opacity=".06"/>
      <rect y="200" width="420" height="16" fill="${o.night?'#6d6488':'#d8c093'}"/>`;
    for(let c=0;c<21;c++) s += `<rect x="${c*20}" y="193" width="11" height="8" fill="${o.night?'#6d6488':'#d8c093'}"/>`;
    [[110,168],[118,172],[232,166]].forEach(([x,y])=> s += `<ellipse cx="${x}" cy="${y}" rx="6" ry="24" fill="${o.night?'#1f3a33':'#2f5e3a'}"/>`);
    s += `<path d="M590 248Q640 262 700 248L692 262Q640 272 598 262Z" fill="#6b3f22"/><path d="M645 250V192" stroke="#4a2c18" stroke-width="3"/><path d="M647 196L690 240H647Z" fill="#fff8ea"/><path d="M643 200L612 238H643Z" fill="#f3e2bb"/>
      <path d="M0 320V280Q60 258 140 276Q200 288 230 320Z" fill="${o.night?'#2b2440':'#8a7552'}"/>`;
    return s;
  },

  bath(id,o){
    let s = `<defs><linearGradient id="${id}wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0dcb2"/><stop offset="1" stop-color="#ddc08b"/></linearGradient>
      <linearGradient id="${id}wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd3f7"/><stop offset="1" stop-color="#3a9bd6"/></linearGradient></defs>
      <rect width="800" height="320" fill="url(#${id}wl)"/>
      <path d="M330 30Q400 -10 470 30V120H330Z" fill="#8fd1f2"/><circle cx="440" cy="60" r="16" fill="#fff4b8"/><path d="M330 30Q400 -10 470 30V120H330Z" fill="none" stroke="#c9a46b" stroke-width="8"/>`;
    const mc = ['#2f6f8f','#e0a43a','#a8432f','#f6efe0'];
    for(let i=0;i<67;i++) s += `<rect x="${i*12}" y="134" width="12" height="12" fill="${mc[i%4]}"/>`;
    [40,712].forEach(x=>{ s += `<rect x="${x}" y="20" width="48" height="262" fill="#f6efe0"/><rect x="${x-8}" y="14" width="64" height="16" fill="#e8dcc4"/>`;
      for(let f=0;f<4;f++) s += `<rect x="${x+8+f*10}" y="34" width="3" height="240" fill="#d8c9a8"/>`; });
    for(let i=0;i<20;i++) for(let j=0;j<2;j++) s += `<rect x="${i*40}" y="${280+j*20}" width="40" height="20" fill="${(i+j)%2?'#c49a5f':'#b0844d'}"/>`;
    s += `<path d="M224 238Q236 304 400 304Q564 304 576 238Z" fill="#e9e2d3" stroke="#cbbfa6" stroke-width="3"/>
      <ellipse cx="400" cy="238" rx="178" ry="28" fill="#f7f2e8"/><ellipse cx="400" cy="238" rx="160" ry="20" fill="url(#${id}wt)"/>
      <path d="M232 244Q220 270 226 300" stroke="#5fb8e8" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M568 244Q584 268 578 302" stroke="#5fb8e8" stroke-width="7" fill="none" stroke-linecap="round"/>
      <ellipse cx="208" cy="306" rx="34" ry="7" fill="#5fb8e8" opacity=".7"/><ellipse cx="596" cy="307" rx="36" ry="7" fill="#5fb8e8" opacity=".7"/>
      <path d="M380 236L338 178" stroke="#e8b48a" stroke-width="12" stroke-linecap="round"/><path d="M420 236L462 178" stroke="#e8b48a" stroke-width="12" stroke-linecap="round"/>
      <circle cx="336" cy="172" r="10" fill="#e8b48a"/><circle cx="464" cy="172" r="10" fill="#e8b48a"/>
      <circle cx="384" cy="190" r="9" fill="#cfcfcf"/><circle cx="400" cy="184" r="10" fill="#cfcfcf"/><circle cx="416" cy="190" r="9" fill="#cfcfcf"/>
      <circle cx="400" cy="208" r="25" fill="#e8b48a"/>
      <path d="M378 212Q400 252 422 212Q412 226 400 226Q388 226 378 212Z" fill="#dcdcdc"/>
      <circle cx="391" cy="203" r="3" fill="#3a2614"/><circle cx="409" cy="203" r="3" fill="#3a2614"/>
      <ellipse cx="400" cy="217" rx="5" ry="6.5" fill="#7a2c2c"/>
      <ellipse cx="400" cy="240" rx="40" ry="8" fill="url(#${id}wt)"/>`;
    [[300,200],[310,170],[500,190],[492,160],[280,226],[524,222],[350,150],[455,145]].forEach(([x,y],i)=> s += `<ellipse cx="${x}" cy="${y}" rx="${5+i%3}" ry="${8+i%3}" fill="#7fd3f7" opacity=".9"/>`);
    s += [0,1,2].map(i=>`<path d="M${330+i*60} 130Q${320+i*60} 110 ${336+i*60} 92Q${350+i*60} 74 ${338+i*60} 56" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`).join('');
    s += star4(530,110,16,'#f0c35a')+star4(270,120,11,'#f0c35a')+star4(560,70,8,'#f0c35a');
    return s;
  },

  venice(id,o){
    let s = sky(id,o.night,'#ffae7a','#ffe7b8','ven',[400,120]);
    s += `<rect x="388" y="40" width="26" height="150" fill="${o.night?'#4b3a5c':'#c27b56'}"/><path d="M384 40L401 6L418 40Z" fill="${o.night?'#3a2d4a':'#7a8a5a'}"/><rect x="392" y="52" width="18" height="16" fill="${o.night?'#ffd36b':'#5a3524'}"/>`;
    const left = [[0,70,96,190,'#d9825b'],[96,100,84,160,'#e6b85c'],[180,85,92,175,'#c95f4a']], right = [[528,90,94,170,'#e8c9a0'],[622,64,86,196,'#cf6b4c'],[708,96,92,164,'#e3a95a']];
    left.concat(right).forEach(([x,y,w,h,c],i)=>{ s += facade(x,y,w,h,o.night?'#4a3d66':c,o.night,'f'+i); s += `<rect x="${x-4}" y="${y-8}" width="${w+8}" height="10" fill="${o.night?'#2b2340':'#8a4b30'}"/>`; });
    s += `<defs><linearGradient id="${id}cn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.night?'#1f3b5c':'#2fa597'}"/><stop offset="1" stop-color="${o.night?'#0f1d36':'#1a6c70'}"/></linearGradient></defs>
      <rect y="254" width="800" height="66" fill="url(#${id}cn)"/>`;
    left.concat(right).forEach(([x,,w,,c])=> s += `<rect x="${x+6}" y="258" width="${w-12}" height="40" fill="${o.night?'#6a5a90':c}" opacity=".25"/>`);
    for(let i=0;i<12;i++) s += `<rect x="${(i*71)%780}" y="${264+(i*13)%48}" width="${24+(i%3)*10}" height="2.5" rx="1" fill="#fff" opacity=".35"/>`;
    s += `<path d="M262 236Q400 160 538 236" stroke="${o.night?'#8a82a8':'#efe3cb'}" stroke-width="22" fill="none"/>
      <path d="M262 222Q400 146 538 222" stroke="${o.night?'#6f6890':'#d9c9a8'}" stroke-width="5" fill="none"/>
      <rect x="252" y="226" width="22" height="34" fill="${o.night?'#8a82a8':'#efe3cb'}"/><rect x="526" y="226" width="22" height="34" fill="${o.night?'#8a82a8':'#efe3cb'}"/>
      <path d="M318 282Q400 304 512 280L530 266Q518 288 470 292Q400 300 330 290Z" fill="#141018"/>
      <path d="M318 282L306 270" stroke="#141018" stroke-width="4"/>
      <rect x="462" y="250" width="9" height="30" rx="3" fill="${o.night?'#1a1433':'#2a2a3a'}"/><circle cx="466.5" cy="243" r="7" fill="#e8b48a"/>
      <rect x="459" y="236" width="15" height="4" fill="#b8322c"/><path d="M467 262L436 318" stroke="#5a3a1e" stroke-width="3"/>`;
    if(o.eraser) s += eraserFig(400,150,.55);
    return s;
  },

  desert(id,o){
    const n = o.night;
    let s = sky(id,n,'#7cc6ee','#fde6b0','des',[190,95]);
    s += `<path d="M0 200Q150 150 300 186T600 176T800 192V320H0Z" fill="${n?'#5a4a8a':'#ecbd78'}"/>`;
    if(o.eraser) s += eraserFig(230,152,.42);
    s += `<path d="M0 238Q200 192 420 226T800 214V320H0Z" fill="${n?'#46397a':'#dda055'}"/>`;
    [[480,206],[540,203],[600,202],[660,204]].forEach(([x,y],i)=> s += camel(x,y,.82,n?'#1c1538':'#6b4423'));
    s += `<path d="M454 206H690" stroke="${n?'#1c1538':'#6b4423'}" stroke-width="1.5" opacity=".7"/>
      <path d="M0 280Q250 244 500 272T800 264V320H0Z" fill="${n?'#352a63':'#c98a3e'}"/>`;
    if(!n) s += `<path d="M60 150H140M90 162H190M500 120H560" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`;
    return s;
  },

  palace(id,o){
    const n = o.night;
    let s = sky(id,n,'#8ecae6','#fff1cf','pal',[650,80]);
    s += `<path d="M0 200L90 120L170 175L260 105L360 180L470 110L580 172L690 116L800 180V320H0Z" fill="${n?'#2e2a5a':'#a9c6d9'}"/>
      <path d="M0 230L120 170L240 220L380 160L520 222L660 168L800 220V320H0Z" fill="${n?'#25224d':'#8fb3c9'}"/>
      <rect x="170" y="268" width="460" height="14" fill="#efe9dc"/><rect x="200" y="256" width="400" height="14" fill="#f6f1e6"/><rect x="230" y="244" width="340" height="14" fill="#efe9dc"/>
      <rect x="262" y="176" width="276" height="70" fill="#7a1f1a"/>`;
    for(let c=0;c<8;c++) s += `<rect x="${268+c*37}" y="176" width="12" height="70" fill="#c0392b"/>`;
    s += `<rect x="378" y="196" width="44" height="50" fill="#f0c35a"/><path d="M400 196V246" stroke="#b07d17" stroke-width="2"/>
      ${roof(400,178,330,32,n?'#164a40':'#1f6f5c')}
      <rect x="326" y="122" width="148" height="34" fill="#a8281f"/>${roof(400,124,236,36,n?'#164a40':'#1f6f5c')}
      <circle cx="400" cy="84" r="7" fill="#f0c35a"/>
      <rect x="110" y="214" width="70" height="40" fill="#a8281f"/>${roof(145,216,80,22,n?'#164a40':'#1f6f5c')}
      <rect x="620" y="214" width="70" height="40" fill="#a8281f"/>${roof(655,216,80,22,n?'#164a40':'#1f6f5c')}`;
    [[250,188],[550,188],[300,186],[500,186]].forEach(([x,y])=> s += `<path d="M${x} ${y-12}V${y-4}" stroke="#3a2614" stroke-width="1.5"/><ellipse cx="${x}" cy="${y+6}" rx="10" ry="12" fill="${n?'#ff6b4a':'#e74c3c'}"/><path d="M${x} ${y+18}V${y+28}" stroke="#f0c35a" stroke-width="2"/>${n?`<circle cx="${x}" cy="${y+6}" r="26" fill="#ff9a5a" opacity=".25"/>`:''}`);
    s += `<circle cx="40" cy="276" r="40" fill="${n?'#3a2a50':'#f4a6c0'}"/><circle cx="80" cy="292" r="30" fill="${n?'#33244a':'#f7b9cd'}"/>
      <circle cx="770" cy="280" r="42" fill="${n?'#3a2a50':'#f4a6c0'}"/><rect y="300" width="800" height="20" fill="${n?'#1d1838':'#7fa36b'}"/>`;
    return s;
  },

  prison(id,o){
    let s = `<defs><radialGradient id="${id}cg"><stop offset="0" stop-color="#ffd36b" stop-opacity=".7"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="320" fill="#3b3d52"/>`;
    for(let row=0; row<12; row++) for(let c=0;c<18;c++){ const x = c*48 - (row%2?24:0); s += `<rect x="${x+2}" y="${row*26+2}" width="44" height="22" rx="3" fill="${(row*7+c*3)%5?'#45475e':'#4c4e66'}"/>`; }
    s += `<rect x="338" y="44" width="124" height="88" fill="#15113a"/><circle cx="430" cy="74" r="14" fill="#fdf3c4"/>`;
    for(let i=0;i<5;i++) s += `<circle cx="${350+i*24}" cy="${60+(i*17)%50}" r="1.2" fill="#fff"/>`;
    for(let b=0;b<5;b++) s += `<rect x="${352+b*24}" y="44" width="7" height="88" fill="#1b1b24"/>`;
    s += `<rect x="332" y="38" width="136" height="8" fill="#2a2b38"/><rect x="332" y="130" width="136" height="8" fill="#2a2b38"/>
      <path d="M338 136H462L580 320H220Z" fill="#fff3c4" opacity=".1"/>
      <rect y="276" width="800" height="44" fill="#26273a"/>
      <path d="M30 300Q90 270 170 296Q120 312 30 310Z" fill="#b8913a"/><path d="M40 296L60 284M80 292L100 280M120 294L136 284" stroke="#d9b25f" stroke-width="2"/>
      <circle cx="560" cy="206" r="70" fill="url(#${id}cg)"/>
      <rect x="470" y="226" width="240" height="12" fill="#7a4b2a"/><rect x="486" y="238" width="10" height="44" fill="#5b3a24"/><rect x="684" y="238" width="10" height="44" fill="#5b3a24"/>
      <rect x="553" y="198" width="12" height="28" fill="#f4ead1"/><ellipse cx="559" cy="190" rx="5.5" ry="10" fill="#ffcc4d"/><ellipse cx="559" cy="193" rx="2.5" ry="5" fill="#fff"/>
      <rect x="600" y="208" width="70" height="18" rx="3" fill="#fff8e1" transform="rotate(-4 635 217)"/>
      <path d="M612 214H660M612 220H650" stroke="#c9b48a" stroke-width="1.5" transform="rotate(-4 635 217)"/>
      <path d="M676 222L712 168" stroke="#f6efe0" stroke-width="3"/><path d="M702 182Q716 168 712 160Q700 170 698 186Z" fill="#f6efe0"/>
      <path d="M90 60V110" stroke="#1b1b24" stroke-width="2" stroke-dasharray="6 3"/><circle cx="90" cy="116" r="8" fill="none" stroke="#1b1b24" stroke-width="3"/>`;
    if(o.eraser){
      s += eraserFig(240,232,1.25);
      [[600,170,-15],[640,140,20],[580,120,40]].forEach(([x,y,a],i)=> s += `<rect x="${x}" y="${y}" width="22" height="28" rx="2" fill="#fff8e1" opacity="${.7-i*.2}" transform="rotate(${a} ${x+11} ${y+14})"/>`);
    }
    return s;
  },

  workshop(id,o){
    let s = `<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d2a4"/><stop offset="1" stop-color="#cfa96f"/></linearGradient>
      <radialGradient id="${id}c"><stop offset="0" stop-color="#ffd36b" stop-opacity=".6"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient></defs>
      <rect width="800" height="320" fill="url(#${id}w)"/>`;
    // חלון עם הכיפה של פירנצה
    s += `<path d="M60 70Q135 10 210 70V210H60Z" fill="${o.night?'#1a1440':'#8fd0f0'}"/>
      <path d="M95 200V160Q135 96 175 160V200Z" fill="${o.night?'#5a3a4a':'#c4683f'}"/><path d="M135 108V200M115 140Q135 128 155 140" stroke="${o.night?'#3a2433':'#9a4a2a'}" stroke-width="3" fill="none"/>
      <rect x="128" y="96" width="14" height="14" fill="${o.night?'#8a7a9a':'#f3ead6'}"/>
      <rect x="66" y="186" width="40" height="24" fill="${o.night?'#4a3d66':'#e8c9a0'}"/><rect x="168" y="182" width="36" height="28" fill="${o.night?'#4a3d66':'#e3a95a'}"/>
      <path d="M60 70Q135 10 210 70V210H60Z" fill="none" stroke="#7a4b2a" stroke-width="9"/><path d="M135 40V210M60 130H210" stroke="#7a4b2a" stroke-width="5"/>`;
    // קורות עץ
    for(let i=0;i<5;i++) s += `<rect x="${i*170-20}" y="0" width="34" height="320" fill="#8a5a32" opacity=".18"/>`;
    s += `<rect y="0" width="800" height="22" fill="#6b4224"/>`;
    // מכונה מעופפת תלויה
    s += `<path d="M470 22V60" stroke="#5a3a1e" stroke-width="2"/>
      <path d="M470 64Q420 40 360 70Q392 74 404 96Q424 80 446 92Q456 76 470 78Z" fill="#d9b98a" stroke="#6b4224" stroke-width="2.5"/>
      <path d="M470 64Q520 40 580 70Q548 74 536 96Q516 80 494 92Q484 76 470 78Z" fill="#d9b98a" stroke="#6b4224" stroke-width="2.5"/>
      <path d="M470 66L380 70M470 66L404 94M470 66L446 92M470 66L560 70M470 66L536 94M470 66L494 92" stroke="#6b4224" stroke-width="1.5"/>
      <rect x="463" y="62" width="14" height="22" rx="4" fill="#7a4b2a"/>`;
    // כן ציור עם ציור
    s += `<path d="M600 300L640 120L680 300M640 120V300" stroke="#6b4224" stroke-width="6" fill="none"/>
      <rect x="590" y="128" width="100" height="126" fill="#5d5a3a" stroke="#a8844a" stroke-width="6"/>
      <ellipse cx="640" cy="178" rx="20" ry="26" fill="#d9a87a"/><path d="M618 172Q620 146 640 146Q660 146 662 172Q664 200 676 254H604Q616 200 618 172Z" fill="#2d2418" opacity=".9"/>
      <ellipse cx="640" cy="180" rx="15" ry="21" fill="#e2b48a"/><path d="M634 190Q640 193 646 190" stroke="#8a4a3a" stroke-width="1.6" fill="none"/>
      <path d="M612 254Q640 214 668 254Z" fill="#3a4a2a"/>`;
    // שולחן עם שרטוטים
    s += `<rect x="40" y="236" width="500" height="14" fill="#7a4b2a"/><rect x="56" y="250" width="12" height="70" fill="#5b3a24"/><rect x="510" y="250" width="12" height="70" fill="#5b3a24"/>
      <rect x="90" y="214" width="90" height="26" fill="#fff6dc" transform="rotate(-6 135 227)"/><path d="M100 224Q120 214 140 226T172 222" stroke="#7a5a3a" stroke-width="1.5" fill="none" transform="rotate(-6 135 227)"/>
      <rect x="200" y="216" width="80" height="24" fill="#f6ecd0" transform="rotate(4 240 228)"/><circle cx="226" cy="228" r="7" fill="none" stroke="#7a5a3a" stroke-width="1.5" transform="rotate(4 240 228)"/>
      <rect x="300" y="200" width="70" height="38" rx="3" fill="#8a4a2a"/><rect x="306" y="204" width="58" height="30" fill="#f3e2bb"/><path d="M312 212H356M312 220H350M312 228H344" stroke="#9a7a5a" stroke-width="1.5"/>
      <rect x="420" y="208" width="10" height="28" fill="#f4ead1"/><ellipse cx="425" cy="201" rx="5" ry="9" fill="#ffcc4d"/><circle cx="425" cy="204" r="40" fill="url(#${id}c)"/>
      <path d="M460 236L500 190" stroke="#f6efe0" stroke-width="3"/><path d="M492 200Q506 186 502 178Q490 190 488 204Z" fill="#f6efe0"/>`;
    if(o.eraser) s += eraserFig(740,250,1.05);
    if(o.night) s += `<rect width="800" height="320" fill="#0b0a2a" opacity=".35"/>`;
    return s;
  },

  tuscany(id,o){
    const n = o.night;
    let s = sky(id,n,'#8fd0f0','#fff0c8','tus',[640,90]);
    if(!n) [[120,80],[160,64],[200,92],[560,60]].forEach(([x,y])=> s += `<path d="M${x-10} ${y}Q${x-5} ${y-6} ${x} ${y}Q${x+5} ${y-6} ${x+10} ${y}" stroke="#3a3a4a" stroke-width="2.4" fill="none"/>`);
    s += `<path d="M0 200Q160 140 340 176T800 160V320H0Z" fill="${n?'#3c3466':'#a7c870'}"/>
      <path d="M0 240Q220 190 460 226T800 212V320H0Z" fill="${n?'#322b5a':'#8cb85a'}"/>`;
    [[70,190],[90,186],[700,170],[720,166],[260,170]].forEach(([x,y])=> s += `<ellipse cx="${x}" cy="${y-20}" rx="7" ry="26" fill="${n?'#1d1838':'#2f5e3a'}"/>`);
    s += `<rect x="300" y="160" width="60" height="34" fill="${n?'#5a4a70':'#e6c27a'}"/><path d="M294 162L330 142L366 162Z" fill="${n?'#4a3550':'#c4683f'}"/><rect x="322" y="176" width="12" height="18" fill="#6b4a2b"/>`;
    // המכונה המעופפת על הגבעה
    s += `<g transform="translate(540 188)">
      <path d="M0 0Q-60 -34 -130 -6Q-96 -2 -84 22Q-60 4 -36 18Q-24 0 0 4Z" fill="${n?'#8a7a6a':'#e2c597'}" stroke="#6b4224" stroke-width="2.5"/>
      <path d="M0 0Q60 -34 130 -6Q96 -2 84 22Q60 4 36 18Q24 0 0 4Z" fill="${n?'#8a7a6a':'#e2c597'}" stroke="#6b4224" stroke-width="2.5"/>
      <path d="M0 2L-120 -4M0 2L-84 20M0 2L-36 16M0 2L120 -4M0 2L84 20M0 2L36 16" stroke="#6b4224" stroke-width="1.5"/>
      <rect x="-8" y="-4" width="16" height="30" rx="4" fill="#7a4b2a"/><path d="M-6 26L-14 44M6 26L14 44" stroke="#5b3a24" stroke-width="3"/></g>`;
    if(o.eraser) s += eraserFig(470,236,.6);
    s += `<path d="M0 286Q260 256 520 280T800 274V320H0Z" fill="${n?'#28224a':'#6f9a45'}"/>`;
    return s;
  },

  forest(id,o){
    const n = !o.day;
    let s = sky(id,n,'#ffb38a','#ffe9c4','for',[620,230]);
    // כוכב הצפון
    if(n) s += `<circle cx="160" cy="64" r="46" fill="url(#${id}glow)" opacity=".7"/>${star4(160,64,22,'#fffbe0')}${star4(160,64,9,'#fff')}<path d="M160 30V98M126 64H194" stroke="#fffbe0" stroke-width="1.2" opacity=".6"/>`;
    const tree = (x,y,h,c)=> `<path d="M${x} ${y-h}L${x-h*.32} ${y-h*.45}H${x-h*.16}L${x-h*.42} ${y}H${x+h*.42}L${x+h*.16} ${y-h*.45}H${x+h*.32}Z" fill="${c}"/><rect x="${x-4}" y="${y}" width="8" height="14" fill="${c}"/>`;
    const far = n?'#1f1a44':'#6a7a5a', mid = n?'#151233':'#4a5e3e', near = n?'#0d0b24':'#2f4430';
    for(let i=0;i<12;i++) s += tree(30+i*70,(i%2?214:206),90+(i%3)*14,far);
    s += `<rect y="226" width="800" height="94" fill="${n?'#14112e':'#5e6e44'}"/>`;
    if(o.cabin) s += `<rect x="560" y="196" width="110" height="60" fill="${n?'#3a2a2a':'#8a5a3a'}"/><path d="M548 198L615 160L682 198Z" fill="${n?'#2a1e22':'#5b3a24'}"/>
      <rect x="590" y="214" width="26" height="22" fill="${o.eraser?'#1a1433':'#ffd36b'}"/>${o.eraser?'':`<circle cx="603" cy="225" r="34" fill="#ffd36b" opacity=".25"/>`}<rect x="636" y="222" width="20" height="34" fill="#3a2614"/>`;
    for(let i=0;i<7;i++) s += tree(60+i*120 + (i%2?20:0),(i%2?280:292),120+(i%3)*20, i===2||i===5 ? near : mid);
    if(o.eraser) s += eraserFig(o.cabin?480:300,262,.9);
    if(o.people) [[330,286],[360,290],[392,284]].forEach(([x,y],i)=> s += `<circle cx="${x}" cy="${y-34}" r="7" fill="${n?'#2a2050':'#3a2a1e'}"/><path d="M${x-9} ${y}V${y-20}Q${x} ${y-28} ${x+9} ${y-20}V${y}Z" fill="${n?'#2a2050':'#3a2a1e'}"/>`);
    return s;
  },

  river(id,o){
    const n = !o.day;
    let s = sky(id,n,'#ffb38a','#ffe9c4','riv',[640,150]);
    if(n) s += `<circle cx="150" cy="60" r="40" fill="url(#${id}glow)" opacity=".7"/>${star4(150,60,18,'#fffbe0')}`;
    s += `<path d="M0 170Q200 150 400 166T800 160V196H0Z" fill="${n?'#1a1640':'#5e7a4a'}"/>`;
    for(let i=0;i<14;i++) s += `<ellipse cx="${20+i*60}" cy="${166-(i%3)*6}" rx="26" ry="${18+(i%2)*8}" fill="${n?'#14112e':'#4a6a3e'}"/>`;
    s += `<defs><linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n?'#2a3a7a':'#7ab8d8'}"/><stop offset="1" stop-color="${n?'#141c40':'#3a7aa8'}"/></linearGradient></defs>
      <rect y="190" width="800" height="100" fill="url(#${id}r)"/>`;
    for(let i=0;i<16;i++) s += `<path d="M${(i*53)%780} ${206+(i*19)%70}q10 -5 20 0t20 0" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/>`;
    if(n) s += `<path d="M150 196L130 290H170Z" fill="#fffbe0" opacity=".08"/>`;
    if(o.people) [[300,238],[336,244],[372,236],[410,242]].forEach(([x,y])=> s += `<circle cx="${x}" cy="${y-22}" r="8" fill="${n?'#0d0b24':'#3a2a1e'}"/><path d="M${x-11} ${y}Q${x} ${y-16} ${x+11} ${y}Z" fill="${n?'#0d0b24':'#3a2a1e'}"/><path d="M${x-16} ${y}q8 -4 16 0t16 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`);
    s += `<path d="M0 290Q200 276 400 288T800 284V320H0Z" fill="${n?'#1d1a3a':'#7a8a4a'}"/>`;
    for(let i=0;i<20;i++) s += `<path d="M${10+i*40} 300Q${14+i*40} ${270-(i%3)*8} ${20+i*40} ${262-(i%4)*6}" stroke="${n?'#2a2a4a':'#5a7a3a'}" stroke-width="3" fill="none"/>`;
    if(o.cloak) s += `<ellipse cx="590" cy="266" rx="78" ry="16" fill="#6a6a7a"/><ellipse cx="580" cy="260" rx="60" ry="10" fill="#8a8a9a"/>
      <path d="M530 262Q562 226 620 240Q652 250 644 264Q586 276 530 262Z" fill="#0d0716"/><path d="M548 258Q560 270 552 284" stroke="#0d0716" stroke-width="6" fill="none"/>
      <path d="M594 246l10 -7l10 7" stroke="#f0c35a" stroke-width="3" fill="none"/>${star4(604,236,9,'#ffe08a')}`;
    return s;
  },
};

export function scene(name, o={}){
  const id = 's'+(++GID), f = SCENES[name] || SCENES.library;
  const align = (name==='venice' || name==='bath') ? 'xMidYMax' : 'xMidYMid';   // לא לחתוך את הסירה / האמבטיה
  return `<svg viewBox="0 0 800 320" preserveAspectRatio="${align} slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${f(id,o)}</svg>`;
}

export function guideSVG(){
  // יובל: שיער חום קצר, מגולח, חיוך גדול, חולצת פולו טורקיז, אוזניות של פודקאסט
  const id = 'gv'+(++GID);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a6"/><stop offset="1" stop-color="#f6c45a"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#${id})"/>
    <path d="M12 100Q16 72 50 70Q84 72 88 100Z" fill="#14808a"/>
    <path d="M38 71L50 84L62 71L58 69L50 76L42 69Z" fill="#0f6870"/>
    <rect x="43" y="58" width="14" height="14" fill="#e0a882"/>
    <circle cx="28.5" cy="48" r="4.5" fill="#eab48e"/><circle cx="71.5" cy="48" r="4.5" fill="#eab48e"/>
    <ellipse cx="50" cy="45" rx="21" ry="24" fill="#f2c4a0"/>
    <path d="M29 40Q28 20 48 18Q70 17 72 38Q68 28 60 27L62 22L55 26L54 20L48 26L45 21L42 27Q33 29 29 40Z" fill="#6b4a2e"/>
    <path d="M36 39Q41 36.5 46 38.5M54 38.5Q59 36.5 64 39" stroke="#5a3d25" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="41" cy="45" rx="2.6" ry="2.4" fill="#2f4a5a"/><ellipse cx="59" cy="45" rx="2.6" ry="2.4" fill="#2f4a5a"/>
    <circle cx="41.8" cy="44.2" r=".8" fill="#fff"/><circle cx="59.8" cy="44.2" r=".8" fill="#fff"/>
    <path d="M37 50Q41 52 44 50M56 50Q59 52 63 50" stroke="#e3a283" stroke-width="1.3" fill="none"/>
    <path d="M48 48Q50 53 52 48" stroke="#d99b78" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M39 57Q50 67 61 57Q50 61 39 57Z" fill="#fff" stroke="#8a3b2a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M27 44Q26 14 50 13Q74 14 73 44" stroke="#1d1d22" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <rect x="21" y="38" width="10" height="20" rx="5" fill="#1d1d22"/><rect x="69" y="38" width="10" height="20" rx="5" fill="#1d1d22"/>
    <rect x="23" y="41" width="3" height="14" rx="1.5" fill="#3a3a44"/><rect x="74" y="41" width="3" height="14" rx="1.5" fill="#3a3a44"/>
  </svg>`;
}

/* תמונה אמיתית של יובל מלחי (ויקישיתוף, CC BY-SA 4.0, צילום: חגי שלום). אם התמונה לא נטענת – הציור מוצג */
export function guideAvatar(){
  return `<img src="/guide/yuval.jpg" alt="יובל" onerror="this.outerHTML=window.__guideSVG ? window.__guideSVG() : ''">`;
}
export const GUIDE_CREDIT = 'תְּמוּנַת יוּבַל מַלְחִי: חַגַּי שָׁלוֹם, CC BY-SA 4.0, וִיקִישִׁתּוּף';

export const LOGO = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect x="22" y="8" width="56" height="8" rx="3" fill="#f0c35a"/><rect x="22" y="84" width="56" height="8" rx="3" fill="#f0c35a"/>
  <path d="M30 16H70Q70 40 54 50Q70 60 70 84H30Q30 60 46 50Q30 40 30 16Z" fill="#fff7dc" fill-opacity=".25" stroke="#f0c35a" stroke-width="3.5"/>
  <path d="M36 26H64Q62 38 50 46Q38 38 36 26Z" fill="#f0c35a"/><path d="M50 50V72" stroke="#f0c35a" stroke-width="2" stroke-dasharray="3 3"/>
  <path d="M36 82Q50 66 64 82Z" fill="#f0c35a"/>
  <path d="M16 20V80M84 20V80" stroke="#c98d1e" stroke-width="4"/>
</svg>`;

export function worldArt(wid){
  const id = 'w'+(++GID);
  if(wid==='history') return `<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky(id,false,'#f7a26b','#ffe1a8','',[220,70])}
    <path d="M0 170V120Q80 96 150 108Q230 120 300 104V170Z" fill="#b5523b"/>
    <rect x="70" y="112" width="140" height="10" fill="#fbf3e0"/><rect x="76" y="104" width="128" height="8" fill="#fbf3e0"/>
    ${[0,1,2,3,4,5,6].map(c=>`<rect x="${84+c*17}" y="58" width="8" height="46" fill="#fbf3e0"/>`).join('')}
    <rect x="74" y="50" width="132" height="9" fill="#fbf3e0"/><path d="M70 50L140 22L210 50Z" fill="#fbf3e0"/>
    ${camel(258,132,.9,'#5a2e1e')}</svg>`;
  if(wid==='adventure') return `<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky(id,false,'#6fd0e8','#d8f6ff','',[60,50])}
    <rect y="110" width="300" height="60" fill="#1e90a8"/><path d="M60 128Q150 88 240 128Z" fill="#f2d48f"/>
    <path d="M150 112Q148 80 160 56" stroke="#7a4b2a" stroke-width="6" fill="none"/>
    <path d="M160 56Q134 44 116 58Q138 52 160 58ZM160 56Q186 40 206 54Q184 50 160 58ZM160 56Q150 34 130 30Q152 40 160 58ZM160 56Q176 34 196 34Q174 42 160 58Z" fill="#2f8f4e"/>
    <rect x="176" y="106" width="26" height="16" rx="3" fill="#8b4a1f"/><rect x="176" y="104" width="26" height="6" rx="2" fill="#f0c35a"/>
    <path d="M30 132Q50 140 74 132L70 140Q52 146 34 140Z" fill="#5a3218"/><path d="M52 134V100" stroke="#3a2614" stroke-width="2"/><path d="M54 102L72 128H54Z" fill="#fff"/></svg>`;
  return `<svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky(id,false,'#8ccdf2','#fff3cf','',[230,52])}
    <path d="M0 130Q70 96 150 118Q220 136 300 108V170H0Z" fill="#9bbf6a"/><path d="M0 150Q90 126 180 146Q240 158 300 140V170H0Z" fill="#7aa64e"/>
    <rect x="70" y="72" width="8" height="54" fill="#8a8a8a"/><rect x="58" y="60" width="32" height="18" rx="3" fill="#a9a9a9"/>
    <path d="M200 124V56" stroke="#6b4a2b" stroke-width="3"/><rect x="202" y="56" width="44" height="30" fill="#fff"/>
    <rect x="202" y="60" width="44" height="4" fill="#2a5db0"/><rect x="202" y="78" width="44" height="4" fill="#2a5db0"/>
    <path d="M224 64L229 73L219 73Z M224 76L219 67L229 67Z" fill="none" stroke="#2a5db0" stroke-width="1.6"/>
    <ellipse cx="130" cy="112" rx="6" ry="20" fill="#2f5e3a"/><ellipse cx="144" cy="116" rx="5" ry="16" fill="#2f5e3a"/></svg>`;
}

export const CHEST_CLOSED = `<svg viewBox="0 0 120 100" aria-hidden="true">
  <ellipse cx="60" cy="94" rx="46" ry="5" fill="#000" opacity=".25"/>
  <rect x="14" y="46" width="92" height="44" rx="6" fill="#8b4a1f"/><path d="M14 52Q14 16 60 16Q106 16 106 52Z" fill="#a85a24"/>
  <path d="M20 30Q60 4 100 30" stroke="#7a3c14" stroke-width="2" fill="none"/>
  <rect x="12" y="44" width="96" height="9" rx="3" fill="#f0c35a"/><rect x="12" y="84" width="96" height="6" rx="3" fill="#f0c35a"/>
  <rect x="52" y="40" width="16" height="22" rx="3" fill="#ffe08a" stroke="#b07d17" stroke-width="2"/><circle cx="60" cy="50" r="2.5" fill="#7a5414"/></svg>`;
export const CHEST_OPEN = `<svg viewBox="0 0 120 110" aria-hidden="true">
  <circle cx="60" cy="50" r="50" fill="#ffe08a" opacity=".45"/>
  <path d="M14 46L22 8Q60 -6 98 8L106 46Z" fill="#a85a24"/><rect x="18" y="40" width="84" height="8" fill="#f0c35a"/>
  <rect x="14" y="54" width="92" height="44" rx="6" fill="#8b4a1f"/><rect x="12" y="52" width="96" height="9" rx="3" fill="#f0c35a"/>
  <circle cx="44" cy="54" r="9" fill="#ffd34d" stroke="#c98d1e" stroke-width="2"/><circle cx="62" cy="50" r="9" fill="#ffd34d" stroke="#c98d1e" stroke-width="2"/><circle cx="78" cy="55" r="9" fill="#ffd34d" stroke="#c98d1e" stroke-width="2"/>
  <path d="M30 24L34 16M60 18V8M88 24L84 16" stroke="#fff3b0" stroke-width="3" stroke-linecap="round"/></svg>`;
