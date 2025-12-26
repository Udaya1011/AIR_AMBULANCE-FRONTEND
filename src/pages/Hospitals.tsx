import React, { useEffect, useMemo, useState } from 'react';
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
import { Plus, Edit, Search, Trash2, Calendar, CheckCircle2, XCircle, Building2, AlertCircle, Download, Bed, MessageCircle, X, Send, Zap, Users, Phone, MapPin, Clock, ChevronRight, Smile, Lightbulb, BookOpen, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { HospitalService } from '@/services/hospital.service';
import { exportHospitals } from '@/utils/exportHospitals';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import chatBotImage from '../emoji.jpeg';

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
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<any | null>(null);
  const [editCandidate, setEditCandidate] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [approvedIds, setApprovedIds] = useState<string[]>(() => {
    try { const raw = localStorage.getItem('asf:approvedPatients:v1'); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  });
  const [hospitalPatients, setHospitalPatients] = useState<{ [hospitalId: string]: string[] }>(() => {
    try { const raw = localStorage.getItem('asf:hospitalPatients:v1'); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
  });
  const [isAddToHospitalDialogOpen, setIsAddToHospitalDialogOpen] = useState(false);
  const [approvedPatientToAdd, setApprovedPatientToAdd] = useState<any | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');

  // Booking approval state
  const [bookings, setBookings] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('airswift_bookings') || '[]');
    } catch {
      return mockBookings || [];
    }
  });
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // New patients awaiting approval state
  const [newPatients, setNewPatients] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('airswift_new_patients_pending') || '[]');
    } catch {
      return [];
    }
  });
  const [patientApprovalNotes, setPatientApprovalNotes] = useState('');
  const [selectedPatientForApproval, setSelectedPatientForApproval] = useState<string | null>(null);

  useEffect(() => {
    fetchHospitals();
    // Initialize recently added patients with the most recent patients from context
    if (patients && patients.length > 0) {
      setRecentPatients(patients.slice(0, 5));
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('asf:approvedPatients:v1', JSON.stringify(approvedIds)); } catch (e) { }
  }, [approvedIds]);

  useEffect(() => {
    try { localStorage.setItem('asf:hospitalPatients:v1', JSON.stringify(hospitalPatients)); } catch (e) { }
  }, [hospitalPatients]);

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

  useEffect(() => {
    const handleNewPatient = (e: any) => {
      const patient = e?.detail;
      if (patient) {
        setRecentPatients(prev => [patient, ...prev].slice(0, 5));
        // Add to pending approvals
        setNewPatients(prev => {
          const updated = [{ ...patient, status: 'pending_approval', createdAt: new Date().toISOString() }, ...prev];
          try { localStorage.setItem('airswift_new_patients_pending', JSON.stringify(updated)); } catch (e) { }
          return updated;
        });
      }
    };
    const handlePatientUpdate = (e: any) => {
      const updatedPatient = e?.detail;
      if (updatedPatient) {
        setRecentPatients(prev => {
          const exists = prev.some(p => p.id === updatedPatient.id);
          if (exists) {
            return prev.map(p => p.id === updatedPatient.id ? updatedPatient : p);
          }
          // If not present, prepend so edits to older patients become visible
          return [updatedPatient, ...prev].slice(0, 5);
        });
      }
    };
    window.addEventListener('new-patient', handleNewPatient as EventListener);
    window.addEventListener('patient-updated', handlePatientUpdate as EventListener);
    return () => {
      window.removeEventListener('new-patient', handleNewPatient as EventListener);
      window.removeEventListener('patient-updated', handlePatientUpdate as EventListener);
    };
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const data = await HospitalService.getHospitals();
      setHospitals(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch hospitals");
      if (process.env.NODE_ENV === "development") {
        setHospitals(mockHospitals);
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


  const summaryStats = useMemo(() => {
    const total = hospitals.length;
    const totalICUCapacity = hospitals.reduce((sum, h) => sum + (h.icuCapacity || 0), 0);
    const primary = hospitals.filter(h => h.levelOfCare === 'Primary').length;
    const secondary = hospitals.filter(h => h.levelOfCare === 'Secondary').length;
    const tertiary = hospitals.filter(h => h.levelOfCare === 'Tertiary').length;
    const quaternary = hospitals.filter(h => h.levelOfCare === 'Quaternary').length;
    return { total, totalICUCapacity, primary, secondary, tertiary, quaternary };
  }, [hospitals]);

  /* PAGINATION STATE */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const visible = useMemo(() => {
    return hospitals.filter((h) => {
      const q = query.trim().toLowerCase();
      return q === '' || h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q) || h.contactPerson.toLowerCase().includes(q);
    });
  }, [hospitals, query]);

  const totalPages = Math.ceil(visible.length / itemsPerPage);
  const paginatedHospitals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visible.slice(start, start + itemsPerPage);
  }, [visible, currentPage]);

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
          tertiary: hospitals.filter(h => h.levelOfCare === 'Tertiary').length,
          secondary: hospitals.filter(h => h.levelOfCare === 'Secondary').length,
          primary: hospitals.filter(h => h.levelOfCare === 'Primary').length,
        };
        botResponse = `🏥 Hospital Network Overview\n━━━━━━━━━━━━━━━━━━━━━━━━\n🔢 Total Hospitals: ${stats.total}\n🛏️ Combined ICU Beds: ${stats.icu}\n⭐ Tertiary Centers: ${stats.tertiary}\n📍 Secondary Centers: ${stats.secondary}\n📌 Primary Centers: ${stats.primary}\n\n💡 What would you like to explore?`;
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
      else if (userText.includes('icu') || userText.includes('capacity') || userText.includes('bed') || userText.includes('available')) {
        const availableHospitals = hospitals
          .sort((a, b) => b.icuCapacity - a.icuCapacity)
          .slice(0, 5);
        botResponse = `🛏️ ICU Bed Availability Report\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${availableHospitals.map((h, i) => `${i + 1}. ${h.name}\n   🛏️ ${h.icuCapacity} ICU beds | ⭐ ${h.levelOfCare} | 📍 ${h.address.substring(0, 30)}...`).join('\n\n')}\n\n✅ Last updated: Just now\n🔄 Refresh for latest data`;
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

  const approveBooking = (bookingId: string) => {
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
    localStorage.setItem('airswift_bookings', JSON.stringify(updatedBookings));
    setSelectedBookingForApproval(null);
    setApprovalNotes('');
    toast({
      title: "Booking Approved",
      description: "The booking has been approved and moved to dispatch review.",
      action: <ToastAction altText="Close">Close</ToastAction>,
    });
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
    localStorage.setItem('airswift_bookings', JSON.stringify(updatedBookings));
    setSelectedBookingForApproval(null);
    setApprovalNotes('');
    toast({
      title: "Booking Rejected",
      description: "The booking has been rejected.",
      variant: "destructive",
    });
  };

  // Patient Approval Functions
  const approvePatient = (patientId: string) => {
    const updatedPatients = newPatients.map(p =>
      p.id === patientId
        ? { ...p, status: 'approved', approvedAt: new Date().toISOString(), approvalNotes: patientApprovalNotes }
        : p
    );
    setNewPatients(updatedPatients.filter(p => p.status === 'pending_approval'));
    localStorage.setItem('airswift_new_patients_pending', JSON.stringify(updatedPatients.filter(p => p.status === 'pending_approval')));
    setSelectedPatientForApproval(null);
    setPatientApprovalNotes('');
    toast({
      title: "Patient Approved",
      description: "The new patient has been approved for transfer.",
      action: <ToastAction altText="Close">Close</ToastAction>,
    });
  };

  const rejectPatient = (patientId: string) => {
    const updatedPatients = newPatients.filter(p => p.id !== patientId);
    setNewPatients(updatedPatients);
    localStorage.setItem('airswift_new_patients_pending', JSON.stringify(updatedPatients));
    setSelectedPatientForApproval(null);
    setPatientApprovalNotes('');
    toast({
      title: "Patient Rejected",
      description: "The new patient record has been rejected.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header - Simple Clean */}
        <div className="flex justify-between items-center py-3">
          <div>
            <h1 className="text-3xl font-bold text-black mb-0.5">🏥 Hospitals</h1>
            <p className="text-gray-600 font-medium text-xs">Manage hospital networks and emergency resources</p>
          </div>
          <Dialog open={dialog.isOpen} onOpenChange={(open) => { if (open) handleOpenDialog('Add'); else handleCloseDialog(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-white hover:bg-gray-100 text-black font-bold shadow-lg border border-gray-300">

                ➕ Add Hospital
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
              <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                <DialogTitle className="text-white text-xl">{dialog.mode === 'Add' ? '➕ Add New Hospital' : `✏️ Edit Hospital - ${formData.name}`}</DialogTitle>
                <DialogDescription className="text-blue-100">Enter hospital details and capacity information</DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* ROW 1: Basic Info */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-1.5">
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
                    <Label className="font-semibold">🛏️ ICU Capacity</Label>
                    <Input
                      type="number"
                      value={formData.icuCapacity || 0}
                      onChange={(e) => setFormData({ ...formData, icuCapacity: parseInt(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* ROW 2: Contact & Address */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="font-semibold">📍 Address *</Label>
                    <Input
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full address"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">👤 Contact Person</Label>
                    <Input
                      value={formData.contactPerson || ""}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">📞 Phone</Label>
                    <Input
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Phone"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* ROW 3: Email & Coordinates (Optional) */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="font-semibold">📧 Email</Label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email"
                      className="h-9"
                    />
                  </div>
                  {/* Placeholder for future fields or empty space */}
                  <div className="col-span-2"></div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                  <Button variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleSave} disabled={submittingId === "saving"} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {submittingId === "saving" ? "Saving..." : "Save Hospital"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Stats - Professional Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">🏢 Total Hospitals</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.total}</p>
                    <p className="text-xs text-gray-400 font-medium">facilities</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">🛏️ Total ICU Beds</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.totalICUCapacity}</p>
                    <p className="text-xs text-gray-400 font-medium">beds</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Bed className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">📊 Care Levels</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.primary + summaryStats.secondary + summaryStats.tertiary + summaryStats.quaternary}</p>
                    <p className="text-xs text-gray-400 font-medium">levels</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">⭐ Primary Care</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.primary}</p>
                    <p className="text-xs text-gray-400 font-medium">facilities</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">🏥 Secondary Care</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.secondary}</p>
                    <p className="text-xs text-gray-400 font-medium">facilities</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">✅ Tertiary Care</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.tertiary}</p>
                    <p className="text-xs text-gray-400 font-medium">facilities</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar & Export - Enhanced */}
        <div className="flex gap-4 bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 h-5 w-5 text-gray-600 font-bold" />
            <Input placeholder="🔍 Search hospitals by name, address, or contact..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-12 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-300 font-semibold text-black placeholder-gray-500 h-12 rounded-xl" />
          </div>
          <Button
            variant="outline"
            onClick={() => exportHospitals(hospitals)}
            className="p-2 h-10 w-10 rounded-lg hover:bg-blue-100 transition"
            title="Export hospitals data"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>

        {/* Pending Booking Approvals */}
        {getPendingBookings().length > 0 && (
          <Card className="border-2 border-gray-300 shadow-lg bg-white mb-6">
            <CardContent className="pt-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-black">
                <AlertCircle className="h-8 w-8 text-gray-600" />
                Pending Booking Approvals
                <Badge className="ml-auto bg-gray-600 text-white text-lg px-3 py-1">
                  {getPendingBookings().length}
                </Badge>
              </h2>

              <div className="space-y-4">
                {getPendingBookings().map((booking) => (
                  <div key={booking.id} className="border-2 border-gray-300 rounded-xl p-6 bg-white shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Booking #{booking.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-500">Requested: {booking.requestedAt ? new Date(booking.requestedAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <Badge className={`text-black border border-gray-400 bg-white ${booking.urgency === 'emergency' ? 'border-gray-600' :
                        booking.urgency === 'urgent' ? 'border-gray-500' :
                          'border-gray-300'
                        }`}>
                        {booking.urgency?.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Patient</p>
                        <p className="font-semibold text-gray-900">{booking.patient?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">From</p>
                        <p className="font-semibold text-gray-900">{booking.originHospital?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">To</p>
                        <p className="font-semibold text-gray-900">{booking.destinationHospital?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">{booking.estimatedFlightTime || 'TBD'} min</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Dialog open={selectedBookingForApproval === booking.id} onOpenChange={(open) => {
                        if (open) setSelectedBookingForApproval(booking.id);
                        else {
                          setSelectedBookingForApproval(null);
                          setApprovalNotes('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="lg" className="gap-2 bg-white hover:bg-gray-100 text-black font-semibold flex-1 border border-gray-300">
                            <CheckCircle2 className="h-5 w-5" />
                            Approve Booking
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-xl">Approve Booking</DialogTitle>
                            <DialogDescription>Patient: {booking.patient?.name} | Urgency: {booking.urgency}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">Approval Notes (Optional)</Label>
                            <Textarea
                              placeholder="Add approval notes here..."
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              className="min-h-24"
                            />
                          </div>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setSelectedBookingForApproval(null)}>Cancel</Button>
                            <Button onClick={() => approveBooking(booking.id)} className="bg-white hover:bg-gray-100 text-black border border-gray-300">Approve</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="lg" className="gap-2 text-gray-600 font-semibold flex-1 bg-white hover:bg-gray-100 border border-gray-300">
                            <XCircle className="h-5 w-5" />
                            Reject Booking
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-xl">Reject Booking</DialogTitle>
                            <DialogDescription>Patient: {booking.patient?.name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Label className="text-base font-semibold">Rejection Reason</Label>
                            <Textarea
                              placeholder="Provide rejection reason..."
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              className="min-h-24"
                            />
                          </div>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setApprovalNotes('')}>Cancel</Button>
                            <Button variant="destructive" onClick={() => rejectBooking(booking.id)}>Reject</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Patients Awaiting Approval */}
        {newPatients.filter(p => p.status === 'pending_approval').length > 0 && (
          <Card className="border-2 border-gray-300 shadow-lg bg-white mb-6">
            <CardContent className="pt-8">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-black">
                <Users className="h-8 w-8 text-gray-600" />
                New Patients Awaiting Approval
                <Badge className="ml-auto bg-gray-600 text-white text-lg px-3 py-1">
                  {newPatients.filter(p => p.status === 'pending_approval').length}
                </Badge>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newPatients.filter(p => p.status === 'pending_approval').map((patient) => {
                  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
                  const acuityColor = patient.acuityLevel === 'critical' ? 'border-gray-600' :
                    patient.acuityLevel === 'urgent' ? 'border-gray-500' : 'border-gray-300';

                  return (
                    <div key={patient.id} className={`border-2 ${acuityColor} rounded-xl p-6 bg-white shadow-md hover:shadow-xl transition-all`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-black">{patient.full_name || patient.name}</h3>
                          <p className="text-xs text-gray-500">ID: {patient.id.slice(0, 8)}</p>
                        </div>
                        <Badge className={`bg-white text-black border ${acuityColor}`}>{patient.acuityLevel?.toUpperCase()}</Badge>
                      </div>

                      <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded text-sm">
                        <p><span className="font-semibold text-gray-700">Age:</span> <span className="text-gray-600">{age} years</span></p>
                        <p><span className="font-semibold text-gray-700">Gender:</span> <span className="text-gray-600">{patient.gender?.toUpperCase()}</span></p>
                        <p><span className="font-semibold text-gray-700">Weight:</span> <span className="text-gray-600">{patient.weight} kg</span></p>
                        <p><span className="font-semibold">Diagnosis:</span> {patient.diagnosis || 'N/A'}</p>
                      </div>

                      <div className="flex gap-2">
                        <Dialog open={selectedPatientForApproval === patient.id} onOpenChange={(open) => {
                          if (open) setSelectedPatientForApproval(patient.id);
                          else {
                            setSelectedPatientForApproval(null);
                            setPatientApprovalNotes('');
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 bg-white hover:bg-gray-100 text-black font-semibold flex-1 border border-gray-300">
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Approve Patient</DialogTitle>
                              <DialogDescription>Patient: {patient.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Label className="text-base font-semibold">Approval Notes (Optional)</Label>
                              <Textarea
                                placeholder="Add notes..."
                                value={patientApprovalNotes}
                                onChange={(e) => setPatientApprovalNotes(e.target.value)}
                                className="min-h-20"
                              />
                            </div>
                            <DialogFooter className="gap-2">
                              <Button variant="outline" onClick={() => setSelectedPatientForApproval(null)}>Cancel</Button>
                              <Button onClick={() => approvePatient(patient.id)} className="bg-white hover:bg-gray-100 text-black border border-gray-300">Approve</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          className="gap-2 text-gray-600 font-semibold flex-1 bg-white hover:bg-gray-100 border border-gray-300"
                          onClick={() => {
                            if (confirm('Are you sure?')) rejectPatient(patient.id);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Patients Section */}
        {recentPatients.length > 0 && (
          <Card className="border-2 border-gray-300 bg-white shadow-2xl">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-black">
                <Users className="h-6 w-6 text-gray-600" />
                👥 Recently Added Patients
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {recentPatients.map((patient) => {
                  const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
                  const acuityColors: Record<string, string> = {
                    critical: 'bg-white text-black border-gray-600',
                    urgent: 'bg-white text-black border-gray-500',
                    stable: 'bg-white text-black border-gray-300',
                  };
                  return (
                    <div key={patient.id} className="border-2 border-gray-300 rounded-xl p-4 bg-white hover:shadow-2xl transition-all flex flex-col h-full">
                      {/* Header: Name and Approved Badge */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-black truncate">👤 {patient.full_name || patient.name}</p>
                          <p className="text-xs text-gray-600 truncate font-semibold">{patient.id}</p>
                        </div>
                        {approvedIds.includes(patient.id) && (
                          <Badge className="text-xs bg-white text-black border-gray-400 border whitespace-nowrap flex-shrink-0 font-bold">
                            ✅ Approved
                          </Badge>
                        )}
                      </div>

                      {/* Patient Details */}
                      <div className="space-y-1 text-xs mb-3 flex-grow bg-gray-50 p-3 rounded-lg">
                        <p><span className="font-bold text-gray-700">📅 Age:</span> <span className="text-gray-600">{age} yrs</span></p>
                        <p><span className="font-bold text-gray-700">🎂 DOB:</span> <span className="text-gray-600">{new Date(patient.date_of_birth || patient.dob || Date.now()).toLocaleDateString()}</span></p>
                        <p><span className="font-bold text-gray-700">👥 Gender:</span> <span className="text-gray-600">{patient.gender}</span></p>
                        {patient.diagnosis && (
                          <p className="truncate"><span className="font-bold text-gray-700">🩺 Diagnosis:</span> <span className="text-gray-600">{patient.diagnosis}</span></p>
                        )}
                      </div>

                      {/* Acuity and Actions */}
                      <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 mt-auto">
                        <Badge className={`text-xs font-bold ${acuityColors[patient.acuityLevel] || acuityColors.stable}`}>
                          {patient.acuityLevel === 'critical' && '🔴'} {patient.acuityLevel === 'urgent' && '🟡'} {patient.acuityLevel === 'stable' && '🟢'} {patient.acuityLevel}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={() => { setEditCandidate(patient); setEditForm({ ...patient }); setIsEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={() => {
                            // Check if patient is already approved to any hospital
                            const isAlreadyAssigned = Object.values(hospitalPatients).some(patients => patients.includes(patient.id));
                            if (isAlreadyAssigned) {
                              toast({ title: 'Already Assigned', description: `${patient.name} is already assigned to a hospital`, variant: 'destructive' });
                              return;
                            }
                            setApprovedIds(prev => Array.from(new Set([patient.id, ...prev])).slice(0, 50));
                            try { window.dispatchEvent(new CustomEvent('patient-approved', { detail: { id: patient.id } })); } catch (e) { }
                            toast({ title: 'Success', description: `${patient.name} approved`, variant: 'default' });
                          }}>
                            <CheckCircle2 className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={() => { setDeleteCandidate(patient); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Patient AlertDialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); setIsDeleteDialogOpen(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Patient</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete {deleteCandidate?.name}? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!deleteCandidate) return;
                try {
                  const deleted = deleteCandidate;
                  // remove from context
                  removePatient(deleted.id);
                  // remove from local recent list
                  setRecentPatients(prev => prev.filter(p => p.id !== deleted.id));
                  // store for undo
                  setLastDeleted(deleted);
                  const name = deleted.name;
                  setDeleteCandidate(null);
                  setIsDeleteDialogOpen(false);
                  toast({
                    title: 'Patient deleted',
                    description: `${name} was removed.`,
                    action: (
                      <ToastAction altText={`Undo delete ${deleted.name}`} onClick={() => {
                        addPatient({ ...deleted, id: deleted.id });
                        setLastDeleted(null);
                      }}>
                        Undo
                      </ToastAction>
                    ),
                    variant: 'destructive'
                  });
                } catch (err) {
                  console.error('Failed to delete patient', err);
                  toast({ title: 'Delete failed', description: 'Could not delete patient', variant: 'destructive' });
                }
              }} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit / Approve Patient Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setEditCandidate(null); } setIsEditDialogOpen(open); }}>
          <DialogContent className="w-[90vw] max-w-none bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
              <DialogTitle className="text-white text-xl">{editCandidate ? `✏️ Manage Patient - ${editCandidate.name}` : '👥 Patient Information'}</DialogTitle>
              <DialogDescription className="text-blue-100">Update patient medical and personal details</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {/* ROW 1: Name & DOB */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">👤 Full Name</Label>
                  <Input value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">📅 Date of Birth</Label>
                  <Input type="date" value={editForm.dob ?? ''} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10" />
                </div>
              </div>

              {/* ROW 2: Gender & Weight */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">⚧ Gender</Label>
                  <Select value={editForm.gender ?? 'other'} onValueChange={(v) => setEditForm({ ...editForm, gender: v as any })}>
                    <SelectTrigger className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">🧑 Male</SelectItem>
                      <SelectItem value="female">👩 Female</SelectItem>
                      <SelectItem value="other">⚧ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">⚖️ Weight (kg)</Label>
                  <Input type="number" value={editForm.weight ?? 0} onChange={(e) => setEditForm({ ...editForm, weight: parseFloat(e.target.value) || 0 })} className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10" />
                </div>
              </div>

              {/* ROW 3: Diagnosis & Acuity */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">🩺 Diagnosis</Label>
                  <Input value={editForm.diagnosis ?? ''} onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })} className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">🚨 Acuity Level</Label>
                  <Select value={editForm.acuityLevel ?? 'stable'} onValueChange={(v) => setEditForm({ ...editForm, acuityLevel: v as AcuityLevel })}>
                    <SelectTrigger className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10">
                      <SelectValue placeholder="Select acuity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="urgent">🟡 Urgent</SelectItem>
                      <SelectItem value="stable">🟢 Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ROW 4: Allergies */}
              <div className="space-y-2">
                <Label className="font-semibold">🧬 Allergies</Label>
                <Textarea value={editForm.allergies ?? ''} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-20 resize-none" />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 pt-6 border-t mt-8">
                <Button
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-base rounded-lg transition"
                  onClick={() => {
                    if (!editForm.name || !editForm.dob) {
                      toast({ title: 'Validation', description: 'Name and DOB are required', variant: 'destructive' });
                      return;
                    }
                    try {
                      const updated = { ...editCandidate, ...editForm };
                      updatePatient(updated);
                      // ensure recent list reflects edits
                      setRecentPatients(prev => {
                        const exists = prev.some(p => p.id === updated.id);
                        if (exists) return prev.map(p => p.id === updated.id ? updated : p);
                        return [updated, ...prev].slice(0, 5);
                      });
                      toast({ title: '✅ Success', description: `${updated.name} has been updated.`, variant: 'default' });
                      setIsEditDialogOpen(false);
                      setEditCandidate(null);
                    } catch (err) {
                      console.error('Update failed', err);
                      toast({ title: '❌ Error', description: 'Could not update patient', variant: 'destructive' });
                    }
                  }}
                >
                  💾 Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditCandidate(null);
                  }}
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign to Hospital Dialog - Hidden, Functionality  Below*/}
        <Dialog open={dialog.isOpen && dialog.mode === 'Assign'} onOpenChange={(open) => {
          if (!open) setDialog({ mode: 'Add', isOpen: false });
          else setDialog({ mode: 'Assign', isOpen: true });
        }}>
          <DialogContent>
            {/* ASSIGN FORM */}
          </DialogContent>
        </Dialog>

        {/* Approve / Assign Patient Button */}
        {editCandidate && (
          <div className="flex gap-4 pt-6 border-t mt-8">
            <Button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition" onClick={() => {
              if (!editForm.name || !editForm.dob) {
                toast({ title: 'Validation', description: 'Name and DOB are required', variant: 'destructive' });
                return;
              }
              try {
                // Check if patient is already assigned to any hospital
                const isAlreadyAssigned = Object.values(hospitalPatients).some(patients => patients.includes(editForm.id));
                if (isAlreadyAssigned) {
                  toast({ title: 'Already Assigned', description: `${editForm.name} is already assigned to a hospital. One patient can only be assigned to one hospital.`, variant: 'destructive' });
                  return;
                }

                const updated = { ...editCandidate, ...editForm };
                updatePatient(updated);
                // mark approved
                setApprovedIds(prev => Array.from(new Set([updated.id, ...prev])).slice(0, 50));
                // ensure recent list reflects edits
                setRecentPatients(prev => {
                  const exists = prev.some(p => p.id === updated.id);
                  if (exists) return prev.map(p => p.id === updated.id ? updated : p);
                  return [updated, ...prev].slice(0, 5);
                });
                // fire event
                try { window.dispatchEvent(new CustomEvent('patient-approved', { detail: { id: updated.id } })); } catch (e) { }
                // open add to hospital dialog
                setApprovedPatientToAdd(updated);
                setSelectedHospitalId('');
                setIsAddToHospitalDialogOpen(true);
                setIsEditDialogOpen(false);
                setEditCandidate(null);
              } catch (err) {
                console.error('Approve failed', err);
                toast({ title: 'Error', description: 'Could not approve patient', variant: 'destructive' });
              }
            }}>
              Approve & Assign
            </Button>
            <Button variant="outline" className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => { setIsEditDialogOpen(false); setEditCandidate(null); }}>
              Cancel
            </Button>
          </div>
        )}

        {/* Add Patient to Hospital Dialog */}
        <Dialog open={isAddToHospitalDialogOpen} onOpenChange={(open) => { if (!open) { setApprovedPatientToAdd(null); setSelectedHospitalId(''); } setIsAddToHospitalDialogOpen(open); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add {approvedPatientToAdd?.name} to Hospital</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Hospital</Label>
                <Select value={selectedHospitalId} onValueChange={(v) => setSelectedHospitalId(v)}>
                  <SelectTrigger className="bg-white text-black border border-gray-300">
                    <SelectValue placeholder="Select a hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-white hover:bg-gray-100 text-black border border-gray-300" onClick={() => {
                  if (!selectedHospitalId) {
                    toast({ title: 'Validation', description: 'Please select a hospital', variant: 'destructive' });
                    return;
                  }
                  if (!approvedPatientToAdd) return;

                  try {
                    // Check if patient is already assigned to any hospital
                    const isAlreadyAssigned = Object.values(hospitalPatients).some(patients => patients.includes(approvedPatientToAdd.id));
                    if (isAlreadyAssigned) {
                      toast({ title: 'Already Assigned', description: `${approvedPatientToAdd.name} is already assigned to a hospital. One patient can only be assigned to one hospital.`, variant: 'destructive' });
                      return;
                    }

                    // Check if patient is already in this specific hospital
                    if (hospitalPatients[selectedHospitalId]?.includes(approvedPatientToAdd.id)) {
                      toast({ title: 'Duplicate', description: `${approvedPatientToAdd.name} is already in this hospital`, variant: 'destructive' });
                      return;
                    }

                    // Add patient to hospital
                    setHospitalPatients(prev => ({
                      ...prev,
                      [selectedHospitalId]: [...(prev[selectedHospitalId] || []), approvedPatientToAdd.id]
                    }));
                    const hospitalName = hospitals.find(h => h.id === selectedHospitalId)?.name || 'Hospital';
                    toast({
                      title: 'Success',
                      description: `${approvedPatientToAdd.name} assigned to ${hospitalName}.`,
                      variant: 'default'
                    });
                    setIsAddToHospitalDialogOpen(false);
                    setApprovedPatientToAdd(null);
                    setSelectedHospitalId('');
                  } catch (err) {
                    console.error('Failed to add patient to hospital', err);
                    toast({ title: 'Error', description: 'Could not assign patient to hospital', variant: 'destructive' });
                  }
                }}>Assign to Hospital</Button>
                <Button variant="outline" onClick={() => { setIsAddToHospitalDialogOpen(false); setApprovedPatientToAdd(null); setSelectedHospitalId(''); }}>Skip</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Table - Enhanced Design */}
        <div className="rounded-2xl border-2 border-gray-300 bg-white overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-50">
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">🏢 Hospital Name</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">📋 Level of Care</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">👤 Contact</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">📞 Phone</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">🛏️ ICU Beds</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">👥 Patients</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">⚙️ Actions</th>
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
                paginatedHospitals.map((hospital, idx) => (
                  <tr key={hospital.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200 group">
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-bold text-black text-base group-hover:text-gray-800">{hospital.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className="bg-white text-black border-2 border-gray-300 font-bold text-xs px-3 py-1">{hospital.levelOfCare}</Badge>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-gray-800">{hospital.contactPerson || '—'}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-gray-800">{hospital.phone || '—'}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-bold text-gray-800">{hospital.icuCapacity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        {hospitalPatients[hospital.id] && hospitalPatients[hospital.id].length > 0 ? (
                          <div className="space-y-2">
                            {hospitalPatients[hospital.id].map((patientId) => {
                              const patient = patients.find(p => p.id === patientId);
                              return patient ? (
                                <div key={patientId} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-300 text-xs">
                                  <div className="flex-1">
                                    <p className="font-medium text-black">{patient.name}</p>
                                    <p className="text-gray-600">{new Date(patient.dob).toLocaleDateString()}</p>
                                  </div>
                                  <Badge className={`text-xs text-black border ${patient.acuityLevel === 'critical' ? 'bg-white border-gray-600' : patient.acuityLevel === 'urgent' ? 'bg-white border-gray-500' : 'bg-white border-gray-300'}`}>
                                    {patient.acuityLevel}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-600"
                                    onClick={() => {
                                      setHospitalPatients(prev => ({
                                        ...prev,
                                        [hospital.id]: prev[hospital.id].filter(id => id !== patientId)
                                      }));
                                      toast({
                                        title: 'Success',
                                        description: `${patient.name} has been unassigned from ${hospital.name}`,
                                        variant: 'default'
                                      });
                                    }}
                                    title="Remove from hospital"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No patients assigned</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={() => handleOpenDialog('Edit', hospital)}>
                          <Edit className="h-4 w-4 text-gray-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Hospital</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete {hospital.name}? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(hospital.id)} className="bg-gray-600 hover:bg-gray-700">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {visible.length > itemsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-6 pb-8">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
            >
              Previous
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 p-0 font-bold ${currentPage === page
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
            >
              Next
            </Button>
          </div>
        )}

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
                  <div className="relative">
                    <MessageCircle className="h-6 w-6 text-white" />
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
    </Layout>
  );
};

export default Hospitals;
