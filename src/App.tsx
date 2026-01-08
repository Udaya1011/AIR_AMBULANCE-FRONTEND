import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PatientsProvider } from "@/contexts/PatientsContext";
import "@/App.css";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Patients from "@/pages/Patients";
import Hospitals from "@/pages/Hospitals";
import Aircraft from "@/pages/Aircraft";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import LiveMapComponent from "./pages/LiveMapComponent";
import ApiTest from "@/pages/ApiTest";

function App() {
  return (
    <div className="app-background">
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <PatientsProvider>
                      <Dashboard />
                    </PatientsProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <PatientsProvider>
                      <Bookings />
                    </PatientsProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients"
                element={
                  <ProtectedRoute>
                    <PatientsProvider>
                      <Patients />
                    </PatientsProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospitals"
                element={
                  <ProtectedRoute>
                    <PatientsProvider>
                      <Hospitals />
                    </PatientsProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aircraft"
                element={
                  <ProtectedRoute>
                    <Aircraft />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/livemap"
                element={
                  <ProtectedRoute>
                    <LiveMapComponent aircraftData={[]} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-test"
                element={
                  <ProtectedRoute>
                    <ApiTest />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </div>
  );
}

export default App;
