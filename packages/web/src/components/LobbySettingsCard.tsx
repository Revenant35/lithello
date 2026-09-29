import {
  formatTimeControl,
  type GameTimeControl,
  type LobbySettings,
} from '@lithello/shared';

/**
 * The terms of the game. Only the host can change them; everyone else sees what
 * was chosen. Changing anything clears both readiness flags server-side, so the
 * copy says so.
 */
export function LobbySettingsCard({
  settings,
  timeControls,
  canEdit,
  onChange,
}: {
  settings: LobbySettings;
  timeControls: readonly GameTimeControl[];
  canEdit: boolean;
  onChange: (settings: LobbySettings) => void;
}) {
  const selected = timeControls.find(
    (timeControl) => timeControl.id === settings.timeControlId,
  );

  return (
    <section className="lobby-table" aria-label="Game settings">
      <div className="section-heading">
        <h2>The terms</h2>
        <span>{canEdit ? 'Your call' : 'Set by the host'}</span>
      </div>

      <fieldset className="mt-1" disabled={!canEdit}>
        <legend className="mb-2 font-mono text-[0.65rem] font-bold tracking-wide text-parchment-500 uppercase">
          Time control
        </legend>

        {timeControls.length === 0 ? (
          <p className="text-sm text-parchment-500">
            {selected ? formatTimeControl(selected) : 'Loading…'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {timeControls.map((timeControl) => {
              const isSelected = timeControl.id === settings.timeControlId;

              return (
                <button
                  key={timeControl.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={!canEdit}
                  onClick={() =>
                    onChange({ ...settings, timeControlId: timeControl.id })
                  }
                  className={`rounded border px-3 py-1.5 font-mono text-sm transition-colors ${
                    isSelected
                      ? 'border-brass-400 bg-wood-700 text-parchment-50'
                      : 'border-wood-700 text-parchment-300 enabled:hover:border-wood-600'
                  } disabled:cursor-not-allowed`}
                >
                  {formatTimeControl(timeControl)}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <label
        className={`mt-5 flex items-center justify-between gap-4 ${
          canEdit ? 'cursor-pointer' : ''
        }`}
      >
        <span>
          <strong className="block text-parchment-50">Rated</strong>
          <small className="text-parchment-300">
            The result moves both players’ ratings.
          </small>
        </span>
        <input
          type="checkbox"
          checked={settings.isRated}
          disabled={!canEdit}
          onChange={(event) =>
            onChange({ ...settings, isRated: event.target.checked })
          }
        />
      </label>

      {canEdit && (
        <p className="lobby-help mt-4">
          Changing the terms clears both players’ ready status.
        </p>
      )}
    </section>
  );
}
