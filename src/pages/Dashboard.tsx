import React, { useState, useRef, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import chatBotImage from '../emoji.jpeg';
import Avatar from '@/components/Avatar';
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  MessageCircle,
  Send,
  AlertCircle,
  Clock,
  TrendingUp,
  Activity,
  Eye,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Plane,
  Calendar,
  BarChart3,
  MapPin,
  User,
  Plus,
  Filter,
  Search,
  Building2,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

const KpiCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) => (
  <Card className="border-slate-200 shadow-none rounded-lg bg-white">
    <CardContent className="p-4 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start gap-2">
        <p className="text-[12px] font-medium text-slate-500 leading-tight">{title}</p>
        <div className="text-slate-400 shrink-0">{icon}</div>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

// Chatbot Component
type Msg = { sender: "bot" | "user"; text: string };

interface ChatbotProps {
  stats: DashboardStats | null;
  bookings: any[];
  totalRevenue: number;
}

const Chatbot: React.FC<ChatbotProps> = ({ stats, bookings, totalRevenue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Inactivity timer effect for auto-close
  useEffect(() => {
    if (!isOpen) return;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      const timer = setTimeout(() => {
        if (isOpen) {
          setIsOpen(false);
        }
      }, INACTIVITY_TIME);
      setInactivityTimer(timer);
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
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [isOpen, inactivityTimer, INACTIVITY_TIME]);

  const append = (m: Msg) => setMessages((s: Msg[]) => [...s, m]);

  const counts = useMemo(() => {
    return stats || {
      active_transfers: 0,
      pending_approvals: 0,
      available_aircraft: 0,
      critical_patients: 0,
    };
  }, [stats]);

  const formatAircraft = (a: any) =>
    `${a.registration} (${a.type}) — ${a.status.replace("_", " ")}`;

  const findBookingById = (rawId: string) => {
    if (!rawId) return null;
    const normalized = rawId.trim().toUpperCase().replace(/^#/, "");
    return bookings.find((b: any) => b.id.toUpperCase() === normalized);
  };

  const reply = (text: string) => append({ sender: "bot", text });

  const processMessage = (raw: string) => {
    const text = raw.trim();
    if (!text) return reply("Please ask a question.");

    const lower = text.toLowerCase();

    if (/\bhelp\b/.test(lower)) {
      return reply("Try:\n• Active transfers?\n• Available aircraft\n• Critical patients?\n• Pending approvals");
    }

    if (/\b(active transfers|active)\b/.test(lower)) {
      return reply(`Active transfers: ${counts.active_transfers}`);
    }

    if (/\b(pending approvals|pending)\b/.test(lower)) {
      return reply(`Pending approvals: ${counts.pending_approvals}`);
    }

    if (/\b(available aircraft|aircraft)\b/.test(lower)) {
      return reply(`Available aircraft: ${counts.available_aircraft}`);
    }

    if (/\b(critical patients|critical)\b/.test(lower)) {
      return reply(`Critical patients: ${counts.critical_patients}`);
    }

    if (/\b(revenue|total revenue|earnings)\b/.test(lower)) {
      return reply(`Total revenue is $${totalRevenue.toLocaleString()}`);
    }

    return reply("Sorry, I didn't understand. Try 'help'.");
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    append({ sender: "user", text: trimmed });
    processMessage(trimmed);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 p-0 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-white animate-bounce overflow-hidden h-16 w-16 flex items-center justify-center z-50"
        aria-label="Open chat"
      >
        <img src={chatBotImage} alt="Chatbot Assistant" className="w-full h-full object-cover rounded-full" />
      </button>

      {isOpen && (
        <div
          className="fixed bottom-24 right-8 w-96 bg-white shadow-2xl rounded-2xl border-2 border-blue-300 z-50 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-white" />
              <div>
                <h3 className="font-bold text-white">Dashboard Assistant</h3>
                <p className="text-xs text-blue-100">Online & Ready</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-white hover:bg-blue-500 rounded-full h-8 w-8 flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="p-4 h-80 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50 scroll-smooth flex-1">
            {messages.map((m: Msg, i: number) => (
              <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
                <div className={`max-w-xs px-4 py-3 rounded-2xl ${m.sender === "user"
                  ? "bg-blue-500 text-white rounded-br-none shadow-lg"
                  : "bg-blue-50 text-black rounded-bl-none shadow-sm border border-blue-200"
                  }`}>
                  <p className="text-sm font-medium whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-blue-300 p-3 bg-white flex gap-2 shrink-0 rounded-b-2xl">
            <input
              className="flex-1 border-blue-300 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-black placeholder:text-gray-400"
              placeholder="Ask about the dashboard..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-full transition-colors flex items-center justify-center h-10 w-10"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { getPatientById } = usePatients();
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [viewingBooking, setViewingBooking] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Helper functions from Bookings page
  const getPatientName = (patientId: string) => {
    if (!patientId) return '';
    const patient = getPatientById(patientId);
    return patient?.name || patient?.full_name || '';
  };

  const getHospitalName = (hospitalId: string) => {
    if (!hospitalId) return 'Unknown Hospital';
    const hospital = hospitals.find(h => h.id === hospitalId);
    return hospital?.name || 'Unknown Hospital';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bookingsData, statsData, activitiesData, hospitalsData] = await Promise.all([
          BookingService.list(),
          DashboardService.getStats(),
          DashboardService.getActivities(),
          HospitalService.getHospitals()
        ]);

        // Use real API data
        setBookings((bookingsData || []).filter(Boolean));
        setHospitals((hospitalsData || []).filter(Boolean));
        setStats(statsData || {
          active_transfers: 0,
          pending_approvals: 0,
          available_aircraft: 0,
          critical_patients: 0
        });
        setActivities(activitiesData?.activities || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Failed to load dashboard data");

        // Set empty data on error
        setBookings([]);
        setStats({
          active_transfers: 0,
          pending_approvals: 0,
          available_aircraft: 0,
          critical_patients: 0
        });
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    return (bookings || []).filter((booking: any) => {
      // Filter out invalid/empty records
      if (!booking || !(booking.id || booking._id) || !booking.patientId) {
        return false;
      }

      // Resolve patient name for searching
      let patientName = "";
      if (booking.patientId) {
        const p = getPatientById(booking.patientId);
        if (!p) return false; // Filter out unknown/empty patient records
        patientName = p?.name || p?.full_name || "";
      } else if (booking.patient) {
        patientName = booking.patient?.full_name || booking.patient?.name || (typeof booking.patient === 'string' ? booking.patient : "");
        if (!patientName) return false;
      } else if (booking.patientName) {
        patientName = booking.patientName;
      } else {
        return false; // No patient info at all
      }

      // Resolve origin hospital name
      let originName = "";
      if (booking.originHospitalId) {
        const h = hospitals.find(h => h.id === booking.originHospitalId);
        originName = h?.name || h?.hospital_name || "";
      } else if (booking.origin_hospital) {
        originName = booking.origin_hospital?.hospital_name || booking.origin_hospital?.name || (typeof booking.origin_hospital === 'string' ? booking.origin_hospital : "");
      } else if (booking.originHospital?.name) {
        originName = booking.originHospital.name;
      }

      // Resolve destination hospital name
      let destinationName = "";
      if (booking.destinationHospitalId) {
        const h = hospitals.find(h => h.id === booking.destinationHospitalId);
        destinationName = h?.name || h?.hospital_name || "";
      } else if (booking.destination_hospital) {
        destinationName = booking.destination_hospital?.hospital_name || booking.destination_hospital?.name || (typeof booking.destination_hospital === 'string' ? booking.destination_hospital : "");
      } else if (booking.destinationHospital?.name) {
        destinationName = booking.destinationHospital.name;
      }

      const searchTerms = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm ||
        (booking.booking_id && String(booking.booking_id).toLowerCase().includes(searchTerms)) ||
        (booking.id && String(booking.id).toLowerCase().includes(searchTerms)) ||
        patientName.toLowerCase().includes(searchTerms) ||
        originName.toLowerCase().includes(searchTerms) ||
        destinationName.toLowerCase().includes(searchTerms);

      const statusMatch = !statusFilter || booking.status === statusFilter;
      const urgencyMatch = !urgencyFilter || booking.urgency === urgencyFilter;

      return searchMatch && statusMatch && urgencyMatch;
    });
  }, [bookings, searchTerm, statusFilter, urgencyFilter, hospitals, getPatientById]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, urgencyFilter]);

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const totalRevenue = useMemo(() => {
    return (bookings || []).reduce((sum, b) => {
      let calculatedCost = 0;
      if (b.originHospitalId && b.destinationHospitalId) {
        const origin = hospitals.find(h => h.id === b.originHospitalId);
        const dest = hospitals.find(h => h.id === b.destinationHospitalId);
        if (origin?.coordinates && dest?.coordinates) {
          const dist = calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
          calculatedCost = calculateRevenue(dist);
        }
      }

      // Prioritize calculated cost to override any incorrect/stale stored data
      const cost = calculatedCost > 0 ? calculatedCost : (Number(b.estimatedCost) || Number(b.actualCost) || 0);
      return sum + cost;
    }, 0);
  }, [bookings, hospitals]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getBookingDetails = (booking: any) => {
    // Initialize default variables
    let patientName = "";
    let patientGender = "N/A";
    let patientAge: string | number = "N/A";
    let patientCondition = "Not specified";
    let patientDiagnosis = "N/A";
    let patientVitals = "N/A";
    let patientAllergies: string | string[] = "None";

    // 1. Try resolving via patientId first
    if (booking.patientId) {
      const patient = getPatientById(booking.patientId);
      if (patient) {
        patientName = patient.name || patient.full_name || "Unknown Patient";
        patientGender = (patient.gender || "N/A").toLowerCase();

        // Age calculation
        if (patient.date_of_birth || (patient as any).dob) {
          const dob = new Date(patient.date_of_birth || (patient as any).dob);
          const ageDifMs = Date.now() - dob.getTime();
          const ageDate = new Date(ageDifMs);
          patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        } else if ((patient as any).age) {
          patientAge = (patient as any).age;
        }

        patientCondition = patient.diagnosis || (patient as any).medical_condition || patient.acuity_level || "Not specified";
        patientDiagnosis = patient.diagnosis || "N/A";
        patientVitals = (patient as any).vitals || "N/A";
        patientAllergies = patient.allergies || "None";
      }
    }

    // 2. If no patient found via ID, or ID not present, check embedded patient object
    // Note: We check if patientName is still default "Unknown Patient" to prioritize ID lookup if successful
    if (patientName === "Unknown Patient" && booking.patient) {
      patientName = booking.patient.full_name || booking.patient.name || "Unknown Patient";
      patientGender = (booking.patient.gender || "N/A").toLowerCase();

      if (booking.patient.date_of_birth || booking.patient.dob) {
        const dob = new Date(booking.patient.date_of_birth || booking.patient.dob);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        patientAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      } else if (booking.patient.age) {
        patientAge = booking.patient.age;
      }

      patientCondition = booking.patient.diagnosis || booking.medical_condition || booking.condition || "Not specified";
      patientDiagnosis = booking.patient.diagnosis || "N/A";
      patientVitals = booking.patient.vitals || "N/A";
      patientAllergies = booking.patient.allergies || "None";
    }

    // 3. Last resort: flat properties
    if (patientName === "Unknown Patient" && (booking.patient_name || booking.patientName)) {
      patientName = booking.patient_name || booking.patientName;
    }

    // Resolve hospital names
    const origin = hospitals.find(h => h.id === booking.originHospitalId) || booking.origin_hospital;
    const dest = hospitals.find(h => h.id === booking.destinationHospitalId) || booking.destination_hospital;

    const originName = origin?.name || origin?.hospital_name || booking.originHospitalId || "N/A";
    const destinationName = dest?.name || dest?.hospital_name || booking.destinationHospitalId || "N/A";

    // Recalculate cost based on distance
    let calculatedCost = 0;
    if (booking.originHospitalId && booking.destinationHospitalId) {
      const originH = hospitals.find(h => h.id === booking.originHospitalId);
      const destH = hospitals.find(h => h.id === booking.destinationHospitalId);
      if (originH?.coordinates && destH?.coordinates) {
        const dist = calculateDistance(originH.coordinates.lat, originH.coordinates.lng, destH.coordinates.lat, destH.coordinates.lng);
        calculatedCost = calculateRevenue(dist);
      }
    }
    const finalCost = calculatedCost > 0 ? calculatedCost : (Number(booking.estimatedCost) || Number(booking.actualCost) || 0);

    return {
      ...booking,
      patientName,
      patientGender,
      patientAge,
      patientCondition,
      patientDiagnosis,
      origin: originName,
      destination: destinationName,
      displayCost: finalCost,
      formattedCost: `$${finalCost.toLocaleString()}`,
      // Ensure arrays exist and sanitize
      requiredEquipment: booking.requiredEquipment || booking.required_equipment || [],
      notes: booking.notes || booking.description || "",
      vitals: patientVitals,
      allergies: patientAllergies
    };
  };

  const handleDownload = (booking: any) => {
    const details = getBookingDetails(booking);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Booking Details", 14, 22);

    const tableData = Object.entries(details).map(([key, value]: [string, any]) => [key, String(value)]);

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: tableData,
    });

    doc.save(`Booking_${booking.id}.pdf`);
  };

  const handleExportAll = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("All Bookings Report", 14, 22);

    const allData = bookings.map((b: any) => {
      let calculated = 0;
      if (b.originHospitalId && b.destinationHospitalId) {
        const origin = hospitals.find(o => o.id === b.originHospitalId);
        const dest = hospitals.find(d => d.id === b.destinationHospitalId);
        if (origin?.coordinates && dest?.coordinates) {
          const dist = calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
          calculated = calculateRevenue(dist);
        }
      }
      const finalRevenue = calculated > 0 ? calculated : (Number(b.estimatedCost) || Number(b.actualCost) || 0);

      return [
        b.id,
        b.patient?.full_name || "-",
        b.origin_hospital?.hospital_name || "-",
        b.destination_hospital?.hospital_name || "-",
        b.status,
        b.urgency,
        `$${finalRevenue.toLocaleString()}`,
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [["ID", "Patient", "Origin", "Destination", "Status", "Urgency", "Revenue"]],
      body: allData,
    });

    doc.save("All_Bookings_Report.pdf");
  };

  const summaryStats = useMemo(() => ({
    active_transfers: stats?.active_transfers || 0,
    pending_approvals: stats?.pending_approvals || 0,
    available_aircraft: stats?.available_aircraft || 0,
    critical_patients: stats?.critical_patients || 0,
    totalRevenue: totalRevenue || 0
  }), [stats, totalRevenue]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="md:hidden flex items-center gap-2">
        {/* Mobile Header Title */}
        <span className="text-lg font-black text-slate-800 tracking-tight">Dashboard</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide md:overflow-visible">
        {/* Search & Actions - Hidden on mobile, shown in dropdown or similar if needed. User requested "name only shown down set dropdown to search filters" */}

        {/* Mobile Search/Filter Dropdown Trigger */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100">
                <Search className="h-5 w-5 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] p-4 rounded-xl shadow-xl border-slate-200" align="end">
              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 pl-9 pr-3 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Filters</p>
                  <div className="flex flex-wrap gap-2">
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="h-9 w-full bg-slate-50 border-slate-200"><SelectValue placeholder="Urgency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="all_urgency">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-full bg-slate-50 border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested">Requested</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="all_status">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-xl h-10 font-bold text-xs" onClick={handleExportAll}>
                  <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Analytics Popover - Hidden on extra small mobile */}
          <div className="hidden xs:block">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group shrink-0" title="System Analytics">
                  <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-32px)] sm:w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                  <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">System Analytics</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Operations</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-100 group/metric">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Activity className="h-3 w-3 text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-800 tracking-tighter">{summaryStats.active_transfers}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase">Flights</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl transition-all hover:border-amber-200 group/metric">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-amber-600 tracking-tighter">{summaryStats.pending_approvals}</span>
                      <span className="text-[8px] text-amber-400 font-bold uppercase">Tasks</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Total Network Revenue</p>
                  <p className="text-2xl font-black text-white tracking-tighter">${summaryStats.totalRevenue.toLocaleString()}</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Unified Filter Dropdown (Desktop) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center justify-center h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative shrink-0" title="Filters">
                <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${statusFilter || urgencyFilter ? 'text-blue-600' : 'text-slate-500'}`} />
                {(statusFilter || urgencyFilter) && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 md:h-4 md:w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                    {(statusFilter ? 1 : 0) + (urgencyFilter ? 1 : 0)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
                Operational Filters
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              <div className="px-2 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Urgency</p>
                <div className="flex flex-col gap-1">
                  {['', 'routine', 'urgent', 'emergency'].map(u => (
                    <DropdownMenuItem key={u} onClick={() => setUrgencyFilter(u)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${urgencyFilter === u ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                      <span className="capitalize">{u || 'All Urgency'}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              <div className="px-2 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Status</p>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                  {['', 'requested', 'clinical_review', 'dispatch_review', 'airline_confirmed', 'crew_assigned', 'in_transit', 'completed', 'cancelled'].map(s => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                      <span className="capitalize">{s.replace('_', ' ') || 'All Status'}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search (Desktop) */}
          <div className="relative group flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-3 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full"
            />
          </div>

          <Button
            variant="outline"
            className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group shrink-0"
            onClick={handleExportAll}
            title="Export Report"
          >
            <Download className="h-4 w-4 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      subTitle="Precision Medical Logistics"
      headerActions={headerActions}
    >
      <div className="p-6 space-y-6">

        {loading ? (
          <LoadingSpinner text="" />
        ) : (
          <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-xl">
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#f8fafc] border-b border-slate-200">
                    <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Patient Name</th>
                    <th className="hidden md:table-cell px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Origin</th>
                    <th className="hidden md:table-cell px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Destination</th>
                    <th className="hidden md:table-cell px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Status</th>
                    <th className="hidden md:table-cell px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Revenue</th>
                    <th className="px-6 py-2.5 text-center text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold text-xs uppercase tracking-widest">
                        No bookings found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((booking: any) => {
                      const details = getBookingDetails(booking);
                      const isExpanded = expandedRowId === booking.id;

                      return (
                        <React.Fragment key={booking.id}>
                          <tr className={`border-b hover:bg-slate-50 transition-colors duration-200 ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-6 py-2.5">
                              <span
                                className="cursor-pointer hover:text-blue-600 font-bold transition-all flex items-center gap-3"
                                onClick={() => setExpandedRowId(isExpanded ? null : booking.id)}
                              >
                                <div className="h-8 w-8 border-2 border-purple-100 bg-gradient-to-tr from-purple-200 via-purple-100 to-purple-50 shadow-sm shrink-0 rounded-full overflow-hidden flex items-center justify-center">
                                  <Avatar gender={details.patientGender} size={32} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 leading-tight text-sm">{details.patientName}</span>
                                </div>
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-6 py-2.5 text-sm font-medium text-slate-700 truncate max-w-[150px]">{details.origin}</td>

                            <td className="hidden md:table-cell px-6 py-2.5">
                              <div className="flex items-center gap-2 text-blue-700">
                                <Building2 className="h-3.5 w-3.5" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold uppercase tracking-wide truncate max-w-[150px]">{details.destination}</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Target Facility</span>
                                </div>
                              </div>
                            </td>

                            <td className="hidden md:table-cell px-6 py-2.5">
                              <div className="flex flex-col gap-1">
                                <Badge className={`w-fit capitalize font-black text-[10px] tracking-tight ${booking.status === 'completed' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                                  booking.status === 'cancelled' ? 'bg-rose-100 text-rose-800 hover:bg-rose-100' :
                                    'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                  } border-0 shadow-none`}>
                                  {booking.status.replace("_", " ")}
                                </Badge>
                                <Badge variant="outline" className={`w-fit capitalize font-black text-[9px] tracking-tight border-0 ${booking.urgency === 'emergency' ? 'text-rose-600 bg-rose-50' :
                                  booking.urgency === 'urgent' ? 'text-amber-600 bg-amber-50' :
                                    'text-emerald-600 bg-emerald-50'
                                  }`}>
                                  {booking.urgency}
                                </Badge>
                              </div>
                            </td>

                            <td className="hidden md:table-cell px-6 py-2.5 text-left font-black text-slate-900 text-sm">
                              {details.formattedCost}
                            </td>

                            <td className="px-6 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                  onClick={() => setViewingBooking(details)}
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                  onClick={() => handleDownload(booking)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-xl shadow-sm active:scale-95 group"
                                  onClick={() => setBookings((prev: any) => prev.filter((b: any) => b.id !== booking.id))}
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail View */}
                          {isExpanded && (
                            <tr className="bg-blue-50/20 border-b border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                              <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pl-0 sm:pl-16">
                                  {/* Mobile-only fields shown in expanded view */}
                                  <div className="md:hidden space-y-1 col-span-1 sm:col-span-4 border-b border-indigo-50 pb-2 mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route & Status</span>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-xs font-bold text-slate-700">{details.origin} → {details.destination}</p>
                                      <div className="flex gap-2 items-center">
                                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">{booking.status.replace('_', ' ')}</Badge>
                                        <span className="text-xs font-black text-emerald-600">{details.formattedCost}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Condition</span>
                                    <p className="text-sm font-medium text-slate-900">{details.patientCondition}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Equipment</span>
                                    <div className="flex flex-wrap gap-1">
                                      {details.requiredEquipment?.length > 0 ? (
                                        details.requiredEquipment.map((eq: string) => (
                                          <Badge key={eq} variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600 capitalize">
                                            {eq.replace(/_/g, ' ')}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-slate-400 italic">Standard Equipment</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vitals</span>
                                    <p className="text-sm font-medium text-slate-900">{details.vitals || 'No record'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transport Notes</span>
                                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{details.notes || "No additional notes."}</p>
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

            {/* PAGINATION FOOTER */}
            <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-3 flex flex-col-reverse gap-4 sm:flex-row items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(val) => setItemsPerPage(parseInt(val))}
                  >
                    <SelectTrigger className="h-9 w-20 bg-white border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 25, 50].map(val => (
                        <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBookings.length)} <span className="text-slate-300 mx-1"> / </span> {filteredBookings.length} Bookings
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 bg-white rounded-xl border-slate-200 hover:bg-slate-50"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-xl text-xs font-black text-blue-600 uppercase tracking-tight shadow-sm">
                  Page {currentPage} <span className="text-slate-300 mx-1">OF</span> {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 bg-white rounded-xl border-slate-200 hover:bg-slate-50"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG: VIEW BOOKING */}
      <Dialog open={!!viewingBooking} onOpenChange={() => setViewingBooking(null)}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
            <DialogTitle className="text-white text-xl">Booking Information</DialogTitle>
          </DialogHeader>
          <div className="p-8 overflow-y-auto">
            {viewingBooking && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-4">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Stat label="Patient Name" value={viewingBooking.patientName} />
                      <Stat label="Age" value={viewingBooking.patientAge} />
                      <Stat label="Gender" value={viewingBooking.patientGender} />
                      <Stat label="Condition" value={viewingBooking.patientCondition} />
                      <Stat label="Diagnosis" value={viewingBooking.patientDiagnosis} />
                      <Stat label="Allergies" value={Array.isArray(viewingBooking.allergies) ? viewingBooking.allergies.join(", ") : viewingBooking.allergies} />
                      <Stat label="Current Vitals" value={viewingBooking.vitals} />
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2 mb-4">Flight Route & Logistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Stat label="Origin" value={viewingBooking.origin} />
                      <Stat label="Destination" value={viewingBooking.destination} />
                      <Stat label="Est. Duration" value={`${viewingBooking.estimatedFlightTime || 'N/A'} min`} />
                      <Stat label="Status" value={viewingBooking.status} />
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Required Equipment</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {viewingBooking.requiredEquipment && viewingBooking.requiredEquipment.length > 0 ? (
                            viewingBooking.requiredEquipment.map((eq: string) => (
                              <Badge key={eq} variant="secondary" className="text-[10px]">{eq.replace(/_/g, ' ')}</Badge>
                            ))
                          ) : "Standard"}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2 mb-4">Financial Summary</h4>
                    <div className="flex flex-col justify-center h-full gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Total Revenue</p>
                        <p className="text-4xl font-black text-emerald-600 tracking-tighter">{viewingBooking.formattedCost}</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 italic">This is a comprehensive logistics fee including aircraft, clinical staff, and specialized medical equipment.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2 mb-4">Notes</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingBooking.notes || "No notes available for this booking."}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Chatbot stats={stats} bookings={bookings} totalRevenue={totalRevenue} />
    </Layout >
  );
}

