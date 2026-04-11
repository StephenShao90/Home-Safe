import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t))
  ];
}

export function colorFromSafety(avgRating) {
  const value = Math.max(1, Math.min(10, Number(avgRating) || 1));
  const t = (value - 1) / 9;

  // red -> orange -> yellow -> green
  const red = [239, 68, 68];
  const orange = [249, 115, 22];
  const yellow = [250, 204, 21];
  const green = [34, 197, 94];

  if (t <= 0.33) {
    return lerpColor(red, orange, t / 0.33);
  }

  if (t <= 0.66) {
    return lerpColor(orange, yellow, (t - 0.33) / 0.33);
  }

  return lerpColor(yellow, green, (t - 0.66) / 0.34);
}

function buildBlobLayers(safetyCells) {
  const expanded = [];

  for (const cell of safetyCells) {
    const lat = Number(cell.center_lat);
    const lng = Number(cell.center_lng);
    const rating = Number(cell.avg_rating) || 1;
    const reports = Number(cell.report_count) || 0;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const baseColor = colorFromSafety(rating);

    // Bigger cells with more reports
    const baseRadius =
      reports >= 8 ? 180 :
      reports >= 5 ? 150 :
      reports >= 3 ? 130 :
      110;

    // Many soft shells so nearby regions visually merge into one field
    expanded.push(
      { lat, lng, radius: baseRadius * 4.2, fill: [...baseColor, 8] },
      { lat, lng, radius: baseRadius * 3.5, fill: [...baseColor, 12] },
      { lat, lng, radius: baseRadius * 2.8, fill: [...baseColor, 18] },
      { lat, lng, radius: baseRadius * 2.2, fill: [...baseColor, 26] },
      { lat, lng, radius: baseRadius * 1.7, fill: [...baseColor, 38] },
      { lat, lng, radius: baseRadius * 1.25, fill: [...baseColor, 54] },
      { lat, lng, radius: baseRadius * 0.9, fill: [...baseColor, 78] }
    );
  }

  return expanded;
}

export function createSafetyBlobOverlay(map, safetyCells, visible) {
  const data = buildBlobLayers(safetyCells);

  const overlay = new GoogleMapsOverlay({
    layers: visible
      ? [
          new ScatterplotLayer({
            id: 'safety-blob-layer',
            data,
            getPosition: (d) => [d.lng, d.lat],
            getRadius: (d) => d.radius,
            radiusUnits: 'meters',
            stroked: false,
            filled: true,
            pickable: false,
            getFillColor: (d) => d.fill,
            parameters: {
              depthTest: false,
              blend: true,
              blendColorSrcFactor: 'src-alpha',
              blendColorDstFactor: 'one-minus-src-alpha',
              blendAlphaSrcFactor: 'one',
              blendAlphaDstFactor: 'one-minus-src-alpha'
            }
          })
        ]
      : []
  });

  overlay.setMap(map);
  return overlay;
}