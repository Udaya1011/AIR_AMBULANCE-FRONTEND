import { Aircraft } from '@/types';
import { apiClient } from './apiClient';

// Map status from backend to frontend
const mapBackendStatus = (status: string): 'available' | 'in_flight' | 'maintenance' => {
    const statusMap: Record<string, 'available' | 'in_flight' | 'maintenance'> = {
        'available': 'available',
        'in_maintenance': 'maintenance',
        'in_use': 'in_flight',
        'out_of_service': 'maintenance',
    };
    return statusMap[status] || 'available';
};

// Map status from frontend to backend
const mapFrontendStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'available': 'available',
        'maintenance': 'in_maintenance',
        'in_flight': 'in_use',
    };
    return statusMap[status] || 'available';
};

export const AircraftService = {
    async getAircrafts(): Promise<Aircraft[]> {
        const response = await apiClient.get('/api/aircraft');

        // Transform backend response to frontend format
        return response.map((aircraft: any) => ({
            id: aircraft.id,
            airlineId: aircraft.airline_id || '',
            airlineName: aircraft.airline_operator || 'Unknown',
            type: aircraft.aircraft_type || '',
            registration: aircraft.registration || '',
            range: aircraft.range_km || 0,
            speed: aircraft.speed_kmh || 0,
            cabinConfig: aircraft.cabin_configuration || '',
            maxPayload: aircraft.max_payload_kg || 0,
            medicalEquipment: Array.isArray(aircraft.medical_equipment)
                ? aircraft.medical_equipment.map((e: any) => typeof e === 'string' ? e : e.name)
                : [],
            baseLocation: aircraft.base_location || '',
            status: mapBackendStatus(aircraft.status),
            operator: aircraft.airline_operator || 'Unknown',
            crewAssigned: aircraft.crew_assigned || 0,
            nextMaintenanceDue: aircraft.next_maintenance_due || null,
            imageUrl: aircraft.image_url || 'https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg',
            latitude: aircraft.latitude || 0,
            longitude: aircraft.longitude || 0,
        }));
    },

    async createAircraft(payload: any): Promise<Aircraft> {
        // Transform frontend format to backend format
        const backendPayload = {
            aircraft_type: payload.type || 'fixed_wing',
            registration: payload.registration || '',
            airline_operator: payload.operator || payload.airlineName || 'Unknown',
            range_km: payload.range || 1000,
            speed_kmh: payload.speed || 300,
            max_payload_kg: payload.maxPayload || 5000,
            cabin_configuration: payload.cabinConfig || 'Standard',
            base_location: payload.baseLocation || 'Unknown Base', // REQUIRED field - must have value
            medical_equipment: Array.isArray(payload.medicalEquipment)
                ? payload.medicalEquipment
                    .filter((e: any) => e && e.trim())
                    .map((name: string) => ({ name: name.trim(), quantity: 1, operational: true }))
                : [],
            status: mapFrontendStatus(payload.status || 'available'),
            latitude: Number(payload.latitude) || 0,
            longitude: Number(payload.longitude) || 0,
        };

        console.log('Sending to backend:', backendPayload); // Debug log

        const response = await apiClient.post('/api/aircraft', backendPayload);

        // Transform response back to frontend format
        return {
            id: response.id,
            airlineId: response.airline_id || '',
            airlineName: response.airline_operator || 'Unknown',
            type: response.aircraft_type || '',
            registration: response.registration || '',
            range: response.range_km || 0,
            speed: response.speed_kmh || 0,
            cabinConfig: response.cabin_configuration || '',
            maxPayload: response.max_payload_kg || 0,
            medicalEquipment: Array.isArray(response.medical_equipment)
                ? response.medical_equipment.map((e: any) => typeof e === 'string' ? e : e.name)
                : [],
            baseLocation: response.base_location || '',
            status: mapBackendStatus(response.status),
        };
    },

    async updateAircraft(id: string, payload: any): Promise<void> {
        // Transform frontend format to backend format
        const backendPayload: any = {};

        if (payload.type) backendPayload.aircraft_type = payload.type;
        if (payload.registration) backendPayload.registration = payload.registration;
        if (payload.operator || payload.airlineName) backendPayload.airline_operator = payload.operator || payload.airlineName;
        if (payload.range) backendPayload.range_km = payload.range;
        if (payload.speed) backendPayload.speed_kmh = payload.speed;
        if (payload.maxPayload) backendPayload.max_payload_kg = payload.maxPayload;
        if (payload.cabinConfig) backendPayload.cabin_configuration = payload.cabinConfig;
        if (payload.baseLocation) backendPayload.base_location = payload.baseLocation;
        if (payload.medicalEquipment) {
            backendPayload.medical_equipment = Array.isArray(payload.medicalEquipment)
                ? payload.medicalEquipment
                    .filter((e: any) => e && e.trim())
                    .map((name: string) => ({ name: name.trim(), quantity: 1, operational: true }))
                : [];
        }
        if (payload.status) backendPayload.status = mapFrontendStatus(payload.status);
        if (payload.latitude !== undefined) backendPayload.latitude = Number(payload.latitude);
        if (payload.longitude !== undefined) backendPayload.longitude = Number(payload.longitude);

        return apiClient.put(`/api/aircraft/${id}`, backendPayload);
    },

    async deleteAircraft(id: string): Promise<void> {
        return apiClient.del(`/api/aircraft/${id}`);
    }
};
