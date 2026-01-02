import { Hospital } from '../types';
import { apiClient } from './apiClient';

// Level of care mapping between frontend and backend
const levelOfCareMap: Record<string, string> = {
  'Primary': 'basic',
  'Secondary': 'advanced',
  'Tertiary': 'tertiary',
  'Quaternary': 'trauma_center'
};

// Reverse mapping for backend to frontend
const reverseLevelOfCareMap: Record<string, string> = {
  'basic': 'Primary',
  'advanced': 'Secondary',
  'tertiary': 'Tertiary',
  'trauma_center': 'Quaternary'
};

export const HospitalService = {
  async getHospitals(): Promise<Hospital[]> {
    const response = await apiClient.get('/api/hospitals');

    // Transform backend response to frontend format
    return response.map((hospital: any) => ({
      id: hospital.id || hospital._id,
      name: hospital.hospital_name,
      address: hospital.address,
      levelOfCare: reverseLevelOfCareMap[hospital.level_of_care] || 'Primary',
      icuCapacity: hospital.icu_capacity,
      occupiedBeds: hospital.occupied_beds || 0,
      coordinates: { lat: hospital.latitude, lng: hospital.longitude },
      contactPerson: hospital.contact_information?.name || '',
      email: hospital.contact_information?.email || '',
      phone: hospital.contact_information?.phone || '',
    }));
  },

  async createHospital(hospital: Partial<Hospital>): Promise<Hospital> {
    try {
      // Transform frontend Hospital format to backend HospitalCreate format
      const hospitalData = {
        hospital_name: hospital.name || '',
        address: hospital.address || '',
        latitude: hospital.coordinates?.lat || 0,
        longitude: hospital.coordinates?.lng || 0,
        level_of_care: levelOfCareMap[hospital.levelOfCare || 'Primary'] || 'basic',
        icu_capacity: hospital.icuCapacity || 0,
        occupied_beds: hospital.occupiedBeds || 0,
        contact_information: {
          name: hospital.contactPerson || '',
          phone: hospital.phone || '',
          email: hospital.email || '',
          position: 'Administrator'  // Default position
        },
        preferred_pickup_location: hospital.address || ''  // Use address as default pickup location
      };

      const response = await apiClient.post('/api/hospitals', hospitalData);

      // Transform backend response back to frontend Hospital format
      return {
        id: response.id || response._id,
        name: response.hospital_name,
        address: response.address,
        levelOfCare: reverseLevelOfCareMap[response.level_of_care] || 'Primary',
        icuCapacity: response.icu_capacity,
        occupiedBeds: response.occupied_beds || 0,
        coordinates: { lat: response.latitude, lng: response.longitude },
        contactPerson: response.contact_information?.name || '',
        email: response.contact_information?.email || '',
        phone: response.contact_information?.phone || '',
      };
    } catch (error: any) {
      console.error('Error creating hospital:', error);
      throw error;
    }
  },

  async updateHospital(id: string, hospital: Partial<Hospital>): Promise<void> {
    try {
      // Transform frontend Hospital format to backend HospitalUpdate format
      const hospitalData: any = {};

      if (hospital.name) hospitalData.hospital_name = hospital.name;
      if (hospital.address) hospitalData.address = hospital.address;
      if (hospital.coordinates?.lat !== undefined) hospitalData.latitude = hospital.coordinates.lat;
      if (hospital.coordinates?.lng !== undefined) hospitalData.longitude = hospital.coordinates.lng;
      if (hospital.levelOfCare) hospitalData.level_of_care = levelOfCareMap[hospital.levelOfCare] || 'basic';
      if (hospital.icuCapacity !== undefined) hospitalData.icu_capacity = hospital.icuCapacity;
      if (hospital.occupiedBeds !== undefined) hospitalData.occupied_beds = hospital.occupiedBeds;
      if (hospital.address) hospitalData.preferred_pickup_location = hospital.address;

      return apiClient.put(`/api/hospitals/${id}`, hospitalData);
    } catch (error) {
      console.error('Error updating hospital:', error);
      throw error;
    }
  },

  async deleteHospital(id: string): Promise<void> {
    try {
      await apiClient.del(`/api/hospitals/${id}`);
    } catch (error) {
      console.error('Error deleting hospital:', error);
      throw error;
    }
  },
};