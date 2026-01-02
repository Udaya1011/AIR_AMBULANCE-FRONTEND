import React, { createContext, useContext, useEffect, useState } from 'react';
import { Patient } from '@/types';
import { PatientsService } from '@/services/patients.service';
import { toast } from '@/components/ui/use-toast';

type PatientsContextType = {
  patients: Patient[];
  isLoading: boolean;
  addPatient: (p: Partial<Patient>) => Promise<Patient>;
  removePatient: (id: string) => Promise<void>;
  updatePatient: (id: string, p: Partial<Patient>) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
};

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

import { useAuth } from './AuthContext';

// ... (keep the existing context definition and provider skeleton)

export const PatientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const data = await PatientsService.list();
        setPatients(data.filter(Boolean));
      } catch (error: any) {
        console.error("Failed to fetch patients", error);
        toast({
          title: "Error fetching patients",
          description: error.message || "Please try logging in again.",
          variant: "destructive"
        });
        if (error.status === 401) {
          // Token expired or invalid
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPatients();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, logout]);

  const addPatient = async (p: Partial<Patient>) => {
    try {
      const newPatient = await PatientsService.create(p);
      setPatients(prev => [newPatient, ...prev]);
      return newPatient;
    } catch (error: any) {
      console.error("Failed to add patient", error);
      if (error.status === 401) logout();
      throw error;
    }
  };

  const removePatient = async (id: string) => {
    try {
      await PatientsService.remove(id);
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error("Failed to remove patient", error);
      if (error.status === 401) logout();
      throw error;
    }
  };

  const updatePatient = async (id: string, p: Partial<Patient>) => {
    try {
      const updatedPatient = await PatientsService.update(id, p);
      setPatients(prev => prev.map(x => x.id === id ? updatedPatient : x));
    } catch (error: any) {
      console.error("Failed to update patient", error);
      if (error.status === 401) logout();
      throw error;
    }
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id || p.patient_id === id);


  return (
    <PatientsContext.Provider value={{ patients, isLoading, addPatient, removePatient, updatePatient, getPatientById }}>
      {children}
    </PatientsContext.Provider>
  );
};

export const usePatients = () => {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error('usePatients must be used within PatientsProvider');
  return ctx;
};

export default PatientsContext;