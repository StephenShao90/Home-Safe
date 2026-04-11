function formatLocation(value, fallbackName) {
  if (fallbackName && typeof fallbackName === 'string') {
    return fallbackName;
  }

  if (!value) {
    return 'Unknown';
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'Selected location';
}
function formatDistance(routeData) {
  if (typeof routeData?.distance === 'string' && routeData.distance.trim()) {
    return routeData.distance;
  }

  if (typeof routeData?.distanceMeters === 'number') {
    if (routeData.distanceMeters < 1000) {
      return `${Math.round(routeData.distanceMeters)} m`;
    }

    return `${(routeData.distanceMeters / 1000).toFixed(1)} km`;
  }

  return 'N/A';
}

function formatDuration(routeData) {
  if (typeof routeData?.duration === 'string' && routeData.duration.trim()) {
    return routeData.duration;
  }

  if (typeof routeData?.durationSeconds === 'number') {
    const totalMinutes = Math.round(routeData.durationSeconds / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }

  return 'N/A';
}

function formatSafetyScore(routeData) {
  const rawScore =
    typeof routeData?.safetyScore === 'number'
      ? routeData.safetyScore
      : typeof routeData?.safety_score === 'number'
        ? routeData.safety_score
        : null;

  if (rawScore === null) {
    return 'N/A';
  }

  if (rawScore <= 10) {
    return `${rawScore.toFixed(1)} / 10`;
  }

  return `${rawScore.toFixed(0)} / 100`;
}

function formatGreenCoverage(routeData) {
  const value =
    typeof routeData?.greenCoverage === 'number'
      ? routeData.greenCoverage
      : typeof routeData?.green_coverage === 'number'
        ? routeData.green_coverage
        : null;

  if (value === null) {
    return 'N/A';
  }

  return `${Math.round(value)}%`;
}

function getRouteAccent(routeData) {
  const key = routeData?.type || routeData?.optionKey;

  switch (key) {
    case 'fastest':
    case 'quickest':
      return {
        badge: 'Quickest',
        badgeBackground: '#dbeafe',
        badgeColor: '#1d4ed8',
        borderColor: '#2563eb',
        selectedBackground: '#eff6ff',
        selectedText: '#1d4ed8'
      };
    case 'safest':
      return {
        badge: 'Safest',
        badgeBackground: '#dcfce7',
        badgeColor: '#15803d',
        borderColor: '#16a34a',
        selectedBackground: '#f0fdf4',
        selectedText: '#15803d'
      };
    case 'balanced':
      return {
        badge: 'Best Mix',
        badgeBackground: '#fef3c7',
        badgeColor: '#b45309',
        borderColor: '#eab308',
        selectedBackground: '#fffbeb',
        selectedText: '#b45309'
      };
    default:
      return {
        badge: 'Route',
        badgeBackground: '#e5e7eb',
        badgeColor: '#374151',
        borderColor: '#2563eb',
        selectedBackground: '#f9fafb',
        selectedText: '#111827'
      };
  }
}

function StatItem({ label, value }) {
  return (
    <div
      style={{
        padding: '0.85rem',
        borderRadius: '14px',
        background: '#f8fafc',
        border: '1px solid #e5e7eb'
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '0.35rem'
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1rem',
          fontWeight: '800',
          color: '#111827'
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RouteCard({
  routeData,
  title = 'Route Result',
  isSelected = false,
  onClick
}) {
  if (!routeData) {
    return null;
  }

  const accent = getRouteAccent(routeData);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        padding: '1.15rem',
        width: '100%',
        minWidth: 0,
        height: '100%',
        border: isSelected
          ? `2px solid ${accent.borderColor}`
          : '1px solid #d1d5db',
        borderRadius: '20px',
        backgroundColor: isSelected ? accent.selectedBackground : '#ffffff',
        boxShadow: isSelected
          ? '0 14px 32px rgba(15, 23, 42, 0.14)'
          : '0 8px 22px rgba(15, 23, 42, 0.08)',
        fontFamily: 'Arial, sans-serif',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.72rem',
                borderRadius: '999px',
                backgroundColor: accent.badgeBackground,
                color: accent.badgeColor,
                fontSize: '0.8rem',
                fontWeight: '800',
                marginBottom: '0.7rem'
              }}
            >
              {accent.badge}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: '1.18rem',
                color: '#111827'
              }}
            >
              {title}
            </h2>

            {routeData.subtitle && (
              <p
                style={{
                  marginTop: '0.4rem',
                  marginBottom: 0,
                  color: '#4b5563',
                  fontSize: '0.95rem'
                }}
              >
                {routeData.subtitle}
              </p>
            )}
          </div>

          {isSelected && (
            <div
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: accent.badgeBackground,
                color: accent.selectedText,
                fontSize: '0.78rem',
                fontWeight: '800',
                whiteSpace: 'nowrap'
              }}
            >
              Selected
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}
        >
          <StatItem label="Distance" value={formatDistance(routeData)} />
          <StatItem label="Duration" value={formatDuration(routeData)} />
          <StatItem label="Safety Score" value={formatSafetyScore(routeData)} />
          <StatItem label="Green Coverage" value={formatGreenCoverage(routeData)} />
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '0.9rem'
        }}
      >
        <div style={{ marginBottom: '0.55rem' }}>
          <span style={{ fontWeight: '800', color: '#374151' }}>From: </span>
          <span style={{ color: '#111827' }}>{formatLocation(routeData.origin, routeData.originName)}</span>
        </div>

        <div>
          <span style={{ fontWeight: '800', color: '#374151' }}>To: </span>
          <span style={{ color: '#111827' }}>{formatLocation(routeData.destination, routeData.destinationName)}</span>
        </div>

        {routeData.forcedWaypoints?.length > 0 && (
          <div
            style={{
              marginTop: '0.9rem',
              padding: '0.75rem',
              borderRadius: '12px',
              background: '#f9fafb',
              color: '#4b5563',
              fontSize: '0.92rem',
              border: '1px solid #e5e7eb'
            }}
          >
            Uses safer intermediate areas to shape this route.
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteCard;