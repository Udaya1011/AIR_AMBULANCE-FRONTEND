export type AcuityLevel = 'critical' | 'urgent' | 'stable';

export type BookingStatus =
    | 'requested'
    | 'clinical_review'
    | 'dispatch_review'
    | 'airline_confirmed'
    | 'crew_assigned'
    | 'in_transit'
    | 'completed'
    | 'cancelled';

export type Gender = 'male' | 'female' | 'other';

export interface Patient {
    id: string;
    patient_id?: string;
    full_name: string;      // Backend uses full_name, mapped from name in UI? No, backend expects 'full_name'
    name?: string;          // Optional alias for UI compatibility
    date_of_birth: string;  // Backend expects 'date_of_birth'
    dob?: string;           // Optional alias
    gender: Gender;
    weight_kg: number;      // Backend uses weight_kg
    weight?: number;        // Alias
    diagnosis: string;
    acuity_level: AcuityLevel; // Backend uses snake_case 'acuity_level'
    blood_group?: string;
    assigned_hospital_id?: string;
    allergies: string[];    // Backend expects list of strings

    current_vitals?: {
        heart_rate?: number;
        blood_pressure?: string;
        oxygen_saturation?: number;
        temperature?: number;
        respiratory_rate?: number;
    };

    special_equipment_needed?: string[];

    insurance_details?: {
        provider: string;
        policy_number: string;
        group_number?: string;
        verification_status?: string;
    };

    next_of_kin?: {
        name: string;
        relationship: string;
        phone: string;
        email?: string;
    };

    created_at?: string;
    updated_at?: string;
}

export interface Hospital {
    id: string;
    name: string;
    address: string;
    levelOfCare: string;
    icuCapacity: number;
    occupiedBeds: number;
    coordinates?: { lat: number; lng: number };
    contactPerson?: string;
    email?: string;
    phone?: string;
    preferredPickupLocation?: string;
}

export interface Booking {
    id: string;
    booking_id?: string;
    patientId: string;
    originHospitalId: string;
    destinationHospitalId: string;
    status: BookingStatus;
    urgency: 'routine' | 'urgent' | 'emergency';
    preferredPickupWindow: string;
    requiredEquipment?: string[];
    timeline: Array<{
        id: string;
        event: string;
        user: string;
        timestamp: string;
        details?: string;
    }>;
    approvals?: Array<{
        id: string;
        type: string;
        status: 'approved' | 'rejected';
        approvedBy: string;
        approvedAt: string;
        notes?: string;
    }>;
    requestedAt?: string;
    requestedBy?: string;
    estimatedFlightTime?: number;
    estimatedCost?: number;
    actualCost?: number;

    // Optional expanded fields for UI convenience
    patient?: { name: string };
    originHospital?: { name: string };
    destinationHospital?: { name: string };
}

export interface Aircraft {
    id: string;
    registration: string;
    type: string;
    operator: string;
    baseLocation: string;
    crewAssigned: number;
    status: 'available' | 'in_flight' | 'maintenance';
    nextMaintenanceDue?: string;
    imageUrl?: string;
    latitude: number;
    longitude: number;
    medicalEquipment?: string[] | string;
    hoursFlown?: number;
    hours?: number;
    airlineId?: string;
    airlineName?: string;
}
