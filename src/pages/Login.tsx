// import { useState, useRef, useEffect } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import { useAuth } from "@/contexts/AuthContext";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";

// import { Plane, AlertCircle, User, ChevronDown } from "lucide-react";
// import { Alert, AlertDescription } from "@/components/ui/alert";

// // ⭐ YOUR BACKGROUND IMAGE
// import bg from "../assets/bg.jpeg";
// import "./Login.css";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const [profileOpen, setProfileOpen] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const dropdownButtonRef = useRef<HTMLButtonElement>(null);

//   useEffect(() => {
//     if (containerRef.current) {
//       containerRef.current.style.setProperty("--bg-image", `url(${bg})`);
//     }
//   }, []);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       await login(email, password);
//       navigate("/dashboard");
//     } catch (err) {
//       setError("Invalid credentials. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const profiles = [
//     { role: "Super Admin", email: "admin@airswift.com", password: "demo" },
//     { role: "Dispatcher", email: "dispatcher@airswift.com", password: "demo" },
//     { role: "Hospital Staff", email: "hospital@general.com", password: "demo" },
//     { role: "Medical Team", email: "doctor@airswift.com", password: "demo" },
//     { role: "Airline Coordinator", email: "airline@skymedic.com", password: "demo" },
//   ];

//   return (
//     <div
//       ref={containerRef}
//       className="login-container"
//     >

//       {/* DARK OVERLAY FOR BETTER VISIBILITY */}
//       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

//       <div className="relative w-full max-w-xl space-y-8">

//         {/* ---------------- LOGO & TITLE ---------------- */}
//         <div className="text-center text-white drop-shadow-lg">
//           <Plane className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
//           <h1 className="text-5xl font-extrabold tracking-wide">Air Ambulance</h1>
//           <p className="text-xl text-gray-200 mt-2">Emergency Response Login</p>
//         </div>

//         {/* ---------------- LOGIN CARD ---------------- */}
//         <Card className="shadow-2xl border rounded-3xl bg-white/20 backdrop-blur-lg text-white">
//           <CardHeader>
//             <CardTitle className="text-2xl font-bold text-white">Sign In</CardTitle>
//             <CardDescription className="text-gray-200">
//               Access the Air Medical Coordination System
//             </CardDescription>
//           </CardHeader>

//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-6">
//               {error && (
//                 <Alert variant="destructive" className="bg-red-600/90 text-white border-none">
//                   <AlertCircle className="h-4 w-4" />
//                   <AlertDescription>{error}</AlertDescription>
//                 </Alert>
//               )}

//               {/* ---------------- PROFILE DROPDOWN ---------------- */}
//               <div className="relative">
//                 <button
//                   ref={dropdownButtonRef}
//                   type="button"
//                   onClick={() => setProfileOpen(!profileOpen)}
//                   className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/30 backdrop-blur border border-white/40 text-white hover:bg-white/40 transition"
//                 >
//                   <User className="w-5 h-5" />
//                   <span className="text-lg">Select Profile</span>
//                   <ChevronDown className={`ml-auto transition-transform ${profileOpen ? "chevron-open" : ""}`}
//                   />
//                 </button>
//               </div>

//               {profileOpen && (
//                 <div className="dropdown-menu">
//                   {profiles && profiles.length > 0 ? (
//                     profiles.map((p, index) => (
//                       <div
//                         key={index}
//                         onClick={() => setProfileOpen(false)}
//                         className="w-full text-left px-6 py-4 hover:bg-blue-100 transition cursor-pointer border-b border-gray-200 last:border-b-0"
//                       >
//                         <div className="font-bold text-base text-blue-700">{p.role}</div>
//                       </div>
//                     ))
//                   ) : (
//                     <div className="p-4 text-gray-600">No profiles available</div>
//                   )}
//                 </div>
//               )}

//               {/* EMAIL */}
//               <div className="space-y-2">
//                 <Label htmlFor="email" className="text-white">Email</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   className="h-14 text-lg rounded-xl bg-white/70 border-white/50 text-black"
//                   placeholder="Enter your email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   autoComplete="off"
//                   data-lpignore="true"
//                   data-form-type="other"
//                   required
//                 />
//               </div>

//               {/* PASSWORD */}
//               <div className="space-y-2">
//                 <Label htmlFor="password" className="text-white">Password</Label>
//                 <Input
//                   id="password"
//                   type="password"
//                   className="h-14 text-lg rounded-xl bg-white/70 border-white/50 text-black"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   autoComplete="new-password"
//                   data-lpignore="true"
//                   data-form-type="other"
//                   required
//                 />
//               </div>

//               {/* LOGIN BUTTON */}
//               <Button
//                 type="submit"
//                 className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg"
//                 disabled={loading}
//               >
//                 {loading ? "Signing in..." : "Sign In"}
//               </Button>

//               <p className="text-sm text-center mt-2 text-gray-200">
//                 Don’t have an account?{" "}
//                 <Link
//                   to="/signup"
//                   className="text-cyan-300 hover:underline font-medium"
//                 >
//                   Sign up
//                 </Link>
//               </p>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }



import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, AlertCircle, User, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import bg from "../assets/bg.jpeg";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--bg-image", `url(${bg})`);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('Login failed. Please check credentials.');
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
          <p className="text-xl text-gray-200 mt-2">Emergency Response Login</p>
        </div>

        <Card className="shadow-2xl border rounded-3xl bg-white/20 backdrop-blur-lg text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Sign In</CardTitle>
            <CardDescription className="text-gray-200">
              Access the Air Medical Coordination System
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {error && (
                <Alert variant="destructive" className="bg-red-600/90 text-white border-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="h-14 text-lg rounded-xl bg-white/70 border-white/50 text-black"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="h-14 text-lg rounded-xl bg-white/70 border-white/50 text-black"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg"
              >
                Sign In
              </Button>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                <span className="relative px-3 bg-white/10 text-sm text-gray-300">OR</span>
              </div>

              {/* SIGNUP OPTION */}
              <div className="space-y-3">
                <p className="text-center text-gray-200 text-sm">New to Air Ambulance?</p>
                <Link
                  to="/signup"
                  className="w-full block text-center h-12 text-lg rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg text-white font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span>📝 Create New Account</span>
                </Link>
              </div>

              {/* TEST ACCOUNTS HINT */}
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                <p className="text-xs text-blue-200 text-center">
                  💡 <strong>Tip:</strong> Use test accounts to explore the system without registering
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
