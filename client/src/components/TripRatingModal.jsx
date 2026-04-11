import { useEffect, useState } from 'react';

function TripRatingModal({
  isOpen,
  onClose,
  onSubmit,
  routeTitle = 'Selected Route'
}) {
  const [safetyRating, setSafetyRating] = useState(8);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSafetyRating(8);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(2, 6, 23, 0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999
    },
    modal: {
      width: 'min(560px, 100%)',
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: '24px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 28px 80px rgba(15, 23, 42, 0.28)',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      padding: '22px 22px 16px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '14px'
    },
    title: {
      margin: 0,
      fontSize: '1.4rem',
      color: '#111827'
    },
    subtitle: {
      margin: '6px 0 0',
      color: '#6b7280',
      fontSize: '0.95rem',
      lineHeight: 1.45
    },
    closeButton: {
      width: '38px',
      height: '38px',
      borderRadius: '999px',
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      fontSize: '1.25rem',
      cursor: 'pointer',
      color: '#374151'
    },
    body: {
      padding: '22px'
    },
    sectionLabel: {
      display: 'block',
      fontSize: '0.95rem',
      fontWeight: 800,
      color: '#111827',
      marginBottom: '10px'
    },
    scoreBox: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '10px'
    },
    scoreValue: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '86px',
      height: '40px',
      padding: '0 14px',
      borderRadius: '999px',
      background: '#dbeafe',
      color: '#1d4ed8',
      fontWeight: 800
    },
    slider: {
      width: '100%',
      marginBottom: '22px'
    },
    helperText: {
      fontSize: '0.9rem',
      color: '#6b7280',
      marginBottom: '18px'
    },
    textarea: {
      width: '100%',
      minHeight: '120px',
      resize: 'vertical',
      borderRadius: '16px',
      border: '1px solid #d1d5db',
      padding: '14px',
      fontSize: '0.96rem',
      boxSizing: 'border-box',
      outline: 'none'
    },
    footer: {
      padding: '16px 22px 22px',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    },
    ghostButton: {
      height: '46px',
      padding: '0 18px',
      borderRadius: '14px',
      border: '1px solid #d1d5db',
      background: '#ffffff',
      color: '#111827',
      fontWeight: 700,
      cursor: 'pointer'
    },
    primaryButton: {
      height: '46px',
      padding: '0 18px',
      borderRadius: '14px',
      border: 'none',
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#ffffff',
      fontWeight: 800,
      cursor: 'pointer',
      boxShadow: '0 12px 24px rgba(37, 99, 235, 0.22)'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Rate This Trip</h2>
            <p style={styles.subtitle}>
              Share how safe the route felt so Home Safe can improve future recommendations.
              <br />
              <strong>{routeTitle}</strong>
            </p>
          </div>

          <button type="button" onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          <label style={styles.sectionLabel}>Safety Rating</label>

          <div style={styles.scoreBox}>
            <div style={styles.helperText}>1 = felt unsafe, 10 = felt very safe</div>
            <div style={styles.scoreValue}>{safetyRating} / 10</div>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={safetyRating}
            onChange={(event) => setSafetyRating(Number(event.target.value))}
            style={styles.slider}
          />

          <label style={styles.sectionLabel} htmlFor="trip-rating-notes">
            Notes
          </label>

          <textarea
            id="trip-rating-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Was it well lit? Busy? Quiet? Did anything make it feel safer or less safe?"
            style={styles.textarea}
          />
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.ghostButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ safetyRating, notes })}
            style={styles.primaryButton}
          >
            Submit Rating
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripRatingModal;