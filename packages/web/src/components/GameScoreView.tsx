import type { PlayerColor } from '@lithello/shared';

export function GameScoreView({
  blackScore,
  whiteScore,
  viewerColor,
}: {
  blackScore: number;
  whiteScore: number;
  viewerColor?: PlayerColor;
}) {
  return (
    <section
      aria-labelledby="game-score-heading"
      className="grid grid-cols-2 border-y border-wood-700"
    >
      <h2 id="game-score-heading" className="sr-only">
        Score
      </h2>

      <dl className="col-span-2 grid grid-cols-2">
        <div className="flex items-center justify-between border-r border-wood-700 py-4 pr-4">
          <dt className="flex items-center gap-2 text-sm text-parchment-500">
            <span
              aria-hidden
              className="inline-block aspect-square w-3.5 rounded-full border border-wood-600 bg-wood-950"
            />
            Black
            {viewerColor === 'b' && (
              <span className="text-parchment-600">(you)</span>
            )}
          </dt>
          <dd className="font-mono text-lg text-parchment-50">{blackScore}</dd>
        </div>
        <div className="flex items-center justify-between py-4 pl-4">
          <dt className="flex items-center gap-2 text-sm text-parchment-500">
            <span
              aria-hidden
              className="inline-block aspect-square w-3.5 rounded-full bg-parchment-50"
            />
            White
            {viewerColor === 'w' && (
              <span className="text-parchment-600">(you)</span>
            )}
          </dt>
          <dd className="font-mono text-lg text-parchment-50">{whiteScore}</dd>
        </div>
      </dl>
    </section>
  );
}
