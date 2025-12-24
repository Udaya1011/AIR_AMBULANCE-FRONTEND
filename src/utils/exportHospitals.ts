import { Hospital } from '@/types';
import * as XLSX from 'xlsx';

export const exportHospitals = (hospitals: Hospital[]) => {
    const data = hospitals.map(h => ({
        ID: h.id,
        Name: h.name,
        Address: h.address,
        LevelOfCare: h.levelOfCare,
        ICUCapacity: h.icuCapacity,
        ContactPerson: h.contactPerson,
        Phone: h.phone,
        Email: h.email
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hospitals");
    XLSX.writeFile(wb, "hospitals_export.xlsx");
};
