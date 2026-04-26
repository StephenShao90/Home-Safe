import { SAFETY_CONFIG } from "../config/safetyConfig.js";

export function clampScore(value, min = 1, max = 10){
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.max(min, Math.min(max, numeric));
}

export function scoreToBucket(score){
    const safeScore = clampScore(score);
    const match = SAFETY_CONFIG.buckets.find((bucket) => safeScpre >= bucket.min);
    return match ? match.label : 'red';
}