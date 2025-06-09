import { Chess } from "chess.js";

type StockfishEvals = Record<string, number>;   // UCI → eval (white-positive)
type MaiaEvals      = Record<string, number[]>; // UCI → 9-length probability array

const A = 1, B = 0.8, EPS = 0.08;

const winRate = (p: number) => 1 / (1 + Math.exp(-(p - A) / B));
const wdl     = (p: number) => { const w = winRate(p), l = winRate(-p); return { w, d: 1 - w - l }; };

const legalMovesUci = (fen: string) => {
  const c = new Chess(fen);
  const s = new Set<string>();
  c.moves({ verbose: true }).forEach(m => s.add(m.from + m.to + (m.promotion ?? "")));
  return s;
};

export function describePosition(
  fen: string,
  sf: StockfishEvals,
  maia: MaiaEvals,
  whiteToMove: boolean,
  eps = EPS
): string {
  const legal  = legalMovesUci(fen);
  const moves  = Object.keys(sf).filter(m => legal.has(m));
  if (!moves.length) return "No legal moves available.";

  const seval: Record<string, number> = {};
  moves.forEach(m => seval[m] = (whiteToMove ? 1 : -1) * sf[m]);

  const opt = moves.reduce((a, b) => seval[a] > seval[b] ? a : b);
  const { w: wOpt, d: dOpt } = wdl(seval[opt]);

  const good = moves.filter(m => {
    const { w, d } = wdl(seval[m]);
    return Math.abs(w - wOpt) <= eps && Math.abs(d - dOpt) <= eps;
  });

  const nGood = good.length;
  const abundance =
        nGood === 1 ? "only one move"
      : nGood === 2 ? "two moves"
                    : "several moves";

  const avgGood = good.reduce((s, m) => s + seval[m], 0) / nGood;

  let outcome: string;
  if      (avgGood >  2.5)  outcome = "to cleanly win";
  else if (avgGood >  1.0)  outcome = "to win";
  else if (avgGood >  0.35) outcome = "for an advantage";
  else if (avgGood >= -0.35) outcome = "to keep the balance";
  else if (avgGood >= -1.0) outcome = "to hold the position";
  else                      outcome = "to stay in the game";

  let setLevels = 0, optLevels = 0, temptLevels = 0;

  for (let lvl = 0; lvl < 9; lvl++) {
    const probs = moves
      .map(m => [maia[m]?.[lvl] ?? 0, m] as [number, string])
      .sort((a, b) => b[0] - a[0]);

    const [p1, m1] = probs[0];
    const [p2, m2] = probs[1] ?? [0, ""];
    const [p3, m3] = probs[2] ?? [0, ""];

    const inGood = good.includes(m1);
    if (inGood) setLevels++;
    if (m1 === opt) optLevels++;

    const nearTop = (prob: number) => (p1 - prob) <= eps;
    const tempting =
      inGood && (
        (m2 && !good.includes(m2) && nearTop(p2)) ||
        (m3 && !good.includes(m3) && nearTop(p3))
      );

    if (tempting) temptLevels++;
  }

  const tier = (k: number) => k <= 2 ? 0 : k <= 6 ? 1 : 2;
  const setTier = tier(setLevels);
  const optTier = tier(optLevels);

  const phrSet =
        setTier === 0 ? "hard for players to find"
      : setTier === 1 ? "findable for skilled players"
                      : "straightforward for players across skill levels to find";

  let phrBest =
        optTier === 0 ? "hard for players to find"
      : optTier === 1 ? "findable for skilled players"
                      : "straightforward for players across skill levels to find";

  if (optTier === 1) phrBest = "only " + phrBest;

  const verb = nGood === 1 ? "is" : "are";
  const pron = nGood === 1 ? "it is" : "they are";

  const hasTempting = setLevels > 0 && temptLevels > setLevels / 2;
  const temptText = hasTempting ? " There are also tempting alternatives." : "";

  if (nGood === 1) {
    return `There ${verb} ${abundance} ${outcome}, and ${pron} ${phrSet}.${temptText}`;
  }

  if (optTier < setTier) {
    return `There ${verb} ${abundance} ${outcome}, and ${pron} ${phrSet}, but the best move is ${phrBest}.${temptText}`;
  }

  return `There ${verb} ${abundance} ${outcome}, and ${pron} ${phrSet}.${temptText}`;
}
