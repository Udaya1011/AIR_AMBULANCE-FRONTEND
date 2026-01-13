import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import LiveMapComponent from "./LiveMapComponent";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Activity,
  ChevronRight,
  Plane,
  MapPin,
  User,
  Building2,
  IndianRupee,
  Zap,
  Heart,
  Stethoscope,
  Users,
  Shield,
  Navigation,
  X,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

// --- SUB-COMPONENTS ---

const KpiCardNew = ({ title, value, subValue, icon: Icon, trend, trendValue, colorClass, bgColorClass }: any) => (
  <Card className="border-0 shadow-sm rounded-[16px] bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300">
    <CardContent className="p-3.5 md:p-4">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${colorClass} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tight ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
            {trend === 'up' ? <TrendingUp className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
          <span className={`w-1 h-1 rounded-full ${bgColorClass}`}></span>
          {title}
        </p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tighter">{value}</h3>
          {subValue && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{subValue}</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ResourceMatrixItem = ({ icon: Icon, value, label, colorClass }: any) => (
  <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors group">
    <div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:border-blue-200 transition-colors`}>
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
    </div>
    <div className="text-center">
      <p className="text-sm font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  </div>
);

const MissionTelemetryCard = ({ id, status, onClickRoute }: any) => (
  <Card className="min-w-[180px] border border-slate-100 shadow-sm rounded-[12px] bg-white p-3 hover:border-blue-200 hover:shadow-md transition-all group shrink-0">
    <div className="flex items-center justify-between mb-2">
      <div className="p-1 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
        <Plane className="h-3 w-3" />
      </div>
      <Badge className="bg-slate-100 text-slate-500 text-[7px] font-black uppercase tracking-widest border-none px-1.5 py-0.5">
        {status.replace('_', ' ')}
      </Badge>
    </div>
    <div className="space-y-0 text-left">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tracking</p>
      <h4 className="text-[11px] font-black text-slate-800 tracking-tight">{id}</h4>
    </div>
    <div
      className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between group/link cursor-pointer"
      onClick={onClickRoute}
    >
      <div className="flex items-center gap-1">
        <MapPin className="h-2.5 w-2.5 text-blue-500" />
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Route</span>
      </div>
      <ChevronRight className="h-3 w-3 text-slate-300 group-hover/link:translate-x-0.5 group-hover/link:text-blue-500 transition-all" />
    </div>
  </Card>
);

// --- CHATBOT ---
type Msg = { sender: "bot" | "user"; text: string };
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(p => [...p, { sender: 'user', text: input }]);
    setTimeout(() => {
      setMessages(p => [...p, { sender: 'bot', text: 'Telemetry Link: Secured.' }]);
    }, 600);
    setInput('');
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-blue-600 shadow-lg flex items-center justify-center text-white hover:scale-105 transition-all z-50 border-2 border-white">
        <MessageCircle size={18} />
      </button>
      {isOpen && (
        <div className="fixed bottom-16 right-4 w-64 bg-white shadow-2xl rounded-lg border border-slate-200 z-50 flex flex-col max-h-[350px] overflow-hidden">
          <div className="bg-slate-900 p-2 text-white flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest">Assist</span>
            <X className="h-3 w-3 cursor-pointer" onClick={() => setIsOpen(false)} />
          </div>
          <div ref={scrollRef} className="flex-1 p-2 overflow-y-auto space-y-2 bg-slate-50/50">
            {messages.length === 0 && <p className="text-[10px] text-slate-400 italic">Ready for commands...</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2 rounded text-[10px] font-bold max-w-[90%] ${m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t bg-white flex gap-2">
            <input
              className="flex-1 text-[10px] border border-slate-200 p-1 rounded outline-none focus:border-blue-500"
              placeholder="Type..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <Button size="icon" className="h-7 w-7 bg-blue-600" onClick={handleSend}><Send size={12} /></Button>
          </div>
        </div>
      )}
    </>
  );
};

// --- MAIN PAGE ---

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients } = usePatients();
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingBooking, setViewingBooking] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bookingsData, statsData, hospitalsData] = await Promise.all([
          BookingService.list(),
          DashboardService.getStats(),
          HospitalService.getHospitals()
        ]);
        setBookings(bookingsData || []);
        setHospitals((hospitalsData || []).filter(Boolean));
        setStats(statsData || { active_transfers: 0, pending_approvals: 0, available_aircraft: 0, critical_patients: 0 });
      } catch (error) {
        toast.error("Telemetry error.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      return sum + (calculatedCost > 0 ? calculatedCost : (Number(b.estimatedCost) || Number(b.actualCost) || 0));
    }, 0);
  }, [bookings, hospitals]);

  const revenueChartData = useMemo(() => {
    const hospitalRev: Record<string, number> = {};
    bookings.forEach(b => {
      const hId = b.destinationHospitalId || b.originHospitalId;
      if (!hId) return;
      const hName = hospitals.find(h => h.id === hId)?.name || 'Unknown';
      let cost = Number(b.actualCost) || Number(b.estimatedCost) || 0;
      if (cost === 0 && b.originHospitalId && b.destinationHospitalId) {
        const o = hospitals.find(h => h.id === b.originHospitalId);
        const d = hospitals.find(h => h.id === b.destinationHospitalId);
        if (o?.coordinates && d?.coordinates) {
          const dist = calculateDistance(o.coordinates.lat, o.coordinates.lng, d.coordinates.lat, d.coordinates.lng);
          cost = calculateRevenue(dist);
        }
      }
      hospitalRev[hName] = (hospitalRev[hName] || 0) + cost;
    });
    return Object.entries(hospitalRev)
      .map(([name, value]) => ({ name: name.split(' ')[0], value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [bookings, hospitals]);

  const volumeChartData = useMemo(() => {
    const stCount: Record<string, number> = {};
    bookings.forEach(b => {
      const s = b.status || 'unknown';
      stCount[s] = (stCount[s] || 0) + 1;
    });
    const colors = {
      pending: '#f59e0b', approved: '#3b82f6', scheduled: '#6366f1',
      en_route: '#ef4444', completed: '#10b981', cancelled: '#94a3b8'
    };
    return Object.entries(stCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1, 4),
      value,
      color: (colors as any)[name] || '#94a3b8'
    }));
  }, [bookings]);

  const bioRecordsData = useMemo(() => {
    const counts = { F: 0, M: 0, O: 0 };
    patients.forEach(p => {
      const g = p.gender?.charAt(0).toUpperCase();
      if (g === 'F') counts.F++;
      else if (g === 'M') counts.M++;
      else counts.O++;
    });
    return [
      { name: 'F', value: counts.F, color: '#3b82f6' },
      { name: 'M', value: counts.M, color: '#10b981' },
      { name: 'O', value: counts.O, color: '#f59e0b' }
    ];
  }, [patients]);

  if (loading) return <Layout isFullHeight={true}><div className="h-full flex items-center justify-center"><LoadingSpinner /></div></Layout>;

  return (
    <Layout subTitle="Global Command Center" isFullHeight={true}>
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] px-4 py-3 space-y-3">

        {/* --- SECTION 1: MISSION INTELLIGENCE BANNER --- */}
        <Card className="border-0 shadow-lg rounded-[20px] bg-[#0f172a] text-white relative overflow-hidden h-[120px] flex items-center px-8 group shrink-0">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-600/10 to-transparent"></div>

          <div className="absolute right-[8%] top-1/2 -translate-y-1/2 hidden md:block">
            <div className="bg-white/5 backdrop-blur-md p-3 rounded-[16px] border border-white/10 w-28 text-center">
              <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">Live Ops</p>
              <div className="flex items-center justify-center gap-1">
                <h3 className="text-xl font-black text-white">{stats?.active_transfers || 14}</h3>
                <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl border-2 border-white/10 overflow-hidden shadow-xl">
              <img src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=1000&auto=format&fit=crop" className="h-full w-full object-cover" alt="Ops Lead" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30 w-fit">
                <Zap className="h-2 w-2 text-blue-400 animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-widest text-blue-400">Active</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tighter leading-none italic uppercase">Mission</h1>
                <h1 className="text-lg font-black text-blue-400 tracking-tighter leading-none italic uppercase">Intelligence</h1>
              </div>
            </div>
          </div>
        </Card>

        {/* --- SECTION 2: PRIMARY KPI GRID --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <KpiCardNew title="Fleet" value={`${stats?.available_aircraft || 5}/5`} subValue="Units" trend="up" trendValue="+100%" icon={Plane} colorClass="bg-blue-600" bgColorClass="bg-blue-600" />
          <KpiCardNew title="Critical" value={stats?.critical_patients || 2} subValue="EMS" trend="up" trendValue="+15%" icon={Shield} colorClass="bg-rose-600" bgColorClass="bg-rose-600" />
          <KpiCardNew title="Net yield" value={`₹${(totalRevenue / 100000).toFixed(1)}L`} subValue="NET" trend="up" trendValue="+14%" icon={IndianRupee} colorClass="bg-emerald-600" bgColorClass="bg-emerald-600" />
          <KpiCardNew title="Registry" value={bookings.length || 13} subValue="Bio" trend="down" trendValue="-5%" icon={Users} colorClass="bg-indigo-600" bgColorClass="bg-indigo-600" />
        </div>

        {/* --- SECTION 3: RESOURCE MATRIX & BIO RECORDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Resource Matrix Card */}
          <Card className="lg:col-span-8 border-0 shadow-sm rounded-[20px] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-0.5 h-4 bg-blue-600 rounded-full"></div>
                <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Resources</h2>
              </div>
              <div className="grid grid-cols-5 gap-1.5 border-b border-slate-50 pb-4">
                <ResourceMatrixItem icon={Building2} value={10} label="Hosp" colorClass="text-blue-500" />
                <ResourceMatrixItem icon={Heart} value={234} label="ICU" colorClass="text-emerald-500" />
                <ResourceMatrixItem icon={Stethoscope} value={42} label="Medics" colorClass="text-purple-500" />
                <ResourceMatrixItem icon={User} value={18} label="Capt" colorClass="text-amber-500" />
                <ResourceMatrixItem icon={Activity} value={124} label="Tech" colorClass="text-slate-500" />
              </div>
            </div>

            {/* Emergency Dispatch CTA */}
            <div className="mt-4 bg-[#0f172a] rounded-[16px] p-4 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10 flex flex-col gap-0.5">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[7px] w-fit px-1.5">INITIATED</Badge>
                <h3 className="text-sm font-black text-white tracking-tighter uppercase italic">Dispatch Portal</h3>
              </div>
              <Button
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg active:scale-95 transition-all z-10"
                onClick={() => navigate('/bookings')}
              >
                Dispatch Aircraft
              </Button>
              <div className="absolute right-0 top-0 h-full w-24 bg-blue-600/10 blur-[30px]"></div>
            </div>
          </Card>

          {/* Bio Records Card */}
          <Card className="lg:col-span-4 border-0 shadow-sm rounded-[20px] bg-white p-4">
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">Bio Analysis</h2>
            <div className="h-[100px] relative mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bioRecordsData} innerRadius={35} outerRadius={45} paddingAngle={6} dataKey="value">
                    {bioRecordsData.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <h3 className="text-lg font-black text-slate-800 leading-none">{bookings.length}</h3>
              </div>
            </div>
            <div className="space-y-1.5">
              {bioRecordsData.map(item => (
                <div key={item.name} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[8px] font-black text-slate-500 tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* --- SECTION 4: ANALYTICS CHARTS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Revenue Analytics */}
          <Card className="border-0 shadow-sm rounded-[20px] bg-white p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                <IndianRupee className="h-3 w-3 text-indigo-600" />
              </div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Revenue Analytics</h2>
            </div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 900, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#cr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Status Volume */}
          <Card className="border-0 shadow-sm rounded-[20px] bg-white p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-rose-50 rounded-lg">
                <Activity className="h-3 w-3 text-rose-600" />
              </div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Status Volume</h2>
            </div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 900, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fontWeight: 700, fill: '#94a3b8' }} />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                    {volumeChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* --- SECTION 5: MISSION TELEMETRY SLIDER --- */}
        <Card className="border-0 shadow-sm rounded-[20px] bg-white p-4 overflow-hidden shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-800 rounded-lg shadow-lg">
                <Navigation className="h-3 w-3 text-white" />
              </div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Telemetry Tracker</h2>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 rounded-full">
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">STABLE</span>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
            {bookings.length > 0 ? (
              bookings.slice(0, 10).map(b => (
                <MissionTelemetryCard
                  key={b.id}
                  id={b.booking_id || b.id.slice(-8).toUpperCase()}
                  status={b.status}
                  onClickRoute={() => setViewingBooking(b)}
                />
              ))
            ) : (
              <div className="w-full text-center py-4 text-slate-400 font-black uppercase text-[8px] tracking-widest">
                No active telemetry detected
              </div>
            )}
            {/* Fallback mockup items */}
            {bookings.length < 4 && [1, 2, 3].map(i => (
              <MissionTelemetryCard
                key={i}
                id={`AF-BK-APOLLO-00${i}`}
                status="dispatch_review"
                onClickRoute={() => toast.info('Simulation data enabled for demo.')}
              />
            ))}
          </div>
        </Card>

      </div>
      <Chatbot />

      {/* Live Map Dialog */}
      <Dialog open={!!viewingBooking} onOpenChange={() => setViewingBooking(null)}>
        <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden rounded-2xl border-none">
          <DialogHeader className="p-4 bg-slate-900 absolute top-0 left-0 right-0 z-10 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-white text-sm font-black uppercase tracking-widest">Mission Telemetry: {viewingBooking?.booking_id || viewingBooking?.id?.slice(-8).toUpperCase()}</DialogTitle>
              <p className="text-blue-400 text-[9px] font-bold uppercase tracking-widest mt-1">Satellite Vector Monitoring Active</p>
            </div>
            <X className="h-4 w-4 text-white cursor-pointer hover:scale-110 transition-transform" onClick={() => setViewingBooking(null)} />
          </DialogHeader>
          <div className="w-full h-full pt-16">
            {viewingBooking && (() => {
              const originH = hospitals.find(h => h.id === viewingBooking.originHospitalId);
              const destH = hospitals.find(h => h.id === viewingBooking.destinationHospitalId);

              const customRoute = (originH?.coordinates && destH?.coordinates) ? {
                code: viewingBooking.booking_id || 'MISSION-ALPHA',
                start: originH.coordinates,
                end: destH.coordinates,
                startName: originH.name,
                endName: destH.name
              } : null;

              return (
                <LiveMapComponent
                  aircraftData={[]}
                  customRoute={customRoute}
                />
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
