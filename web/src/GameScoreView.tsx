import "./GameScoreView.css";

interface GameScoreViewProps {
  blackScore: number;
  whiteScore: number;
}

export function GameScoreView({ blackScore, whiteScore }: GameScoreViewProps) {
  return (
    <section className="game-score" aria-labelledby="game-score-heading">
      <h2 id="game-score-heading">Score</h2>
      <dl>
        <div>
          <dt>
            <span className="game-score-disc game-score-disc-black" aria-hidden="true" />
            Black
          </dt>
          <dd>{blackScore}</dd>
        </div>
        <div>
          <dt>
            <span className="game-score-disc game-score-disc-white" aria-hidden="true" />
            White
          </dt>
          <dd>{whiteScore}</dd>
        </div>
      </dl>
    </section>
  );
}
