// Deterministic, offline room illustrations so listings never show broken photos.
const PALETTES = [
  { wall: '#F4E3C1', wall2: '#EBCF9B', floor: '#C79A62', bed: '#C1442D', bed2: '#E58468', accent: '#1B2A4A' },
  { wall: '#DCE9E2', wall2: '#BDD5C8', floor: '#B58B5A', bed: '#4C7A63', bed2: '#86B09A', accent: '#1B2A4A' },
  { wall: '#E3E8F4', wall2: '#C5CFE8', floor: '#A9825A', bed: '#1B2A4A', bed2: '#4C5E8C', accent: '#EFA23B' },
  { wall: '#F6DFD8', wall2: '#EBBFB1', floor: '#BF9367', bed: '#EFA23B', bed2: '#F6C77C', accent: '#9E3520' },
  { wall: '#EFE9DD', wall2: '#DDD2BC', floor: '#B08C62', bed: '#6B5B95', bed2: '#9C8EC4', accent: '#375A49' },
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function roomSvg(seed, w = 700, h = 500) {
  const r = rng(hash(seed));
  const p = PALETTES[Math.floor(r() * PALETTES.length)];
  const winX = 60 + Math.floor(r() * 300);
  const bedLeft = r() > 0.5;
  const bx = bedLeft ? 70 : 330;
  const hasPlant = r() > 0.3;
  const hasShelf = r() > 0.4;
  const hasRug = r() > 0.4;
  const posterCol = [p.accent, p.bed, '#EFA23B'][Math.floor(r() * 3)];
  const sky = r() > 0.5 ? ['#9AD0F5', '#E8F4FD'] : ['#FFB88C', '#FFE6CF'];
  const id = 'g' + hash(seed);
  const deskX = bedLeft ? 470 : 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 500" width="${w}" height="${h}" role="img" aria-label="Room illustration">
<defs>
<linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.wall}"/><stop offset="1" stop-color="${p.wall2}"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.floor}"/><stop offset="1" stop-color="#8f6a42"/></linearGradient>
</defs>
<rect width="700" height="500" fill="url(#${id}w)"/>
<rect y="340" width="700" height="160" fill="url(#${id}f)"/>
<rect y="336" width="700" height="8" fill="rgba(0,0,0,.12)"/>
${[0,1,2,3,4,5,6].map(i=>`<line x1="${i*115-20}" y1="344" x2="${i*150-120}" y2="500" stroke="rgba(0,0,0,.08)" stroke-width="2"/>`).join('')}
<rect x="${winX}" y="60" width="170" height="150" rx="6" fill="#fff"/>
<rect x="${winX+8}" y="68" width="154" height="134" rx="3" fill="url(#${id}s)"/>
<circle cx="${winX+120}" cy="105" r="16" fill="#FFF3C4" opacity=".9"/>
<path d="M${winX+8} 202 L${winX+60} 150 L${winX+95} 180 L${winX+130} 140 L${winX+162} 190 L${winX+162} 202Z" fill="rgba(76,122,99,.35)"/>
<rect x="${winX+82}" y="68" width="6" height="134" fill="#fff"/><rect x="${winX+8}" y="130" width="154" height="6" fill="#fff"/>
<rect x="${winX-14}" y="54" width="14" height="170" rx="4" fill="${p.bed2}" opacity=".85"/>
<rect x="${winX+170}" y="54" width="14" height="170" rx="4" fill="${p.bed2}" opacity=".85"/>
${hasShelf?`<rect x="${bedLeft?450:60}" y="250" width="150" height="8" rx="2" fill="#8f6a42"/><rect x="${bedLeft?462:72}" y="222" width="22" height="28" rx="2" fill="${p.bed}"/><rect x="${bedLeft?490:100}" y="230" width="18" height="20" rx="2" fill="#EFA23B"/><rect x="${bedLeft?514:124}" y="218" width="26" height="32" rx="2" fill="${p.accent}"/>`:`<rect x="${bedLeft?470:80}" y="90" width="90" height="120" rx="3" fill="${posterCol}" opacity=".9"/><rect x="${bedLeft?480:90}" y="100" width="70" height="100" rx="2" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`}
${hasRug?`<ellipse cx="${bx+130}" cy="440" rx="170" ry="30" fill="${p.accent}" opacity=".25"/>`:''}
<rect x="${bx}" y="270" width="270" height="22" rx="6" fill="#7a5a38"/>
<rect x="${bx}" y="226" width="22" height="110" rx="4" fill="#7a5a38"/>
<rect x="${bx+248}" y="300" width="22" height="46" rx="3" fill="#7a5a38"/>
<rect x="${bx+10}" y="244" width="250" height="44" rx="10" fill="#fff"/>
<rect x="${bx+10}" y="262" width="250" height="40" rx="10" fill="${p.bed}"/>
<rect x="${bx+10}" y="262" width="250" height="14" rx="7" fill="${p.bed2}"/>
<rect x="${bx+26}" y="232" width="70" height="30" rx="14" fill="#fff"/>
<rect x="${bx+26}" y="232" width="70" height="30" rx="14" fill="none" stroke="rgba(0,0,0,.08)"/>
<rect x="${bx+12}" y="300" width="14" height="46" fill="#5b4328"/><rect x="${bx+244}" y="300" width="14" height="46" fill="#5b4328"/>
<rect x="${deskX}" y="290" width="160" height="12" rx="3" fill="#8f6a42"/>
<rect x="${deskX+8}" y="302" width="10" height="70" fill="#6d5133"/><rect x="${deskX+142}" y="302" width="10" height="70" fill="#6d5133"/>
<rect x="${deskX+20}" y="262" width="52" height="28" rx="3" fill="${p.accent}"/><rect x="${deskX+24}" y="266" width="44" height="20" rx="2" fill="#9AD0F5" opacity=".7"/>
<path d="M${deskX+112} 290 L${deskX+118} 250 L${deskX+138} 244" stroke="#333" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M${deskX+130} 240 L${deskX+150} 246 L${deskX+142} 258Z" fill="#EFA23B"/>
<rect x="${deskX+30}" y="330" width="56" height="30" rx="6" fill="${p.bed2}"/>
<rect x="${deskX+34}" y="360" width="8" height="26" fill="#6d5133"/><rect x="${deskX+74}" y="360" width="8" height="26" fill="#6d5133"/>
${hasPlant?`<rect x="${bedLeft?640:28}" y="360" width="30" height="40" rx="5" fill="#B5603E"/><path d="M${bedLeft?655:43} 360 C${bedLeft?625:13} 320 ${bedLeft?640:28} 300 ${bedLeft?655:43} 330 C${bedLeft?670:58} 300 ${bedLeft?690:78} 320 ${bedLeft?655:43} 360Z" fill="#4C7A63"/>`:''}
</svg>`;
}

module.exports = { roomSvg };
