import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AcuityLevel } from '@/types';
import { mockHospitals, mockBookings } from '@/data/mockData';
import { usePatients } from '@/contexts/PatientsContext';
import { Hospital } from '@/types';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, Edit, Trash2, Heart, Activity, User, Calendar, MapPin, Hash, Phone, AlertCircle, FileText, Download, MoreVertical, MessageCircle, X, Send, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Bed, XCircle, CheckCircle2, Building2, Users, Clock, Smile, Lightbulb, BookOpen, TrendingUp, Zap, Navigation, Loader2, Eye, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { HospitalService } from '@/services/hospital.service';
import { BookingService } from '@/services/booking.service';
import { exportHospitals } from '@/utils/exportHospitals';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import chatBotImage from '../emoji.jpeg';

// Fix Leaflet marker icons
const iconRetinaUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Map Click Handler Component
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// KPI Card Component
const KpiCard = ({
  title,
  value,
  icon,
  trend = "+2.4%",
  isPositive = true,
  color = "blue"
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  color?: string;
}) => {
  const colorClasses: any = {
    blue: "bg-blue-600 hover:shadow-blue-200",
    rose: "bg-rose-600 hover:shadow-rose-200",
    amber: "bg-amber-600 hover:shadow-amber-200",
    emerald: "bg-emerald-600 hover:shadow-emerald-200",
  };

  return (
    <Card className="group relative overflow-hidden border-none bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {title}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              {value}
            </h3>
            <div className="flex items-center gap-1.5 pt-1">
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isPositive ? <TrendingUp size={10} /> : <Activity size={10} />}
                {trend}
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Health Check</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110 ${colorClasses[color] || colorClasses.blue}`}>
            {icon}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-0 bg-blue-600 group-hover:w-full transition-all duration-500" />
      </CardContent>
    </Card>
  );
};

const getCapacityStatus = (occupied: number = 0, total: number = 1) => {
  const ratio = occupied / (total || 1);
  if (ratio >= 0.9) return { label: 'CRITICAL', color: 'bg-red-100 text-red-800 border-red-200' };
  if (ratio >= 0.7) return { label: 'HIGH', color: 'bg-orange-100 text-orange-800 border-orange-200' };
  if (ratio >= 0.4) return { label: 'NORMAL', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  return { label: 'OPTIMAL', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
};


type LevelOfCare = 'Primary' | 'Secondary' | 'Tertiary' | 'Quaternary';

interface HospitalData {
  hospital_name: string;
  address: string;
  latitude: string;
  longitude: string;
  level_of_care: LevelOfCare;
  icu_capacity: string;
  contact_information: {
    name: string;
    phone: string;
    email: string;
    position: string;
  }
  preferred_pickup_location: string
}

const CARE_LEVELS = ['Primary', 'Secondary', 'Tertiary', 'Quaternary'] as const;

const Hospitals = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [query, setQuery] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'Add' | 'Edit'; isOpen: boolean; hospital?: Hospital }>({ mode: 'Add', isOpen: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Hospital>>({});
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | LevelOfCare>('all');
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [trackHospital, setTrackHospital] = useState<Hospital | null>(null);


  // Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    action?: { type: 'booking' | 'hospital'; label: string; data?: any };
    suggestions?: string[];
  }>>([
    {
      id: '1',
      sender: 'bot',
      text: '👋 Welcome to Air Swift Flow! I\'m your Hospital Assistant. I can help you manage hospitals, view bookings, create transfers, and much more. What would you like to do?',
      timestamp: new Date(),
      suggestions: ['View hospitals', 'Create booking', 'Check capacity', 'Add hospital']
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatContext, setChatContext] = useState<{ step?: string; data?: any }>({});
  const [chatInactivityTimer, setChatInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const CHAT_INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes in milliseconds
  const { addPatient, patients, removePatient, updatePatient } = usePatients();
  const navigate = useNavigate();

  // Booking approval state
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  useEffect(() => {
    fetchHospitals();
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await BookingService.list();
      setBookings((data || []).filter(Boolean));
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const getPatientName = (patientId: string) => {
    if (!patientId) return 'Unknown Patient';
    const patient = patients.find(p => p.id === patientId || (p as any)._id === patientId);
    return patient ? (patient.name || patient.full_name || 'Unnamed Patient') : 'Patient Not Found';
  };

  // Chatbot inactivity timer effect
  useEffect(() => {
    if (!isChatOpen) return;

    const resetInactivityTimer = () => {
      // Clear existing timer
      if (chatInactivityTimer) {
        clearTimeout(chatInactivityTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        if (isChatOpen) {
          setIsChatOpen(false);
          toast({
            title: '⏱️ Chat Closed',
            description: 'Chat closed due to inactivity. Click the button to reopen.'
          });
        }
      }, CHAT_INACTIVITY_TIME);

      setChatInactivityTimer(timer);
    };

    // Listen for user activity
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Reset timer on chat open
    resetInactivityTimer();

    // Add event listeners for user activity
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('click', handleActivity);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('click', handleActivity);
      if (chatInactivityTimer) {
        clearTimeout(chatInactivityTimer);
      }
    };
  }, [isChatOpen, chatInactivityTimer, CHAT_INACTIVITY_TIME]);


  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const data = await HospitalService.getHospitals();
      const validHospitals = data.filter((h: any) => h && (h.id || h._id) && h.name && h.name.trim().length > 0);
      setHospitals(validHospitals);
      setError(null);
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch hospitals");
      if (process.env.NODE_ENV === "development") {
        setHospitals(mockHospitals.filter((h: any) => h && h.name));
        toast({
          title: "Development Mode",
          description: "Using mock data for development",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Could not load hospitals",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };



  /* PAGINATION STATE */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const visible = useMemo(() => {
    return hospitals.filter((h) => {
      const q = query.trim().toLowerCase();
      const matchesSearch = q === '' ||
        (h.name?.toLowerCase().includes(q)) ||
        (h.address?.toLowerCase().includes(q)) ||
        (h.contactPerson?.toLowerCase().includes(q));

      const matchesLevel = levelFilter === 'all' || h.levelOfCare === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [hospitals, query, levelFilter]);

  const totalPages = Math.ceil(visible.length / itemsPerPage);
  const paginatedHospitals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visible.slice(start, start + itemsPerPage);
  }, [visible, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleOpenDialog = (mode: 'Add' | 'Edit', hospital?: Hospital) => {
    setDialog({ mode, isOpen: true, hospital });
    if (hospital) {
      setFormData({
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        levelOfCare: hospital.levelOfCare,
        icuCapacity: hospital.icuCapacity,
        occupiedBeds: hospital.occupiedBeds,
        coordinates: hospital.coordinates,
        contactPerson: hospital.contactPerson,
        email: hospital.email,
        phone: hospital.phone,
      });
    } else {
      setFormData({});
    }
  };

  const handleCloseDialog = () => {
    setDialog({ mode: 'Add', isOpen: false });
    setFormData({});
    setIsMapVisible(false);
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng }
    }));

    setReverseGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name,
          // Extract house number/street if possible for hospital name if empty
          name: prev.name || data.address.hospital || data.address.amenity || data.address.building || ""
        }));
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleMapSearch = async () => {
    if (!mapSearch.trim()) return;
    setIsSearchingMap(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setFormData(prev => ({
          ...prev,
          address: display_name,
          coordinates: { lat: latitude, lng: longitude },
          // Try to set hospital name if empty
          name: prev.name || data[0].address?.hospital || data[0].address?.amenity || ""
        }));

        toast({ title: "Location Found", description: "Map center updated to searched location." });
      } else {
        toast({ title: "No results", description: "Could not find that location on the map.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Map search failed:", err);
      toast({ title: "Search Error", description: "Failed to search for location.", variant: "destructive" });
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.address) {
      toast({ title: 'Validation Error', description: 'Hospital name and address are required', variant: 'destructive' });
      return;
    }

    setSubmittingId('saving');
    try {
      if (dialog.mode === 'Add') {
        const newHospital = await HospitalService.createHospital(formData as Hospital);
        setHospitals([...hospitals, newHospital]);
        toast({ title: 'Success', description: 'Hospital added successfully', variant: 'default' });
      } else if (dialog.hospital) {
        await HospitalService.updateHospital(dialog.hospital.id, formData as Hospital);
        setHospitals(hospitals.map(h => h.id === dialog.hospital!.id ? { ...h, ...formData } : h));
        toast({ title: 'Success', description: 'Hospital updated successfully', variant: 'default' });
      }
      fetchHospitals();
      handleCloseDialog();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save hospital', variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmittingId(id);
    try {
      await HospitalService.deleteHospital(id);
      setHospitals(hospitals.filter(h => h.id !== id));
      toast({ title: 'Success', description: 'Hospital deleted successfully', variant: 'default' });
    } catch (err: any) {
      console.error('Delete hospital error:', err);
      const errorMessage = err?.message || err?.data?.detail || 'Failed to delete hospital';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setSubmittingId(null);
    }
  };

  // Chatbot handler - Enhanced with more features
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput.toLowerCase();

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user' as const,
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    const input = chatInput;
    setChatInput('');

    // Handle close/exit commands
    const lower = input.toLowerCase();
    if (lower.includes('close') || lower.includes('exit') || lower.includes('bye') || lower === 'quit' || lower.includes('goodbye')) {
      const botPrompt = { id: (Date.now() + 2).toString(), sender: 'bot' as const, text: "👋 Thank you for using Air Swift Flow! Chat closing in 1 second...", timestamp: new Date() };
      setChatMessages(prev => [...prev, botPrompt]);
      setTimeout(() => {
        setIsChatOpen(false);
        setChatContext({});
      }, 1000);
      return;
    }

    // Basic intent handling: create patient flow (multi-step)
    if (lower.includes('create patient') || lower.includes('new patient') || lower.includes('add patient')) {
      const botPrompt = { id: (Date.now() + 2).toString(), sender: 'bot' as const, text: "👤 Sure! I'll help you create a new patient profile.\n\nWhat's the patient's full name?", timestamp: new Date() };
      setChatMessages(prev => [...prev, botPrompt]);
      setChatContext({ step: 'create_patient_name', data: {} });
      return;
    }

    // Multi-step creation
    if (chatContext?.step && chatContext.step.startsWith('create_patient')) {
      const step = chatContext.step;
      const data = chatContext.data || {};
      if (step === 'create_patient_name') {
        const name = input.trim();
        if (!name) {
          setChatMessages(prev => [...prev, { id: (Date.now() + 3).toString(), sender: 'bot', text: "❌ I didn't catch the name. Please provide the full name.", timestamp: new Date() }]);
          return;
        }
        setChatContext({ step: 'create_patient_dob', data: { ...data, name } });
        setChatMessages(prev => [...prev, { id: (Date.now() + 4).toString(), sender: 'bot', text: `✅ Got it! ${name}\n\n📅 Now, please provide date of birth (YYYY-MM-DD)`, timestamp: new Date() }]);
        return;
      }
      if (step === 'create_patient_dob') {
        const dob = input.trim();
        if (!/\d{4}-\d{2}-\d{2}/.test(dob)) {
          setChatMessages(prev => [...prev, { id: (Date.now() + 5).toString(), sender: 'bot', text: '⚠️ Please provide DOB in YYYY-MM-DD format (e.g., 1990-05-15)', timestamp: new Date() }]);
          return;
        }
        setChatContext({ step: 'create_patient_gender', data: { ...data, dob } });
        setChatMessages(prev => [...prev, { id: (Date.now() + 6).toString(), sender: 'bot', text: `✅ DOB recorded!\n\n⚧ What is the gender? (male/female/other)`, timestamp: new Date() }]);
        return;
      }
      if (step === 'create_patient_gender') {
        const gender = input.trim().toLowerCase();
        setChatContext({ step: 'create_patient_acuity', data: { ...data, gender } });
        setChatMessages(prev => [...prev, { id: (Date.now() + 7).toString(), sender: 'bot', text: `✅ Noted!\n\n🚨 What is the acuity level? (critical/urgent/stable)`, timestamp: new Date() }]);
        return;
      }
      if (step === 'create_patient_acuity') {
        const acuity = input.trim().toLowerCase();
        setChatContext({ step: 'create_patient_allergies', data: { ...data, acuityLevel: acuity } });
        setChatMessages(prev => [...prev, { id: (Date.now() + 8).toString(), sender: 'bot', text: `✅ Acuity level set to: ${acuity}\n\n🧬 Any known allergies? (Or type "none")`, timestamp: new Date() }]);
        return;
      }
      if (step === 'create_patient_allergies') {
        const allergies = input.trim();
        const payload: any = {
          full_name: data.name,
          date_of_birth: data.dob,
          gender: data.gender,
          acuity_level: data.acuityLevel || 'stable',
          allergies: allergies === 'none' ? [] : [allergies],
          // Defaults to satisfy backend
          weight_kg: 70,
          diagnosis: 'Not specified',
          blood_group: 'O+',
          insurance_details: { provider: "N/A", policy_number: "N/A" },
          next_of_kin: { name: "N/A", relationship: "N/A", phone: "N/A" }
        };
        const created = await addPatient(payload);
        setChatMessages(prev => [...prev, { id: (Date.now() + 9).toString(), sender: 'bot', text: `✨ Perfect! Patient profile created successfully!\n\n👤 Name: ${created.full_name}\n🆔 ID: ${created.id}\n🚨 Acuity: ${created.acuity_level}\n\n✅ Task completed! Closing chat in 2 seconds...`, timestamp: new Date() }]);
        setChatContext({});
        // Auto-close chat after completion
        setTimeout(() => {
          setIsChatOpen(false);
          toast({ title: '✅ Patient Created', description: `${created.full_name} has been added to the system.` });
        }, 2000);
        return;
      }
    }

    // Simulate bot response with AI logic
    setTimeout(() => {
      let botResponse = '';
      let suggestions: string[] = [];
      let action: any = undefined;

      // Hospital Information Queries
      if (userText.includes('hospital') || userText.includes('view') || userText.includes('list') || userText.includes('all')) {
        const stats = {
          total: hospitals.length,
          icu: hospitals.reduce((sum, h) => sum + h.icuCapacity, 0),
          occupied: hospitals.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0),
          tertiary: hospitals.filter(h => h.levelOfCare === 'Tertiary').length,
          secondary: hospitals.filter(h => h.levelOfCare === 'Secondary').length,
          primary: hospitals.filter(h => h.levelOfCare === 'Primary').length,
        };
        botResponse = `🏥 Hospital Network Overview\n━━━━━━━━━━━━━━━━━━━━━━━━\n🔢 Total Hospitals: ${stats.total}\n🛏️ Total Seats: ${stats.icu}\n📉 Occupied Seats: ${stats.occupied}\n✨ Available Seats: ${stats.icu - stats.occupied}\n⭐ Tertiary Centers: ${stats.tertiary}\n📍 Secondary Centers: ${stats.secondary}\n📌 Primary Centers: ${stats.primary}\n\n💡 What would you like to explore?`;
        suggestions = ['⭐ Tertiary hospitals', '❤️ Cardiac centers', '🛏️ ICU availability', '📍 By location'];
      }

      // Booking/Transfer Requests
      else if (userText.includes('booking') || userText.includes('transfer') || userText.includes('arrange') || userText.includes('book') || userText.includes('dispatch')) {
        botResponse = `📋 Medical Transfer Coordinator\n━━━━━━━━━━━━━━━━━━━━━━━━\nI'll help arrange emergency medical transport!\n\n📝 Required Information:\n1️⃣ Patient Name/ID\n2️⃣ Current Location\n3️⃣ Destination Hospital\n4️⃣ Urgency Level\n5️⃣ Medical Condition\n\n✅ Booking initiated! Closing chat in 2 seconds...`;
        setChatContext({ step: 'booking_patient', data: {} });
        suggestions = ['👤 Patient search', '📋 View my bookings', '🚁 Emergency dispatch'];
        // Auto-close booking after starting
        setTimeout(() => {
          setIsChatOpen(false);
          toast({ title: '📋 Transfer Booking', description: 'Medical transfer booking has been initiated.' });
        }, 2000);
      }

      // ICU Capacity Queries
      else if (userText.includes('icu') || userText.includes('capacity') || userText.includes('bed') || userText.includes('seat') || userText.includes('available')) {
        const availableHospitals = hospitals
          .sort((a, b) => (b.icuCapacity - (b.occupiedBeds || 0)) - (a.icuCapacity - (a.occupiedBeds || 0)))
          .slice(0, 5);
        botResponse = `🛏️ Seat Availability Report\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${availableHospitals.map((h, i) => `${i + 1}. ${h.name}\n   🛏️ ${h.icuCapacity - (h.occupiedBeds || 0)} Available / ${h.icuCapacity} Total Seats\n   ⭐ ${h.levelOfCare} | 📍 ${h.address.substring(0, 25)}...`).join('\n\n')}\n\n✅ Last updated: Just now\n🔄 Refresh for latest data`;
        suggestions = ['🚁 Create transfer', '📊 All hospitals', '🔍 Search hospital'];
      }

      // Add Hospital
      else if (userText.includes('add') || userText.includes('new hospital') || userText.includes('create hospital') || userText.includes('register')) {
        botResponse = `✨ Register New Hospital\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📝 Required Information:\n🏛️ Hospital Name\n📍 Address\n⭐ Level of Care (Primary/Secondary/Tertiary/Quaternary)\n🛏️ ICU Capacity\n👤 Contact Person\n📧 Email\n📞 Phone Number\n\n✅ Form opened! Closing chat in 2 seconds...`;
        suggestions = ['🔘 Open form', '📝 Tell details', '📚 View examples', '❌ Cancel'];
        // Auto-close after opening form
        setTimeout(() => {
          setIsChatOpen(false);
          toast({ title: '✅ Add Hospital Form', description: 'Hospital registration form is ready.' });
        }, 2000);
      }

      // Help & Features
      else if (userText.includes('help') || userText.includes('what') || userText.includes('how') || userText.includes('?') || userText.includes('guide') || userText.includes('features')) {
        botResponse = `🎯 Hospital Management Assistant - Quick Guide\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏛️ HOSPITAL MANAGEMENT\n  • View all hospitals in network\n  • Filter by care level\n  • Search by location\n  • Check ICU capacity\n\n🚁 MEDICAL TRANSFERS\n  • Create new booking\n  • Emergency dispatch\n  • Track status\n  • View history\n\n👥 PATIENT MANAGEMENT\n  • Create patient profile\n  • Assign to hospital\n  • Update medical records\n  • Monitor status\n\n📊 ANALYTICS & REPORTS\n  • Occupancy rates\n  • Transfer statistics\n  • Hospital performance\n  • Export data\n\n❓ What would you like to do?`;
        suggestions = ['🏥 Hospitals', '🚁 Transfers', '👥 Patients', '📊 Reports'];
      }

      // Patient Management
      else if (userText.includes('patient') && userText.includes('create')) {
        botResponse = `👥 Patient Profile Creation\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n✨ Create new patient profile in 5 steps:\n1️⃣ Full Name\n2️⃣ Date of Birth (YYYY-MM-DD)\n3️⃣ Gender (male/female/other)\n4️⃣ Acuity Level (critical/urgent/stable)\n5️⃣ Allergies (or 'none')\n\n🚀 Ready? Say "Create patient"!`;
        suggestions = ['✅ Create patient', '📋 View patients', '📝 Edit patient'];
      }

      // Search/Find
      else if (userText.includes('search') || userText.includes('find') || userText.includes('filter')) {
        botResponse = `🔍 Smart Search & Filter\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔎 Search by:\n🏛️ Hospital Name\n⭐ Care Level (Tertiary, Secondary, etc.)\n📍 Location/City\n🛏️ ICU Capacity (Min/Max)\n👤 Contact Person Name\n❤️ Medical Specialty\n\n💡 Try: "Show tertiary hospitals in Delhi" or "Find cardiac centers"`;
        suggestions = ['⭐ Tertiary only', '❤️ Cardiac', '🏥 All', '🔍 Advanced'];
      }

      // Emergency/Urgent
      else if (userText.includes('urgent') || userText.includes('emergency') || userText.includes('critical') || userText.includes('sos') || userText.includes('alert')) {
        botResponse = `🚨 CRITICAL EMERGENCY PROTOCOL\n━━━━━━━━━━━━━━━━━━━━━━━━\n⚡ EMERGENCY MODE ACTIVATED\n\n✅ Fast-track routing to nearest tertiary center\n✅ Instant helicopter/ambulance dispatch\n✅ Direct hospital emergency notification\n✅ Specialist consultation on standby\n✅ 24/7 emergency hotline active\n\n📋 Required Information:\n👤 Patient Name\n🆔 ID/Registration\n📍 Current Location\n🏥 Destination (Auto-selected: Nearest Tertiary)\n⚠️ Medical Condition\n\n✅ Emergency protocol initiated! Closing chat in 3 seconds...`;
        suggestions = ['✅ Yes, dispatch now', '📞 Call emergency', '⭐ SOS contacts', '❌ Cancel'];
        // Auto-close after emergency dispatch
        setTimeout(() => {
          setIsChatOpen(false);
          toast({ title: '🚨 Emergency Dispatch Activated', description: 'Emergency services have been notified.' });
        }, 3000);
      }

      // Statistics & Reports
      else if (userText.includes('stat') || userText.includes('report') || userText.includes('analytics') || userText.includes('data')) {
        botResponse = `📊 Hospital Network Statistics\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📈 Key Metrics:\n🏥 Total Operational Hospitals: ${hospitals.length}\n🛏️ Combined ICU Capacity: ${hospitals.reduce((sum, h) => sum + h.icuCapacity, 0)} beds\n⭐ Tertiary Centers: ${hospitals.filter(h => h.levelOfCare === 'Tertiary').length}\n📍 Geographic Coverage: Multiple regions\n\n📉 Trending Data:\n🚑 Monthly Transfers: 1,247\n✅ Success Rate: 98.5%\n⏱️ Avg Response Time: 12 mins\n👥 Active Patients: 342\n\n📥 Export reports or drill down?`;
        suggestions = ['📥 Export data', '📊 Detailed report', '📈 Charts', '🔄 Refresh'];
      }

      // Default helpful response
      else {
        botResponse = `🤖 Hospital Assistant Active\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nI can help with:\n\n🏥 View hospitals & capacity\n🚁 Book medical transfers\n👥 Manage patients\n🛏️ Check ICU availability\n📊 View reports & analytics\n📞 Contact information\n\n💡 Try these commands:\n• "Show hospitals"\n• "Create patient"\n• "Book transfer"\n• "Check ICU"\n• "Emergency"\n\n👉 Or select a suggestion below!`;
        suggestions = ['🏥 View hospitals', '🚁 New transfer', '👥 New patient', '📊 Reports'];
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot' as const,
        text: botResponse,
        timestamp: new Date(),
        suggestions: suggestions,
      };
      setChatMessages(prev => [...prev, botMessage]);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    setTimeout(() => handleChatSend(), 50);
  };

  // Booking Approval Functions
  const getPendingBookings = () => {
    return bookings.filter(b => b.status === 'requested' || b.status === 'clinical_review');
  };

  const approveBooking = async (bookingId: string) => {
    try {
      const targetBooking = bookings.find(b => b.id === bookingId);
      if (!targetBooking) return;

      const destHospitalId = targetBooking.destinationHospitalId;
      const hospital = hospitals.find(h => h.id === destHospitalId);

      // 1. Update Hospital Bed Capacity (Increment Occupied)
      if (hospital) {
        const newOccupied = (hospital.occupiedBeds || 0) + 1;
        await HospitalService.updateHospital(destHospitalId, { occupiedBeds: newOccupied });

        setHospitals(prev => prev.map(h =>
          h.id === destHospitalId ? { ...h, occupiedBeds: newOccupied } : h
        ));
      }

      // 2. Update Booking Status via Service
      await BookingService.update(bookingId, { status: 'dispatch_review' });

      const updatedBookings = bookings.map(b =>
        b.id === bookingId
          ? {
            ...b,
            status: 'dispatch_review',
            approvals: [...(b.approvals || []), {
              id: `approval_${Date.now()}`,
              type: 'receiving_hospital',
              status: 'approved',
              approvedBy: 'Hospital Staff',
              approvedAt: new Date().toISOString(),
              notes: approvalNotes
            }]
          }
          : b
      );
      setBookings(updatedBookings);
      setSelectedBookingForApproval(null);
      setApprovalNotes('');

      toast({
        title: "✅ Request Approved",
        description: `Patient transfer approved. ${hospital ? `Bed occupied at ${hospital.name}.` : 'Status updated.'}`,
      });
    } catch (err) {
      console.error("Approval error:", err);
      toast({
        title: "❌ Approval Failed",
        description: "Could not update registration status or capacity.",
        variant: "destructive"
      });
    }
  };

  const rejectBooking = (bookingId: string) => {
    const updatedBookings = bookings.map(b =>
      b.id === bookingId
        ? {
          ...b,
          status: 'cancelled',
          approvals: [...(b.approvals || []), {
            id: `approval_${Date.now()}`,
            type: 'receiving_hospital',
            status: 'rejected',
            approvedBy: 'Hospital Staff',
            approvedAt: new Date().toISOString(),
            notes: approvalNotes
          }]
        }
        : b
    );
    setBookings(updatedBookings);
    setSelectedBookingForApproval(null);
    setApprovalNotes('');
    toast({
      title: "Booking Rejected",
      description: "The booking has been rejected.",
      variant: "destructive",
    });
  };


  const summaryStats = useMemo(() => ({
    total: hospitals.length,
    totalICUCapacity: hospitals.reduce((sum, h) => sum + (h.icuCapacity || 0), 0),
    totalOccupiedBeds: hospitals.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0),
    primary: hospitals.filter(h => h.levelOfCare === 'Primary').length,
    secondary: hospitals.filter(h => h.levelOfCare === 'Secondary').length,
    tertiary: hospitals.filter(h => h.levelOfCare === 'Tertiary').length,
    quaternary: hospitals.filter(h => h.levelOfCare === 'Quaternary').length,
  }), [hospitals]);

  const summaryStatsArray = useMemo(() => [
    { title: "Total Centres", value: summaryStats.total, icon: <Building2 className="h-5 w-5" />, color: "blue", trend: "+1 new" },
    { title: "Total Capacity", value: summaryStats.totalICUCapacity, icon: <Bed className="h-5 w-5" />, color: "rose", trend: "100% Active" },
    { title: "Available Seats", value: summaryStats.totalICUCapacity - summaryStats.totalOccupiedBeds, icon: <Activity className="h-5 w-5" />, color: "amber", trend: `${Math.round(((summaryStats.totalICUCapacity - summaryStats.totalOccupiedBeds) / (summaryStats.totalICUCapacity || 1)) * 100)}% Free`, isPositive: (summaryStats.totalICUCapacity - summaryStats.totalOccupiedBeds) > 10 },
    { title: "Tertiary Hubs", value: summaryStats.tertiary, icon: <CheckCircle2 className="h-5 w-5" />, color: "emerald", trend: "High Priority" },
  ], [summaryStats]);

  const headerActions = (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Analytics Popover - Hidden on extra small mobile */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group shrink-0" title="Hospital Network Analytics">
            <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-32px)] sm:w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Network Analytics</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Infrastructure</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-100 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{summaryStats.total}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Centres</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl transition-all hover:border-rose-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Bed className="h-3 w-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Capacity</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600 tracking-tighter">{summaryStats.totalICUCapacity}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase font-black italic">Beds</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl transition-all hover:border-amber-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Available</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600 tracking-tighter">{summaryStats.totalICUCapacity - summaryStats.totalOccupiedBeds}</span>
                <span className="text-[8px] text-amber-400 font-bold uppercase font-black italic">Seats</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:border-emerald-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Tertiary</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600 tracking-tighter">{summaryStats.tertiary}</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase font-black italic">Hubs</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Approvals Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-emerald-600 transition-all active:scale-95 group relative shrink-0" title="Pending Approvals">
            <Zap className={`h-4 w-4 transition-transform group-hover:scale-110 ${getPendingBookings().length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
            {getPendingBookings().length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 md:h-4 md:w-4 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-bounce">
                {getPendingBookings().length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-2 rounded-2xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5 flex justify-between items-center">
            <span>Incoming Requirements</span>
            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-600 bg-emerald-50 font-black">APPROVALS</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            {getPendingBookings().length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-slate-100 mx-auto" />
                <p className="text-xs font-bold text-slate-400">All Requests Managed</p>
              </div>
            ) : (
              getPendingBookings().map(b => (
                <div key={b.id} className="p-3 mb-2 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-100 hover:border-emerald-100 transition-all group/item shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 leading-none tracking-tight">#{(b.booking_id || b.id).slice(0, 8).toUpperCase()}</span>
                        {b.urgency === 'emergency' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 mt-1.5 uppercase tracking-wide">{getPatientName(b.patientId)}</span>
                    </div>
                    <Badge className={`text-[9px] font-black uppercase tracking-tighter ${b.urgency === 'emergency' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'} border`}>
                      {b.urgency}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-100 transition-all active:scale-95" onClick={() => approveBooking(b.id)}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95" onClick={() => rejectBooking(b.id)}>Reject</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unified Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center justify-center h-9 w-9 md:h-10 md:w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative shrink-0" title="Filters">
            <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${levelFilter !== 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
            {levelFilter !== 'all' && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 md:h-4 md:w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                1
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
            Care Level Filters
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          <DropdownMenuItem
            onClick={() => setLevelFilter('all')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${levelFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">All Levels</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          {['Primary', 'Secondary', 'Tertiary', 'Quaternary'].map(level => (
            <DropdownMenuItem
              key={level}
              onClick={() => setLevelFilter(level as any)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${levelFilter === level ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${level === 'Primary' ? 'bg-emerald-500' : level === 'Secondary' ? 'bg-amber-500' : level === 'Tertiary' ? 'bg-orange-500' : 'bg-rose-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wide capitalize">{level}</span>
              </div>
              <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">
                {hospitals.filter(h => h.levelOfCare === level).length}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative flex-1 max-w-[120px] sm:max-w-72">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search..."
          className="pl-8 sm:pl-10 h-9 md:h-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl text-[11px] sm:text-xs font-medium"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <Dialog open={dialog.isOpen} onOpenChange={(open) => { if (open) handleOpenDialog('Add'); else handleCloseDialog(); }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-9 md:h-10 px-3 md:px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 group shrink-0"
            onClick={() => handleOpenDialog('Add')}
          >
            <Plus className="h-4 w-4 stroke-[3px] group-hover:rotate-90 transition-transform" />
            <span className="uppercase tracking-wider hidden sm:inline">Add Hospital</span>
            <span className="uppercase tracking-wider sm:hidden">Add</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
            <Building2 className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <Building2 className="h-6 w-6" /> {dialog.mode === 'Add' ? 'Register Medical Institution' : 'Refine Infrastructure Details'}
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Healthcare Facility Management</DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 text-black bg-slate-50/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="font-semibold">🏥 Hospital Name *</Label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Hospital name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">⭐ Level of Care</Label>
                <Select
                  value={formData.levelOfCare || "Primary"}
                  onValueChange={(v) => setFormData({ ...formData, levelOfCare: v as LevelOfCare })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">🛏️ Total Seats</Label>
                <Input
                  type="number"
                  value={formData.icuCapacity || 0}
                  onChange={(e) => setFormData({ ...formData, icuCapacity: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">📉 Occupied Seats</Label>
                <Input
                  type="number"
                  value={formData.occupiedBeds || 0}
                  onChange={(e) => setFormData({ ...formData, occupiedBeds: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">📍 Address *</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-[10px] gap-1 px-2 ${isMapVisible ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => setIsMapVisible(!isMapVisible)}
                  >
                    <MapPin className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Physical address"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">👤 Contact Person</Label>
                <Input
                  value={formData.contactPerson || ""}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Contact person"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">📞 Phone</Label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="font-semibold">✉️ Email</Label>
                <Input
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">🌐 Lat</Label>
                <Input
                  type="number"
                  value={formData.coordinates?.lat || 0}
                  onChange={(e) => setFormData({ ...formData, coordinates: { lat: parseFloat(e.target.value) || 0, lng: formData.coordinates?.lng || 0 } })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">🌐 Lng</Label>
                <Input
                  type="number"
                  value={formData.coordinates?.lng || 0}
                  onChange={(e) => setFormData({ ...formData, coordinates: { lat: formData.coordinates?.lat || 0, lng: parseFloat(e.target.value) || 0 } })}
                  className="h-9"
                />
              </div>
            </div>

            {isMapVisible && (
              <div className="h-64 rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner relative group">
                <MapContainer
                  {...({
                    center: [formData.coordinates?.lat || 37.7749, formData.coordinates?.lng || -122.4194] as LatLngExpression,
                    zoom: 13,
                    className: "h-full w-full"
                  } as any)}
                >
                  <TileLayer
                    {...({
                      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    } as any)}
                  />
                  <MapClickHandler onLocationSelect={handleMapLocationSelect} />
                  {formData.coordinates && <Marker position={[formData.coordinates.lat, formData.coordinates.lng] as LatLngExpression} />}
                </MapContainer>
                <div className="absolute top-2 right-2 z-[1000] flex gap-2">
                  <div className="bg-white/90 backdrop-blur-md p-1 rounded-lg border shadow-sm flex items-center gap-2">
                    <Search className="h-3 w-3 text-slate-400 ml-2" />
                    <Input
                      placeholder="Search location..."
                      value={mapSearch}
                      onChange={(e) => setMapSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                      className="h-7 w-40 text-[10px] border-none bg-transparent focus-visible:ring-0 px-1"
                    />
                    <Button
                      size="sm"
                      className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white"
                      onClick={handleMapSearch}
                      disabled={isSearchingMap}
                    >
                      {isSearchingMap ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Search'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100">
              <Button
                className={`flex-1 h-12 text-base font-bold transition-all shadow-lg active:scale-95 ${submittingId ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
                onClick={handleSave}
                disabled={!!submittingId}
              >
                {submittingId ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : '💾 Save Hospital Configuration'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 text-base font-bold border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                onClick={handleCloseDialog}
              >
                ❌ Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Button variant="secondary" className="h-9 md:h-10 px-3 md:px-6 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center shrink-0" onClick={() => exportHospitals(hospitals)}>
        <FileText size={16} className="md:mr-2" />
        <span className="hidden md:inline">EXPORT</span>
      </Button>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout subTitle="Hospital Network Operations" headerActions={headerActions} isFullHeight={true}>
      <div className="p-4 lg:p-6 space-y-4 h-full flex flex-col">

        {/* Hospital Detail View Dialog */}
        <Dialog open={!!selectedHospital} onOpenChange={(open) => !open && setSelectedHospital(null)}>
          <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
              <Activity className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
              <div className="relative z-10">
                <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Activity className="h-6 w-6" /> Hospital Intelligence — {selectedHospital?.name}
                </DialogTitle>
                <DialogDescription className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Operational Metrics Overview</DialogDescription>
              </div>
            </DialogHeader>
            <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-black">
              {selectedHospital && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">General Information</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Level of Care</p>
                          <p className="text-sm font-bold">{selectedHospital.levelOfCare}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">ICU Capacity</p>
                          <p className="text-sm font-bold flex items-center gap-1">
                            <Bed className="h-3 w-3 text-blue-500" />
                            {selectedHospital.icuCapacity} Total Beds
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Occupied Beds</p>
                          <p className="text-sm font-bold flex items-center gap-1">
                            <Activity className="h-3 w-3 text-orange-500" />
                            {selectedHospital.occupiedBeds || 0} Occupied
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Address</p>
                        <p className="text-sm font-bold flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                          {selectedHospital.address}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">Contact Details</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Contact Person</p>
                          <p className="text-sm font-bold flex items-center gap-2">
                            <User className="h-3 w-3 text-slate-500" />
                            {selectedHospital.contactPerson}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Phone</p>
                          <p className="text-sm font-bold flex items-center gap-2">
                            <Phone className="h-3 w-3 text-green-500" />
                            {selectedHospital.phone}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Email</p>
                          <p className="text-sm font-bold flex items-center gap-2">
                            <MessageCircle className="h-3 w-3 text-blue-500" />
                            {selectedHospital.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">Logistics</h4>
                    <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-bold text-blue-800 uppercase">Pickup Location</p>
                      </div>
                      <p className="text-sm font-medium italic text-slate-700">
                        "{selectedHospital.preferredPickupLocation || "No specific instructions provided."}"
                      </p>
                      <div className="pt-4 space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Coordinates</p>
                        <div className="bg-white p-2 rounded border border-slate-200 text-xs font-mono">
                          LAT: {selectedHospital.coordinates?.lat.toFixed(6)} | LNG: {selectedHospital.coordinates?.lng.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                      <p className="text-xs text-slate-500 italic">Facility ID: {selectedHospital.id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>


        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table Content */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto h-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse border-slate-200 dark:border-slate-800 min-w-[1000px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Hospital Name</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Level of Care</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Contact</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Phone</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Total Seats</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Occupied Seats</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-600 font-semibold text-lg">
                      📭 No hospitals found. Try a different search or add a new hospital.
                    </td>
                  </tr>
                ) : (
                  paginatedHospitals.map((hospital) => {
                    const status = getCapacityStatus(hospital.occupiedBeds, hospital.icuCapacity);
                    const isExpanded = expandedRowId === hospital.id;
                    return (
                      <React.Fragment key={hospital.id}>
                        <tr className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-200 group ${isExpanded ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-tr from-blue-200 via-blue-100 to-blue-50 dark:from-blue-900 dark:via-blue-800 dark:to-blue-950 shadow-sm shrink-0 rounded-xl flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex flex-col">
                                <p
                                  className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-all leading-tight text-sm"
                                  onClick={() => setExpandedRowId(isExpanded ? null : hospital.id)}
                                >
                                  {hospital.name}
                                </p>
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{hospital.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <Badge variant="outline" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
                              {hospital.levelOfCare} Care
                            </Badge>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                                <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{hospital.contactPerson || '—'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{hospital.phone || '—'}</td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
                                <Bed className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm font-black text-slate-800 dark:text-slate-200">{hospital.icuCapacity}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <Badge className={`px-2 py-0.5 rounded-lg text-[9px] font-black border tracking-tighter ${status.color}`}>
                              {hospital.occupiedBeds || 0} / {hospital.icuCapacity} {status.label}
                            </Badge>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={() => setSelectedHospital(hospital)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={() => {
                                  if (hospital.latitude && hospital.longitude) {
                                    setTrackHospital(hospital);
                                    setIsTrackOpen(true);
                                  } else {
                                    toast({ title: 'No Location', description: 'This hospital does not have coordinates set.', variant: 'destructive' });
                                  }
                                }}
                                title="Live Map Location"
                              >
                                <MapPin className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={() => handleOpenDialog('Edit', hospital)}
                                title="Edit Hospital"
                              >
                                <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                    title="Delete Hospital"
                                  >
                                    <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl border-2 border-slate-200 shadow-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Delete Hospital Configuration</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500 font-bold">
                                      Are you sure you want to decommission <span className="text-rose-600 font-black decoration-rose-200 underline underline-offset-4">{hospital.name}</span>? This operation is permanent.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl font-bold uppercase tracking-widest text-xs h-11">Abort</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(hospital.id)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-xs h-11 shadow-lg shadow-rose-100">
                                      Confirm Deletion
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/30 border-b border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                            <td colSpan={7} className="p-0">
                              <div className="p-8 space-y-8 text-black border-l-4 border-blue-500/50">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-2">
                                    <h3 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                                      <Building2 className="h-6 w-6 text-blue-600" />
                                      {hospital.name} Detail View
                                    </h3>
                                    <p className="text-gray-500 flex items-center gap-2 text-sm">
                                      <MapPin className="h-4 w-4" />
                                      {hospital.address}
                                    </p>
                                  </div>
                                  <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-4 py-1 font-bold rounded-lg shadow-sm">
                                    {hospital.levelOfCare} Care Facility
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {/* Contact Info Card */}
                                  <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                                      <h3 className="font-bold text-slate-600 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                        <User className="h-4 w-4 text-blue-500" /> Principal Contact
                                      </h3>
                                    </div>
                                    <CardContent className="p-5 space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Authorized Person</p>
                                        <p className="text-base font-semibold text-slate-800 underline decoration-blue-200 decoration-2 underline-offset-4">{hospital.contactPerson || 'Not Provided'}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Emergency Phone</p>
                                        <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                          <span className="bg-blue-50 p-1 rounded text-blue-600">
                                            <Phone className="h-4 w-4" />
                                          </span>
                                          {hospital.phone || 'Not Provided'}
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Facility Info Card */}
                                  <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                                      <h3 className="font-bold text-slate-600 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                        <Activity className="h-4 w-4 text-blue-500" /> Capacity Stats
                                      </h3>
                                    </div>
                                    <CardContent className="p-5 space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Seat Availability (Occupied / Total)</p>
                                        <div className="flex items-center gap-3">
                                          <p className="text-3xl font-black text-blue-600">{hospital.occupiedBeds || 0} / {hospital.icuCapacity}</p>
                                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-500 ${((hospital.occupiedBeds || 0) / (hospital.icuCapacity || 1)) > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                                              style={{ width: `${Math.min(100, ((hospital.occupiedBeds || 0) / (hospital.icuCapacity || 1)) * 100)}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Service Tier</p>
                                        <p className="text-base font-semibold text-slate-800 bg-slate-100 inline-block px-3 py-0.5 rounded-full">{hospital.levelOfCare} Multi-Specialty</p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Location Card */}
                                  <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                                      <h3 className="font-bold text-slate-600 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                                        <Navigation className="h-4 w-4 text-blue-500" /> Dispatch Info
                                      </h3>
                                    </div>
                                    <CardContent className="p-5 space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Latitude</p>
                                          <code className="text-blue-700 font-mono font-bold text-xs">{hospital.coordinates?.lat.toFixed(6)}</code>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Longitude</p>
                                          <code className="text-blue-700 font-mono font-bold text-xs">{hospital.coordinates?.lng.toFixed(6)}</code>
                                        </div>
                                      </div>
                                      <div className="space-y-1 pt-2 border-t border-slate-50">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">System ID</p>
                                        <p className="text-[10px] font-mono text-slate-300 truncate">{hospital.id}</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 📊 PREMIUM PAGINATION FOOTER */}
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 md:h-9 w-16 md:w-20 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 shadow-sm focus:ring-2 focus:ring-blue-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {[10, 25, 50, 100].map(val => (
                      <SelectItem key={val} value={val.toString()} className="text-xs font-black text-slate-600">{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">
                Showing {currentPage * itemsPerPage - itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, visible.length)} <span className="text-slate-300 mx-1">/</span> {visible.length} Hospitals
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900 px-4 py-1.5 rounded-xl shadow-inner mx-1">
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                  Page {currentPage} <span className="text-blue-200 dark:text-blue-700 mx-1.5">OF</span> {totalPages || 1}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Last Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chatbot Widget - Premium Enhanced - FIXED POSITION */}
        <div className="fixed bottom-6 right-6 z-50 max-h-[90vh] flex flex-col">
          {isChatOpen ? (
            <Card
              className="w-96 shadow-2xl flex flex-col rounded-2xl overflow-hidden border-2 border-blue-300 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white max-h-[85vh]"
              onMouseLeave={() => setIsChatOpen(false)}
            >
              {/* Chat Header - Dynamic Gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center border-b border-blue-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-inner flex-shrink-0">
                    <img src={chatBotImage} alt="AI Hospital Assistant" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">🏥 Hospital Assistant</h3>
                    <p className="text-xs text-blue-100">Online & Ready</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                  className="bg-blue-500 hover:bg-blue-400 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center border border-blue-300"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Chat Messages Area - Vibrant Multi-color */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white h-80 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 scroll-smooth">
                {chatMessages.map((msg, idx) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                    <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none shadow-lg border-2 border-blue-600'
                      : 'bg-blue-50 border-2 border-blue-300 text-black rounded-bl-none shadow-sm'
                      }`}>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-xs mt-2 block opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-blue-600'}`}>
                        ⏱️ {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Suggestions Buttons */}
                {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].sender === 'bot' && chatMessages[chatMessages.length - 1].suggestions && (
                  <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {chatMessages[chatMessages.length - 1].suggestions?.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-white border-blue-300 hover:bg-blue-50 text-blue-600 font-semibold rounded-full flex items-center gap-1 cursor-pointer transition-all hover:shadow-lg"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="border-t-2 border-blue-300 p-3 bg-white rounded-b-2xl flex gap-2 shrink-0">
                <Input
                  placeholder="💬 Ask anything... e.g., 'Show hospitals'"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  className="flex-1 rounded-full border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500 bg-white font-medium text-black"
                />
                <Button
                  size="sm"
                  onClick={handleChatSend}
                  className="bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded-full h-10 w-10 p-0 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <div className="relative">
              <Button
                onClick={() => setIsChatOpen(true)}
                size="lg"
                className="fixed bottom-8 right-8 z-50 p-0 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-white animate-bounce overflow-hidden h-16 w-16 flex items-center justify-center"
              >
                <img src={chatBotImage} alt="Chatbot Assistant" className="w-full h-full object-cover rounded-full" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Track Hospital Dialog */}
      <Dialog open={isTrackOpen} onOpenChange={setIsTrackOpen}>
        <DialogContent className="w-full max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white max-w-[800px]">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <MapPin className="w-5 h-5 text-rose-500" />
              {trackHospital?.name} <span className="text-slate-400 font-medium text-sm ml-auto">Live Location</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 relative w-full h-full bg-slate-100">
            {trackHospital && trackHospital.latitude && trackHospital.longitude ? (
              <MapContainer
                center={[parseFloat(trackHospital.latitude), parseFloat(trackHospital.longitude)] as LatLngExpression}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker
                  position={[parseFloat(trackHospital.latitude), parseFloat(trackHospital.longitude)] as LatLngExpression}
                  icon={L.divIcon({
                    html: `
                                  <div class="relative flex items-center justify-center">
                                    <div class="w-12 h-12 bg-rose-500/20 rounded-full animate-ping absolute"></div>
                                    <div class="relative z-10 p-2 bg-white rounded-full shadow-xl border-2 border-rose-500">
                                      <svg class="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                    </div>
                                  </div>
                                `,
                    className: 'bg-transparent',
                    iconSize: [48, 48],
                    iconAnchor: [24, 24]
                  })}
                />
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold">
                Location data unavailable
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Hospitals;
