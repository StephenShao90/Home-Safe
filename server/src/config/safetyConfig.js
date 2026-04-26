export const SAFETY_CONFIG = {
    publicWeight: 0.75,
    userWeight: 0.25,
    buckets: [
        { min: 8.5, label: 'green' },
        { min: 6.5, label: 'yellow' },
        { min: 4.5, label: 'orange' },
        { min: 0, label: 'red'}
    ]
};