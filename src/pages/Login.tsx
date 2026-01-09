import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Plane,
  Shield,
  RefreshCw,
  Lock,
  Mail
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import innovativeBg from "../assets/innovative_bg.png";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [userInputCaptcha, setUserInputCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const generateCaptcha = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);



  useEffect(() => {
    document.documentElement.style.setProperty("--bg-image", `url(${innovativeBg})`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userInputCaptcha.toUpperCase() !== captcha) {
      toast.error("Security Check Failed", {
        description: "The verification code is incorrect. Please try again.",
      });
      generateCaptcha();
      setUserInputCaptcha("");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      toast.success("Authentication Success", {
        description: "Welcome back to the Air Ambulance coordination hub.",
      });
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err) {
      toast.error("Access Denied", {
        description: "Invalid credentials. Please verify your identity.",
      });
      generateCaptcha();
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

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="innovative-floating-info"
      >
        <div className="brand-badge">24/7 GLOBAL EMERGENCY NETWORK</div>
        <h2>AIR <br />AMBULANCE <br /><span className="text-glow">SERVICE</span></h2>
        <div className="brand-divider"></div>
        <p className="brand-tagline">
          The next generation of medical emergency <br />
          coordination and synchronized dispatch.
        </p>
      </motion.div>

      {/* Immersive Right Panel */}
      <motion.div
        initial={{ x: 500, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "tween", duration: 0.4 }}
        className="innovative-right-panel"
      >
        <div className="panel-top-branding">
          <Plane className="w-5 h-5" />
          <span>AIR AMBULANCE</span>
        </div>

        <div className="brand-header">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Sign in
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Access the Air Ambulance Smart Site. <br />
            Secure authentication required to proceed.
          </motion.p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="innovative-form-group">
            <label className="innovative-label">Email Address or Mobile</label>
            <div className="innovative-input-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                className="innovative-input icon-indent"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="innovative-form-group">
            <label className="innovative-label">Password</label>
            <div className="innovative-input-wrapper">
              <Lock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                className="innovative-input icon-indent"
                placeholder="Enter your secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="innovative-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="innovative-form-group">
            <label className="innovative-label">Security Verification</label>
            <div className="verification-row">
              <div className="innovative-input-wrapper flex-1">
                <Shield className="input-icon" />
                <input
                  type="text"
                  className="innovative-input icon-indent"
                  placeholder="Enter code"
                  value={userInputCaptcha}
                  onChange={(e) => setUserInputCaptcha(e.target.value)}
                  required
                />
              </div>
              <div className="captcha-display-box" title="Refresh" onClick={generateCaptcha}>
                <span className="captcha-text">{captcha}</span>
                <RefreshCw className="w-3 h-3 refresh-icon" />
              </div>
            </div>
          </div>




          <button
            type="submit"
            disabled={loading}
            className="innovative-submit-btn"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? "Verifying..." : "Sign In to Dashboard"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </span>
          </button>

          <footer className="innovative-footer">
            <p className="mb-4 text-xs text-slate-400">
              New to the platform?{" "}
              <Link to="/signup" className="innovative-link">Request Access</Link>
            </p>
            <div className="security-badge">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Enterprise-grade Security</span>
            </div>
            <p className="version-info">
              v1.0.0 • © 2026 Air Ambulance Service
            </p>
          </footer>
        </form>
      </motion.div>
    </div>
  );
}
