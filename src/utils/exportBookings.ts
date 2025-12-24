import { Booking, Patient, Hospital } from '@/types';
import * as XLSX from 'xlsx';

export const exportBookings = (bookings: Booking[], patients: Patient[], hospitals: Hospital[]) => {
    const data = bookings.map(booking => {
        const patient = patients.find(p => p.id === booking.patientId);
        const origin = hospitals.find(h => h.id === booking.originHospitalId);
        const destination = hospitals.find(h => h.id === booking.destinationHospitalId);

        return {
            ID: booking.id,
            Patient: patient?.name || 'Unknown',
            Status: booking.status,
            Urgency: booking.urgency,
            Origin: origin?.name || 'Unknown',
            Destination: destination?.name || 'Unknown',
            Date: booking.preferredPickupWindow,
            RequiredEquipment: booking.requiredEquipment?.join(', ') || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bookings");
    XLSX.writeFile(wb, "bookings_export.xlsx");
};
