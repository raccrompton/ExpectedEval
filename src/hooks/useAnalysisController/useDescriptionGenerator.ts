import { Chess, PieceSymbol } from 'chess.ts'

type StockfishEvals = Record<string, number>
type MaiaEvals      = Record<string, number[]>

/* ---------------- Centipawn → win-rate table ---------------- */
export const cpLookup: Record<string, number> = {
  '-10.0': 0.16874792794783955,
  '-9.9': 0.16985049833887045,
  '-9.8': 0.17055738720598324,
  '-9.7': 0.17047675058336964,
  '-9.6': 0.17062880930380164,
  '-9.5': 0.17173295708238823,
  '-9.4': 0.1741832515174232,
  '-9.3': 0.17496583875894223,
  '-9.2': 0.17823840614328434,
  '-9.1': 0.17891311823785128,
  '-9.0': 0.18001756037367211,
  '-8.9': 0.18238828856575562,
  '-8.8': 0.18541818422621015,
  '-8.7': 0.18732127851231173,
  '-8.6': 0.188595528612019,
  '-8.5': 0.19166809721845357,
  '-8.4': 0.18989033973470404,
  '-8.3': 0.19357848980722225,
  '-8.2': 0.195212660943061,
  '-8.1': 0.1985674406526584,
  '-8.0': 0.20401430566976098,
  '-7.9': 0.2053494594581885,
  '-7.8': 0.2095001157139551,
  '-7.7': 0.2127603864858716,
  '-7.6': 0.21607609694057794,
  '-7.5': 0.21973060624595708,
  '-7.4': 0.2228248514176221,
  '-7.3': 0.22299885811455433,
  '-7.2': 0.22159517034121434,
  '-7.1': 0.2253474128373214,
  '-7.0': 0.22700275966883976,
  '-6.9': 0.2277978270416834,
  '-6.8': 0.23198254537369023,
  '-6.7': 0.23592594616253237,
  '-6.6': 0.24197398088661215,
  '-6.5': 0.24743721350483228,
  '-6.4': 0.2504634951693775,
  '-6.3': 0.25389828445048646,
  '-6.2': 0.2553693799097443,
  '-6.1': 0.2574747677153313,
  '-6.0': 0.26099610941165985,
  '-5.9': 0.26359484469524885,
  '-5.8': 0.26692516804140987,
  '-5.7': 0.269205898445802,
  '-5.6': 0.2716602975482676,
  '-5.5': 0.2762577909143481,
  '-5.4': 0.27686670371314326,
  '-5.3': 0.2811527494908349,
  '-5.2': 0.2842962444080047,
  '-5.1': 0.28868260131133583,
  '-5.0': 0.2914459750278813,
  '-4.9': 0.29552500948265914,
  '-4.8': 0.29889111624248266,
  '-4.7': 0.30275330907688625,
  '-4.6': 0.30483684697544633,
  '-4.5': 0.3087308954422261,
  '-4.4': 0.3119607377503364,
  '-4.3': 0.3149431542506458,
  '-4.2': 0.31853131804955126,
  '-4.1': 0.320778152372042,
  '-4.0': 0.32500585429582063,
  '-3.9': 0.3287550205647155,
  '-3.8': 0.3302152905962328,
  '-3.7': 0.3337414440782651,
  '-3.6': 0.3371096329087784,
  '-3.5': 0.3408372806176929,
  '-3.4': 0.3430467389812629,
  '-3.3': 0.345358794898586,
  '-3.2': 0.3488968896485116,
  '-3.1': 0.35237319918137733,
  '-3.0': 0.354602162593592,
  '-2.9': 0.35921288506416393,
  '-2.8': 0.3620978187487768,
  '-2.7': 0.36570889434391574,
  '-2.6': 0.36896483582772577,
  '-2.5': 0.3738375709360098,
  '-2.4': 0.37755946149735364,
  '-2.3': 0.38083501393471353,
  '-2.2': 0.3841356210618174,
  '-2.1': 0.38833097169521236,
  '-2.0': 0.3913569664390527,
  '-1.9': 0.39637664590926824,
  '-1.8': 0.4006706381318188,
  '-1.7': 0.40568723118901173,
  '-1.6': 0.4112309032143989,
  '-1.5': 0.4171285506703859,
  '-1.4': 0.422533096069275,
  '-1.3': 0.4301262113278628,
  '-1.2': 0.4371930420830884,
  '-1.1': 0.44297556987180564,
  '-1.0': 0.4456913220302985,
  '-0.9': 0.4524847690277852,
  '-0.8': 0.4589667426852546,
  '-0.7': 0.46660356893847554,
  '-0.6': 0.47734553584312966,
  '-0.5': 0.4838742651753062,
  '-0.4': 0.4949662422107537,
  '-0.3': 0.5052075551297714,
  '-0.2': 0.5134173311516534,
  '-0.1': 0.5243603487770374,
  '0.0': 0.526949638981131,
  '0.1': 0.5295389291852245,
  '0.2': 0.5664296189371014,
  '0.3': 0.5748717155242605,
  '0.4': 0.5869360163496304,
  '0.5': 0.5921709270831235,
  '0.6': 0.6012651707026009,
  '0.7': 0.6088638279243903,
  '0.8': 0.6153816495064385,
  '0.9': 0.6213113677421394,
  '1.0': 0.6271095095579187,
  '1.1': 0.632804166473034,
  '1.2': 0.6381911052846212,
  '1.3': 0.6442037744916549,
  '1.4': 0.649365491330027,
  '1.5': 0.6541269394628821,
  '1.6': 0.6593775707102116,
  '1.7': 0.6642844357446305,
  '1.8': 0.6680323879474359,
  '1.9': 0.6719097160994534,
  '2.0': 0.6748374005101319,
  '2.1': 0.6783363422342483,
  '2.2': 0.6801467867275195,
  '2.3': 0.684829276628467,
  '2.4': 0.6867513620895516,
  '2.5': 0.6905527274606579,
  '2.6': 0.6926332976777145,
  '2.7': 0.6952680187678887,
  '2.8': 0.7001656575385784,
  '2.9': 0.7010142788018504,
  '3.0': 0.7047537668053925,
  '3.1': 0.7073295468984271,
  '3.2': 0.7106392738949507,
  '3.3': 0.7116862871579852,
  '3.4': 0.7149981105354425,
  '3.5': 0.7168150290640533,
  '3.6': 0.7181645290803663,
  '3.7': 0.7215706104143079,
  '3.8': 0.7257548871790502,
  '3.9': 0.7266799478667236,
  '4.0': 0.7312566255649167,
  '4.1': 0.7338343990993276,
  '4.2': 0.7363492332937249,
  '4.3': 0.7374945601492073,
  '4.4': 0.7413387385114591,
  '4.5': 0.7466896678519318,
  '4.6': 0.7461156227069248,
  '4.7': 0.7500348334958896,
  '4.8': 0.7525591569082364,
  '4.9': 0.7567349424376287,
  '5.0': 0.7596581998583797,
  '5.1': 0.7621623413577621,
  '5.2': 0.7644432506942895,
  '5.3': 0.7668438338565464,
  '5.4': 0.7697341715213551,
  '5.5': 0.7718264040129471,
  '5.6': 0.774903252738822,
  '5.7': 0.777338112750803,
  '5.8': 0.7782543748612702,
  '5.9': 0.7815446531238023,
  '6.0': 0.7817240741095305,
  '6.1': 0.7843444714897749,
  '6.2': 0.7879064312243436,
  '6.3': 0.7894336918448414,
  '6.4': 0.7906807160826923,
  '6.5': 0.7958175057898639,
  '6.6': 0.799001778895725,
  '6.7': 0.8059773285734155,
  '6.8': 0.8073085278260186,
  '6.9': 0.8079169497726442,
  '7.0': 0.8094553564231399,
  '7.1': 0.812049156586624,
  '7.2': 0.8080964608399982,
  '7.3': 0.8089371589128438,
  '7.4': 0.811884066397279,
  '7.5': 0.8139355726992591,
  '7.6': 0.8176447870147248,
  '7.7': 0.8205118056812014,
  '7.8': 0.8239310183322626,
  '7.9': 0.8246215704824976,
  '8.0': 0.8282444028473858,
  '8.1': 0.8307566922119521,
  '8.2': 0.8299970989266028,
  '8.3': 0.8329910434137715,
  '8.4': 0.8348790035853562,
  '8.5': 0.8354299179013772,
  '8.6': 0.838042734118834,
  '8.7': 0.8386288753155167,
  '8.8': 0.8403357337021318,
  '8.9': 0.8438203836486884,
  '9.0': 0.8438217313242881,
  '9.1': 0.8451134380453753,
  '9.2': 0.8456384082100551,
  '9.3': 0.844182520663178,
  '9.4': 0.8463847100484717,
  '9.5': 0.8479706716538067,
  '9.6': 0.8511321531494442,
  '9.7': 0.8506127153603494,
  '9.8': 0.8490128260556276,
  '9.9': 0.8522167487684729,
  '10.0': 0.8518353443061348,
}



