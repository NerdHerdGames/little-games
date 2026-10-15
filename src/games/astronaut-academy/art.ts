/** Project-owned SVG art. All shapes are local; no fonts or images are fetched. */
export function plant(leaves: number): string {
  return `<path d="M50 76V22" stroke="#286b54" stroke-width="4"/>${Array.from(
    { length: leaves },
    (_, i) => {
      const y = 61 - Math.floor(i / 2) * 17;
      return `<ellipse cx="${i % 2 ? 61 : 39}" cy="${y}" rx="14" ry="6" transform="rotate(${i % 2 ? -30 : 30} ${i % 2 ? 61 : 39} ${y})" fill="#58a97a" stroke="#286b54" stroke-width="2"/>`;
    },
  ).join('')}<path d="M30 73H70L65 94H35Z" fill="#d38355" stroke="#894b32" stroke-width="3"/>`;
}

const drawings: Record<string, string> = {
  helmet:
    '<circle cx="50" cy="45" r="34" fill="#f7f2df"/><rect x="23" y="24" width="54" height="40" rx="18" fill="#23465c"/><path d="M33 35Q42 27 57 32" stroke="#b0e5e2" stroke-width="5"/><path d="M28 77H72V88H28Z" fill="#e39958"/>',
  cap: '<path d="M24 56Q24 18 50 18Q76 18 76 56" fill="#e7b458"/><ellipse cx="50" cy="60" rx="44" ry="12" fill="#d58c42"/><path d="M25 48H75" stroke="#f9edc8" stroke-width="9"/>',
  umbrella:
    '<path d="M8 48Q50 -6 92 48Z" fill="#e6a16f"/><path d="M50 48V83Q50 99 35 88" fill="none" stroke="#345269" stroke-width="6"/>',
  gloves:
    '<path d="M28 87L15 51Q12 40 21 42L30 54V22Q30 13 37 22L40 44V15Q44 6 49 16L51 44V20Q57 12 60 23L62 46V31Q69 25 72 36L73 65L65 87Z" fill="#faf2dc" stroke="#517080" stroke-width="3"/><path d="M26 81H68V94H26Z" fill="#e7a25e"/>',
  pack: '<rect x="21" y="12" width="58" height="77" rx="13" fill="#e5e9df" stroke="#486576" stroke-width="4"/><rect x="32" y="27" width="36" height="24" rx="5" fill="#76bdbe"/><path d="M31 65H69M39 73H61" stroke="#486576" stroke-width="4"/><path d="M79 44Q98 61 78 76" fill="none" stroke="#e1a258" stroke-width="6"/>',
  book: '<path d="M19 13H77V91H19Z" fill="#f9edce" stroke="#486576" stroke-width="3"/><path d="M31 13V91M42 32H66M42 47H66M42 62H60" stroke="#738b8d" stroke-width="4"/>',
  water:
    '<path d="M60 24V9H79" fill="none" stroke="#486576" stroke-width="5"/><path d="M28 25H73L78 87H23Z" fill="#8fd0d1" stroke="#486576" stroke-width="3"/><path d="M49 42Q28 65 49 70Q70 65 49 42Z" fill="#f2fbf4"/>',
  ball: '<circle cx="50" cy="50" r="37" fill="#ebae65" stroke="#486576" stroke-width="3"/><path d="M50 13Q17 50 50 87Q83 50 50 13Z" fill="#88c1c5"/><path d="M14 50H86" stroke="#486576" stroke-width="3"/>',
  radio:
    '<path d="M18 57V45A32 32 0 0 1 82 45V66" fill="none" stroke="#486576" stroke-width="9"/><rect x="12" y="42" width="18" height="30" rx="7" fill="#e8a965"/><rect x="70" y="42" width="18" height="30" rx="7" fill="#e8a965"/><path d="M79 70Q79 86 54 83" fill="none" stroke="#486576" stroke-width="5"/><rect x="42" y="77" width="19" height="10" rx="5" fill="#486576"/>',
  checklist:
    '<rect x="21" y="15" width="58" height="77" rx="6" fill="#f8f0da" stroke="#486576" stroke-width="3"/><rect x="36" y="9" width="28" height="13" rx="4" fill="#e4a662"/><path d="M30 40L35 45L43 34M30 60L35 65L43 54M51 40H68M51 60H68M30 79H68" fill="none" stroke="#327966" stroke-width="4"/>',
  team: '<circle cx="29" cy="31" r="14" fill="#c48b68"/><circle cx="72" cy="31" r="14" fill="#8f5e47"/><path d="M9 83V65Q29 40 49 65L50 83M51 83V65Q72 40 92 65V83" fill="#80b9bd" stroke="#486576" stroke-width="3"/><path d="M35 73L50 81L67 71" fill="none" stroke="#faf2dc" stroke-width="5"/>',
  rocket:
    '<path d="M33 63L18 84V58L33 40M67 63L82 84V58L67 40" fill="#e6a467"/><path d="M33 72V40Q33 18 50 7Q67 18 67 40V72Z" fill="#f9f0db" stroke="#486576" stroke-width="3"/><circle cx="50" cy="38" r="10" fill="#8ac8ce"/><path d="M40 78L50 96L60 78" fill="#efba6d"/>',
  exercise:
    '<circle cx="24" cy="72" r="18" fill="none" stroke="#486576" stroke-width="5"/><circle cx="78" cy="72" r="18" fill="none" stroke="#486576" stroke-width="5"/><path d="M24 72L42 40L59 72H24L60 48L78 72M35 38H49M63 49V30H78" fill="none" stroke="#cf8655" stroke-width="5"/><circle cx="59" cy="72" r="5" fill="#486576"/>',
  sleep:
    '<rect x="27" y="8" width="46" height="86" rx="19" fill="#85b9b5" stroke="#486576" stroke-width="3"/><rect x="33" y="16" width="34" height="22" rx="10" fill="#fcf1d9"/><path d="M50 43V84M27 53H18M73 53H82" stroke="#486576" stroke-width="3"/>',
  cup: '<path d="M22 28H68V77Q45 93 22 77Z" fill="#f6e6c6" stroke="#486576" stroke-width="4"/><path d="M68 35Q96 34 87 62Q82 70 68 65" fill="none" stroke="#486576" stroke-width="5"/><ellipse cx="45" cy="28" rx="23" ry="6" fill="#89c8d3"/>',
};

