import React, { useMemo, useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Patient, AcuityLevel, Hospital } from '@/types';
import { usePatients } from '@/contexts/PatientsContext';
import { Plus, Search, Filter, Edit, Trash2, Heart, Activity, User, Calendar, MapPin, Hash, Phone, AlertCircle, FileText, Download, MoreVertical, MessageCircle, X, Send, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, BarChart3, Users, CheckCircle2, Building2, Eye } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HospitalService } from '@/services/hospital.service';
import chatBotImage from '../emoji.jpeg';
const Patients = () => {
  const { patients, isLoading: patientsLoading, addPatient, removePatient, updatePatient } = usePatients();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInactivityTimer, setChatInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const CHAT_INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'bot'; text: string; timestamp: Date }>>([
    { id: '1', sender: 'bot', text: '👋 Welcome to Patient Management Assistant!\n\nI\'m your AI-powered healthcare companion. I can help you:\n\n📊 Analyze patient statistics\n🔴 Monitor critical cases\n🟡 Track urgent patients\n🟢 View stable patients\n👥 Get patient demographics\n🩺 Review diagnoses\n➕ Add new patients\n⚠️ Get clinical recommendations\n\nWhat would you like to know?', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [form, setForm] = useState<{
    name?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    weight?: number;
    diagnosis?: string;
    acuity_level?: AcuityLevel;
    blood_group?: string;
    allergies?: string;
    vitals?: string;
    specialEquipment?: string[];
    hospital_id?: string;
  }>({
    name: '',
    dob: '',
    gender: 'other',
    weight: 0,
    diagnosis: '',
    acuity_level: 'stable',
    blood_group: 'O+',
    allergies: '',
    vitals: '',
    hospital_id: 'no_hospital',
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const params = useParams();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'stable' | 'urgent' | 'critical'>('all');
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isLoading = patientsLoading || hospitalsLoading;

  const fetchHospitals = async () => {
    setHospitalsLoading(true);
    try {
      const data = await HospitalService.getHospitals();
      setHospitals(data);
    } catch (error) {
      console.error("Failed to fetch hospitals", error);
    } finally {
      setHospitalsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    const id = params['id'];
    if (id) {
      const match = patients.find(p => p.id === id);
      if (match) setSelectedPatient(match);
    }
  }, [params, patients]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Filter Logic
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter(p => {
      const matchesGender = genderFilter === 'all' || (p.gender || 'other').toLowerCase() === genderFilter;
      const matchesStatus = statusFilter === 'all' || (p.acuity_level || 'stable').toLowerCase() === statusFilter;
      const matchesSearch = !searchTerm ||
        (p.full_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.patient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGender && matchesStatus && matchesSearch;
    });
  }, [patients, genderFilter, statusFilter, searchTerm]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [genderFilter, statusFilter, searchTerm, itemsPerPage]);



  // Chat inactivity timer
  useEffect(() => {
    if (!isChatOpen) return;

    const resetInactivityTimer = () => {
      if (chatInactivityTimer) clearTimeout(chatInactivityTimer);
      const timer = setTimeout(() => {
        if (isChatOpen) {
          setIsChatOpen(false);
          toast({ title: '⏱️ Chat Closed', description: 'Chat closed due to inactivity.' });
        }
      }, CHAT_INACTIVITY_TIME);
      setChatInactivityTimer(timer);
    };

    const handleActivity = () => resetInactivityTimer();
    resetInactivityTimer();

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('click', handleActivity);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('click', handleActivity);
      if (chatInactivityTimer) clearTimeout(chatInactivityTimer);
    };
  }, [isChatOpen, chatInactivityTimer, CHAT_INACTIVITY_TIME]);

  const summaryStats = useMemo(() => {
    const total = patients.length;
    const critical = patients.filter(p => p.acuity_level === 'critical').length;
    const urgent = patients.filter(p => p.acuity_level === 'urgent').length;
    const stable = patients.filter(p => p.acuity_level === 'stable').length;

    // Gender stats for filter labels
    const male = patients.filter(p => (p.gender || 'other').toLowerCase() === 'male').length;
    const female = patients.filter(p => (p.gender || 'other').toLowerCase() === 'female').length;
    const other = total - male - female;

    return { total, critical, urgent, stable, male, female, other };
  }, [patients]);

  const getAcuityColor = (acuity: AcuityLevel) => {
    const colors: Record<AcuityLevel, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      urgent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      stable: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[acuity] || colors.stable;
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;

    // Add user message
    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);

    // Generate intelligent bot response with proper analysis
    setTimeout(() => {
      let botResponse = '';
      const lowerInput = chatInput.toLowerCase().trim();

      // Analysis helpers
      const criticalPatients = patients.filter(p => p.acuity_level === 'critical');
      const urgentPatients = patients.filter(p => p.acuity_level === 'urgent');
      const stablePatients = patients.filter(p => p.acuity_level === 'stable');
      const totalPatients = patients.length;

      const getAverageAge = () => {
        if (totalPatients === 0) return 0;
        return Math.round(patients.reduce((sum, p) => sum + (new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear()), 0) / totalPatients);
      };

      // Keyword matching with better logic
      if (!patients || patients.length === 0) {
        if (lowerInput.includes('add') || lowerInput.includes('new')) {
          botResponse = '➕ **Getting Started**\n\nNo patients in the system yet!\n\nClick the "➕ Add Patient" button to add your first patient. You\'ll need:\n• Full Name\n• Date of Birth\n• Gender\n• Diagnosis\n• Acuity Level\n\nLet\'s get started! 🚀';
        } else {
          botResponse = '📋 **No Patients Yet**\n\nThe system is currently empty. Let\'s add your first patient!\n\n👉 Click "➕ Add Patient" to begin.\n\nOnce patients are added, I can help you with:\n✓ View statistics\n✓ Monitor critical cases\n✓ Analyze trends';
        }
      } else if (lowerInput.includes('summary') || lowerInput.includes('overview') || lowerInput === 'hi' || lowerInput === 'hello') {
        const criticalPercent = Math.round((criticalPatients.length / totalPatients) * 100);
        const urgentPercent = Math.round((urgentPatients.length / totalPatients) * 100);
        const stablePercent = Math.round((stablePatients.length / totalPatients) * 100);
        botResponse = `📊 **Patient Overview**\n\nTotal Patients: ${totalPatients}\n\n🔴 Critical: ${criticalPatients.length} (${criticalPercent}%)\n🟡 Urgent: ${urgentPatients.length} (${urgentPercent}%)\n🟢 Stable: ${stablePatients.length} (${stablePercent}%)\n\nAverage Age: ${getAverageAge()} years\n\n${criticalPatients.length > 0 ? '⚠️ ALERT: Critical patients need immediate attention!' : '✅ All patients stable!'}`;
      } else if (lowerInput.includes('critical')) {
        if (criticalPatients.length === 0) {
          botResponse = '✅ **Great News!**\n\nNo critical patients at the moment. The system is running smoothly! 🎉';
        } else {
          botResponse = `🔴 **CRITICAL ALERT** (${criticalPatients.length} patients)\n\n${criticalPatients.map((p, i) => `${i + 1}. ${p.full_name || p.name}\n   Age: ${new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear()} years\n   Diagnosis: ${p.diagnosis || 'Not specified'}`).join('\n\n')}\n\n⚠️ Immediate medical intervention required!`;
        }
      } else if (lowerInput.includes('urgent')) {
        if (urgentPatients.length === 0) {
          botResponse = '✅ **No Urgent Cases**\n\nThere are currently no urgent patients. System status: Normal ✓';
        } else {
          botResponse = `🟡 **Urgent Cases** (${urgentPatients.length} patients)\n\n${urgentPatients.map((p, i) => `${i + 1}. ${p.name} - ${p.diagnosis || 'No diagnosis'}`).join('\n')}\n\n⏰ Requires attention soon!`;
        }
      } else if (lowerInput.includes('stable')) {
        if (stablePatients.length === 0) {
          botResponse = '📋 No stable patients currently.';
        } else {
          botResponse = `🟢 **Stable Patients** (${stablePatients.length} total)\n\n${stablePatients.slice(0, 8).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}${stablePatients.length > 8 ? `\n... and ${stablePatients.length - 8} more` : ''}\n\n✓ All stable patients under observation`;
        }
      } else if (lowerInput.includes('age') || lowerInput.includes('demographic')) {
        const ages = patients.map(p => new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear());
        const oldest = Math.max(...ages);
        const youngest = Math.min(...ages);
        botResponse = `👥 **Demographic Analysis**\n\nTotal Patients: ${totalPatients}\nAverage Age: ${getAverageAge()} years\nYoungest: ${youngest} years\nOldest: ${oldest} years\n\nAge Range: ${oldest - youngest} years`;
      } else if (lowerInput.includes('diagnosis') || lowerInput.includes('condition')) {
        const diagnoses = [...new Set(patients.map(p => p.diagnosis).filter(d => d))];
        if (diagnoses.length === 0) {
          botResponse = '📋 No diagnoses recorded yet.';
        } else {
          botResponse = `🩺 **Active Diagnoses** (${diagnoses.length} types)\n\n${diagnoses.slice(0, 10).map((d, i) => `${i + 1}. ${d}`).join('\n')}${diagnoses.length > 10 ? `\n... and ${diagnoses.length - 10} more` : ''}`;
        }
      } else if (lowerInput.includes('add') || lowerInput.includes('new') || lowerInput.includes('create')) {
        botResponse = `➕ **How to Add a Patient**\n\n1️⃣ Click "➕ Add Patient" button (top right)\n2️⃣ Fill in patient details:\n   • Full Name *\n   • Date of Birth *\n   • Gender\n   • Weight\n   • Diagnosis\n   • Acuity Level\n   • Allergies\n\n3️⃣ Click "Add Patient" to save\n\n✓ Patient will appear in the list!`;
      } else if (lowerInput.includes('recommend') || lowerInput.includes('suggest') || lowerInput.includes('action')) {
        if (criticalPatients.length > 0) {
          botResponse = `⚠️ **Clinical Recommendation**\n\n🔴 PRIORITY: ${criticalPatients.length} critical patient(s)\n\nImmediate Actions:\n1. Review: ${criticalPatients.map(p => p.name).join(', ')}\n2. Check vitals and diagnosis\n3. Consider emergency transfer\n4. Notify medical team\n\n🚁 This requires immediate attention!`;
        } else if (urgentPatients.length > 0) {
          botResponse = `⚡ **Recommendation**\n\n🟡 ${urgentPatients.length} urgent patient(s) need review\n\nSuggested Actions:\n✓ Schedule consultations\n✓ Review treatment plans\n✓ Monitor progress\n✓ Plan follow-ups`;
        } else {
          botResponse = `✅ **System Status: OPTIMAL**\n\nAll patients stable ✓\n\nRecommendations:\n• Continue routine check-ups\n• Monitor vital signs regularly\n• Schedule follow-up appointments\n• Maintain patient records`;
        }
      } else if (lowerInput.includes('statistics') || lowerInput.includes('stats') || lowerInput.includes('report')) {
        botResponse = `📊 **Comprehensive Report**\n\n**Patient Count:**\nTotal: ${totalPatients}\nCritical: ${criticalPatients.length}\nUrgent: ${urgentPatients.length}\nStable: ${stablePatients.length}\n\n**Percentages:**\nCritical: ${totalPatients > 0 ? Math.round((criticalPatients.length / totalPatients) * 100) : 0}%\nUrgent: ${totalPatients > 0 ? Math.round((urgentPatients.length / totalPatients) * 100) : 0}%\nStable: ${totalPatients > 0 ? Math.round((stablePatients.length / totalPatients) * 100) : 0}%\n\n**Demographics:**\nAverage Age: ${getAverageAge()} years`;
      } else if (lowerInput.includes('help') || lowerInput.includes('what can')) {
        botResponse = `💡 **I Can Help With:**\n\n📊 ANALYTICS\n• Patient overview & summary\n• Statistics & reports\n• Demographic analysis\n\n🔍 SEARCH\n• Find critical patients\n• Find urgent patients\n• Find stable patients\n• View diagnoses\n\n➕ MANAGEMENT\n• Add new patients\n• Guidance on patient records\n\n⚠️ ALERTS\n• Critical case alerts\n• Recommendations\n• Clinical insights\n\nTry asking: "Show critical patients" or "Patient summary"`;
      } else if (lowerInput.includes('thank')) {
        botResponse = '😊 You\'re welcome! I\'m here 24/7 to help with patient management. Feel free to ask anything! 🏥';
      } else if (lowerInput.includes('status') || lowerInput.includes('how is')) {
        botResponse = `⚕️ **System Status**\n\n✅ System: OPERATIONAL\n👥 Patients: ${totalPatients}\n🔴 Critical: ${criticalPatients.length}\n🟡 Urgent: ${urgentPatients.length}\n🟢 Stable: ${stablePatients.length}\n\n${criticalPatients.length > 0 ? '⚠️ ACTION REQUIRED: Critical cases detected' : '✓ All clear - System running smoothly'}`;
      } else {
        botResponse = `👨‍⚕️ **I understand you're asking:** "${chatInput}"\n\n**What I can help with:**\n✓ Patient statistics\n✓ Critical/Urgent/Stable lists\n✓ Age & demographic data\n✓ Diagnosis information\n✓ Clinical recommendations\n✓ How to add patients\n✓ System status\n\nTry: "Show summary" or "Critical patients"`;
      }

      const botMsg = { id: (Date.now() + 1).toString(), sender: 'bot' as const, text: botResponse, timestamp: new Date() };
      setChatMessages(prev => [...prev, botMsg]);
    }, 700);

    setChatInput('');
  };



  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Analytics Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group" title="View Patient Analytics">
            <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Analytics Summary</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Real-time Metrics</span>
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
                <span className="text-[8px] text-slate-400 font-bold uppercase">Active</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl transition-all hover:border-rose-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="h-3 w-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Critical</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600 tracking-tighter">{summaryStats.critical}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase font-black italic">Crit</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl transition-all hover:border-amber-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Heart className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Urgent</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600 tracking-tighter">{summaryStats.urgent}</span>
                <span className="text-[8px] text-amber-400 font-bold uppercase font-black italic">Urg</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:border-emerald-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Stable</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600 tracking-tighter">{summaryStats.stable}</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase font-black italic">Stab</span>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/avatars/male.png" alt="Male" className="h-5 w-5 rounded-full object-cover border border-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Male Group</span>
              </div>
              <span className="text-sm font-black text-blue-600">{summaryStats.male}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/avatars/female.png" alt="Female" className="h-5 w-5 rounded-full object-cover border border-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Female Group</span>
              </div>
              <span className="text-sm font-black text-rose-600">{summaryStats.female}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Unified Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center justify-center h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative" title="Filters">
            <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${(genderFilter !== 'all' || statusFilter !== 'all') ? 'text-blue-600' : 'text-slate-500'}`} />
            {(genderFilter !== 'all' || statusFilter !== 'all') && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                {(genderFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
            Details & Filtering
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <DropdownMenuItem
            onClick={() => { setGenderFilter('all'); setStatusFilter('all'); }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${genderFilter === 'all' && statusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">All Patients</span>
            </div>
            <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">
              {summaryStats.total}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acuity Status</span>
          </div>

          <DropdownMenuItem
            onClick={() => setStatusFilter('critical')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${statusFilter === 'critical' ? 'bg-red-50 text-red-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold uppercase tracking-wide">Critical</span>
            </div>
            <span className="text-[10px] font-black bg-red-100/50 px-1.5 py-0.5 rounded-md text-red-600">
              {summaryStats.critical}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setStatusFilter('urgent')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${statusFilter === 'urgent' ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wide">Urgent</span>
            </div>
            <span className="text-[10px] font-black bg-amber-100/50 px-1.5 py-0.5 rounded-md text-amber-600">
              {summaryStats.urgent}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setStatusFilter('stable')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${statusFilter === 'stable' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wide">Stable</span>
            </div>
            <span className="text-[10px] font-black bg-emerald-100/50 px-1.5 py-0.5 rounded-md text-emerald-600">
              {summaryStats.stable}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Demographics</span>
          </div>

          <DropdownMenuItem
            onClick={() => setGenderFilter('male')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${genderFilter === 'male' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <img src="/avatars/male.png" alt="Male" className="h-5 w-5 rounded-full object-cover border border-slate-200" />
              <span className="text-xs font-bold uppercase tracking-wide">Male</span>
            </div>
            <span className="text-[10px] font-black bg-blue-100/50 px-1.5 py-0.5 rounded-md text-blue-600">
              {summaryStats.male}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setGenderFilter('female')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${genderFilter === 'female' ? 'bg-rose-50 text-rose-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <img src="/avatars/female.png" alt="Female" className="h-5 w-5 rounded-full object-cover border border-slate-200" />
              <span className="text-xs font-bold uppercase tracking-wide">Female</span>
            </div>
            <span className="text-[10px] font-black bg-rose-100/50 px-1.5 py-0.5 rounded-md text-rose-600">
              {summaryStats.female}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search Patients by Name or ID..."
          className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl text-xs font-medium"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 group"
            onClick={() => { setForm({}); setIsDialogOpen(true); }}
          >
            <Plus className="h-4 w-4 stroke-[3px] group-hover:rotate-90 transition-transform" />
            Add Patient
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
            <DialogTitle className="text-white text-xl">➕ Add New Patient</DialogTitle>
            <DialogDescription className="text-blue-100">Enter patient medical information</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* ROW 1: Basics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold">👤 Full Name *</Label>
                <Input placeholder="Full Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">📅 DOB *</Label>
                <Input type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">⚧ Gender</Label>
                <Select value={form.gender || 'other'} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">🧑 Male</SelectItem>
                    <SelectItem value="female">👩 Female</SelectItem>
                    <SelectItem value="other">⚧ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">⚖️ Weight (kg)</Label>
                <Input type="number" placeholder="kg" value={form.weight as number | undefined} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} className="h-9" />
              </div>
            </div>

            {/* ROW 2: Medical */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold">🩸 Blood Group</Label>
                <Select value={form.blood_group || 'O+'} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="font-semibold">🩺 Diagnosis</Label>
                <Input placeholder="Diagnosis" value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">🚨 Acuity</Label>
                <Select value={form.acuity_level || 'stable'} onValueChange={(v) => setForm({ ...form, acuity_level: v as AcuityLevel })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Acuity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="urgent">🟡 Urgent</SelectItem>
                    <SelectItem value="stable">🟢 Stable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 3: Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold">🧬 Allergies</Label>
                <Input placeholder="Allergies (comma separated)" value={form.allergies || ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">💓 Current Vitals</Label>
                <Input placeholder="BP, HR, SpO2..." value={form.vitals || ''} onChange={(e) => setForm({ ...form, vitals: e.target.value })} className="h-9" />
              </div>
            </div>

            {/* ROW 4: Hospital Assignment */}
            <div className="space-y-1.5">
              <Label className="font-semibold">🏥 Assigned Hospital</Label>
              <Select value={form.hospital_id || 'no_hospital'} onValueChange={(v) => setForm({ ...form, hospital_id: v })}>
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="Select a hospital to assign..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_hospital">None (Not Assigned)</SelectItem>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id} disabled={(h.icuCapacity - (h.occupiedBeds || 0)) <= 0}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span>{h.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-1">{h.levelOfCare}</Badge>
                        <span className={`text-[10px] font-bold ml-auto ${(h.icuCapacity - (h.occupiedBeds || 0)) <= 2 ? 'text-red-500' : 'text-green-600'}`}>
                          Available: {h.icuCapacity - (h.occupiedBeds || 0)} Seats
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* ACTION BUTTONS */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition"
                onClick={async () => {
                  if (!form.name || !form.dob) {
                    toast({ title: 'Validation', description: 'Name and DOB are required', variant: 'destructive' });
                    return;
                  }
                  try {
                    const payload: any = {
                      full_name: form.name as string,
                      date_of_birth: form.dob as string,
                      gender: (form.gender as any) || 'other',
                      weight_kg: (form.weight as number) || 70, // Default weight
                      diagnosis: form.diagnosis || 'Not specified',
                      acuity_level: (form.acuity_level as AcuityLevel) || 'stable',
                      blood_group: form.blood_group || 'O+',
                      allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
                      current_vitals: {
                        heart_rate: 80,
                        blood_pressure: "120/80",
                        oxygen_saturation: 98,
                        temperature: 37.0,
                        respiratory_rate: 16
                      },
                      special_equipment_needed: [],
                      insurance_details: {
                        provider: "N/A",
                        policy_number: "N/A",
                        group_number: "N/A",
                        verification_status: "pending"
                      },
                      next_of_kin: {
                        name: "N/A",
                        relationship: "N/A",
                        phone: "N/A",
                        email: "na@example.com"
                      },
                      assigned_hospital_id: form.hospital_id === 'no_hospital' ? undefined : form.hospital_id
                    };

                    const p = await addPatient(payload);

                    // Refresh hospitals from server to get accurate occupancy from backend
                    fetchHospitals();

                    toast({ title: '✅ Patient Added', description: `${p.full_name || p.name} was successfully added.`, variant: 'default' });
                    setIsDialogOpen(false);
                  } catch (error) {
                    toast({ title: '❌ Error', description: 'Failed to add patient.', variant: 'destructive' });
                  }
                }}
              >
                💾 Save Patient
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50"
                onClick={() => setIsDialogOpen(false)}
              >
                ❌ Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Layout headerActions={headerActions} subTitle="Management System">
      <div className="space-y-6">

        {/* Patients Table Content */}
        {/* Selected patient detail dialog (opens when navigating to /patients/:id) */}
        <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => { if (!open) { setSelectedPatient(null); navigate('/patients'); } }}>
          <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
              <DialogTitle className="text-white text-xl">Patient Details - {selectedPatient?.full_name || selectedPatient?.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-black">
              {selectedPatient && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient ID</p>
                      <p className="text-lg font-medium">{selectedPatient.patient_id || selectedPatient.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="text-lg font-medium">{selectedPatient.dob ? format(new Date(selectedPatient.dob), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="text-lg font-medium capitalize">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="text-lg font-medium">{selectedPatient.weight || selectedPatient.weight_kg} kg</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="text-lg font-medium">{selectedPatient.diagnosis}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-xl">
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#f8fafc] border-b border-slate-200">
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Patient Name</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Age</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Diagnosis</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Acuity</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Hospital</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-black text-xs uppercase tracking-widest">
                      No patients found in system
                    </td>
                  </tr>
                ) : (
                  currentItems.map((patient) => {
                    const age = new Date().getFullYear() - new Date(patient.date_of_birth || patient.dob || Date.now()).getFullYear();
                    const isExpanded = expandedRowId === patient.id;

                    return (
                      <React.Fragment key={patient.id}>
                        <tr
                          className={`border-b hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-purple-100 bg-gradient-to-tr from-purple-200 via-purple-100 to-purple-50 shadow-sm shrink-0">
                                <AvatarImage
                                  src={(patient.gender?.toLowerCase() === 'male') ? '/avatars/male.png' : (patient.gender?.toLowerCase() === 'female') ? '/avatars/female.png' : ''}
                                  alt="Patient"
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-purple-50 text-purple-600 font-bold">
                                  {patient.name?.split(' ')[0][0] ?? 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <p
                                  className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-all leading-tight text-base"
                                  onClick={() => setExpandedRowId(isExpanded ? null : patient.id)}
                                >
                                  {patient.name}
                                </p>
                                <p className="text-[11px] font-medium text-slate-500 tracking-tight">{patient.patient_id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-sm">{age}</td>
                          <td className="px-6 py-4 text-sm">{patient.diagnosis}</td>

                          <td className="px-6 py-2.5">
                            <Badge className={getAcuityColor(patient.acuity_level)}>
                              {patient.acuity_level}
                            </Badge>
                          </td>

                          <td className="px-6 py-4 text-sm font-medium">
                            {patient.assigned_hospital_id ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 text-blue-700">
                                  <Building2 className="h-3.5 w-3.5" />
                                  <span className="truncate max-w-[180px]">
                                    {hospitals.find(h => h.id === patient.assigned_hospital_id)?.name || 'Assigned'}
                                  </span>
                                </div>
                                {hospitals.find(h => h.id === patient.assigned_hospital_id) && (
                                  <p className="text-[10px] text-slate-500 font-normal ml-5">
                                    {Math.max(0, (hospitals.find(h => h.id === patient.assigned_hospital_id)!.icuCapacity || 0) - (hospitals.find(h => h.id === patient.assigned_hospital_id)!.occupiedBeds || 0))} Seats Available
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Not Assigned</span>
                            )}
                          </td>

                          <td className="px-6 py-2.5">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={() => setSelectedPatient(patient)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={() => {
                                  setEditingPatientId(patient.id);
                                  setForm({
                                    name: patient.full_name || patient.name,
                                    dob: patient.date_of_birth || patient.dob,
                                    gender: patient.gender,
                                    weight: patient.weight_kg || patient.weight,
                                    diagnosis: patient.diagnosis,
                                    acuity_level: patient.acuity_level,
                                    blood_group: patient.blood_group,
                                    allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies || '',
                                    vitals: patient.current_vitals ? JSON.stringify(patient.current_vitals) : '',
                                    hospital_id: patient.assigned_hospital_id || 'no_hospital',
                                  });
                                  setIsEditOpen(true);
                                }}
                                title="Edit Patient"
                              >
                                <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                onClick={async () => {
                                  try {
                                    await removePatient(patient.id);
                                    toast({
                                      title: "🗑️ Patient Deleted",
                                      description: "The record has been permanently removed.",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "❌ Error",
                                      description: "Failed to delete patient.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                title="Delete Record"
                              >
                                <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-blue-50/20 border-b">
                            <td colSpan={6} className="px-10 py-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Column 1: Medical Details */}
                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                    <Activity className="h-3 w-3" /> Medical Status
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-[10px] text-gray-500 uppercase">Blood Group</p>
                                        <p className="text-sm font-semibold">{patient.blood_group || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-gray-500 uppercase">Heart Rate</p>
                                        <p className="text-sm font-semibold">{patient.current_vitals?.heart_rate || '--'} bpm</p>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-[10px] text-gray-500 uppercase">Blood Pressure</p>
                                        <p className="text-sm font-semibold">{patient.current_vitals?.blood_pressure || '--/--'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-gray-500 uppercase">SpO2</p>
                                        <p className="text-sm font-semibold">{patient.current_vitals?.oxygen_saturation || '--'}%</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-blue-100/50">
                                    <p className="text-[10px] text-gray-500 uppercase mb-1">Allergies</p>
                                    <div className="flex flex-wrap gap-1">
                                      {patient.allergies && patient.allergies.length > 0 ? (
                                        patient.allergies.map(allergy => (
                                          <Badge key={allergy} variant="outline" className="text-[10px] py-0 h-5 bg-white border-red-100 text-red-700">
                                            {allergy}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-400">None reported</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2: Insurance & Billing */}
                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                    <FileText className="h-3 w-3" /> Insurance & Records
                                  </h4>
                                  <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-100/50 shadow-sm">
                                    <div>
                                      <p className="text-[10px] text-gray-500 uppercase">Provider</p>
                                      <p className="text-sm font-semibold text-blue-900">{patient.insurance_details?.provider || 'Self Pay'}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500">Policy #:</span>
                                      <span className="font-mono">{patient.insurance_details?.policy_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500">Status:</span>
                                      <Badge variant="secondary" className="text-[9px] py-0 h-4 bg-blue-100 text-blue-800">
                                        {patient.insurance_details?.verification_status || 'Pending'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="pt-2">
                                    <p className="text-[10px] text-gray-500 uppercase mb-1">Special Equipment</p>
                                    <p className="text-xs text-gray-600 italic">
                                      {patient.special_equipment_needed && patient.special_equipment_needed.length > 0
                                        ? patient.special_equipment_needed.join(', ')
                                        : 'No special equipment required'}
                                    </p>
                                  </div>
                                </div>

                                {/* Column 3: Emergency Contact */}
                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> Next of Kin
                                  </h4>
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-gray-100 p-2 rounded-full">
                                        <User className="h-4 w-4 text-gray-500" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900">{patient.next_of_kin?.name || 'No contact listed'}</p>
                                        <p className="text-[10px] text-gray-500">{patient.next_of_kin?.relationship || 'Emergency Contact'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <div className="bg-gray-100 p-2 rounded-full">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700">{patient.next_of_kin?.phone || 'No phone provided'}</p>
                                        <p className="text-[10px] text-gray-500">Primary Phone</p>
                                      </div>
                                    </div>
                                    <div className="p-2 mt-2 bg-yellow-50 rounded border border-yellow-100">
                                      <p className="text-[9px] text-yellow-800 font-bold uppercase tracking-tighter">Medical Alert</p>
                                      <p className="text-[10px] text-yellow-700 leading-tight">Patient requires stabilization before high-altitude transport.</p>
                                    </div>
                                  </div>
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
          <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="h-9 w-20 bg-white border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {[5, 10, 25, 50].map(val => (
                      <SelectItem key={val} value={val.toString()} className="text-xs font-black text-slate-600">{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPatients.length)} <span className="text-slate-300 mx-1">/</span> {filteredPatients.length} Patients
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="bg-white border-2 border-blue-100 px-4 py-1.5 rounded-xl shadow-inner mx-1">
                <span className="text-xs font-black text-blue-600 uppercase tracking-tight">
                  Page {currentPage} <span className="text-blue-200 mx-1.5">OF</span> {totalPages || 1}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* EDIT DIALOG MOVED OUTSIDE LOOP */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditingPatientId(null); }}>
          <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
              <DialogTitle className="text-white text-xl">✏️ Edit Patient</DialogTitle>
              <DialogDescription className="text-blue-100">Update patient medical information</DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-black">
              {/* ROW 1: Basics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">👤 Full Name</Label>
                  <Input
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">📅 DOB</Label>
                  <Input
                    type="date"
                    value={form.dob || ""}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">⚧ Gender</Label>
                  <Select value={form.gender || "other"} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">🧑 Male</SelectItem>
                      <SelectItem value="female">👩 Female</SelectItem>
                      <SelectItem value="other">⚧ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">⚖️ Weight (kg)</Label>
                  <Input
                    type="number"
                    value={form.weight || 0}
                    onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
              </div>

              {/* ROW 2: Medical */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">🩸 Blood Group</Label>
                  <Select value={form.blood_group || 'O+'} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="font-semibold">🩺 Diagnosis</Label>
                  <Input
                    value={form.diagnosis || ""}
                    onChange={(e) =>
                      setForm({ ...form, diagnosis: e.target.value })
                    }
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">🚨 Acuity</Label>
                  <Select
                    value={form.acuity_level || "stable"}
                    onValueChange={(v) =>
                      setForm({ ...form, acuity_level: v as AcuityLevel })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Acuity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="urgent">🟡 Urgent</SelectItem>
                      <SelectItem value="stable">🟢 Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ROW 3: Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">🧬 Allergies</Label>
                  <Input
                    placeholder="Allergies (comma separated)"
                    value={form.allergies || ""}
                    onChange={(e) =>
                      setForm({ ...form, allergies: e.target.value })
                    }
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">💓 Vitals</Label>
                  <Input
                    placeholder="BP, HR, SpO2..."
                    value={form.vitals || ""}
                    onChange={(e) =>
                      setForm({ ...form, vitals: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
              </div>

              {/* ROW 4: Hospital Assignment */}
              <div className="space-y-1.5">
                <Label className="font-semibold">🏥 Assigned Hospital</Label>
                <Select value={form.hospital_id || 'no_hospital'} onValueChange={(v) => setForm({ ...form, hospital_id: v })}>
                  <SelectTrigger className="h-10 border-gray-300">
                    <SelectValue placeholder="Select a hospital to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_hospital">None (Not Assigned)</SelectItem>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id} disabled={(h.icuCapacity - (h.occupiedBeds || 0)) <= 0 && h.id !== form.hospital_id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span>{h.name}</span>
                          <Badge variant="outline" className="text-[10px] ml-1">{h.levelOfCare}</Badge>
                          <span className={`text-[10px] font-bold ml-auto ${(h.icuCapacity - (h.occupiedBeds || 0)) <= 2 ? 'text-red-500' : 'text-green-600'}`}>
                            Available: {h.icuCapacity - (h.occupiedBeds || 0)} Seats
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SAVE */}
              <div className="flex gap-4 pt-6 border-t mt-8 text-black">
                <Button
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-base rounded-lg transition"
                  onClick={async () => {
                    if (!form.name || !form.dob) {
                      toast({
                        title: "Validation",
                        description: "Name and DOB are required",
                        variant: "destructive",
                      });
                      return;
                    }
                    try {
                      if (!editingPatientId) return;

                      const payload: any = {
                        full_name: form.name,
                        date_of_birth: form.dob,
                        gender: form.gender,
                        weight_kg: form.weight,
                        diagnosis: form.diagnosis || 'Undiagnosed',
                        acuity_level: form.acuity_level,
                        blood_group: form.blood_group || 'O+',
                        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
                        current_vitals: {
                          // defaulting for update as well if empty/string
                          heart_rate: 80,
                          blood_pressure: "120/80"
                        },
                        // Handle update logic properly, partial updates might be safer but replacing for now
                        insurance_details: { provider: "N/A", policy_number: "N/A" },
                        next_of_kin: { name: "N/A", relationship: "N/A", phone: "N/A" },
                        assigned_hospital_id: form.hospital_id === 'no_hospital' ? null : form.hospital_id
                      };

                      const oldPatient = patients.find(p => p.id === editingPatientId);
                      const oldHospitalId = oldPatient?.assigned_hospital_id;
                      const newHospitalId = form.hospital_id === 'no_hospital' ? null : form.hospital_id;

                      await updatePatient(editingPatientId, payload);

                      // Refresh hospitals from server to get accurate occupancy from backend
                      fetchHospitals();

                      toast({
                        title: "✅ Patient Updated",
                        description: `${form.name} was successfully updated.`,
                      });
                      setIsEditOpen(false);
                      setEditingPatientId(null);
                    } catch (error) {
                      toast({
                        title: "❌ Error",
                        description: "Failed to update patient.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  💾 Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50 bg-white"
                  onClick={() => { setIsEditOpen(false); setEditingPatientId(null); }}
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div >

      {/* Chatbot Floating Button */}
      {
        !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            title="Open Patient AI Assistant"
            aria-label="Open Patient AI Assistant"
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all bg-transparent border-4 border-white animate-bounce overflow-hidden"
          >
            <img src={chatBotImage} alt="Chatbot" className="w-full h-full object-cover" />
          </button>
        )
      }

      {/* Chatbot Window - Enhanced UI */}
      {
        isChatOpen && (
          <div
            className="fixed bottom-8 right-8 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border-2 border-blue-600 flex flex-col z-40 overflow-hidden"
          >
            {/* Chat Header - Enhanced */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-inner flex-shrink-0">
                  <img src={chatBotImage} alt="AI Assistant" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">🤖 AI Medical Assistant</h3>
                  <p className="text-xs text-blue-100">💙 Always available</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} title="Close chat" aria-label="Close chat" className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages - Scrollable with better styling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-200 scroll-smooth">
              {chatMessages.map((msg, idx) => (
                <div key={msg.id} className={`flex gap-2 animate-fadeIn ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-sm font-bold">🤖</span>
                    </div>
                  )}
                  <div className={`max-w-xs px-4 py-2.5 rounded-lg whitespace-pre-wrap break-words text-sm leading-relaxed shadow-md font-medium ${msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border-2 border-gray-300 text-gray-800 rounded-bl-none'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input - Enhanced */}
            <div className="border-t-2 border-gray-200 p-3 bg-white flex gap-2 rounded-b-2xl">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 placeholder-gray-500 font-medium"
              />
              <button
                onClick={handleChatSend}
                title="Send message"
                aria-label="Send message"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2.5 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-blue-600 font-bold"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      }
    </Layout >
  );
};

export default Patients;