const cpToWinrate = (cp: number | string, allowNaN = false): number => {
  try {
    const num   = (typeof cp === 'string' ? parseFloat(cp) : cp) / 100;
    const clamp = Math.max(-10, Math.min(10, num));
    const key   = (Math.round(clamp * 10) / 10).toFixed(1);
    return cpLookup[key] ?? (allowNaN ? Number.NaN : 0.5);
  } catch {
    return allowNaN ? Number.NaN : 0.5;
  }
};

/* ---------------- phrase banks ---------------- */

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const OUTCOME = {
  overwhelming: [
    'for an overwhelming winning advantage',
    'for a crushing advantage',
    'for a decisive winning advantage',
  ],
  win: [
    'to win',
    'for a winning advantage',
    'to maintain a winning advantage',
  ],
  advantage: [
    'for an advantage',
    'to gain an edge',
    'to press for advantage',
  ],
  balance: [
    'to keep the balance',
    'to maintain the balance',
    'to hold equality',
  ],
  hold: [
    'to hold the position',
    'to defend the position',
    'to hold on',
  ],
  stay: [
    'to stay in the game',
    'to stay afloat',
    'to keep fighting',
  ],
};

const FINDABILITY = {
  hard: [
    'hard for human players to find',
    'very tough for humans to spot',
    'challenging for most players to see',
  ],
  skilled: [
    'findable for skilled players',
    'within reach for experienced players',
    'doable for strong players',
  ],
  straight: [
    'straightforward for players across skill levels to find',
    'easy for players of all strengths to spot',
    'obvious to most players',
  ],
};

