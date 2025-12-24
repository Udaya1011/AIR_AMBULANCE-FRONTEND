import { Booking } from '@/types';
import { apiClient } from './apiClient';

export const BookingService = {
    async list(): Promise<Booking[]> {
        const response = await apiClient.get('/api/bookings/');

        // Transform backend response to frontend format
        return response.map((booking: any) => ({
            id: booking.id || booking._id,
            patientId: booking.patient_id,
            originHospitalId: booking.origin_hospital_id || '',
            destinationHospitalId: booking.destination_hospital_id || '',
            status: mapBackendStatus(booking.status),
            urgency: booking.urgency || 'routine',
            preferredPickupWindow: combineDateTime(booking.preferred_date, booking.preferred_time),
            requiredEquipment: booking.required_equipment || [],
            requestedBy: booking.created_by || 'Unknown',
            requestedAt: booking.created_at || new Date().toISOString(),
            approvals: [],
            timeline: [
                {
                    id: '1',
                    timestamp: booking.created_at || new Date().toISOString(),
                    event: 'Booking Created',
                    user: booking.created_by || 'System'
                }
            ]
        }));
    },

    async get(id: string): Promise<Booking> {
        const booking = await apiClient.get(`/api/bookings/${id}/`);
        return transformToFrontend(booking);
    },

    async create(payload: any): Promise<Booking> {
        // Transform frontend format to backend format
        const { date, time } = splitDateTime(payload.preferredPickupWindow || '');

        const backendPayload = {
            patient_id: payload.patientId,
            urgency: mapFrontendUrgency(payload.urgency || 'routine'),
            origin_hospital_id: payload.originHospitalId || null,
            destination_hospital_id: payload.destinationHospitalId || null,
            preferred_date: date,
            preferred_time: time,
            required_equipment: payload.requiredEquipment || [],
            special_instructions: payload.specialInstructions || ''
        };

        const response = await apiClient.post('/api/bookings/', backendPayload);
        return transformToFrontend(response);
    },

    async update(id: string, payload: any): Promise<Booking> {
        const { date, time } = splitDateTime(payload.preferredPickupWindow || '');

        const backendPayload: any = {};
        if (payload.urgency) backendPayload.urgency = mapFrontendUrgency(payload.urgency);
        if (payload.status) backendPayload.status = mapFrontendStatus(payload.status);
        if (date) backendPayload.preferred_date = date;
        if (time) backendPayload.preferred_time = time;
        if (payload.requiredEquipment) backendPayload.required_equipment = payload.requiredEquipment;

        const response = await apiClient.put(`/api/bookings/${id}/`, backendPayload);
        return transformToFrontend(response);
    },

    async remove(id: string): Promise<void> {
        return apiClient.del(`/api/bookings/${id}/`);
    }
};

// Helper functions
function mapBackendStatus(status: string): any {
    const statusMap: Record<string, string> = {
        'pending': 'requested',
        'approved': 'clinical_review',
        'scheduled': 'dispatch_review',
        'en_route': 'in_transit',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };
    return statusMap[status] || status;
}

function mapFrontendStatus(status: string): string {
    const statusMap: Record<string, string> = {
        'requested': 'pending',
        'clinical_review': 'approved',
        'dispatch_review': 'scheduled',
        'in_transit': 'en_route',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };
    return statusMap[status] || status;
}

function mapFrontendUrgency(urgency: string): string {
    const urgencyMap: Record<string, string> = {
        'routine': 'stable',
        'urgent': 'urgent',
        'emergency': 'critical'
    };
    return urgencyMap[urgency] || 'stable';
}

function combineDateTime(date: string | null, time: string | null): string {
    if (!date && !time) {
        return new Date().toISOString();
    }

    try {
        const dateStr = date || new Date().toISOString().split('T')[0];
        const timeStr = time || '00:00:00';
        return new Date(`${dateStr}T${timeStr}`).toISOString();
    } catch {
        return new Date().toISOString();
    }
}

function splitDateTime(dateTime: string): { date: string | null, time: string | null } {
    if (!dateTime) return { date: null, time: null };

    try {
        const dt = new Date(dateTime);
        const date = dt.toISOString().split('T')[0];
        const time = dt.toTimeString().split(' ')[0];
        return { date, time };
    } catch {
        return { date: null, time: null };
    }
}

function transformToFrontend(booking: any): Booking {
    return {
        id: booking.id || booking._id,
        patientId: booking.patient_id,
        originHospitalId: booking.origin_hospital_id || '',
        destinationHospitalId: booking.destination_hospital_id || '',
        status: mapBackendStatus(booking.status),
        urgency: booking.urgency || 'routine',
        preferredPickupWindow: combineDateTime(booking.preferred_date, booking.preferred_time),
        requiredEquipment: booking.required_equipment || [],
        requestedBy: booking.created_by || 'Unknown',
        requestedAt: booking.created_at || new Date().toISOString(),
        approvals: [],
        timeline: [
            {
                id: '1',
                timestamp: booking.created_at || new Date().toISOString(),
                event: 'Booking Created',
                user: booking.created_by || 'System'
            }
        ]
    };
}

export default BookingService;
