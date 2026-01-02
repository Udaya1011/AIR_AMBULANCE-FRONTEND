/**
 * Calculates the Haversine distance between two points in km.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Distance in km rounded to 2 decimal places
};

/**
 * Calculates revenue based on distance and a fixed rate.
 * Rate: 1000/km.
 */
export const calculateRevenue = (distanceKm: number): number => {
    return Math.round(distanceKm * 1000);
};
