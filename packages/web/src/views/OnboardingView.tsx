import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import {
  type Player,
  PlayerSchema,
  type PlayerSelfAssessmentLevel,
  PlayerSelfAssessmentLevelSchema,
  SELF_ASSESSMENT_RATINGS,
} from '@lithello/shared';
import { z } from 'zod';
import { AppShell } from '../components/AppShell';
import { usePlayer } from '../lib/player-context';

const CreatePlayerResponseSchema = z.object({
  player: PlayerSchema,
});

const LEVEL_DESCRIPTIONS: Record<PlayerSelfAssessmentLevel, string> = {
  beginner: 'I know the rules, or I am learning them.',
  novice: 'I have played a handful of games.',
  intermediate: 'I think about corners and edges.',
  advanced: 'I plan several moves ahead and play for position.',
  expert: 'I have studied openings and endgame counting.',
};

export function OnboardingView() {
  const navigate = useNavigate();
  const { setPlayer } = usePlayer();
  const [level, setLevel] = useState<PlayerSelfAssessmentLevel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (level === null) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/player/me`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level }),
        },
      );

      if (!response.ok) {
        setError('Could not save your rating. Please try again.');
        return;
      }

      const parsed = CreatePlayerResponseSchema.safeParse(
        await response.json(),
      );

      if (!parsed.success) {
        setError('The server sent an unexpected response.');
        return;
      }

      // Seeding the context first means the guard sees a player and lets the
      // navigation through rather than bouncing straight back here.
      setPlayer(parsed.data.player satisfies Player);
      navigate('/home', { replace: true });
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[42rem]">
        <header className="mb-8">
          <p className="eyebrow accent-text">One last thing</p>
          <h1 className="display-heading">How strong a player are you?</h1>
          <p className="mt-3 text-parchment-300">
            This sets your starting rating. Be honest rather than modest — the
            rating settles quickly either way once you start playing.
          </p>
        </header>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Estimated playing strength</legend>

          {PlayerSelfAssessmentLevelSchema.options.map((option) => {
            const elo = SELF_ASSESSMENT_RATINGS[option];
            const isSelected = level === option;

            return (
              <label
                key={option}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? 'border-brass-400 bg-wood-700'
                    : 'border-wood-700 bg-wood-800 hover:border-wood-600'
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="level"
                    value={option}
                    checked={isSelected}
                    onChange={() => setLevel(option)}
                    className="mt-1"
                  />
                  <span>
                    <strong className="block text-parchment-50 uppercase">
                      {option} (~{elo})
                    </strong>
                    <small className="text-parchment-300">
                      {LEVEL_DESCRIPTIONS[option]}
                    </small>
                  </span>
                </span>
                <span className="font-mono text-sm text-parchment-500">
                  {elo}
                </span>
              </label>
            );
          })}
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm text-ember-500">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={level === null || isSaving}
          onClick={handleSubmit}
          className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Start playing'}
          {!isSaving && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </AppShell>
  );
}
