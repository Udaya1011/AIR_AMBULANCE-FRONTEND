import { Patient } from '@/types';
import { apiClient } from './apiClient';

export const PatientsService = {
  async list(): Promise<Patient[]> {
    const response = await apiClient.get('/api/patients');
    return response.map((p: any) => ({
      ...p,
      id: p.id || p._id,
      name: p.full_name || p.name,
      dob: p.date_of_birth || p.dob,
      weight: p.weight_kg || p.weight
    }));
  },

  async create(patient: any): Promise<Patient> {
    const payload = {
      full_name: patient.full_name || patient.name,
      date_of_birth: patient.date_of_birth || patient.dob,
      gender: patient.gender,
      weight_kg: Number(patient.weight_kg || patient.weight || 70),
      diagnosis: patient.diagnosis || 'Undiagnosed',
      acuity_level: patient.acuity_level || 'stable',
      blood_group: patient.blood_group || 'O+',
      allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
      current_vitals: patient.current_vitals || {},
      special_equipment_needed: patient.special_equipment_needed || [],
      insurance_details: patient.insurance_details || { provider: "N/A", policy_number: "N/A" },
      next_of_kin: patient.next_of_kin || { name: "N/A", relationship: "N/A", phone: "N/A" }
    };

    const response = await apiClient.post('/api/patients', payload);
    return {
      ...response,
      id: response.id || response._id,
      name: response.full_name || response.name,
      dob: response.date_of_birth || response.dob,
      weight: response.weight_kg || response.weight
    };
  },

  async update(id: string, patient: Partial<Patient>): Promise<Patient> {
    const payload: any = { ...patient };
    if (patient.name) {
      payload.full_name = patient.name;
      delete payload.name;
    }
    if (patient.dob) {
      payload.date_of_birth = patient.dob;
      delete payload.dob;
    }
    if (patient.weight !== undefined) {
      payload.weight_kg = patient.weight;
      delete payload.weight;
    }

    const response = await apiClient.put(`/api/patients/${id}`, payload);
    return {
      ...response,
      id: response.id || response._id,
      name: response.full_name || response.name,
      dob: response.date_of_birth || response.dob,
      weight: response.weight_kg || response.weight
    };
  },

  async remove(id: string): Promise<void> {
    await apiClient.del(`/api/patients/${id}`);
  }
};