export function icon(id: string): string {
  const drawing = id.startsWith('plant')
    ? plant(Number(id.slice(5)) || 4)
    : (drawings[id] ?? drawings.helmet);
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${drawing}</svg>`;
}

export function astronaut(): string {
  return `<g stroke="#425e70" stroke-width="3" stroke-linejoin="round"><rect x="184" y="175" width="110" height="135" rx="20" fill="#cbd8d3"/><path d="M206 294L200 376H233L246 306L258 376H291L279 294" fill="#f3eddb"/><path d="M197 365H234V389H185Q181 375 197 365M258 365H293L307 383V389H258Z" fill="#7fb5b6"/><path d="M204 204L164 261L146 248L176 187Q189 173 207 187M279 203L316 237L333 217L298 181Q283 176 276 189" fill="#f5efde"/><path d="M146 244Q126 246 132 264L154 276L166 260M329 218Q343 204 354 215L355 232L338 243L315 237" fill="#e9a464"/><rect x="200" y="175" width="83" height="132" rx="27" fill="#f7f1e2"/><path d="M204 282H280" stroke="#e3a267" stroke-width="12"/><rect x="217" y="211" width="49" height="39" rx="8" fill="#89c5c2"/><circle cx="230" cy="224" r="4" fill="#254655"/><path d="M242 224H255M230 237H254" stroke="#254655"/><circle cx="242" cy="140" r="57" fill="#f7f1e2"/><rect x="198" y="105" width="89" height="64" rx="28" fill="#1b344d"/><path d="M211 124Q230 109 253 118" fill="none" stroke="#b1dddb" stroke-width="6" stroke-linecap="round"/><path d="M218 188H266" stroke="#e3a267" stroke-width="9"/></g>`;
}

export function stageArt(station: number, complete: boolean): string {
  const science = station === 3 && !complete;
  return `<svg class="academy-stage" viewBox="0 0 480 460" role="img" aria-label="${science ? 'Space lab plants: A has 2 leaves, B has 6 leaves, C has 4 leaves' : 'Friendly astronaut floating beside Earth in the space station'}">
    <defs><radialGradient id="academy-space"><stop stop-color="#2e5366"/><stop offset="1" stop-color="#14283e"/></radialGradient><clipPath id="academy-window"><circle cx="240" cy="202" r="165"/></clipPath></defs>
    <circle cx="240" cy="202" r="174" fill="#678087"/><circle cx="240" cy="202" r="165" fill="url(#academy-space)"/>
    <g clip-path="url(#academy-window)"><g fill="#e8e6c8"><circle cx="120" cy="117" r="2"/><circle cx="311" cy="90" r="3"/><circle cx="365" cy="186" r="2"/><circle cx="143" cy="217" r="3"/><path d="M347 116V130M340 123H354" stroke="#e8e6c8" stroke-width="2"/></g><circle cx="312" cy="346" r="132" fill="#609cae"/><path d="M248 240L280 234L301 259L289 285L320 302L311 335L346 353L370 401L278 401L258 355L224 330L241 300L224 272Z" fill="#8fb7a0"/><path d="M192 302Q271 233 386 277M206 351Q318 304 431 344" fill="none" stroke="#c7dfd7" stroke-width="11" opacity=".6"/></g>
    ${science ? `<rect x="48" y="298" width="384" height="108" rx="18" fill="#ecedda" stroke="#68858c" stroke-width="4"/>${[2, 6, 4].map((leaves, i) => `<g transform="translate(${70 + i * 120} 207) scale(1.02)">${plant(leaves)}<text x="50" y="133" text-anchor="middle" fill="#24404e" font-family="Arial" font-size="22" font-weight="bold">${String.fromCharCode(65 + i)} · ${leaves}</text></g>`).join('')}` : `<g class="academy-astronaut">${astronaut()}</g>`}
    ${station === 1 && !complete ? `<g transform="translate(55 300) scale(.9)">${drawings.radio}</g>` : ''}
    ${station === 2 && !complete ? `<g transform="translate(66 303) scale(.85)">${drawings.water}</g>` : ''}
    <path d="M66 422H414" stroke="#66828b" stroke-width="3"/><circle cx="80" cy="422" r="5" fill="#e8b775"/><circle cx="400" cy="422" r="5" fill="#e8b775"/>
  </svg>`;
}
