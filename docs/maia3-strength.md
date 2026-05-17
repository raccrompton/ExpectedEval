# Maia 3 Strength (ELO) Handling

## How Maia 3 Takes ELO Input

Maia 3 accepts the raw ELO rating as a float in two model inputs:

- `elo_self` — ELO of the side to move
- `elo_oppo` — ELO of the opponent

Both inputs are tensors of shape `[batchSize]` containing the raw floating-point ELO value.
There is **no category bucketing or mapping** — the integer ELO is passed directly as a float.

The Maia 2 path in the reference codebase (`maia-platform-frontend`) used a
`createEloDict` / `mapToCategory` bucketing scheme. That bucketing is **not used for
Maia 3**.

## Valid ELO Range

The reference implementation (`maia-platform-frontend`, `MAIA_RATINGS`) runs ELO from
**600 to 2600** in steps of 100. This is the observed valid range for Maia 3.

## How the App Passes ELO

The passthrough happens in `src/core/engine/maia.ts`, inside `RealMaia.predict()`:

```ts
const eloLevel = config?.eloLevel ?? DEFAULT_EW_CONFIG.maiaLevel

// ...

await this.runInference(
  boardTokens,
  new Float32Array([eloLevel]),   // eloSelfs — raw float
  new Float32Array([eloLevel]),   // eloOppos — raw float, symmetric
  1,
)
```

`MaiaConfig.eloLevel` is sent straight through as both `elo_self` and `elo_oppo` with no
transformation. The symmetric assignment (`elo_self === elo_oppo`) means the model is
conditioned to predict play at a single skill level for both sides.

## App Settings Range

The app's settings UI currently exposes Maia Level **1100–1900**, which is a valid subset
of Maia 3's full 600–2600 range.

Settings range left at 1100–1900; widening to Maia 3's full 600–2600 is possible future
work.
