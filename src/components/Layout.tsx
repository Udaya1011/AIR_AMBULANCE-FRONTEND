import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  Plane,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  UserCircle,
  Radio
} from 'lucide-react';
import { useEffect, useState } from 'react';
import "../components/Header.css";

interface LayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  subTitle?: string;
  isFullHeight?: boolean;
}

export const Layout = ({ children, headerActions, subTitle, isFullHeight }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Persist sidebar state across navigations
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebar-minimized');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-minimized', String(isMinimized));
  }, [isMinimized]);
  type NotificationItem = {
    id: number;
    title: string;
    message: string;
    time: string;
  };
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const sample = [
      { id: 1, title: "New booking created", message: "A new booking B102 was added.", time: "2 mins ago" },
      { id: 2, title: "Aircraft status updated", message: "Aircraft A1 is now available.", time: "10 mins ago" },
      { id: 3, title: "Patient record updated", message: "Patient John Doe's details were modified.", time: "20 mins ago" }
    ];
    setNotifications(sample);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/live-monitoring', icon: Radio, label: 'Live Intel' },
    { path: '/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/hospitals', icon: Building2, label: 'Hospitals' },
    { path: '/aircraft', icon: Plane, label: 'Aircraft' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Get avatar image path based on gender (using public folder)
  const getAvatarImage = () => {
    const gender = user?.gender?.toLowerCase() || 'male'; // Default to male for testing
    if (gender === 'male') return '/avatars/male.png';
    if (gender === 'female') return '/avatars/female.png';
    return null;
  };

  const avatarImage = getAvatarImage();

  return (
    <div className="h-screen flex bg-background font-sans overflow-hidden">

      {/* 🔵 SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-card border-r border-border
          transition-all duration-300 ease-in-out flex flex-col
          lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isMinimized ? 'lg:w-14' : 'lg:w-64'} w-72
        `}
      >
        {/* Sidebar Header / Logo */}
        <div className={`h-20 flex items-center gap-3 border-b border-slate-100 shrink-0 px-4 transition-all duration-300 ${isMinimized ? 'justify-center' : 'justify-start'}`}>
          {/* Toggle Button for Desktop (Toggle Icon) */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`
              hidden lg:flex items-center justify-center p-2 rounded-xl border border-slate-100
              transition-all duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 group/toggle
              ${isMinimized ? 'w-8 h-8' : 'w-9 h-9'} text-slate-400
            `}
            title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            <Menu size={18} className="group-hover/toggle:scale-110 transition-transform" />
          </button>

          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isMinimized ? 'lg:hidden' : 'flex'}`}>
            <div className="w-9 h-9 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/plane-logo.png"
                alt="Airswift Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!isMinimized && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-lg font-bold text-slate-800 tracking-tight whitespace-nowrap leading-none">Airswift</span>
              </div>
            )}
          </div>

          {/* Close for Mobile */}
          <button
            className={`lg:hidden p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors ${isMinimized ? 'hidden' : 'ml-auto'}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 scrollbar-none">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive(item.path)
                  ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                ${isMinimized ? 'lg:justify-center lg:px-0' : ''}
              `}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive(item.path) ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'}`} />

              {!isMinimized ? (
                <span className="font-semibold text-[13px] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              ) : (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-slate-700">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
                </div>
              )}

              {isActive(item.path) && !isMinimized && (
                <div className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full" />
              )}
              {isActive(item.path) && isMinimized && (
                <div className="absolute left-0 bottom-1.5 top-1.5 w-1 bg-blue-600 rounded-r-full lg:block hidden" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className={`p-4 border-t border-border bg-card transition-all ${isMinimized ? 'lg:px-1' : ''}`}>
          <div className={`flex items-center justify-between px-1 py-3 ${isMinimized ? 'lg:flex-col lg:gap-4 lg:px-0' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-200 shrink-0 bg-white">
                {avatarImage ? (
                  <img src={avatarImage} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              {!isMinimized && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate">{user?.name || "Admin"}</span>
                  <span className="text-[10px] text-slate-500 truncate">{user?.email || "admin@hms.com"}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ${isMinimized ? 'lg:w-full lg:flex lg:justify-center' : ''}`}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 🔵 MAIN SECTION */}
      <div
        className={`
          flex-1 flex flex-col h-screen overflow-hidden
          transition-all duration-300 ease-in-out
          ${isMinimized ? 'lg:ml-14' : 'lg:ml-64'}
        `}
      >
        {/* Top Bar - Page Title & Notifications */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2.5 -ml-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-all active:scale-95"
            >
              <Menu size={22} />
            </button>

            {/* Page Title */}
            <div className="flex flex-col">
              <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight capitalize leading-none">
                {location.pathname === '/' ? 'Dashboard' : location.pathname.split('/')[1].replace('-', ' ')}
              </h1>
              {subTitle && (
                <p className="text-[11px] text-slate-500 font-bold mt-1.5 uppercase tracking-widest leading-none">
                  {subTitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {headerActions ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {headerActions}
              </div>
            ) : (
              /* Search - Decorative for premium feel */
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 focus-within:border-blue-300 focus-within:bg-white transition-all group">
                <Search size={16} className="group-focus-within:text-blue-500" />
                <input type="text" placeholder="Quick search..." className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 placeholder:text-slate-400 w-32 focus:w-48 transition-all" />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400 opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-all active:scale-95 group"
            >
              <Bell size={22} className="group-hover:animate-swing" />
              {notifications.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <main className={`flex-1 w-full ${isFullHeight ? 'overflow-hidden pt-3 px-3 pb-5 lg:pt-5 lg:px-5 lg:pb-7' : 'overflow-y-auto p-5 lg:p-8'} overflow-x-hidden custom-scrollbar bg-background`}>
          <div className={`max-w-[1600px] mx-auto ${isFullHeight ? 'h-full flex flex-col' : 'min-h-full flex flex-col'}`}>
            <div className={`flex-1 ${isFullHeight ? 'min-h-0 flex flex-col' : ''}`}>
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* 🔔 NOTIFICATION DRAWER */}
      <div
        className={`
          fixed inset-y-0 right-0 z-[60] w-85 bg-white shadow-2xl 
          transform transition-transform duration-500 border-l border-slate-100
          ${notifOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-6 py-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">System Alerts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recent updates from the network</p>
            </div>
            <button onClick={() => setNotifOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                  <Bell size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">No new alerts found</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50/50 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{item.title}</h3>
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-200"></div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.message}</p>
                  <div className="flex items-center gap-1.5 mt-4">
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/30">
            <button
              onClick={() => setNotifications([])}
              className="w-full py-3.5 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition-all uppercase tracking-widest"
            >
              Mark all system alerts as cleared
            </button>
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {(mobileMenuOpen || notifOpen) && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[45] transition-opacity duration-300"
          onClick={() => { setMobileMenuOpen(false); setNotifOpen(false); }}
        />
      )}

      {/* GLOBAL STYLES */}
      <style>{`
        /* Hide scrollbars but keep functionality */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; border: 2px solid #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
        
        @keyframes swing {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-swing {
          animation: swing 0.6s ease-in-out;
        }
      `}</style>

    </div>
  );
};
