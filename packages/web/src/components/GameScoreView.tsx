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
    <section aria-labelledby="game-score-heading" className="score-card">
      <h2 id="game-score-heading" className="score-label">
        The board, by the numbers
      </h2>

      <dl className="score-values">
        <div>
          <dt>
            <span aria-hidden className="disc disc-b score-disc" />
            Black
            {viewerColor === 'b' && <span className="sr-only">(you)</span>}
          </dt>
          <dd>{blackScore}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden className="disc disc-w score-disc" />
            White
            {viewerColor === 'w' && <span className="sr-only">(you)</span>}
          </dt>
          <dd>{whiteScore}</dd>
        </div>
      </dl>
      <div className="score-meter" aria-hidden="true">
        <span style={{ flex: blackScore }} />
        <span style={{ flex: whiteScore }} />
      </div>
    </section>
  );
}
