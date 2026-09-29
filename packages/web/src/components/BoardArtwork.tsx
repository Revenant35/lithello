const arrangement = [
  '........',
  '...b....',
  '..bbw...',
  '..bwww..',
  '.bbwbw..',
  '..wbbw..',
  '...w....',
  '........',
].join('');

export function BoardArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`board-artwork ${compact ? 'board-artwork-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="board-orbit orbit-one" />
      <div className="board-orbit orbit-two" />
      <div className="art-board-wrap">
        <div className="art-coordinates">A B C D E F G H</div>
        <div className="art-board">
          {Array.from(arrangement, (disc, index) => (
            <div className="art-square" key={`square-${index}`}>
              {disc !== '.' && <span className={`disc disc-${disc}`} />}
              {index === 21 && <span className="art-legal-move" />}
            </div>
          ))}
        </div>
      </div>
      <span className="floating-disc disc disc-w" />
      <span className="board-caption">
        <span /> One move can change everything.
      </span>
    </div>
  );
}