const CAREFUL = ['Tread carefully', 'Be alert', 'Stay sharp', 'Watch out'];
const TEMPTING_INTRO = [
  'There',
  'Be careful, as there',
  'In this position there',
];
const TEMPT_WORD = ['tempting', 'enticing', 'natural-looking'];

/* ---------------- constants & helpers ---------------- */

const EPS = 0.08;          // “good move” window
const BLUNDER_GAP = 0.1;   // win-rate drop that defines a blunder

const winRate = (p: number) => 1 / (1 + Math.exp(-(p - 1) / 0.8));
const wdl = (p: number) => {
  const w = winRate(p), l = winRate(-p);
  return { w, d: 1 - w - l };
};

/* ========================================================= */

export function describePosition(
  fen: string,
  sf: StockfishEvals,
  maia: MaiaEvals, whiteToMove
): string {
  /* ---------- board ---------- */
  const chess = new Chess(fen);
  const legal = new Set<string>();
  chess.moves({ verbose: true }).forEach(m =>
    legal.add(m.from + m.to + (m.promotion ?? '')),
  );

  const moves = Object.keys(sf).filter(m => legal.has(m));
  if (!moves.length) return 'No legal moves available.';

  /* ---------- evals (side-to-move) ---------- */
  const seval: Record<string, number> = {};
  for (const m of moves) seval[m] = sf[m];

  /* ---------- good moves ---------- */
  const opt = moves.reduce((a, b) => (seval[a] > seval[b] ? a : b));
  const { w: wOpt, d: dOpt } = wdl(seval[opt]);

  const good = moves.filter(m => {
    const { w, d } = wdl(seval[m]);
    return Math.abs(w - wOpt) <= EPS && Math.abs(d - dOpt) <= EPS;
  });

  const nGood = good.length;
  const abundance =
    nGood === 1
      ? 'only one move'
      : nGood === 2
      ? 'two moves'
      : pick(['several moves', 'multiple moves', 'a few moves']);

  /* ---------- helpers ---------- */
  const uciToSan = (uci: string) => {
    const mv = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as PieceSymbol | undefined,
    });
    const san = mv?.san ?? uci;
    chess.undo();
    return san;
  };

  const sortedGood = [...good].sort((a, b) => seval[b] - seval[a]);
  const bestMoveSan = uciToSan(opt);

  /* ε/2 closeness check */
  let optCloseSecond = false;
  if (sortedGood.length >= 2) {
    const second = sortedGood[1];
    const { w: w2, d: d2 } = wdl(seval[second]);
    optCloseSecond =
      Math.abs(wOpt - w2) <= EPS / 2 && Math.abs(dOpt - d2) <= EPS / 2;
  }

  const listWithOpt = sortedGood.slice(0, 3).map(uciToSan).join(', ');
  const listWithoutOpt = sortedGood
    .filter(m => m !== opt)
    .slice(0, 3)
    .map(uciToSan)
    .join(', ');

  /* ---------- outcome wording ---------- */
  const avgGood = sortedGood.reduce((s, m) => s + seval[m], 0) / nGood;
  const outcome =
    avgGood > 3
      ? pick(OUTCOME.overwhelming)
      : avgGood > 1.5
      ? pick(OUTCOME.win)
      : avgGood > 0.35
      ? pick(OUTCOME.advantage)
      : avgGood >= -0.35
      ? pick(OUTCOME.balance)
      : avgGood >= -1.5
      ? pick(OUTCOME.hold)
      : pick(OUTCOME.stay);

  /* ---------- Maia analysis ---------- */
  let setLv = 0,
    optLv = 0,
    temptLv = 0;
  const temptCnt: Record<string, number> = {};
  const aggProb: Record<string, number> = {};

  for (let lvl = 0; lvl < 9; lvl++) {
    const probs = moves
      .map(m => [maia[m]?.[lvl] ?? 0, m] as [number, string])
      .sort((a, b) => b[0] - a[0]);

    const [p1, m1] = probs[0];
    const [p2, m2] = probs[1] ?? [0, ''];
    const [p3, m3] = probs[2] ?? [0, ''];

    if (good.includes(m1)) setLv++;
    if (m1 === opt) optLv++;

    for (const [p, m] of probs.slice(0, 4))
      aggProb[m] = (aggProb[m] ?? 0) + p;

    const nearTop = (pr: number) => p1 - pr <= EPS;
    const add = (m: string) => {
      temptCnt[m] = (temptCnt[m] ?? 0) + 1;
      return true;
    };

    const nearBad =
      (m2 && !good.includes(m2) && nearTop(p2) && add(m2)) ||
      (m3 && !good.includes(m3) && nearTop(p3) && add(m3));

    if (nearBad) temptLv++;
  }

  /* ---------- tiers ---------- */
  const tier = (k: number) => (k <= 2 ? 0 : k <= 6 ? 1 : 2);
  const setT = tier(setLv),
    optT = tier(optLv);
  const bestHarder = optT < setT && !optCloseSecond;

  const phrSet =
    setT === 0
      ? pick(FINDABILITY.hard)
      : setT === 1
      ? pick(FINDABILITY.skilled)
      : pick(FINDABILITY.straight);

  let phrBest =
    optT === 0
      ? pick(FINDABILITY.hard)
      : optT === 1
      ? pick(FINDABILITY.skilled)
      : pick(FINDABILITY.straight);

  if (optT === 1 && bestHarder) phrBest = 'only ' + phrBest;

  /* ---------- blunder detection (win-rate gap) ---------- */
  const optWR = cpToWinrate(seval[opt]);
  const isBlunder = (m: string) => optWR - cpToWinrate(seval[m]) >= BLUNDER_GAP;

  const topNonGood = Object.entries(aggProb)
    .filter(([m]) => !good.includes(m))
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const top4 = Object.entries(aggProb)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  let blunderMove: string | null = null;
  if (topNonGood && isBlunder(topNonGood)) blunderMove = topNonGood;
  else
    for (const [m, p] of top4)
      if (p > 0.15 && isBlunder(m)) {
        blunderMove = m;
        break;
      }

  /* ---------- treacherous 40 % ---------- */
  const total = Object.values(aggProb).reduce((s, p) => s + p, 0);
  const blunderMass = Object.entries(aggProb)
    .filter(([m]) => isBlunder(m))
    .reduce((s, [, p]) => s + p, 0);
  const treach = total && blunderMass / total > 0.4;

  /* ---------- tail text ---------- */
  const verb = nGood === 1 ? 'is' : 'are';
  const pron = nGood === 1 ? 'it is' : 'they are';
  const prefix = setT === 2 && !bestHarder ? ', however' : '';
  const temptW = pick(TEMPT_WORD);

  let tail = '';
  if (blunderMove && treach) {
    tail = ` ${pick(CAREFUL)}${prefix}, this position is highly treacherous! It is easy to go astray with ${temptW} blunders like ${uciToSan(
      blunderMove,
    )}.`;
  } else if (blunderMove) {
    tail = ` ${pick(CAREFUL)}${prefix}! There is a ${temptW} blunder in this position: ${uciToSan(
      blunderMove,
    )}.`;
  } else {
    const showTempt = setT < 2 || (setT === 2 && temptLv > 4);
    if (showTempt) {
      let temptUci =
        Object.entries(temptCnt).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      if (!temptUci)
        temptUci =
          Object.entries(aggProb)
            .filter(([m]) => !good.includes(m))
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const temptSan = temptUci ? uciToSan(temptUci) : '';
      const intro = pick(TEMPTING_INTRO);
      tail = temptSan
        ? ` ${intro}${prefix} are also ${temptW} alternatives, such as ${temptSan}.`
        : ` ${intro}${prefix} are also ${temptW} alternatives.`;
    }
  }

  /* ---------- assemble ---------- */
  const moveList = bestHarder ? listWithoutOpt : listWithOpt;
  return nGood === 1
    ? `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}.${tail}`
    : bestHarder
    ? `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}, but the best move (${bestMoveSan}) is ${phrBest}.${tail}`
    : `There ${verb} ${abundance} (${moveList}) ${outcome}, and ${pron} ${phrSet}.${tail}`;
}
