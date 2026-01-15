import { useState, useEffect, CSSProperties } from 'react';
import { mockLocationService, isMockLocationEnabled, PRESET_LOCATIONS } from '../../services/mockLocation';

export function MockLocationControls() {
  const [isOpen, setIsOpen] = useState(true);
  const [lat, setLat] = useState('32.0853');
  const [lng, setLng] = useState('34.7818');
  const [currentPosition, setCurrentPosition] = useState(mockLocationService.getPosition());

  useEffect(() => {
    const unsubscribe = mockLocationService.subscribe((position) => {
      setCurrentPosition(position);
      setLat(position.latitude.toFixed(6));
      setLng(position.longitude.toFixed(6));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          mockLocationService.move('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          mockLocationService.move('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          mockLocationService.move('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          mockLocationService.move('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isMockLocationEnabled()) return null;

  const handleSetLocation = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (!isNaN(latitude) && !isNaN(longitude)) {
      mockLocationService.setPosition(latitude, longitude);
    }
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESET_LOCATIONS[e.target.value as keyof typeof PRESET_LOCATIONS];
    if (preset) {
      mockLocationService.setPosition(preset.latitude, preset.longitude);
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={styles.minimizedButton}>
        Mock GPS
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Mock Location</span>
        <button onClick={() => setIsOpen(false)} style={styles.closeButton}>-</button>
      </div>

      <div style={styles.currentLocation}>
        <strong>Current:</strong><br />
        {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Preset:</label>
        <select onChange={handlePresetSelect} style={styles.select} defaultValue="">
          <option value="" disabled>Select location...</option>
          {Object.keys(PRESET_LOCATIONS).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Custom:</label>
        <div style={styles.inputRow}>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            style={styles.input}
          />
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            style={styles.input}
          />
        </div>
        <button onClick={handleSetLocation} style={styles.button}>Set</button>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Move (or use arrow keys):</label>
        <div style={styles.arrowGrid}>
          <div />
          <button onClick={() => mockLocationService.move('up')} style={styles.arrowButton}>^</button>
          <div />
          <button onClick={() => mockLocationService.move('left')} style={styles.arrowButton}>{'<'}</button>
          <div style={styles.centerDot} />
          <button onClick={() => mockLocationService.move('right')} style={styles.arrowButton}>{'>'}</button>
          <div />
          <button onClick={() => mockLocationService.move('down')} style={styles.arrowButton}>v</button>
          <div />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 220,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
    padding: 12,
    zIndex: 9999,
    fontSize: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid #eee',
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    background: '#f0f0f0',
    border: 'none',
    borderRadius: 4,
    width: 24,
    height: 24,
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: '20px',
  },
  minimizedButton: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 9999,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  currentLocation: {
    background: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  select: {
    width: '100%',
    padding: 6,
    borderRadius: 4,
    border: '1px solid #ddd',
    fontSize: 12,
  },
  inputRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    border: '1px solid #ddd',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  button: {
    width: '100%',
    padding: 6,
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    width: 100,
    margin: '0 auto',
  },
  arrowButton: {
    width: 30,
    height: 30,
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 30,
    height: 30,
    background: '#3b82f6',
    borderRadius: '50%',
    margin: '0 auto',
  },
};
