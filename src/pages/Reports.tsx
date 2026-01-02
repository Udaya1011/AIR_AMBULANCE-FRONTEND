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
  TabsContent,
} from "@/components/ui/tabs";

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
  BarChart3,
  Clock,
  DollarSign,
  CheckCircle,
  ReceiptText,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

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
const StatCard = ({
  title,
  value,
  icon: Icon,
  iconBgColor,
  valueColor,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor?: string;
  valueColor?: string;
}) => (
  <div className="rounded-xl p-5 flex items-center justify-between" style={{ background: "transparent" }}>
    <div>
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className={`mt-1 text-3xl font-bold ${valueColor ?? "text-gray-900"}`}>{value}</div>
    </div>
    <div className="p-3 rounded-full" style={{ background: iconBgColor ?? "transparent" }}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

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

  // PAGINATION STATE
  const [currentPageBookings, setCurrentPageBookings] = useState(1);
  const [currentPageBilling, setCurrentPageBilling] = useState(1);
  const itemsPerPage = 5;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsData, aircraftData, patientsData, hospitalsData] = await Promise.all([
          BookingService.list(),
          AircraftService.getAircrafts(),
          PatientsService.list(),
          HospitalService.getHospitals(),
        ]);
        setBookings(bookingsData.map((b: any) => ({ ...b, id: b._id || b.id })));
        setAircraft(aircraftData);
        setPatients(patientsData);
        setHospitals(hospitalsData);
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
  const summaryStats = useMemo(() => ({
    totalBookings: bookings.length,
    completedBookings: bookings.filter((b) => b.status === "completed").length,
    totalRevenue: bookings.reduce((s, b) => {
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
    }, 0),
    avgFlightTime: bookings.length > 0 ? Math.round(bookings.reduce((s, b) => s + (Number(b.estimatedFlightTime) || 0), 0) / bookings.length) : 0
  }), [bookings, hospitals]);

  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Analytics Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group" title="Operations Analytics">
            <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Ops Analytics</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Fleet Performance</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-100 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <ReceiptText className="h-3 w-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{summaryStats.totalBookings}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Apps</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:border-emerald-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Done</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600 tracking-tighter">{summaryStats.completedBookings}</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase">Flights</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Estimated Net Revenue</p>
            <p className="text-2xl font-black text-white tracking-tighter">${summaryStats.totalRevenue.toLocaleString()}</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Unified Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center justify-center h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative" title="Filters">
            <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${statusFilter !== 'all' || urgencyFilter !== 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
            {(statusFilter !== 'all' || urgencyFilter !== 'all') && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                {(statusFilter !== 'all' ? 1 : 0) + (urgencyFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
            Report Filters
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Urgency</p>
            <div className="flex flex-col gap-1">
              {['all', 'routine', 'urgent', 'emergency'].map(u => (
                <DropdownMenuItem key={u} onClick={() => setUrgencyFilter(u)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${urgencyFilter === u ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <span className="capitalize">{u.replace('all', 'All Urgency')}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Status</p>
            <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin">
              {['all', 'requested', 'clinical_review', 'dispatch_review', 'airline_confirmed', 'crew_assigned', 'in_transit', 'completed', 'cancelled'].map(s => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-2 py-1.5 cursor-pointer text-xs font-bold transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                  <span className="capitalize">{s.replace('_', ' ').replace('all', 'All Status')}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Global Search */}
      <div className="relative group max-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Global search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-9 pr-3 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full"
        />
      </div>

      <Button
        className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 transition-all active:scale-95 group border-b-4 border-blue-800"
        onClick={openAdd}
      >
        <Plus className="h-4 w-4 stroke-[3px] group-hover:rotate-90 transition-transform" />
        New Booking
      </Button>
    </div>
  );

  // PAGINATION LOGIC FOR BOOKING REPORTS
  const totalPagesBookings = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const start = (currentPageBookings - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPageBookings]);

  const handlePageChangeBookings = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPagesBookings) {
      setCurrentPageBookings(newPage);
    }
  };

  // PAGINATION LOGIC FOR BILLING
  const totalPagesBilling = Math.ceil(bookings.length / itemsPerPage);
  const paginatedBilling = useMemo(() => {
    const start = (currentPageBilling - 1) * itemsPerPage;
    return bookings.slice(start, start + itemsPerPage);
  }, [bookings, currentPageBilling]);

  const handlePageChangeBilling = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPagesBilling) {
      setCurrentPageBilling(newPage);
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

  // charts data
  const utilizationChartData = aircraft.map((a) => ({
    name: a.name ?? a.id ?? "Unknown",
    hours: Number(a.hoursFlown ?? a.hours ?? 0),
  }));

  const revenueByMonth = (() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const dt = b.requestedAt ? new Date(b.requestedAt) : new Date();
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

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
      map.set(key, (map.get(key) ?? 0) + cost);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([month, revenue]) => ({ month, revenue }));
  })();

  const flightTimeTrend = bookings.map((b, i) => ({
    index: i + 1,
    flightTime: Number(b.estimatedFlightTime) || 0,
    revenue: Number(b.estimatedCost) || 0,
    ratio: Number(b.estimatedFlightTime) > 0 ? Math.round(Number(b.estimatedCost) / Number(b.estimatedFlightTime)) : Number(b.estimatedCost) || 0,
  }));

  const revenueByHospital = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach(b => {
      const h = hospitals.find(h => h.id === b.originHospitalId);
      const name = h?.name || "Unknown";

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
      map.set(name, (map.get(name) || 0) + cost);
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
  }, [bookings, hospitals]);

  return (
    <Layout isFullHeight={true} subTitle="Operational Logs & Network Analytics" headerActions={headerActions}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <TooltipProvider>
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                System <span className="text-slate-400 font-bold ml-2">Intelligence</span>
              </h1>
            </div>

            {/* Stat cards - standardized premium feel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Network Ops</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">{summaryStats.totalBookings}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Successful Transits</p>
                  <p className="text-2xl font-black text-emerald-600 tracking-tighter">{summaryStats.completedBookings}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Managed Revenue</p>
                  <p className="text-2xl font-black text-blue-600 tracking-tighter">${summaryStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Transit Velocity</p>
                  <p className="text-2xl font-black text-amber-600 tracking-tighter">{summaryStats.avgFlightTime} min</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Main Content Area (Tabs Container) */}
            <div>
              <div>
                <Tabs defaultValue="bookings">
                  <TabsList className="gap-2 border-b border-gray-200 w-full mb-4 justify-start h-auto p-0 bg-transparent">
                    <TabsTrigger
                      value="bookings"
                      className="px-4 py-2 rounded-md font-semibold text-sm data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=inactive]:hover:bg-gray-100 transition-all duration-200"
                    >
                      Booking Reports
                    </TabsTrigger>
                    <TabsTrigger
                      value="aircraft"
                      className="px-4 py-2 rounded-md font-semibold text-sm data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=inactive]:hover:bg-gray-100 transition-all duration-200"
                    >
                      Aircraft Utilization
                    </TabsTrigger>
                    <TabsTrigger
                      value="billing"
                      className="px-4 py-2 rounded-md font-semibold text-sm data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=inactive]:hover:bg-gray-100 transition-all duration-200"
                    >
                      Revenue &amp; Invoices
                    </TabsTrigger>
                    <TabsTrigger
                      value="analytics"
                      className="px-4 py-2 rounded-md font-semibold text-sm data-[state=active]:bg-transparent data-[state=active]:text-black data-[state=inactive]:hover:bg-gray-100 transition-all duration-200"
                    >
                      Analytics
                    </TabsTrigger>
                  </TabsList>

                  {/* BOOKINGS TAB CONTENT */}
                  <TabsContent value="bookings" className="mt-6">
                    <Card className="rounded-lg border-none" style={{ background: "transparent" }}>
                      <CardHeader className="p-0 pb-4">
                        <CardTitle className="text-xl font-bold text-gray-800">Booking Records</CardTitle>
                      </CardHeader>

                      <CardContent className="p-0">
                        {/* Filter Section */}
                        <div className="space-y-6" style={{ background: "transparent" }}>
                          <div className="flex flex-wrap gap-4 items-center">
                            <Input
                              placeholder="Search by Booking ID..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full md:w-64 border-gray-300 rounded-md"
                            />

                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                              <SelectTrigger className="w-full md:w-48 border-gray-300 rounded-md">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="airline_confirmed">Airline Confirmed</SelectItem>
                                <SelectItem value="clinical_review">Clinical Review</SelectItem>
                                <SelectItem value="requested">Requested</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v)}>
                              <SelectTrigger className="w-full md:w-48 border-gray-300 rounded-md">
                                <SelectValue placeholder="All Urgency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Urgency</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                                <SelectItem value="routine">Routine</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Table: Neutral backgrounds */}
                        <div className="overflow-x-auto border rounded-lg" style={{ background: "transparent" }}>
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DATE</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">STATUS</TableHead>
                                <TableHead className="p-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">URGENCY</TableHead>
                                <TableHead className="p-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">REVENUE</TableHead>
                                <TableHead className="p-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {paginatedBookings.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                                    No bookings found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                paginatedBookings.map((b, index) => (
                                  <TableRow key={b.id}>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.booking_id || b.id}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {b.requestedAt ? format(new Date(b.requestedAt), "MMM dd, yyyy") : "N/A"}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(b.status, "status")}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(b.urgency, "urgency")}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
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
                                    </TableCell>

                                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                                      <div className="inline-flex gap-2 p-1 rounded-md">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button size="icon" className="h-8 w-8" onClick={() => setViewBooking(b)}>
                                              <Eye size={16} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>View Details</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button size="icon" className="h-8 w-8" onClick={() => downloadInvoice(b)}>
                                              <Download size={16} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Download Invoice</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openEdit(b)}>
                                              <Edit size={16} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Edit Booking</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button size="icon" className="h-8 w-8" onClick={() => handleDelete(b.id)}>
                                              <Trash2 size={16} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Delete Booking</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {totalPagesBookings > 1 && (
                          <div className="flex justify-center items-center gap-3 mt-6 pb-4">
                            {Array.from({ length: totalPagesBookings }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChangeBookings(page)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentPageBookings === page
                                  ? "bg-blue-600 scale-125 shadow-sm"
                                  : "bg-gray-300 hover:bg-gray-400"
                                  }`}
                                title={`Page ${page}`}
                                aria-label={`Go to page ${page}`}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* BILLING TAB */}
                  <TabsContent value="billing" className="mt-6">
                    <Card className="rounded-lg border-none">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">Revenue &amp; Invoices</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto border rounded-lg">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">BOOKING</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DATE</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">REVENUE</TableHead>
                                <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">INVOICE</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {paginatedBilling.map((b, index) => (
                                <TableRow key={b.id}>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.booking_id || b.id}</TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.requestedAt ? format(new Date(b.requestedAt), "MMM dd, yyyy") : "N/A"}</TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
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
                                  </TableCell>

                                  <TableCell className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <div className="inline-flex items-center justify-center gap-2">
                                      <ReceiptText size={18} className="text-gray-500" />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" className="h-8 w-8" onClick={() => downloadInvoice(b)}>
                                            <Download size={16} />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Download Invoice</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {totalPagesBilling > 1 && (
                          <div className="flex justify-center items-center gap-3 mt-6 pb-4">
                            {Array.from({ length: totalPagesBilling }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChangeBilling(page)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentPageBilling === page
                                  ? "bg-blue-600 scale-125 shadow-sm"
                                  : "bg-gray-300 hover:bg-gray-400"
                                  }`}
                                title={`Page ${page}`}
                                aria-label={`Go to page ${page}`}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* AIRCRAFT TAB */}
                  <TabsContent value="aircraft" className="mt-6">
                    <Card className="rounded-lg border-none">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">Aircraft Utilization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={utilizationChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} />
                              <YAxis axisLine={false} tickLine={false} />
                              <RechartsTooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} />
                              <Bar dataKey="hours" fill="#4B00FF" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ANALYTICS TAB */}
                  <TabsContent value="analytics" className="mt-6">
                    <Card className="rounded-lg border-none">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">Analytics Dashboard</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold mb-3 text-gray-700">Revenue Trend (Monthly)</h3>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueByMonth}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                  <YAxis axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} />
                                  <Legend />
                                  <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-3 text-gray-700">Revenue by Hospital</h3>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueByHospital}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                  <YAxis axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} />
                                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-3 text-gray-700">Flight Time Trend</h3>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={flightTimeTrend}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="index" axisLine={false} tickLine={false} />
                                  <YAxis axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} />
                                  <Line type="monotone" dataKey="flightTime" stroke="#60a5fa" strokeWidth={2} activeDot={{ r: 6 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-3 text-gray-700">Profitability Ratio (Revenue/Time)</h3>
                            <div className="h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={flightTimeTrend}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="index" axisLine={false} tickLine={false} />
                                  <YAxis axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} />
                                  <Bar dataKey="ratio" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Chatbot Widget - Fixed Position */}
            <div className="fixed bottom-6 right-6 z-50">
              {isChatOpen ? (
                <Card
                  className="w-96 shadow-2xl flex flex-col rounded-2xl overflow-hidden border-2 border-blue-300 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white max-h-[85vh]"
                  onMouseLeave={() => setIsChatOpen(false)}
                >
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center border-b border-blue-400">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-inner flex-shrink-0">
                        <img src={chatBotImage} alt="AI Reports Assistant" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">📊 Reports Assistant</h3>
                        <p className="text-xs text-blue-100">Online & Ready</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsChatOpen(false)}
                      className="bg-blue-500 hover:bg-blue-400 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center border border-blue-300"
                    >
                      ✕
                    </Button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white h-80 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
                        <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.sender === "user"
                          ? "bg-blue-500 text-white rounded-br-none shadow-lg"
                          : "bg-blue-50 text-black rounded-bl-none shadow-sm border border-blue-200"
                          }`}>
                          <p className="text-sm font-medium">{msg.text}</p>
                          <span className={`text-xs mt-1 block opacity-70 ${msg.sender === "user" ? "text-blue-100" : "text-blue-600"}`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="border-t-2 border-blue-300 p-3 bg-white flex gap-2">
                    <Input
                      placeholder="Ask about reports..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend(e)}
                      className="flex-1 rounded-full border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-black"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSend(null)}
                      className="bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded-full h-10 w-10 p-0 flex items-center justify-center"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  onClick={() => setIsChatOpen(true)}
                  className="p-0 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-white animate-bounce overflow-hidden h-16 w-16 flex items-center justify-center"
                >
                  <img src={chatBotImage} alt="Chatbot Assistant" className="w-full h-full object-cover rounded-full" />
                </Button>
              )}
            </div>

            {/* Edit dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                  <DialogTitle className="text-white text-xl">Edit Booking</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4 space-y-1.5">
                      <label className="text-sm font-medium">Booking ID</label>
                      <Input value={form.id || ""} readOnly className="h-9 bg-gray-50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Urgency</label>
                      <Select value={form.urgency || ""} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Estimated Revenue ($)</label>
                      <Input type="number" value={form.estimatedCost ?? 0} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Flight Time (min)</label>
                      <Input type="number" value={form.estimatedFlightTime ?? 0} onChange={(e) => setForm({ ...form, estimatedFlightTime: Number(e.target.value) })} className="h-9" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                    <Button variant="ghost" onClick={() => { setEditOpen(false); setEditingId(null); }}>Cancel</Button>
                    <Button onClick={() => submitEdit()} className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* View dialog */}
            <Dialog open={!!viewBooking} onOpenChange={() => setViewBooking(null)}>
              <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                  <DialogTitle className="text-white text-xl">Booking Details</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {viewBooking ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 font-semibold w-1/3">ID</td>
                            <td className="p-3">
                              <span className="font-mono text-sm px-2 py-1 rounded">
                                {viewBooking.id}
                              </span>
                            </td>
                          </tr>

                          <tr className="border-b">
                            <td className="p-3 font-semibold">Status</td>
                            <td className="p-3">
                              {getStatusBadge(viewBooking.status, "status")}
                            </td>
                          </tr>

                          <tr className="border-b">
                            <td className="p-3 font-semibold">Urgency</td>
                            <td className="p-3">
                              {getStatusBadge(viewBooking.urgency, "urgency")}
                            </td>
                          </tr>

                          <tr className="border-b">
                            <td className="p-3 font-semibold">Date</td>
                            <td className="p-3">
                              {viewBooking.requestedAt
                                ? format(new Date(viewBooking.requestedAt), "PPpp")
                                : "N/A"}
                            </td>
                          </tr>

                          <tr className="border-b">
                            <td className="p-3 font-semibold">Revenue</td>
                            <td className="p-3">
                              <span className="text-green-600 font-bold">
                                ${(viewBooking.estimatedCost ?? 0).toLocaleString()}
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td className="p-3 font-semibold">Flight Time</td>
                            <td className="p-3">
                              {(viewBooking.estimatedFlightTime ?? 0)} min
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                  <DialogTitle className="text-white text-xl">Add New Booking</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4 space-y-1.5">
                      <label className="text-sm font-medium">Booking ID</label>
                      <Input value={form.id || ""} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Booking ID (e.g., AB-1234)" className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Urgency</label>
                      <Select value={form.urgency || ""} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Estimated Revenue ($)</label>
                      <Input type="number" value={form.estimatedCost ?? 0} onChange={(e) => setForm({ ...form, estimatedCost: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-sm font-medium">Flight Time (min)</label>
                      <Input type="number" value={form.estimatedFlightTime ?? 0} onChange={(e) => setForm({ ...form, estimatedFlightTime: Number(e.target.value) })} className="h-9" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                    <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={submitAdd} className="bg-blue-600 hover:bg-blue-700 text-white">Add Booking</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div >
        </TooltipProvider >
      )}
    </Layout >
  );
}