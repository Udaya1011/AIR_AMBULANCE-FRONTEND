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
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
          fetch('/api/patients/').then(r => r.json()).catch(() => []),
          fetch('/api/hospitals/').then(r => r.json()).catch(() => []),
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

  // analytics / aggregated values
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings.reduce((s, b) => s + (Number(b.estimatedCost) || 0), 0);
  const avgFlightTime =
    bookings.length > 0 ? Math.round(bookings.reduce((s, b) => s + (Number(b.estimatedFlightTime) || 0), 0) / bookings.length) : 0;

  // filtered bookings (search + filters)
  const filteredBookings = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return bookings.filter((b) => {
      const matchesSearch = !q || (b.id || "").toString().toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesUrgency = urgencyFilter === "all" || b.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [bookings, searchTerm, statusFilter, urgencyFilter]);

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
        aiResponseText = `Total revenue is $${totalRevenue.toLocaleString()}.`;
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

      const rows: [string, string][] = [
        ["Booking ID", b.id || "N/A"],
        ["Date", b.requestedAt ? format(new Date(b.requestedAt), "PPpp") : "N/A"],
        ["Status", b.status || "N/A"],
        ["Urgency", b.urgency || "N/A"],
        ["Estimated Cost", `$${(b.estimatedCost ?? 0).toLocaleString()}`],
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
      map.set(key, (map.get(key) ?? 0) + (Number(b.estimatedCost) || 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([month, revenue]) => ({ month, revenue }));
  })();

  const flightTimeTrend = bookings.map((b, i) => ({
    index: i + 1,
    flightTime: Number(b.estimatedFlightTime) || 0,
    cost: Number(b.estimatedCost) || 0,
  }));

  return (
    <Layout>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <TooltipProvider>
          <div>
            {/* Header - neutral, no background */}
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold">Reports &amp; Analytics</h1>
                  <p className="mt-1 text-sm text-gray-600">Operational reports, utilization and billing</p>
                </div>

                <div>
                  <Button onClick={openAdd} className="px-4 py-2 rounded-lg font-semibold">
                    <Plus size={16} className="mr-2" /> Add Booking
                  </Button>
                </div>
              </div>

              {/* Stat cards - neutral background */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Bookings" value={totalBookings} icon={BarChart3} iconBgColor="transparent" valueColor="text-gray-900" />
                <StatCard title="Completed" value={completedBookings} icon={CheckCircle} iconBgColor="transparent" valueColor="text-gray-900" />
                <StatCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} iconBgColor="transparent" valueColor="text-gray-900" />
                <StatCard title="Avg Flight Time" value={`${avgFlightTime} min`} icon={Clock} iconBgColor="transparent" valueColor="text-gray-900" />
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
                      Billing &amp; Invoices
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
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">URGENCY</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">COST</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ACTIONS</TableHead>
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
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.id}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {b.requestedAt ? format(new Date(b.requestedAt), "MMM dd, yyyy") : "N/A"}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(b.status, "status")}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(b.urgency, "urgency")}</TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${(b.estimatedCost ?? 0).toLocaleString()}</TableCell>

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

                        {/* PAGINATION CONTROLS FOR BOOKING REPORTS */}
                        {filteredBookings.length > itemsPerPage && (
                          <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                            <Button
                              variant="outline"
                              disabled={currentPageBookings === 1}
                              onClick={() => handlePageChangeBookings(currentPageBookings - 1)}
                              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
                            >
                              Previous
                            </Button>

                            <div className="flex gap-1">
                              {Array.from({ length: totalPagesBookings }, (_, i) => i + 1).map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPageBookings === page ? "default" : "outline"}
                                  onClick={() => handlePageChangeBookings(page)}
                                  className={`w-10 h-10 p-0 font-bold ${currentPageBookings === page
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
                              disabled={currentPageBookings === totalPagesBookings}
                              onClick={() => handlePageChangeBookings(currentPageBookings + 1)}
                              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* BILLING TAB */}
                  <TabsContent value="billing" className="mt-6">
                    <Card className="rounded-lg border-none">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800">Billing &amp; Invoices</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto border rounded-lg">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">BOOKING</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DATE</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">COST</TableHead>
                                <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">INVOICE</TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {paginatedBilling.map((b, index) => (
                                <TableRow key={b.id}>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{b.id}</TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.requestedAt ? format(new Date(b.requestedAt), "MMM dd, yyyy") : "N/A"}</TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${(b.estimatedCost ?? 0).toLocaleString()}</TableCell>

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

                        {/* PAGINATION CONTROLS FOR BILLING */}
                        {bookings.length > itemsPerPage && (
                          <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                            <Button
                              variant="outline"
                              disabled={currentPageBilling === 1}
                              onClick={() => handlePageChangeBilling(currentPageBilling - 1)}
                              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
                            >
                              Previous
                            </Button>

                            <div className="flex gap-1">
                              {Array.from({ length: totalPagesBilling }, (_, i) => i + 1).map((page) => (
                                <Button
                                  key={page}
                                  variant={currentPageBilling === page ? "default" : "outline"}
                                  onClick={() => handlePageChangeBilling(page)}
                                  className={`w-10 h-10 p-0 font-bold ${currentPageBilling === page
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
                              disabled={currentPageBilling === totalPagesBilling}
                              onClick={() => handlePageChangeBilling(currentPageBilling + 1)}
                              className="bg-white border-gray-300 hover:bg-gray-100 text-black font-bold w-24"
                            >
                              Next
                            </Button>
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
                            <h3 className="font-semibold mb-3 text-gray-700">Revenue Trend</h3>
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
                      <MessageSquare className="h-6 w-6 text-white" />
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
              <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
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
                      <label className="text-sm font-medium">Estimated Cost ($)</label>
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
              <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
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
                            <td className="p-3 font-semibold">Cost</td>
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
              <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
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
                      <label className="text-sm font-medium">Estimated Cost ($)</label>
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