import React, { useState, useRef, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Plane,
    Shield,
    AlertCircle,
    TrendingUp,
    Users,
    IndianRupee,
    Navigation,
    Building2,
    Bed,
    Stethoscope,
    UserCog,
    Zap,
    Send,
    Radio,
    MapPin,
    ArrowRight,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

// Mission Intelligence Header Banner
const MissionBanner = ({ liveTransfers }: { liveTransfers: number }) => (
    <div className="relative h-48 rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl mb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)] opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center justify-between h-full px-10">
            {/* Left: Avatar & Title */}
            <div className="flex items-center gap-8">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 shadow-2xl flex items-center justify-center overflow-hidden border-4 border-slate-600/50 transform hover:scale-105 transition-transform">
                    <Users className="h-14 w-14 text-slate-300" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-blue-300 text-xs font-black uppercase tracking-wider">Command Active</span>
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight mb-2">
                        MISSION <span className="text-blue-400">INTELLIGENCE</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Navigation className="h-3 w-3" />
                        <p className="text-sm font-bold uppercase tracking-widest">Sector Alpha • Live Data Stream Hub</p>
                    </div>
                </div>
            </div>

            {/* Right: Live Transfers Counter */}
            <div className="bg-slate-800/80 backdrop-blur-md border-2 border-slate-700/50 rounded-2xl px-8 py-6 shadow-xl hover:shadow-2xl transition-all">
                <div className="text-blue-400 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Live Transfers
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-6xl font-black text-white">{liveTransfers}</div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                </div>
            </div>
        </div>
    </div>
);

// Premium KPI Card
const PremiumKpiCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    trend,
    gradient,
}: any) => (
    <Card className="border-2 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white">
        <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-4 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7 text-white" />
                </div>
                {trend && (
                    <Badge className={`${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} border-0 font-black text-xs`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </Badge>
                )}
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
            </div>
        </CardContent>
    </Card>
);

// Resource Icon Card
const ResourceIcon = ({ icon: Icon, value, label, color }: any) => (
    <div className="text-center group cursor-pointer">
        <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
    </div>
);

// Donut Chart
const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = 90;
        const innerRadius = 60;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentAngle = -Math.PI / 2;

        data.forEach((item) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();

            currentAngle += sliceAngle;
        });

        // Center
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 36px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(total), centerX, centerY - 5);
        ctx.font = 'bold 12px Inter';
        ctx.fillStyle = '#64748b';
        ctx.fillText('REGISTRY', centerX, centerY + 15);
    }, [data, total]);

    return (
        <div className="flex flex-col items-center gap-6">
            <canvas ref={canvasRef} width={220} height={220} />
            <div className="space-y-3 w-full">
                {data.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">{item.label}</span>
                        </div>
                        <span className="text-lg font-black text-slate-900">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Aircraft Tracking Card
const AircraftCard = ({ aircraft }: any) => (
    <Card className="border-2 border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl group">
        <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg group-hover:scale-110 transition-transform">
                    <Plane className="h-5 w-5 text-white" />
                </div>
                <Badge className="bg-slate-100 text-slate-700 border-0 font-black text-xs">
                    DISPATCH REVIEW
                </Badge>
            </div>
            <div className="space-y-3">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Tracking Active</p>
                    <p className="text-xl font-black text-slate-900">{aircraft.code}</p>
                </div>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm group/btn">
                    <MapPin className="h-4 w-4" />
                    <span>Live Route</span>
                    <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </CardContent>
    </Card>
);

// Revenue Area Chart
const RevenueAreaChart = ({ hospitals }: { hospitals: any[] }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const data = hospitals.slice(0, 3).map((h, i) => ({
        name: h?.name || h?.hospital_name || `Hospital ${i + 1}`,
        value: [500, 400, 50][i] || 100,
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;

        ctx.clearRect(0, 0, width, height);

        const max = Math.max(...data.map(d => d.value));
        const stepX = (width - padding * 2) / (data.length - 1);

        // Draw area
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);

        data.forEach((point, i) => {
            const x = padding + i * stepX;
            const y = height - padding - (point.value / max) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        data.forEach((point, i) => {
            const x = padding + i * stepX;
            const y = height - padding - (point.value / max) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        data.forEach((point, i) => {
            const x = padding + i * stepX;
            ctx.fillText(point.name.split(' ')[0].toUpperCase(), x, height - 10);
        });
    }, [data]);

    return <canvas ref={canvasRef} width={500} height={300} className="w-full" />;
};

// Volume Bar Chart
const VolumeBarChart = ({ bookings }: { bookings: any[] }) => {
    const statuses = ['requested', 'approved', 'scheduled', 'in_transit', 'completed'];
    const labels = ['Pending', 'Approved', 'Scheduled', 'En Route', 'Completed'];
    const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981'];

    const data = statuses.map((status, i) => ({
        label: labels[i],
        value: bookings.filter(b => b.status === status || (status === 'requested' && b.status === 'pending')).length,
        color: colors[i],
    }));

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 h-64 items-end">
                {data.map((item, index) => (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                        <div className="w-full relative">
                            <div
                                className="w-full rounded-t-xl transition-all duration-700 ease-out"
                                style={{
                                    height: `${(item.value / maxValue) * 200}px`,
                                    backgroundColor: item.color,
                                    animation: `slideUp 0.7s ease-out ${index * 0.1}s both`,
                                }}
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-slate-900">{item.value}</div>
                            <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slideUp {
          from { height: 0; }
        }
      `}</style>
        </div>
    );
};

export default function MissionControlDashboard() {
    const { getPatientById } = usePatients();
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
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
                console.error("Failed to fetch dashboard data:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const totalRevenue = useMemo(() => {
        return (bookings || []).reduce((sum, b) => {
            let calculatedCost = 0;
            if (b.originHospitalId && b.destinationHospitalId) {
                const origin = hospitals.find(h => h.id === b.originHospitalId);
                const dest = hospitals.find(h => h.id === b.destinationHospitalId);
                if (origin?.coordinates && dest?.coordinates) {
                    const dist = calculateDistance(
                        origin.coordinates.lat,
                        origin.coordinates.lng,
                        dest.coordinates.lat,
                        dest.coordinates.lng
                    );
                    calculatedCost = calculateRevenue(dist);
                }
            }
            return sum + (calculatedCost > 0 ? calculatedCost : (Number(b.estimatedCost) || 0));
        }, 0);
    }, [bookings, hospitals]);

    const liveTransfers = bookings.filter(b => ['in_transit', 'en_route', 'scheduled'].includes(b.status)).length;
    const bioData = [
        { label: "Female", value: 4, color: "#3b82f6" },
        { label: "Male", value: 9, color: "#10b981" },
        { label: "Other", value: 0, color: "#f59e0b" },
    ];

    const aircraftList = [
        { code: "AF-BK-KUMARAN-003" },
        { code: "AF-BK-APOLLO-001" },
        { code: "AF-BK-SARAN-002" },
        { code: "AF-BK-001" },
    ];

    if (loading) {
        return (
            <Layout subTitle="Global Command Center" isFullHeight={true}>
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Initializing Mission Control..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout subTitle="Global Command Center" isFullHeight={true}>
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
                <div className="p-6 space-y-6">
                    {/* Mission Intelligence Banner */}
                    <MissionBanner liveTransfers={liveTransfers} />

                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <PremiumKpiCard
                            icon={Plane}
                            title="Aero-Readiness"
                            value={`${stats?.available_aircraft || 5}/5`}
                            subtitle="Avail Units"
                            trend={100}
                            gradient="from-blue-600 to-blue-700"
                        />
                        <PremiumKpiCard
                            icon={Shield}
                            title="Critical Load"
                            value={stats?.critical_patients || 2}
                            subtitle="Emergency"
                            trend={15}
                            gradient="from-rose-500 to-rose-600"
                        />
                        <PremiumKpiCard
                            icon={IndianRupee}
                            title="Operational Yield"
                            value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
                            subtitle="Net Revenue"
                            trend={14}
                            gradient="from-emerald-500 to-emerald-600"
                        />
                        <PremiumKpiCard
                            icon={Users}
                            title="Total Registry"
                            value={13}
                            subtitle="Bio Records"
                            trend={-5}
                            gradient="from-purple-600 to-purple-700"
                        />
                    </div>

                    {/* Resource Matrix & Bio Records */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Resource Matrix */}
                        <Card className="lg:col-span-2 border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 bg-blue-600 rounded-full" />
                                    <CardTitle className="text-xl font-black text-slate-900">RESOURCE MATRIX</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-5 gap-8 mb-8">
                                    <ResourceIcon icon={Building2} value={hospitals.length} label="Hospitals" color="from-blue-500 to-blue-600" />
                                    <ResourceIcon icon={Bed} value={234} label="ICU Mode" color="from-emerald-500 to-emerald-600" />
                                    <ResourceIcon icon={Stethoscope} value={42} label="Air Medics" color="from-purple-500 to-purple-600" />
                                    <ResourceIcon icon={UserCog} value={18} label="Captains" color="from-amber-500 to-amber-600" />
                                    <ResourceIcon icon={Zap} value={124} label="Tech Staff" color="from-slate-500 to-slate-600" />
                                </div>

                                {/* Emergency Extraction */}
                                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent)]" />
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div>
                                            <div className="text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">Ready to Launch</div>
                                            <h3 className="text-3xl font-black text-white mb-2 italic">EMERGENCY EXTRACTION</h3>
                                            <p className="text-slate-400 text-sm">Direct satellite uplink for immediate aircraft mobilization.</p>
                                            <p className="text-slate-500 text-xs mt-1">Locked Channel secured.</p>
                                        </div>
                                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl font-black text-sm shadow-xl hover:shadow-2xl transition-all">
                                            <Send className="mr-2 h-5 w-5" />
                                            DISPATCH AIRCRAFT
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bio Records */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                                <CardTitle className="text-xl font-black text-slate-900">BIO RECORDS</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <DonutChart data={bioData} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mission Telemetry */}
                    <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                        <CardHeader className="border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Navigation className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-xl font-black italic">MISSION TELEMETRY</CardTitle>
                                </div>
                                <Badge className="bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-2" />
                                    SIGNAL: STABLE
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {aircraftList.map((aircraft, i) => (
                                    <AircraftCard key={i} aircraft={aircraft} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analytics Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Chart */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <IndianRupee className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <CardTitle className="text-xl font-black text-slate-900">HOSPITAL REVENUE YIELD</CardTitle>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Operational Financial Analytics</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <RevenueAreaChart hospitals={hospitals} />
                            </CardContent>
                        </Card>

                        {/* Volume Chart */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-rose-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="p-2 bg-rose-100 rounded-lg">
                                                <Activity className="h-5 w-5 text-rose-600" />
                                            </div>
                                            <CardTitle className="text-xl font-black text-slate-900">MISSION VOLUME ANALYSIS</CardTitle>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Live Status Distribution</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <VolumeBarChart bookings={bookings} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
