import React, { useState, useRef, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import chatBotImage from '../emoji.jpeg';
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plane,
  AlertCircle,
  Clock,
  TrendingUp,
  Activity,
  Eye,
  Trash2,
  Download,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
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
  <div className="p-0">
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  </div>
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
}

const Chatbot: React.FC<ChatbotProps> = ({ stats, bookings }) => {
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
                <h3 className="font-bold text-white">📊 Dashboard Assistant</h3>
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Helper functions from Bookings page
  const getPatientName = (patientId: string) => {
    if (!patientId) return 'Unknown Patient';
    const patient = getPatientById(patientId);
    return patient?.name || 'Unknown Patient';
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
        setBookings(bookingsData || []);
        setHospitals(hospitalsData || []);
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
    return bookings.filter((booking: any) => {
      // Resolve patient name for searching
      let patientName = "";
      if (booking.patientId) {
        const p = getPatientById(booking.patientId);
        patientName = p?.name || p?.full_name || "";
      } else if (booking.patient) {
        patientName = booking.patient?.full_name || booking.patient?.name || (typeof booking.patient === 'string' ? booking.patient : "");
      } else if (booking.patientName) {
        patientName = booking.patientName;
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

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getBookingDetails = (booking: any) => {
    // Resolve patient ID to name using PatientsContext
    let patientName = "N/A";
    if (booking.patientId) {
      const patient = getPatientById(booking.patientId);
      patientName = patient?.name || patient?.full_name || "N/A";
    } else if (booking.patient) {
      patientName = booking.patient?.full_name || booking.patient?.name || booking.patient;
    }

    // Resolve origin hospital ID to name
    let originName = "N/A";
    if (booking.originHospitalId) {
      const hospital = hospitals.find(h => h.id === booking.originHospitalId);
      originName = hospital?.name || hospital?.hospital_name || "N/A";
    } else if (booking.origin_hospital) {
      originName = booking.origin_hospital?.hospital_name || booking.origin_hospital?.name || booking.origin_hospital;
    }

    // Resolve destination hospital ID to name
    let destinationName = "N/A";
    if (booking.destinationHospitalId) {
      const hospital = hospitals.find(h => h.id === booking.destinationHospitalId);
      destinationName = hospital?.name || hospital?.hospital_name || "N/A";
    } else if (booking.destination_hospital) {
      destinationName = booking.destination_hospital?.hospital_name || booking.destination_hospital?.name || booking.destination_hospital;
    }

    return {
      ...booking,
      patient: patientName,
      origin: originName,
      destination: destinationName,
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
      return [
        b.id,
        b.patient?.full_name || "-",
        b.origin_hospital?.hospital_name || "-",
        b.destination_hospital?.hospital_name || "-",
        b.status,
        b.urgency,
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [["ID", "Patient", "Origin", "Destination", "Status", "Urgency"]],
      body: allData,
    });

    doc.save("All_Bookings_Report.pdf");
  };

  return (
    <Layout>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.email || "User"}</h1>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Active Transfers" value={stats?.active_transfers || 0} icon={<Activity />} />
            <KpiCard title="Pending Approvals" value={stats?.pending_approvals || 0} icon={<Clock />} />
            <KpiCard title="Available Aircraft" value={stats?.available_aircraft || 0} icon={<Plane />} />
            <KpiCard title="Critical Patients" value={stats?.critical_patients || 0} icon={<AlertCircle />} />
          </div>

          {/* BOOKINGS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Manage Bookings
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Search + Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Input
                  placeholder="Search patient, hospital, or ID..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full md:w-72"
                />

                <select
                  className="border p-2 rounded-md bg-background w-40"
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  title="Filter by status"
                >
                  <option value="">All Status</option>
                  <option value="requested">Requested</option>
                  <option value="clinical_review">Clinical Review</option>
                  <option value="dispatch_review">Dispatch Review</option>
                  <option value="airline_confirmed">Airline Confirmed</option>
                  <option value="crew_assigned">Crew Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  className="border p-2 rounded-md bg-background w-32"
                  value={urgencyFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUrgencyFilter(e.target.value)}
                  title="Filter by urgency"
                >
                  <option value="">Urgency</option>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setUrgencyFilter("");
                  }}
                  className="w-32"
                >
                  Clear
                </Button>

                <Button
                  onClick={handleExportAll}
                  className="ml-auto p-2 h-10 w-10 rounded-lg hover:bg-blue-100 transition"
                  title="Export all data"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left">Patient</th>
                      <th className="p-3 text-left">Origin</th>
                      <th className="p-3 text-left">Destination</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Urgency</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-muted-foreground">
                          No bookings found.
                        </td>
                      </tr>
                    ) : (
                      currentItems.map((booking: any) => {
                        const details = getBookingDetails(booking);

                        return (
                          <tr key={booking.id} className="border-b hover:bg-muted/20 transition">
                            <td className="p-3">{details.patient}</td>
                            <td className="p-3">{details.origin}</td>
                            <td className="p-3">{details.destination}</td>

                            <td className="p-3">
                              <Badge className="capitalize">{booking.status.replace("_", " ")}</Badge>
                            </td>

                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {booking.urgency}
                              </Badge>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setViewingBooking(details)}
                                >
                                  <Eye className="w-4 h-4 text-blue-500" />
                                </Button>

                                <Button variant="ghost" size="icon" onClick={() => handleDownload(booking)}>
                                  <Download className="w-4 h-4 text-green-500" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setBookings((prev: any) => prev.filter((b: any) => b.id !== booking.id))}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredBookings.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-4">
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
            </CardContent>
          </Card>

          {/* DIALOG: VIEW BOOKING */}
          <Dialog open={!!viewingBooking} onOpenChange={() => setViewingBooking(null)}>
            <DialogContent className="w-[90vw] max-w-none max-h-[70vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
              <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                <DialogTitle className="text-white text-xl">Booking Details</DialogTitle>
              </DialogHeader>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <table className="min-w-full text-sm border border-gray-300 rounded-lg overflow-hidden">
                  <tbody>
                    {viewingBooking &&
                      Object.entries(viewingBooking).map(([key, value]: [string, any]) => {
                        if (key === "approvals" || key === "timeline") return null;
                        return (
                          <tr key={key} className="border-b">
                            <td className="font-semibold capitalize p-3 w-1/3 bg-gray-100">
                              {key.replace("_", " ")}
                            </td>
                            <td className="p-3 leading-relaxed">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          {/* AIRCRAFT + STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5" /> Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recent activities.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {activities.map((activity) => (
                      <li key={activity.id}>
                        {activity.description} <span className="text-xs text-gray-400">({new Date(activity.timestamp).toLocaleDateString()})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Stat label="Total Bookings" value={bookings.length} />
                  <Stat label="Active Transfers" value={stats?.active_transfers || 0} />
                  <Stat label="Pending Approvals" value={stats?.pending_approvals || 0} />
                </div>
              </CardContent>
            </Card>

            {/* ACTIVITIES */}
            {/* Removed duplicate activities card since we repurposed the aircraft card for activities or we can keep it if we want to show something else. 
              Let's actually keep the Activities card but use the real data, and maybe replace the Aircraft Fleet Status with something else or just remove it if we don't have that data handy in the same format.
              The previous replacement replaced "Aircraft Fleet Status" with "Recent Activities". 
              So I will remove this hardcoded "Recent Activities" block to avoid duplication.
           */}
          </div>

          <p className="text-center text-sm text-muted-foreground">&copy; Air Ambulance</p>

          {/* Chatbot Component */}
          <Chatbot stats={stats} bookings={bookings} />
        </div>
      )}
    </Layout>
  );
}
