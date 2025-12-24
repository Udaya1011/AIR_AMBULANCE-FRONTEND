import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plane, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/services/apiClient";
import "./Login.css";
import bg from "../assets/bg.jpeg";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    phone: "",
    role: "superadmin",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--bg-image", `url(${bg})`);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Name must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Phone must be 10 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/api/auth/register", {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
      });

      if (response) {
        setSuccess(true);
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          role: "superadmin",
          password: "",
          confirmPassword: "",
        });

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = 
        typeof err?.message === 'string' ? err.message :
        err?.data?.detail || 
        err?.detail || 
        "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="login-container">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative w-full max-w-xl space-y-8">
        <div className="text-center text-white drop-shadow-lg">
          <Plane className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-5xl font-extrabold tracking-wide">Air Ambulance</h1>
          <p className="text-xl text-gray-200 mt-2">Create Your Account</p>
        </div>

        <Card className="shadow-2xl border rounded-3xl bg-white/20 backdrop-blur-lg text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Sign Up</CardTitle>
            <CardDescription className="text-gray-200">
              Join the Air Medical Coordination System
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-red-600/90 text-white border-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-600/90 text-white border-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Account created! Redirecting to login...</AlertDescription>
                </Alert>
              )}

              {/* FULL NAME */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white font-semibold">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="h-12 text-lg rounded-lg bg-white/70 border-white/50 text-black placeholder-gray-500"
                  required
                />
                {errors.fullName && <p className="text-red-300 text-sm">{errors.fullName}</p>}
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12 text-lg rounded-lg bg-white/70 border-white/50 text-black placeholder-gray-500"
                  required
                />
                {errors.email && <p className="text-red-300 text-sm">{errors.email}</p>}
              </div>

              {/* PHONE */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-12 text-lg rounded-lg bg-white/70 border-white/50 text-black placeholder-gray-500"
                  required
                />
                {errors.phone && <p className="text-red-300 text-sm">{errors.phone}</p>}
              </div>

              {/* ROLE */}
              <div className="space-y-2">
                <Label htmlFor="selectRole" className="text-white font-semibold block mb-2">
                  Professional Role
                </Label>
                <select
                  id="selectRole"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  title="Select your professional role"
                  className="h-12 text-lg rounded-lg bg-white/70 border border-white/50 text-black w-full px-3 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="">-- Select a role --</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="hospital_staff">Hospital Staff</option>
                  <option value="medical_team">Medical Team</option>
                  <option value="airline_coordinator">Airline Coordinator</option>
                </select>
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-12 text-lg rounded-lg bg-white/70 border-white/50 text-black placeholder-gray-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-300 text-sm">{errors.password}</p>}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-12 text-lg rounded-lg bg-white/70 border-white/50 text-black placeholder-gray-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-300 text-sm">{errors.confirmPassword}</p>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg"
                disabled={loading || success}
              >
                {loading
                  ? "Creating Account..."
                  : success
                  ? "Redirecting..."
                  : "Create Account"}
              </Button>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <span className="relative px-3 bg-white/10 text-sm text-gray-300">OR</span>
              </div>

              {/* LOGIN LINK */}
              <p className="text-center text-gray-200">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-cyan-300 hover:text-cyan-200 font-semibold underline"
                >
                  Sign In
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
