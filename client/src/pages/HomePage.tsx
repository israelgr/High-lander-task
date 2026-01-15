import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';

export function HomePage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { authenticate, isAuthenticated } = useGame();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    try {
      await authenticate(username.trim());
      navigate('/lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>High Lander</h1>
        <p style={styles.subtitle}>Navigate to the goal before anyone else!</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Enter your username</label>
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Username"
              maxLength={20}
              style={styles.input}
            />
            {error && <span style={styles.error}>{error}</span>}
          </div>

          <button type="submit" style={styles.button}>
            Start Playing
          </button>
        </form>

        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📍</span>
            <span>Real-time GPS tracking</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🗺️</span>
            <span>Navigate to random goals</span>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🏆</span>
            <span>Compete with friends</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  },
  content: {
    background: 'white',
    borderRadius: 16,
    padding: 40,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 16,
  },
  error: {
    display: 'block',
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    width: '100%',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
  },
  featureIcon: {
    fontSize: 20,
  },
};
