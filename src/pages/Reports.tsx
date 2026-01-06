import React, { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import chatBotImage from '../emoji.jpeg';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  Plane,
  Building2,
} from "lucide-react";


import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Recharts restored for analytics views


import { format } from "date-fns";
import { BookingService } from "@/services/booking.service";
import { AircraftService } from "@/services/aircraft.service";
import { HospitalService } from "@/services/hospital.service";
import { PatientsService } from "@/services/patients.service";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";

// --- CHATBOT CONSTANTS ---
const initialMessages: any[] = [];
// -------------------------

// Helper component for Stat Cards (neutral background)
// Keep colored badges only for the allowed statuses/urgencies; everything else neutral/transparent
const getStatusBadge = (status: string, type: "status" | "urgency") => {

  const s = (status || "").toString();
  let className = "px-2.5 py-0.5 rounded-md text-xs font-medium capitalize border"; // base
  // STATUS colors (keep these colored)
  if (type === "status") {
    switch (s) {
      case "in_transit":
        className += " bg-blue-100 text-blue-700 border-blue-300/50";
        break;
      case "airline_confirmed":
        className += " bg-indigo-100 text-indigo-700 border-indigo-300/50";
        break;
      case "clinical_review":
        className += " bg-yellow-100 text-yellow-700 border-yellow-300/50";
        break;
      case "requested":
        className += " bg-gray-100 text-gray-700 border-gray-300/50";
        break;
      // allowed to remain colored as urgency examples (but for status keep neutral if not in list)
      default:
        className += " bg-transparent text-gray-700 border-gray-200";
    }
  }

  // URGENCY colors (keep these colored)
  if (type === "urgency") {
    switch (s) {
      case "emergency":
        className += " bg-red-100 text-red-700 border-red-300/50 font-bold";
        break;
      case "urgent":
        className += " bg-orange-100 text-orange-700 border-orange-300/50 font-semibold";
        break;
      case "routine":
        className += " bg-green-100 text-green-700 border-green-300/50";
        break;
      default:
        className += " bg-transparent text-gray-700 border-gray-200";
    }
  }

  return <span className={className}>{s.replace(/_/g, " ") || "—"}</span>;
};

