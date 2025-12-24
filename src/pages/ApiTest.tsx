import { useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export default function ApiTest() {
  const [output, setOutput] = useState<any>(null);
  const { logout } = useAuth();

  const doHealth = async () => {
    try {
      const res = await apiClient.get('/health');
      setOutput(res);
    } catch (e: any) {
      setOutput({ error: e.message || e });
    }
  };

  const doHospitals = async () => {
    try {
      const res = await apiClient.get('/api/hospitals');
      setOutput(res);
    } catch (e: any) {
      setOutput({ error: e.message || e });
    }
  };

  const doBookings = async () => {
    try {
      const res = await apiClient.get('/api/bookings');
      setOutput(res);
    } catch (e: any) {
      setOutput({ error: e.message || e });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">API Test</h2>
      <div className="space-x-2 mb-4">
        <button onClick={doHealth} className="btn">Health</button>
        <button onClick={doHospitals} className="btn">Hospitals</button>
        <button onClick={doBookings} className="btn">Bookings</button>
        <button onClick={logout} className="btn">Logout</button>
      </div>

      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
}
