import { useState } from 'react';

function TripRatingModal({ isOpen, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      safetyRating: Number(rating),
      notes
    });

    setRating(5);
    setNotes('');
  }

  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '1.5rem',
        maxWidth: '500px',
        border: '1px solid #ddd',
        borderRadius: '12px',
        backgroundColor: '#fff8f8',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h2 style={{ marginTop: 0 }}>Rate Your Trip</h2>
      <p>How safe did you feel on this route?</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="rating" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Safety Rating (1 to 10)
          </label>
          <input
            id="rating"
            type="number"
            min="1"
            max="10"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            style={{
              width: '100px',
              padding: '0.5rem',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about how the trip felt"
            rows="4"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Submit Rating
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </form>
    </div>
  );
}

export default TripRatingModal;