import { useState, useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { DistanceConfig } from '@high-lander/shared';
import { getAdminConfig, updateAdminConfig } from '../services/api';

export function AdminPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<DistanceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await getAdminConfig();
      setConfig(response.config.distance);
      setError(null);
    } catch (err) {
      setError('Failed to load configuration. Admin access required.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateAdminConfig({ distance: config });
      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (!config) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.error}>{error}</div>
          <button onClick={() => navigate('/')} style={styles.button}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Admin Settings</h1>

        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Goal Generation</h2>

          <div style={styles.field}>
            <label style={styles.label}>Goal Radius Min (meters)</label>
            <input
              type="number"
              value={config.goalRadiusMin}
              onChange={(e) => setConfig({ ...config, goalRadiusMin: Number(e.target.value) })}
              style={styles.input}
              min={50}
              max={5000}
            />
            <span style={styles.hint}>Minimum distance for goal generation (50-5000m)</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Goal Radius Max (meters)</label>
            <input
              type="number"
              value={config.goalRadiusMax}
              onChange={(e) => setConfig({ ...config, goalRadiusMax: Number(e.target.value) })}
              style={styles.input}
              min={100}
              max={10000}
            />
            <span style={styles.hint}>Maximum distance for goal generation (100-10000m)</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Proximity Thresholds</h2>

          <div style={styles.field}>
            <label style={styles.label}>Near (meters)</label>
            <input
              type="number"
              value={config.proximityThresholds.near}
              onChange={(e) =>
                setConfig({
                  ...config,
                  proximityThresholds: {
                    ...config.proximityThresholds,
                    near: Number(e.target.value),
                  },
                })
              }
              style={styles.input}
              min={10}
              max={500}
            />
            <span style={styles.hint}>Distance to show "getting close" UI (10-500m)</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Very Close (meters)</label>
            <input
              type="number"
              value={config.proximityThresholds.veryClose}
              onChange={(e) =>
                setConfig({
                  ...config,
                  proximityThresholds: {
                    ...config.proximityThresholds,
                    veryClose: Number(e.target.value),
                  },
                })
              }
              style={styles.input}
              min={5}
              max={200}
            />
            <span style={styles.hint}>Distance to show "almost there" UI (5-200m)</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Reached (meters)</label>
            <input
              type="number"
              value={config.proximityThresholds.reached}
              onChange={(e) =>
                setConfig({
                  ...config,
                  proximityThresholds: {
                    ...config.proximityThresholds,
                    reached: Number(e.target.value),
                  },
                })
              }
              style={styles.input}
              min={5}
              max={100}
            />
            <span style={styles.hint}>Distance to trigger goal completion (5-100m)</span>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Default Game Settings</h2>

          <div style={styles.field}>
            <label style={styles.label}>Default Max Players</label>
            <input
              type="number"
              value={config.defaultMaxPlayers}
              onChange={(e) => setConfig({ ...config, defaultMaxPlayers: Number(e.target.value) })}
              style={styles.input}
              min={1}
              max={50}
            />
            <span style={styles.hint}>Default max players per game (1-50)</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Default Proximity Threshold (meters)</label>
            <input
              type="number"
              value={config.defaultProximityThreshold}
              onChange={(e) =>
                setConfig({ ...config, defaultProximityThreshold: Number(e.target.value) })
              }
              style={styles.input}
              min={5}
              max={100}
            />
            <span style={styles.hint}>Default distance to reach goal (5-100m)</span>
          </div>
        </section>

        <div style={styles.actions}>
          <button onClick={() => navigate('/')} style={styles.buttonSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} style={styles.button} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 24,
  },
  content: {
    maxWidth: 600,
    margin: '0 auto',
    background: 'white',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
    marginTop: 0,
  },
  section: {
    marginBottom: 32,
    padding: 16,
    background: '#f8fafc',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 16,
    marginTop: 0,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
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
  },
  buttonSecondary: {
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  success: {
    background: '#f0fdf4',
    color: '#16a34a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
};
