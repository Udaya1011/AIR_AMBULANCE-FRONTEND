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
  Bell
} from 'lucide-react';
import { useEffect, useState } from 'react';
import "../components/Header.css";

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /** 🔔 Generate dynamic sample notifications (N3) */
  useEffect(() => {
    const sample = [
      {
        id: 1,
        title: "New booking created",
        message: "A new booking B102 was added.",
        time: "2 mins ago"
      },
      {
        id: 2,
        title: "Aircraft status updated",
        message: "Aircraft A1 is now available.",
        time: "10 mins ago"
      },
      {
        id: 3,
        title: "Patient record updated",
        message: "Patient John Doe's details were modified.",
        time: "20 mins ago"
      }
    ];

    // Shuffle for randomness
    const randomList = sample.sort(() => Math.random() - 0.5);
    setNotifications(randomList);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/hospitals', icon: Building2, label: 'Hospitals' },
    { path: '/aircraft', icon: Plane, label: 'Aircraft' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen">

      {/* 🔵 TOP HEADER */}
      <header className="header-container">

        {/* Left */}
        <div className="header-left">
          <span className="header-logo">✈️</span>
          <div>
            <h1 className="header-title">Airswift</h1>
            <div className="header-sub">Medical Transport</div>
          </div>
        </div>

        {/* Right */}
        <div className="header-right">
          {/* User Info */}
          <div>
            <div className="header-user-name">{user?.name}</div>
            <div className="header-user-role">
              {user?.role?.replace("_", " ")}
            </div>
          </div>

          {/* 🔔 Notification Bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative"
          >
            <Bell size={24} className="text-white cursor-pointer" />

            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </button>

          {/* Logout button */}
          <button className="header-logout-btn" onClick={handleLogout}>
            Logout
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden header-mobile-icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={30} /> : <Menu size={30} />}
          </button>
        </div>
      </header>

      <div className="flex">

        {/* 🔵 SIDEBAR */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-md 
            border-r border-border shadow-md
            transform transition-transform duration-200 ease-in-out
            mt-[80px] lg:mt-0
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* 🔵 MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-8 bg-white/80 backdrop-blur-md rounded-xl m-4 shadow-xl">
          {children}
        </main>

        {/* Chatbot */}
        {/* <Chatbot /> */}
      </div>

      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 🔔 NOTIFICATION DRAWER (Right Side) */}
<div
  className={`
    fixed top-0 right-0 h-full w-80 bg-white shadow-2xl 
    transform transition-transform duration-300 z-50
    ${notifOpen ? "translate-x-0" : "translate-x-full"}
  `}
>
  {/* Header */}
  <div className="flex justify-between items-center px-5 py-4 border-b">
    <h2 className="text-lg font-semibold">Notifications</h2>

    {/* Close Button */}
    <div className="flex items-center gap-3">
      {/* 🧹 Clear All Notifications */}
      <button
        onClick={() => setNotifications([])}
        className="text-sm text-red-600 hover:underline"
      >
        Clear All
      </button>

      <button onClick={() => setNotifOpen(false)}>
        <X size={22} />
      </button>
    </div>
  </div>

  {/* Notification List */}
  <div className="p-4 space-y-4 overflow-y-auto h-full">
    {notifications.length === 0 ? (
      <p className="text-center text-muted-foreground mt-10">
        No notifications available.
      </p>
    ) : (
      notifications.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-gray-100 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-700 mt-1">{item.message}</p>
          <span className="text-xs text-gray-500 mt-2 block">{item.time}</span>
        </div>
      ))
    )}
  </div>
</div>


      {/* Notification overlay */}
      {notifOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setNotifOpen(false)}
        />
      )}

    </div>
  );
};
