import { useState } from 'react';
import { GameConfig, DEFAULT_GAME_CONFIG } from '@high-lander/shared';

interface CreateGameFormProps {
  onSubmit: (config: Partial<GameConfig>) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function CreateGameForm({ onSubmit, disabled, loading }: CreateGameFormProps) {
  const [config, setConfig] = useState<Partial<GameConfig>>({
    maxPlayers: DEFAULT_GAME_CONFIG.maxPlayers,
    goalRadiusMin: DEFAULT_GAME_CONFIG.goalRadiusMin,
    goalRadiusMax: DEFAULT_GAME_CONFIG.goalRadiusMax,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.field}>
        <label style={styles.label}>Max Players</label>
        <input
          type="number"
          min={1}
          max={20}
          value={config.maxPlayers}
          onChange={e => setConfig({ ...config, maxPlayers: parseInt(e.target.value) })}
          style={styles.input}
          disabled={disabled}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Goal Distance Range (meters)</label>
        <div style={styles.rangeInputs}>
          <input
            type="number"
            min={100}
            max={5000}
            step={100}
            value={config.goalRadiusMin}
            onChange={e => setConfig({ ...config, goalRadiusMin: parseInt(e.target.value) })}
            style={styles.input}
            disabled={disabled}
            placeholder="Min"
          />
          <span>to</span>
          <input
            type="number"
            min={100}
            max={5000}
            step={100}
            value={config.goalRadiusMax}
            onChange={e => setConfig({ ...config, goalRadiusMax: parseInt(e.target.value) })}
            style={styles.input}
            disabled={disabled}
            placeholder="Max"
          />
        </div>
      </div>

      <button
        type="submit"
        style={{
          ...styles.button,
          opacity: disabled || loading ? 0.7 : 1,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
        }}
        disabled={disabled || loading}
      >
        {loading ? 'Creating...' : 'Create Game'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 16,
    width: '100%',
  },
  rangeInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
  },
};
