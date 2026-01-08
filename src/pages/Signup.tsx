import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Mail,
  Phone,
  ShieldAlert,
  Plane
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import innovativeBg from "../assets/innovative_bg.png";
import "./Login.css";

interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  confirmPassword: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    phone: "",
    role: "superadmin",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image", `url(${innovativeBg})`);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Validation Error", { description: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/auth/register", {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
      });

      toast.success("Account Created", {
        description: "Your administrative profile has been established. Redirecting to login...",
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      toast.error("Registration Failed", {
        description: err?.message || "Please check your details and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-innovative">
      {/* Static Background View */}
      <div className="video-bg-container">
        <div className="ai-video-canvas static-view"></div>
      </div>

      {/* Primary Branding Only */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="innovative-floating-info"
      >
        <h2>AIR <br />AMBULANCE <br />SERVICE</h2>
      </motion.div>

      {/* Immersive Right Panel */}
      <motion.div
        initial={{ x: 500, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 30, stiffness: 100, delay: 0.3 }}
        className="innovative-right-panel"
      >
        <div className="scroll-content">
          <div className="panel-top-branding">
            <Plane className="w-5 h-5" />
            <span>AIR AMBULANCE</span>
          </div>

          <div className="brand-header">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Create Account
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Fill in your administrative credentials <br />
              to request access to the coordination hub.
            </motion.p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="innovative-form-group">
              <label className="innovative-label">Full Name</label>
              <div className="innovative-input-wrapper">
                <input
                  name="fullName"
                  type="text"
                  className="innovative-input"
                  placeholder="Ex: John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="innovative-form-group">
              <label className="innovative-label">Professional Email</label>
              <div className="innovative-input-wrapper">
                <input
                  name="email"
                  type="email"
                  className="innovative-input"
                  placeholder="john.doe@hospital.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="innovative-form-group">
              <label className="innovative-label">Phone Coordination</label>
              <div className="innovative-input-wrapper">
                <input
                  name="phone"
                  type="text"
                  className="innovative-input"
                  placeholder="10 digit number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="innovative-form-group">
              <label className="innovative-label">Assigned Role</label>
              <div className="innovative-input-wrapper">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="innovative-input innovative-select"
                  required
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="hospital_staff">Hospital Staff</option>
                  <option value="medical_team">Medical Team</option>
                  <option value="airline_coordinator">Airline Coordinator</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="innovative-form-group">
                <label className="innovative-label">Password</label>
                <div className="innovative-input-wrapper">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="innovative-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="innovative-form-group">
                <label className="innovative-label">Confirm</label>
                <div className="innovative-input-wrapper">
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    className="innovative-input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="innovative-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="innovative-submit-btn"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Establishing Profile..." : "Register Profile"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </span>
            </button>

            <footer className="innovative-footer">
              <p>
                Already an established member?{" "}
                <Link to="/login" className="innovative-link">Return to Login</Link>
              </p>
            </footer>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
