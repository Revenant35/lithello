import {
  getExpectedScore,
  getKFactor,
  getNewRating,
  getRatingsAfterGame,
  MAX_RATING,
  MIN_RATING,
} from './rating.ts';

describe('getExpectedScore', () => {
  it('is even between equal ratings', () => {
    expect(getExpectedScore(1500, 1500)).toBe(0.5);
  });

  it('is symmetric - the two expectations sum to one', () => {
    expect(getExpectedScore(1700, 1400) + getExpectedScore(1400, 1700)).toBeCloseTo(
      1,
      10,
    );
  });

  it('gives the favourite roughly three quarters at 200 points up', () => {
    expect(getExpectedScore(1700, 1500)).toBeCloseTo(0.76, 2);
  });

  it('gives the favourite roughly nine tenths at 400 points up', () => {
    expect(getExpectedScore(1900, 1500)).toBeCloseTo(0.909, 3);
  });
});

describe('getKFactor', () => {
  it.each([
    [400, 32],
    [1500, 32],
    [2099, 32],
    [2100, 24],
    [2399, 24],
    [2400, 16],
    [3000, 16],
  ])('is %i -> K %i', (rating, expected) => {
    expect(getKFactor(rating)).toBe(expected);
  });
});

describe('getNewRating', () => {
  it('splits K evenly when equals draw', () => {
    expect(
      getNewRating({ rating: 1500, opponentRating: 1500, score: 0.5 }),
    ).toBe(1500);
  });

  it('gives an equal winner half of K', () => {
    // K=32, expected 0.5, so +16.
    expect(getNewRating({ rating: 1500, opponentRating: 1500, score: 1 })).toBe(
      1516,
    );
    expect(getNewRating({ rating: 1500, opponentRating: 1500, score: 0 })).toBe(
      1484,
    );
  });

  it('rewards an upset far more than an expected win', () => {
    const upset = getNewRating({ rating: 1200, opponentRating: 1800, score: 1 });
    const expected = getNewRating({
      rating: 1800,
      opponentRating: 1200,
      score: 1,
    });

    expect(upset - 1200).toBeGreaterThan(28);
    expect(expected - 1800).toBeLessThan(4);
  });

  it('penalises a favourite heavily for losing', () => {
    expect(
      getNewRating({ rating: 1800, opponentRating: 1200, score: 0 }),
    ).toBeLessThan(1772);
  });

  it('accepts an explicit K factor', () => {
    expect(
      getNewRating({
        rating: 1500,
        opponentRating: 1500,
        score: 1,
        kFactor: 10,
      }),
    ).toBe(1505);
  });

  it('never falls below the minimum a rating column allows', () => {
    expect(
      getNewRating({ rating: 5, opponentRating: 2500, score: 0 }),
    ).toBeGreaterThanOrEqual(MIN_RATING);
  });

  it('never exceeds what a smallint can hold', () => {
    expect(
      getNewRating({ rating: MAX_RATING, opponentRating: 100, score: 1 }),
    ).toBeLessThanOrEqual(MAX_RATING);
  });

  it('returns whole numbers, since ratings are stored as integers', () => {
    expect(
      Number.isInteger(
        getNewRating({ rating: 1437, opponentRating: 1622, score: 1 }),
      ),
    ).toBe(true);
  });
});

describe('getRatingsAfterGame', () => {
  it('moves the winner up and the loser down', () => {
    const after = getRatingsAfterGame({
      whiteRating: 1500,
      blackRating: 1500,
      result: 'white_win',
    });

    expect(after.white).toBe(1516);
    expect(after.black).toBe(1484);
  });

  it('is zero sum when both players share a K factor', () => {
    const after = getRatingsAfterGame({
      whiteRating: 1432,
      blackRating: 1677,
      result: 'black_win',
    });

    expect(after.white - 1432).toBe(-(after.black - 1677));
  });

  it('moves the underdog up on a draw and the favourite down', () => {
    const after = getRatingsAfterGame({
      whiteRating: 1300,
      blackRating: 1700,
      result: 'draw',
    });

    expect(after.white).toBeGreaterThan(1300);
    expect(after.black).toBeLessThan(1700);
  });

  it('barely moves equals on a draw', () => {
    const after = getRatingsAfterGame({
      whiteRating: 1500,
      blackRating: 1500,
      result: 'draw',
    });

    expect(after).toEqual({ white: 1500, black: 1500 });
  });

  /**
   * Rounding each game to a whole number lets a little error in, so an
   * alternating series does not land exactly back on 1500. What matters is
   * that the error settles instead of accumulating, and that the pair stays
   * zero sum throughout.
   */
  describe('over a long alternating series', () => {
    function playAlternating(games: number) {
      let white = 1500;
      let black = 1500;

      for (let game = 0; game < games; game++) {
        const after = getRatingsAfterGame({
          whiteRating: white,
          blackRating: black,
          result: game % 2 === 0 ? 'white_win' : 'black_win',
        });
        white = after.white;
        black = after.black;
      }

      return { white, black };
    }

    it.each([2, 10, 20, 100, 500])(
      'conserves the combined rating after %i games',
      (games) => {
        const { white, black } = playAlternating(games);

        expect(white + black).toBe(3000);
      },
    );

    it('lets rounding drift settle rather than accumulate', () => {
      const short = playAlternating(20);
      const long = playAlternating(500);

      expect(long).toEqual(short);
      expect(Math.abs(long.white - 1500)).toBeLessThan(10);
    });
  });
});
