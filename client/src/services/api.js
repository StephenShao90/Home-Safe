const BASE_URL = 'http://localhost:5000';

export async function computeRoute(origin, destination){
    const response = await fetch(`${BASE_URL}/api/routes/compute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({origin, destination})
    });

    const data = await response.json();

    if(!response.ok){
        throw new Error(data.error || 'Failed to compute route');
    }

    return data;
}

export async function submitRating(origin, destination, safetyRating, notes){
    const response = await fetch(`${BASE_URL}/api/ratings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            origin,
            destination,
            safetyRating,
            notes
        })
    });

    const data = await response.json();

    if(!response.ok) {
        throw new Error(data.error || 'Failed to submit rating');
    }

    return data;
}