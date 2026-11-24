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
};

export function scene(name, o={}){
  const id = 's'+(++GID), f = SCENES[name] || SCENES.library;
  const align = (name==='venice' || name==='bath') ? 'xMidYMax' : 'xMidYMid';   // לא לחתוך את הסירה / האמבטיה
  return `<svg viewBox="0 0 800 320" preserveAspectRatio="${align} slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${f(id,o)}</svg>`;
}

export function guideSVG(){
  const id = 'gv'+(++GID);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd56b"/><stop offset="1" stop-color="#f39c43"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#${id})"/>
    <path d="M14 100Q18 74 50 72Q82 74 86 100Z" fill="#1f7a8c"/>
    <path d="M34 74Q50 86 66 74L64 82Q50 92 36 82Z" fill="#d64545"/>
    <rect x="43" y="60" width="14" height="14" fill="#e3ad84"/>
    <circle cx="29" cy="48" r="4.5" fill="#e9b48c"/><circle cx="71" cy="48" r="4.5" fill="#e9b48c"/>
    <ellipse cx="50" cy="45" rx="21" ry="24" fill="#f1c39b"/>
    <path d="M28 46Q24 18 50 16Q76 18 72 46Q70 32 62 29Q50 25 38 29Q30 32 28 46Z" fill="#3b2a20"/>
    <circle cx="34" cy="24" r="7" fill="#3b2a20"/><circle cx="46" cy="18" r="7.5" fill="#3b2a20"/><circle cx="58" cy="19" r="7" fill="#3b2a20"/><circle cx="68" cy="27" r="6.5" fill="#3b2a20"/>
    <path d="M30 50Q31 71 50 73Q69 71 70 50Q66 61 50 62Q34 61 30 50Z" fill="#4a3426"/>
    <path d="M43 61Q50 67 57 61" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M35 38Q41 35 46 38M54 38Q59 35 65 38" stroke="#3b2a20" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="41" cy="46" r="2.4" fill="#2a1d16"/><circle cx="59" cy="46" r="2.4" fill="#2a1d16"/>
    <circle cx="41" cy="46" r="7.5" fill="#fff" fill-opacity=".18" stroke="#2a1d16" stroke-width="2.4"/><circle cx="59" cy="46" r="7.5" fill="#fff" fill-opacity=".18" stroke="#2a1d16" stroke-width="2.4"/>
    <path d="M48.5 45.5H51.5" stroke="#2a1d16" stroke-width="2.4"/>
  </svg>`;
}

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



/* ===================== הדמות של הילד – שומר הזמן ===================== */
export function keeperSVG(eq = {}, opts = {}){
  const vb = opts.head ? '30 8 60 60' : '0 0 120 170';
  let s = `<svg viewBox="${vb}" aria-hidden="true">`;
  if(eq.cape==='cape_red') s += `<path d="M38 66Q30 120 22 160H98Q90 120 82 66Z" fill="#c0392b"/><path d="M38 66Q33 118 29 160" stroke="#922b21" stroke-width="3" fill="none"/>`;
  if(eq.cape==='cape_stars'){ s += `<path d="M38 66Q28 120 16 162H104Q92 120 82 66Z" fill="#3b2a7a"/>`;
    [[30,140],[44,120],[88,128],[96,150],[24,156],[76,150]].forEach(([x,y])=> s += star4(x,y,4,'#f0c35a')); }
  s += `<rect x="46" y="128" width="11" height="30" rx="4" fill="#2d3a5c"/><rect x="63" y="128" width="11" height="30" rx="4" fill="#2d3a5c"/>
    <ellipse cx="51" cy="160" rx="9" ry="5" fill="#5b3a24"/><ellipse cx="69" cy="160" rx="9" ry="5" fill="#5b3a24"/>
    <path d="M40 70Q60 62 80 70L86 132Q60 140 34 132Z" fill="#2a8f8a"/><rect x="36" y="106" width="48" height="7" fill="#7a4b2a"/><rect x="56" y="105" width="8" height="9" rx="1" fill="#f0c35a"/>
    <path d="M40 74Q28 92 30 110" stroke="#2a8f8a" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M80 74Q92 92 90 110" stroke="#2a8f8a" stroke-width="11" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="112" r="6" fill="#f1c39b"/><circle cx="90" cy="112" r="6" fill="#f1c39b"/>`;
  if(eq.neck==='neck_hourglass') s += `<path d="M51 70Q60 88 69 70" stroke="#f0c35a" stroke-width="1.6" fill="none"/><path d="M55 86h10l-5 6 5 6H55l5-6z" fill="#f0c35a" stroke="#b07d17" stroke-width="1"/>`;
  s += `<rect x="54" y="58" width="12" height="10" fill="#e3ad84"/><circle cx="39" cy="46" r="4" fill="#e9b48c"/><circle cx="81" cy="46" r="4" fill="#e9b48c"/><circle cx="60" cy="44" r="21" fill="#f1c39b"/>
    <circle cx="52" cy="46" r="2.6" fill="#2a1d16"/><circle cx="68" cy="46" r="2.6" fill="#2a1d16"/>
    <path d="M53 54Q60 60 67 54" stroke="#7a3b2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="47" cy="52" r="3" fill="#f5a3a3" opacity=".5"/><circle cx="73" cy="52" r="3" fill="#f5a3a3" opacity=".5"/>
    <path d="M39 42Q38 22 60 21Q82 22 81 42Q76 31 66 31Q62 26 56 31Q46 30 39 42Z" fill="#5a3a22"/>`;
  if(eq.hat==='hat_explorer') s += `<ellipse cx="60" cy="30" rx="30" ry="6" fill="#8a6a3a"/><path d="M42 30Q44 12 60 12Q76 12 78 30Z" fill="#a8844a"/><rect x="43" y="24" width="34" height="4" fill="#5b3a24"/>`;
  if(eq.hat==='hat_crown') s += `<path d="M42 30L44 14L52 22L60 10L68 22L76 14L78 30Z" fill="#f0c35a" stroke="#b07d17" stroke-width="1.5"/><circle cx="60" cy="22" r="2.5" fill="#e74c3c"/>`;
  if(eq.hand==='hand_lantern') s += `<circle cx="94" cy="122" r="18" fill="#ffd36b" opacity=".35"/><path d="M90 108v4" stroke="#3a2614" stroke-width="2"/><rect x="86" y="112" width="16" height="20" rx="3" fill="#3a2614"/><rect x="89" y="115" width="10" height="14" rx="2" fill="#ffd36b"/>`;
  if(eq.hand==='hand_magnifier') s += `<path d="M92 116L100 132" stroke="#7a4b2a" stroke-width="4" stroke-linecap="round"/><circle cx="88" cy="106" r="10" fill="#bfe6ff" fill-opacity=".6" stroke="#b07d17" stroke-width="3"/>`;
  if(eq.hand==='hand_compass') s += `<circle cx="92" cy="118" r="11" fill="#f0c35a" stroke="#b07d17" stroke-width="2"/><circle cx="92" cy="118" r="7" fill="#fffaf0"/><path d="M92 112L94 118L92 124L90 118Z" fill="#c0392b"/>`;
  return s + '</svg>';
}
