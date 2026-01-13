import React, { useState, useRef, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Plane,
    Clock,
    AlertCircle,
    TrendingUp,
    Users,
    IndianRupee,
    MapPin,
    Building2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Radio,
    MessageSquare,
    CheckCircle2,
    Map as MapIcon,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import LiveMapComponent from "./LiveMapComponent";

// --- CUSTOM COMPONENTS ---

const DashboardCard = ({ title, value, subValue, icon: Icon, trend, trendValue, colorClass }: any) => (
    <Card className="border-0 shadow-sm rounded-xl bg-white overflow-hidden relative group">
        <CardContent className="p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 shadow-sm`}>
                    <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
                    {subValue && <span className="text-[11px] font-bold text-slate-400">{subValue}</span>}
                </div>
            </div>
        </CardContent>
    </Card>
);

const SectionHeader = ({ title, icon: Icon, badge }: any) => (
    <div className="flex items-center justify-between mb-4 mt-2">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
                <Icon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em]">{title}</h2>
        </div>
        {badge && (
            <Badge className="bg-blue-600 text-white font-black text-[10px] border-none px-3">
                {badge}
            </Badge>
        )}
    </div>
);

// --- MAIN PAGE ---

export default function LiveTrackingDashboard() {
    const { getPatientById } = usePatients();
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // We don't set loading true on refresh to avoid flickers
                const [bookingsData, statsData, hospitalsData] = await Promise.all([
                    BookingService.list(),
                    DashboardService.getStats(),
                    HospitalService.getHospitals(),
                ]);

                setBookings(bookingsData || []);
                setHospitals((hospitalsData || []).filter(Boolean));
                setStats(statsData || {
                    active_transfers: 0,
                    pending_approvals: 0,
                    available_aircraft: 0,
                    critical_patients: 0,
                });
            } catch (error) {
                console.error("Dashboard refresh error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); // Fast refresh for "Live" feel
        return () => clearInterval(interval);
    }, []);

    // Derived Data
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

    const activeMissions = useMemo(() => bookings.filter(b => b.status === 'in_transit'), [bookings]);

    // Chart Data
    const revenueProgress = useMemo(() => {
        const data = [
            { name: 'Sun', value: 400000 },
            { name: 'Mon', value: 300000 },
            { name: 'Tue', value: 200000 },
            { name: 'Wed', value: 278000 },
            { name: 'Thu', value: 189000 },
            { name: 'Fri', value: 239000 },
            { name: 'Sat', value: 349000 },
        ];
        // Inject real today's data roughly
        data[6].value = Math.min(totalRevenue, 1000000);
        return data;
    }, [totalRevenue]);

    const statusData = useMemo(() => {
        const counts = {
            requested: bookings.filter(b => b.status === 'requested').length,
            in_transit: bookings.filter(b => b.status === 'in_transit').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
        };
        return [
            { name: 'Pending', value: counts.requested, color: '#f59e0b' },
            { name: 'Active', value: counts.in_transit, color: '#3b82f6' },
            { name: 'Done', value: counts.completed, color: '#10b981' },
            { name: 'Failed', value: counts.cancelled, color: '#ef4444' },
        ];
    }, [bookings]);

    const aircraftDataForMap = useMemo(() => {
        // Find aircraft from active transfers
        return activeMissions.map((b, i) => {
            const h = hospitals.find(h => h.id === b.originHospitalId);
            return {
                id: b.id || i.toString(),
                registration: `AIR-${b.id?.slice(-4).toUpperCase() || 'AMB'}`,
                type: 'Pilatus PC-12',
                status: 'in_flight' as const,
                latitude: h?.coordinates?.lat || 20.5937 + (Math.random() - 0.5) * 5,
                longitude: h?.coordinates?.lng || 78.9629 + (Math.random() - 0.5) * 5,
            };
        });
    }, [activeMissions, hospitals]);

    if (loading) return <LoadingSpinner />;

    return (
        <Layout subTitle="Global Mission Matrix" isFullHeight={true}>
            <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">

                {/* --- 1. KPI TOP ROW --- */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <DashboardCard
                        title="Active Missions"
                        value={stats?.active_transfers || 0}
                        trend="up" trendValue="12%"
                        icon={Activity} colorClass="bg-blue-600"
                    />
                    <DashboardCard
                        title="Clinicals Open"
                        value={stats?.pending_approvals || 0}
                        icon={Clock} colorClass="bg-amber-600"
                    />
                    <DashboardCard
                        title="Fleet Status"
                        value={stats?.available_aircraft || 0}
                        subValue="Ready"
                        trend="up" trendValue="+2"
                        icon={Plane} colorClass="bg-emerald-600"
                    />
                    <DashboardCard
                        title="Critical Alert"
                        value={stats?.critical_patients || 0}
                        icon={AlertCircle} colorClass="bg-rose-600"
                    />
                    <div className="col-span-1 lg:col-span-2">
                        <DashboardCard
                            title="Net Network Revenue"
                            value={`₹${(totalRevenue / 1000).toFixed(1)}k`}
                            trend="up" trendValue="18.5%"
                            icon={IndianRupee} colorClass="bg-indigo-600"
                        />
                    </div>
                </div>

                {/* --- 2. MIDDLE INTEL SECTION --- */}
                <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Progress Trend (Cirswift Style Line) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden flex-1">
                            <CardHeader className="pb-2">
                                <SectionHeader title="Performance Trend" icon={TrendingUp} />
                            </CardHeader>
                            <CardContent className="h-[250px] p-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueProgress} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSlope" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            formatter={(value: any) => [`₹${(value / 1000).toFixed(0)}k`, 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSlope)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Status Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                                <SectionHeader title="Status Breakdown" icon={CheckCircle2} />
                                <div className="h-[200px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2">
                                        {statusData.map(s => (
                                            <div key={s.name} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                                <span className="text-[10px] font-black uppercase text-slate-500">{s.name} ({s.value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-0 shadow-sm rounded-2xl bg-white p-6">
                                <SectionHeader title="Quick Actions" icon={MessageSquare} />
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all border border-blue-100 group">
                                        <Users className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-blue-800 uppercase">Manage Staff</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all border border-emerald-100 group">
                                        <MapIcon className="h-6 w-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-emerald-800 uppercase">Route Audit</span>
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* LIVE TRACKING MAP (The "Responsive View Correctl") */}
                    <div className="lg:col-span-4 flex flex-col h-full min-h-[500px]">
                        <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden flex-1 flex flex-col">
                            <CardHeader className="bg-slate-900 border-none px-6 py-4 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Air-Space</h3>
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-tighter shadow-none">
                                        {activeMissions.length} LIVE OBJECTS
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 relative min-h-0 bg-slate-900">
                                <LiveMapComponent
                                    aircraftData={aircraftDataForMap}
                                    center={[20.5937, 78.9629]}
                                    zoom={4}
                                />
                                {/* Map Overlay Intel */}
                                <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-col gap-2">
                                    {activeMissions.slice(0, 1).map(m => {
                                        const p = getPatientById(m.patientId);
                                        return (
                                            <div key={m.id} className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-white/50 shadow-2xl animate-in slide-in-from-bottom-2">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-black text-blue-600 uppercase">Target Payload</span>
                                                    <Badge className="bg-rose-500 h-1.5 w-1.5 p-0 rounded-full animate-ping border-none" />
                                                </div>
                                                <p className="font-black text-slate-800 text-xs">{p?.name || 'Emergency Patient'}</p>
                                                <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-slate-500">
                                                    <span>En Route: {hospitals.find(h => h.id === m.destinationHospitalId)?.name || 'Facility'}</span>
                                                    <span className="text-blue-600">32m REMAINING</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
