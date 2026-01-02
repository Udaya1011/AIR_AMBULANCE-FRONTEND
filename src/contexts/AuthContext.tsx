// import { createContext, useContext, useState, ReactNode, useEffect } from "react";
// import { useNavigate } from "react-router-dom";

// interface User {
//   name: string;   // ✅ Added name
//   email: string;
//   role: string;
// }

// interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   login: (email: string, password: string) => Promise<void>;
//   signup: (email: string, password: string) => Promise<void>;
//   logout: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const navigate = useNavigate();

//   // Load saved user when app starts
//   useEffect(() => {
//     const savedUser = localStorage.getItem("user");
//     if (savedUser) {
//       setUser(JSON.parse(savedUser));
//     }
//   }, []);

//   const saveUser = (user: User) => {
//     localStorage.setItem("user", JSON.stringify(user));
//     setUser(user);
//   };

//   // LOGIN FUNCTION
//   const login = async (email: string, password: string) => {
//     const savedUsers = JSON.parse(localStorage.getItem("users") || "[]");

//     const existingUser = savedUsers.find(
//       (u: any) => u.email === email && u.password === password
//     );

//     if (existingUser || password === "demo") {
//       // ✅ Now storing NAME also
//       const newUser = {
//         name: existingUser?.name || "Sarah Mitchell",
//         email,
//         role: "Super Admin",
//       };
//       saveUser(newUser);
//       navigate("/dashboard");
//     } else {
//       alert("Invalid credentials. Try again!");
//     }
//   };

//   // SIGNUP FUNCTION
//   const signup = async (email: string, password: string) => {
//     const savedUsers = JSON.parse(localStorage.getItem("users") || "[]");

//     const alreadyExists = savedUsers.find((u: any) => u.email === email);
//     if (alreadyExists) {
//       alert("Email already registered! Please log in.");
//       navigate("/login");
//       return;
//     }

//     // Store the user in "users" list
//     const newUser = { name: "Sarah Mitchell", email, password };
//     const updatedUsers = [...savedUsers, newUser];
//     localStorage.setItem("users", JSON.stringify(updatedUsers));

//     // Save logged-in user
//     saveUser({
//       name: "Sarah Mitchell",
//       email,
//       role: "Super Admin",
//     });

//     navigate("/dashboard");
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem("user");
//     navigate("/login");
//   };

//   return (
//     <AuthContext.Provider
//       value={{ user, isAuthenticated: !!user, login, signup, logout }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context)
//     throw new Error("useAuth must be used within an AuthProvider");
//   return context;
// };


import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from '@/services/apiClient';

interface User {
  name: string;
  email: string;
  role: string;
  gender?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch { }
    }
    setLoading(false);
  }, []);

  const saveUser = (user: User, token?: string) => {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      if (token) localStorage.setItem('token', token);
    } catch { }
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post('/api/auth/login', { email, password });

      const token = data?.access_token || data?.token;
      const backendUser = data?.user;

      if (!backendUser || !token) {
        throw new Error("Invalid response from server");
      }

      const name = backendUser?.full_name || backendUser?.name || backendUser?.email || '';
      const userObj: User = { name, email: backendUser?.email || email, role: backendUser?.role || 'user' };

      saveUser(userObj, token);

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error', err);
      alert(err?.message || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch { }
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
