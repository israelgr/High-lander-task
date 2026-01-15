import { useState } from 'react';

interface JoinGameFormProps {
  onSubmit: (code: string) => void;
  disabled?: boolean;
}

export function JoinGameForm({ onSubmit, disabled }: JoinGameFormProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(code.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.field}>
        <label style={styles.label}>Game Code</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-character code"
          maxLength={6}
          style={styles.input}
          disabled={disabled}
        />
      </div>

      <button
        type="submit"
        style={{
          ...styles.button,
          opacity: code.length < 6 ? 0.5 : 1,
        }}
        disabled={disabled || code.length < 6}
      >
        Join Game
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
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  button: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