export default function Reports() {
  // data state
  const [bookings, setBookings] = useState<any[]>([]);
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("bookings");


  // PAGINATION STATE
  const [currentPageBookings, setCurrentPageBookings] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(5);


  // CHATBOT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");

  // dialogs & forms
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewBooking, setViewBooking] = useState<any | null>(null);

  const [form, setForm] = useState<any>({
    id: "",
    patientId: "",
    originHospitalId: "",
    destinationHospitalId: "",
    status: "requested",
    urgency: "routine",
    preferredPickupWindow: "",
    requiredEquipment: [],
    estimatedCost: 0,
    estimatedFlightTime: 0,
    requestedAt: new Date().toISOString(),
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper helpers
  const getPatientName = (patientId: string) => {
    const p = patients.find(x => x.id === patientId || x.patient_id === patientId);
    return p?.name || p?.full_name || 'Patient Restricted';
  };

  const getHospitalName = (hId: string) => {
    const h = hospitals.find(x => x.id === hId);
    return h?.name || 'Unassigned Facility';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsData, aircraftData, patientsData, hospitalsData] = await Promise.all([
          BookingService.list(),
          AircraftService.getAircrafts(),
          PatientsService.list(),
          HospitalService.getHospitals(),
        ]);

        // Filter out null or incomplete data - only show records with valid links
        const validBookings = (bookingsData || []).filter((b: any) => {
          if (!b || !(b.id || b._id)) return false;
          // Must have valid patient and hospitals to be a real report
          const hasPatient = patientsData.some((p: any) => p.id === b.patientId || p.patient_id === b.patientId);
          const hasOrigin = hospitalsData.some((h: any) => h.id === b.originHospitalId);
          const hasDest = hospitalsData.some((h: any) => h.id === b.destinationHospitalId);
          return hasPatient && hasOrigin && hasDest;
        });

        setBookings(validBookings.map((b: any) => ({ ...b, id: b._id || b.id })));

        setAircraft((aircraftData || []).filter((a: any) => a && (a.id || a._id)));
        setPatients((patientsData || []).filter((p: any) => p && (p.id || p._id)));
        setHospitals((hospitalsData || []).filter((h: any) => h && (h.id || h._id)));
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bId = (b.booking_id || b.id || "").toString().toLowerCase();
      const matchSearch = bId.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      const matchUrgency = urgencyFilter === "all" || b.urgency === urgencyFilter;
      return matchSearch && matchStatus && matchUrgency;
    });
  }, [bookings, searchTerm, statusFilter, urgencyFilter]);

  // analytics / aggregated values
  const summaryStats = useMemo(() => {
    const totalRev = bookings.reduce((s, b) => {
      let calculated = 0;
      if (b.originHospitalId && b.destinationHospitalId) {
        const origin = hospitals.find(h => h.id === b.originHospitalId);
        const dest = hospitals.find(h => h.id === b.destinationHospitalId);
        if (origin?.coordinates && dest?.coordinates) {
          const dist = calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
          calculated = calculateRevenue(dist);
        }
      }
      const cost = calculated > 0 ? calculated : (Number(b.estimatedCost) || Number(b.actualCost) || 0);
      return s + cost;
    }, 0);

    return {
      totalBookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      pendingBookings: bookings.filter((b) => b.status === "requested" || b.status === "clinical_review").length,
      totalRevenue: totalRev,
      efficiency: bookings.length > 0 ? Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) : 0,
      avgFlightTime: bookings.length > 0 ? Math.round(bookings.reduce((s, b) => s + (Number(b.estimatedFlightTime) || 0), 0) / bookings.length) : 0
    };
  }, [bookings, hospitals]);

  // Restored Analytics Data
  const utilizationChartData = useMemo(() => {
    const aircraftUsage: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.aircraftId) {
        aircraftUsage[b.aircraftId] = (aircraftUsage[b.aircraftId] || 0) + 1;
      }
    });
    return Object.entries(aircraftUsage).map(([id, count]) => {
      const a = aircraft.find(ac => ac.id === id);
      return { name: a?.tailNumber || id.slice(0, 6).toUpperCase(), usage: count };
    });
  }, [bookings, aircraft]);

  const revenueByMonthData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize last 6 months with 0
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyData[months[d.getMonth()]] = 0;
    }

    bookings.forEach(b => {
      if (!b.requestedAt) return;
      const date = new Date(b.requestedAt);
      const month = months[date.getMonth()];

      if (monthlyData[month] !== undefined) {
        let calculated = 0;
        if (b.originHospitalId && b.destinationHospitalId) {
          const origin = hospitals.find(h => h.id === b.originHospitalId);
          const dest = hospitals.find(h => h.id === b.destinationHospitalId);
          if (origin?.coordinates && dest?.coordinates) {
            const dist = calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
            calculated = calculateRevenue(dist);
          }
        }
        const cost = calculated > 0 ? calculated : (Number(b.estimatedCost) || Number(b.actualCost) || 0);
        monthlyData[month] += cost;
      }
    });

    return Object.entries(monthlyData).map(([name, revenue]) => ({ name, revenue }));
  }, [bookings, hospitals]);

  const flightTimeTrendData = useMemo(() => {
    const dailyData: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Initialize last 7 days including today
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      dailyData[days[d.getDay()]] = 0;
    }

    bookings.forEach(b => {
      if (!b.requestedAt) return;
      const date = new Date(b.requestedAt);
      const dayName = days[date.getDay()];
      if (dailyData[dayName] !== undefined) {
        dailyData[dayName] += (Number(b.estimatedFlightTime) || 0);
      }
    });

    return Object.entries(dailyData).map(([day, hours]) => ({ day, hours }));
  }, [bookings]);

  const revenueByHospital = useMemo<{ name: string; revenue: number }[]>(() => {
    const hospitalRev: Record<string, number> = {};
    bookings.forEach(b => {
      const h = hospitals.find(h => h.id === b.originHospitalId);
      if (!h) return; // Skip records without valid hospital (should already be filtered, but double safety)

      let calculated = 0;
      if (b.originHospitalId && b.destinationHospitalId) {
        const dest = hospitals.find(d => d.id === b.destinationHospitalId);
        if (h?.coordinates && dest?.coordinates) {
          const dist = calculateDistance(h.coordinates.lat, h.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
          calculated = calculateRevenue(dist);
        }
      }
      const cost = calculated > 0 ? calculated : (Number(b.estimatedCost) || Number(b.actualCost) || 0);

      const name = h.name;
      hospitalRev[name] = (hospitalRev[name] || 0) + cost;
    });
    return Object.entries(hospitalRev).map(([name, revenue]) => ({ name, revenue }));
  }, [bookings, hospitals]);




  const headerActions = (
    <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
      {/* Click to View Filter Type - Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 md:h-10 px-3 md:px-4 border-2 border-slate-200 bg-white text-slate-600 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 group shadow-sm transition-all active:scale-95 text-[11px] md:text-xs">
            <Filter size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
            <span>FILTER TYPE</span>
            <ChevronDown size={14} className="text-slate-300 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-2 border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl z-[100]">
          <div className="px-2 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Urgency Level</p>
            <div className="flex flex-col gap-1">
              {['all', 'routine', 'urgent', 'emergency'].map(u => (
                <DropdownMenuItem key={u} onClick={() => setUrgencyFilter(u)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${urgencyFilter === u ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <span className="capitalize">{u === 'all' ? 'All Urgency' : u}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status</p>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
              {['all', 'requested', 'clinical_review', 'dispatch_review', 'airline_confirmed', 'crew_assigned', 'in_transit', 'completed', 'cancelled'].map(s => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <span className="capitalize">{s.replace('_', ' ').replace('all', 'All Status')}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Responsive Search Input */}
      <div className="relative group min-w-[140px] md:min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Search by ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 md:h-10 pl-9 pr-3 bg-slate-50 border-slate-200 rounded-xl text-[11px] md:text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full shadow-sm"
        />
      </div>

      <Button
        className="h-9 md:h-10 px-3 md:px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] md:text-[11px] uppercase tracking-wider rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 transition-all active:scale-95 group border-b-4 border-blue-800"
        onClick={openAdd}
      >
        <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 stroke-[3px] group-hover:rotate-90 transition-transform" />
        <span className="hidden sm:inline">New Booking</span>
        <span className="sm:hidden">ADD</span>
      </Button>
    </div>
  );

  // PAGINATION LOGIC FOR BOOKING REPORTS
  const totalPagesBookings = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const start = (currentPageBookings - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPageBookings, itemsPerPage]);


  const handlePageChangeBookings = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPagesBookings) {
      setCurrentPageBookings(newPage);
    }
  };




  // CHATBOT HANDLERS
  const handleSend = (e: React.FormEvent | null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = { id: Date.now(), text: newMessage, sender: "user", time: format(new Date(), "h:mm a") };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");

    // Mocked AI reply
    setTimeout(() => {
      let aiResponseText = "I can help with filtering bookings, generating invoices or showing trends.";

      const lower = userMessage.text.toLowerCase();
      if (lower.includes("filter completed")) {
        aiResponseText = "Use the Status dropdown and select 'Completed' to filter.";
      } else if (lower.includes("revenue")) {
        aiResponseText = `Total revenue is $${summaryStats.totalRevenue.toLocaleString()}.`;
      }

      const aiMessage = { id: Date.now() + 1, text: aiResponseText, sender: "ai", time: format(new Date(), "h:mm a") };
      setMessages((prev) => [...prev, aiMessage]);
    }, 700);
  };

  // CRUD handlers
  function openAdd() {
    setForm({
      id: "",
      patientId: "",
      originHospitalId: "",
      destinationHospitalId: "",
      status: "requested",
      urgency: "routine",
      preferredPickupWindow: new Date().toISOString().slice(0, 16),
      requiredEquipment: [],
      estimatedCost: 0,
      estimatedFlightTime: 0,
      requestedAt: new Date().toISOString(),
    });
    setAddOpen(true);
  }

  async function submitAdd() {
    // Validate required fields
    if (!form.patientId || !form.originHospitalId || !form.destinationHospitalId || !form.urgency || !form.preferredPickupWindow) {
      alert("Please fill all required fields: Patient, Origin Hospital, Destination Hospital, Urgency, and Pickup Time");
      return;
    }

    if (form.originHospitalId === form.destinationHospitalId) {
      alert("Origin and destination hospitals cannot be the same");
      return;
    }

    try {
      const bookingData = {
        patientId: form.patientId,
        originHospitalId: form.originHospitalId,
        destinationHospitalId: form.destinationHospitalId,
        urgency: form.urgency,
        preferredPickupWindow: form.preferredPickupWindow,
        requiredEquipment: form.requiredEquipment || [],
      };

      await BookingService.create(bookingData);
      setAddOpen(false);
      const bookingsData = await BookingService.list();
      setBookings(bookingsData.map((b: any) => ({ ...b, id: b._id || b.id })));

      alert('Booking created successfully!');
    } catch (err: any) {
      console.error('Error creating booking:', err);
      alert(`Failed to create booking: ${err.message || 'Unknown error'}`);
    }
  }

  function openEdit(b: any) {
    setEditingId(b.id);
    setForm({ ...b });
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editingId) return;

    try {
      await BookingService.update(editingId, form);
      setEditingId(null);
      setEditOpen(false);
      const bookingsData = await BookingService.list();
      setBookings(bookingsData.map((b: any) => ({ ...b, id: b._id || b.id })));

      // Success notification
      alert('Booking updated successfully!');
    } catch (err: any) {
      console.error('Error updating booking:', err);
      alert(`Failed to update booking: ${err.message || 'Unknown error'}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this booking?")) return;

    try {
      await BookingService.remove(id);
      const bookingsData = await BookingService.list();
      setBookings(bookingsData.map((b: any) => ({ ...b, id: b._id || b.id })));

      // Success notification
      alert('Booking deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting booking:', err);
      alert(`Failed to delete booking: ${err.message || 'Unknown error'}`);
    }
  }

  // PDF generation
  function downloadInvoice(b: any) {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFontSize(18);
      doc.text("Booking Invoice", 40, 40);

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

      const rows: [string, string][] = [
        ["Booking ID", b.booking_id || b.id || "N/A"],
        ["Date", b.requestedAt ? format(new Date(b.requestedAt), "PPpp") : "N/A"],
        ["Status", b.status || "N/A"],
        ["Urgency", b.urgency || "N/A"],
        ["Estimated Revenue", `$${finalRevenue.toLocaleString()}`],
        ["Flight Time", `${b.estimatedFlightTime ?? 0} min`],
      ];

      autoTable(doc, {
        startY: 80,
        head: [["Field", "Value"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 11 },
      });

      doc.save(`${b.id || "booking"}_invoice.pdf`);
    } catch (err) {
      console.error("PDF error", err);
      alert("Failed to generate PDF");
    }
  }



  return (
    <Layout subTitle="System Intelligence" headerActions={headerActions} isFullHeight={true}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <TooltipProvider>
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs defaultValue="bookings" className="flex flex-col" onValueChange={(v) => setActiveTab(v)}>
              <div className="mb-4 overflow-x-auto custom-scrollbar pb-1">
                <TabsList className="bg-white/50 backdrop-blur-md border border-slate-200 p-1 rounded-2xl shadow-sm inline-flex min-w-max">
                  <TabsTrigger
                    value="bookings"
                    className="rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg active:scale-95 transition-all"
                  >
                    Booking Reports
                  </TabsTrigger>
                  <TabsTrigger
                    value="aircraft"
                    className="rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg active:scale-95 transition-all"
                  >
                    Aircraft Utilization
                  </TabsTrigger>
                  <TabsTrigger
                    value="revenue"
                    className="rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg active:scale-95 transition-all"
                  >
                    Revenue & Invoices
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg active:scale-95 transition-all"
                  >
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 📋 BOOKING REPORTS TAB */}
              <TabsContent value="bookings" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden flex flex-col">
                  <div className="max-h-[380px] overflow-auto custom-scrollbar">
                    <div className="min-w-[800px] md:min-w-0">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 shadow-sm">
                          <tr className="bg-[#f8fafc] border-b-2 border-slate-300">
                            <th className="px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Booking ID</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Patient</th>
                            <th className="hidden lg:table-cell px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Path</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Status</th>
                            <th className="hidden md:table-cell px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Urgency</th>
                            <th className="hidden sm:table-cell px-6 py-4 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Revenue</th>
                            <th className="px-6 py-4 text-center text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc] sticky top-0">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedBookings.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                No reports found matching criteria
                              </td>
                            </tr>
                          ) : (
                            paginatedBookings.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{b.booking_id || (b.id && b.id.toString().slice(-8).toUpperCase()) || "N/A"}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{getPatientName(b.patientId)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{b.patientId?.slice(0, 8)}</span>
                                  </div>
                                </td>
                                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{getHospitalName(b.originHospitalId)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">→ {getHospitalName(b.destinationHospitalId)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {getStatusBadge(b.status, "status")}
                                </td>
                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                  {getStatusBadge(b.urgency, "urgency")}
                                </td>
                                <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                                  {(() => {
                                    let calculated = 0;
                                    if (b.originHospitalId && b.destinationHospitalId) {
                                      const origin = hospitals.find(o => o.id === b.originHospitalId);
                                      const dest = hospitals.find(d => d.id === b.destinationHospitalId);
                                      if (origin?.coordinates && dest?.coordinates) {
                                        const dist = calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng);
                                        calculated = calculateRevenue(dist);
                                      }
                                    }
                                    const cost = calculated > 0 ? calculated : (Number(b.estimatedCost) || Number(b.actualCost) || 0);
                                    return `$${cost.toLocaleString()}`;
                                  })()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all rounded-lg shadow-sm border border-blue-100"
                                          onClick={() => setViewBooking(b)}
                                        >
                                          <Eye size={14} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white font-bold text-[10px] border-none">View Details</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          className="h-8 w-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all rounded-lg shadow-sm border border-emerald-100"
                                          onClick={() => downloadInvoice(b)}
                                        >
                                          <Download size={14} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white font-bold text-[10px] border-none">Invoice</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          className="h-8 w-8 bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white transition-all rounded-lg shadow-sm border border-slate-200"
                                          onClick={() => openEdit(b)}
                                        >
                                          <Edit size={14} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white font-bold text-[10px] border-none">Edit</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          className="h-8 w-8 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all rounded-lg shadow-sm border border-rose-100"
                                          onClick={() => handleDelete(b.id)}
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white font-bold text-[10px] border-none">Delete</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Implementation */}
                  {totalPagesBookings > 0 && (
                    <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                          <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPageBookings(1); }}>
                            <SelectTrigger className="h-9 w-20 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm transition-all hover:border-blue-200 focus:ring-4 focus:ring-blue-500/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                              {[5, 10, 25, 50].map(val => (
                                <SelectItem key={val} value={val.toString()} className="text-xs font-bold text-slate-600 rounded-lg focus:bg-blue-50 focus:text-blue-700">
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          SHOWING {Math.min(filteredBookings.length, (currentPageBookings - 1) * itemsPerPage + 1)}-{Math.min(filteredBookings.length, currentPageBookings * itemsPerPage)} <span className="mx-1">/</span> {filteredBookings.length} REPORTS
                        </span>
                      </div>


                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-20 shadow-sm active:scale-90"
                          onClick={() => handlePageChangeBookings(1)}
                          disabled={currentPageBookings === 1}
                        >
                          <ChevronsLeft size={16} strokeWidth={2.5} className="text-slate-400" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-20 shadow-sm active:scale-90"
                          onClick={() => handlePageChangeBookings(currentPageBookings - 1)}
                          disabled={currentPageBookings === 1}
                        >
                          <ChevronLeft size={16} strokeWidth={2.5} className="text-slate-400" />
                        </Button>

                        <div className="flex items-center justify-center px-4 h-9 min-w-[120px] rounded-xl bg-blue-50 border-2 border-blue-100 shadow-inner">
                          <span className="text-blue-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            PAGE <span className="text-sm">{currentPageBookings}</span> <span className="text-blue-300">OF</span> <span className="text-sm">{totalPagesBookings || 1}</span>
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-20 shadow-sm active:scale-90"
                          onClick={() => handlePageChangeBookings(currentPageBookings + 1)}
                          disabled={currentPageBookings === totalPagesBookings || totalPagesBookings === 0}
                        >
                          <ChevronRight size={16} strokeWidth={2.5} className="text-slate-400" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all disabled:opacity-20 shadow-sm active:scale-90"
                          onClick={() => handlePageChangeBookings(totalPagesBookings)}
                          disabled={currentPageBookings === totalPagesBookings || totalPagesBookings === 0}
                        >
                          <ChevronsRight size={16} strokeWidth={2.5} className="text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 🛩️ TAB 2: AIRCRAFT UTILIZATION */}
              <TabsContent value="aircraft" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                  <Card className="rounded-2xl border-2 border-slate-100 shadow-lg overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-50 bg-[#f8fafc]/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-[#64748b]">Usage by Tail Number</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={utilizationChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="usage" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-2 border-slate-100 shadow-lg overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-50 bg-[#f8fafc]/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-[#64748b]">Flight Hours (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={flightTimeTrendData}>
                          <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorHours)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 💰 TAB 3: REVENUE & INVOICES */}
              <TabsContent value="revenue" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-md hover:shadow-xl transition-all border-l-8 border-l-blue-600 group">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 opacity-60 group-hover:opacity-100 transition-opacity">Financial Intake</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">${summaryStats.totalRevenue.toLocaleString()}</span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">USD</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-md hover:shadow-xl transition-all border-l-8 border-l-emerald-600 group">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 opacity-60 group-hover:opacity-100 transition-opacity">Settled Exports</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{summaryStats.completedBookings}</span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">RECORDS</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-md hover:shadow-xl transition-all border-l-8 border-l-orange-500 group">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-3 opacity-60 group-hover:opacity-100 transition-opacity">Active Queue</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter">{summaryStats.pendingBookings}</span>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">PENDING</span>
                    </div>
                  </div>
                </div>

                <Card className="rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden bg-white mb-4">
                  <CardHeader className="border-b border-slate-50 bg-[#f8fafc]/50 px-6 py-4">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Revenue Growth Curve</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueByMonthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#94a3b8" }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: "#10b981", strokeWidth: 3, stroke: "#fff" }} activeDot={{ r: 10, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 📈 TAB 4: ANALYTICS */}
              <TabsContent value="analytics" className="m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[32px] shadow-2xl shadow-blue-200 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
                      <div className="flex items-center gap-6 relative z-10 text-white">
                        <div className="bg-white/20 p-5 rounded-2xl backdrop-blur-md">
                          <Plane size={36} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black tracking-tight">System Operational Efficiency</h4>
                          <p className="text-blue-100 text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-80">{summaryStats.efficiency}% OPTIMIZED</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-950 p-6 rounded-[32px] shadow-2xl shadow-slate-200 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                      <div className="flex items-center gap-6 relative z-10 text-white">
                        <div className="bg-white/5 p-5 rounded-2xl backdrop-blur-md">
                          <Building2 size={36} strokeWidth={2.5} className="text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black tracking-tight">Avg Flight Duration</h4>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-80">{summaryStats.avgFlightTime} MIN AVERAGE</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Card className="rounded-[32px] border-2 border-slate-100 shadow-xl overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-50 bg-[#f8fafc]/50 px-6 py-4">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-[#64748b]">Strategic Capacity Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByHospital.slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "black", fill: "#64748b" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "black", fill: "#64748b" }} />
                          <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                          <Bar dataKey="revenue" fill="url(#blueGradient)" radius={[10, 10, 0, 0]} barSize={60}>
                            <defs>
                              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                              </linearGradient>
                            </defs>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* 🤖 CHATBOT WIDGET */}
            <div className="fixed bottom-6 right-6 z-50">
              {isChatOpen ? (
                <Card className="w-[calc(100vw-3rem)] sm:w-96 shadow-2xl flex flex-col rounded-[32px] overflow-hidden border-2 border-blue-400 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white max-h-[70vh] sm:max-h-[85vh]">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-6 flex justify-between items-center border-b border-white/10 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden shadow-2xl">
                        <img src={chatBotImage} alt="AI Assistant" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-base tracking-tight">System Assistant</h3>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]"></span>
                          <p className="text-[10px] text-blue-100 uppercase tracking-widest font-black">Online</p>
                        </div>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setIsChatOpen(false)} className="text-white hover:bg-white/10 rounded-2xl h-10 w-10">✕</Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 h-[350px] custom-scrollbar">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] px-5 py-3.5 rounded-3xl shadow-sm ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-none shadow-blue-200 shadow-xl" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"}`}>
                          <p className="text-xs sm:text-sm font-bold leading-relaxed">{msg.text}</p>
                          <span className={`text-[9px] mt-2 block font-black uppercase opacity-40 ${msg.sender === "user" ? "text-right" : ""}`}>{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
                    <Input placeholder="Ask about system records..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend(e)} className="flex-1 h-14 rounded-2xl border-slate-200 focus:border-blue-500 bg-slate-50 text-xs sm:text-sm font-bold shadow-inner" />
                    <Button size="icon" onClick={() => handleSend(null)} className="h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 active:scale-90 transition-transform"><Send size={20} /></Button>
                  </div>
                </Card>
              ) : (
                <Button onClick={() => setIsChatOpen(true)} className="p-0 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-white animate-bounce h-16 w-16 bg-blue-600 overflow-hidden relative group">
                  <img src={chatBotImage} alt="Assistant" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent transition-colors"></div>
                </Button>
              )}
            </div>

            {/* 📁 OPERATIONAL DIALOGS */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-5 py-3 shrink-0">
                  <DialogTitle className="text-white font-black uppercase tracking-widest text-lg">Update Data Record</DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 text-black">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Identifier</label><Input value={form.id || ""} readOnly className="h-10 bg-slate-100/50 border-slate-200 font-black text-slate-600 rounded-lg text-sm" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Status</label>
                      <Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 font-black text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-lg text-sm"><SelectItem value="requested">Requested</SelectItem><SelectItem value="clinical_review">Clinical Review</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forecast Revenue ($)</label><Input type="number" value={form.estimatedCost ?? 0} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })} className="h-10 rounded-lg border-slate-200 font-black text-sm" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight Chronology (min)</label><Input type="number" value={form.estimatedFlightTime ?? 0} onChange={(e) => setForm({ ...form, estimatedFlightTime: Number(e.target.value) })} className="h-10 rounded-lg border-slate-200 font-black text-sm" /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100"><Button variant="ghost" onClick={() => setEditOpen(false)} className="h-10 px-6 rounded-xl font-black text-slate-400 hover:bg-slate-100 uppercase tracking-widest text-[10px]">Discard</Button><Button onClick={submitEdit} className="h-10 px-8 rounded-xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-95 transition-all text-[10px]">Submit Changes</Button></div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={!!viewBooking} onOpenChange={() => setViewBooking(null)}>
              <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-5 py-3 shrink-0">
                  <DialogTitle className="text-white font-black uppercase tracking-widest text-lg">Booking Intelligence Report</DialogTitle>
                </DialogHeader>
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 text-black">
                  {viewBooking && (
                    <div className="max-w-4xl mx-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                        <div className="p-5 bg-white rounded-2xl shadow-md border border-slate-50"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Booking ID</p><p className="font-mono text-base font-black text-blue-600">{viewBooking.booking_id || viewBooking.id}</p></div>
                        <div className="p-5 bg-white rounded-2xl shadow-md border border-slate-50"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Badge</p>{getStatusBadge(viewBooking.status, "status")}</div>
                        <div className="p-5 bg-white rounded-2xl shadow-md border border-slate-50"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority Level</p>{getStatusBadge(viewBooking.urgency, "urgency")}</div>
                      </div>
                      <div className="bg-white rounded-3xl shadow-lg border-none overflow-hidden transition-all">
                        <table className="w-full text-xs font-bold text-slate-700">
                          <tbody>
                            <tr className="border-b border-slate-50/50"><td className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest bg-slate-50/30">Patient Identity</td><td className="px-6 py-4"><span className="text-sm font-black">{getPatientName(viewBooking.patientId)}</span></td></tr>
                            <tr className="border-b border-slate-50/50"><td className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest bg-slate-50/30">Transfer Path</td><td className="px-6 py-4 flex items-center gap-4"><span className="font-black text-slate-900">{getHospitalName(viewBooking.originHospitalId)}</span><span className="text-blue-500">→</span><span className="font-black text-slate-900">{getHospitalName(viewBooking.destinationHospitalId)}</span></td></tr>
                            <tr className="border-b border-slate-50/50"><td className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest bg-slate-50/30">Temporal Stamp</td><td className="px-6 py-4">{viewBooking.requestedAt ? format(new Date(viewBooking.requestedAt), "PPP p") : "DATA_RESTRICTED"}</td></tr>
                            <tr className="border-b border-slate-50/50"><td className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest bg-slate-50/30">Financial Resolution</td><td className="px-6 py-4 text-emerald-600 text-xl font-black tracking-tighter">${(viewBooking.estimatedCost ?? 0).toLocaleString()} <span className="text-[9px] text-slate-300 font-black ml-1 mt-auto">USD</span></td></tr>
                            <tr><td className="px-6 py-4 text-[10px] uppercase text-slate-400 tracking-widest bg-slate-50/30">Flight Duration</td><td className="px-6 py-4 font-black text-slate-900">{(viewBooking.estimatedFlightTime ?? 0)} MIN</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-center"><Button onClick={() => setViewBooking(null)} className="h-10 px-8 rounded-full font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-lg text-[10px]">Exit Visualizer</Button></div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-5 py-3 shrink-0">
                  <DialogTitle className="text-white font-black uppercase tracking-widest text-lg">Initialize System Entry</DialogTitle>
                </DialogHeader>
                <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/20 text-black">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record Identifier (Primary Key)</label><Input value={form.id || ""} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Reference..." className="h-10 rounded-xl border-slate-200 font-black shadow-inner text-sm" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Vector</label><Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="requested">Requested</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Flag</label><Select value={form.urgency || ""} onValueChange={(v) => setForm({ ...form, urgency: v })}><SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="routine">Routine</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Value ($)</label><Input type="number" value={form.estimatedCost ?? 0} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })} className="h-10 rounded-xl border-slate-200 font-black text-sm" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Time (min)</label><Input type="number" value={form.estimatedFlightTime ?? 0} onChange={(e) => setForm({ ...form, estimatedFlightTime: Number(e.target.value) })} className="h-10 rounded-xl border-slate-200 font-black text-sm" /></div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100"><Button variant="ghost" onClick={() => setAddOpen(false)} className="h-10 px-8 rounded-xl font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancel</Button><Button onClick={submitAdd} className="h-10 px-10 rounded-xl font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg active:scale-95 transition-all text-[10px]">Initialize Record</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TooltipProvider>
      )}
    </Layout>
  );
}
