import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    Bell,
    Search,
    ShoppingCart,
    X,
    Navigation2,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

// Route Map Visualization Component
function RouteMapVisualization({ route }: { route: any }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !route) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;

        ctx.clearRect(0, 0, width, height);

        // Calculate map bounds
        const lats = [route.origin.coordinates.lat, route.destination.coordinates.lat];
        const lngs = [route.origin.coordinates.lng, route.destination.coordinates.lng];
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latRange = (maxLat - minLat) || 1;
        const lngRange = (maxLng - minLng) || 1;

        // Map coordinates to canvas
        const mapToCanvas = (lat: number, lng: number) => {
            const x = padding + ((lng - minLng) / lngRange) * (width - padding * 2);
            const y = height - padding - ((lat - minLat) / latRange) * (height - padding * 2);
            return { x, y };
        };

        const origin = mapToCanvas(route.origin.coordinates.lat, route.origin.coordinates.lng);
        const dest = mapToCanvas(route.destination.coordinates.lat, route.destination.coordinates.lng);

        // Draw background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#f1f5f9');
        bgGradient.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        for (let i = 0; i <= 4; i++) {
            const x = padding + (i / 4) * (width - padding * 2);
            const y = padding + (i / 4) * (height - padding * 2);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw route line with gradient
        const lineGradient = ctx.createLinearGradient(origin.x, origin.y, dest.x, dest.y);
        lineGradient.addColorStop(0, '#3b82f6');
        lineGradient.addColorStop(1, '#10b981');

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(dest.x, dest.y);
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw dashed line underneath
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(dest.x, dest.y);
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw origin marker (blue)
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw destination marker (green)
        ctx.beginPath();
        ctx.arc(dest.x, dest.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Origin', origin.x, origin.y - 35);
        ctx.fillText('Destination', dest.x, dest.y - 35);

        // Draw distance on line
        const midX = (origin.x + dest.x) / 2;
        const midY = (origin.y + dest.y) / 2;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.strokeText(`${route.distance} km`, midX, midY - 10);
        ctx.fillText(`${route.distance} km`, midX, midY - 10);

    }, [route]);

    return (
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg">
            <canvas ref={canvasRef} width={800} height={400} className="w-full" />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Live Route Map</p>
            </div>
        </div>
    );
}

export default function PremiumDashboard() {
    const navigate = useNavigate();
    const { getPatientById } = usePatients();
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoute, setSelectedRoute] = useState<any>(null);
    const [showRouteDialog, setShowRouteDialog] = useState(false);

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

    const handleDispatchClick = () => {
        navigate('/aircraft');
    };

    const handleLiveRouteClick = (bookingCode: string) => {
        // Find booking that matches the code
        const booking = bookings.find(b => {
            const bookingId = b.id || b._id || '';
            return bookingId.includes(bookingCode.split('-').pop() || '');
        });

        if (booking && booking.originHospitalId && booking.destinationHospitalId) {
            const origin = hospitals.find(h => h.id === booking.originHospitalId);
            const dest = hospitals.find(h => h.id === booking.destinationHospitalId);

            if (origin?.coordinates && dest?.coordinates) {
                const distance = calculateDistance(
                    origin.coordinates.lat,
                    origin.coordinates.lng,
                    dest.coordinates.lat,
                    dest.coordinates.lng
                );

                setSelectedRoute({
                    booking,
                    origin: { ...origin, name: origin.name || origin.hospital_name },
                    destination: { ...dest, name: dest.name || dest.hospital_name },
                    distance: distance.toFixed(2),
                    code: bookingCode,
                });
                setShowRouteDialog(true);
            } else {
                toast.error('Hospital coordinates not available for this route');
            }
        } else {
            toast.info('No booking data available for this aircraft');
        }
    };

    if (loading) {
        return (
            <Layout subTitle="Global Command Center" isFullHeight={true}>
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading Dashboard..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout subTitle="Global Command Center" isFullHeight={true}>
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="p-8 space-y-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-full">

                    {/* TOP SECTION - HEADER & SEARCH */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 mb-1">Dashboard</h1>
                            <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Global Command Center</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Quick search..."
                                    className="pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all w-64"
                                />
                            </div>
                            <button className="p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl hover:bg-white transition-all">
                                <ShoppingCart className="h-5 w-5 text-slate-600" />
                            </button>
                            <button className="p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl hover:bg-white transition-all relative">
                                <Bell className="h-5 w-5 text-slate-600" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            </button>
                        </div>
                    </div>

                    {/* DARK BANNER - MISSION INTELLIGENCE */}
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] mb-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent)]" />
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-20 w-64 h-64 bg-blue-700/5 rounded-full blur-3xl" />

                        <div className="relative z-10 flex items-center justify-between p-10 px-12">
                            <div className="flex items-center gap-8">
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-600 shadow-2xl flex items-center justify-center border-4 border-slate-600/50 overflow-hidden">
                                    <Users className="h-16 w-16 text-slate-300" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-600/20 border border-blue-500/40 rounded-lg backdrop-blur-sm">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
                                            <span className="text-blue-300 text-xs font-black uppercase tracking-widest">Command Active</span>
                                        </div>
                                    </div>

                                    <h1 className="text-6xl font-black text-white tracking-tight mb-2 leading-none">
                                        MISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">INTELLIGENCE</span>
                                    </h1>

                                    <div className="flex items-center gap-2 text-slate-400 mt-3">
                                        <Navigation className="h-4 w-4" />
                                        <p className="text-sm font-bold uppercase tracking-[0.2em]">Sector Alpha • Live Data Stream Hub</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/90 backdrop-blur-xl border-2 border-slate-700/60 rounded-3xl px-10 py-8 shadow-2xl min-w-[200px]">
                                <div className="text-blue-300 text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 justify-center">
                                    <Radio className="h-4 w-4 animate-pulse" />
                                    Live Transfers
                                </div>
                                <div className="text-7xl font-black text-white text-center relative">
                                    {liveTransfers}
                                    <div className="absolute -right-2 -top-2 w-3 h-3 bg-emerald-400 rounded-full animate-ping shadow-lg shadow-emerald-500/50" />
                                    <div className="absolute -right-2 -top-2 w-3 h-3 bg-emerald-400 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4 KPI CARDS ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Card 1: Aero-Readiness */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                            <CardContent className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-xl shadow-blue-600/30 group-hover:shadow-2xl group-hover:shadow-blue-600/40 group-hover:scale-110 transition-all duration-300">
                                        <Plane className="h-7 w-7 text-white" />
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-0 font-black text-xs px-3 py-1">
                                        +100%
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Aero-Readiness</p>
                                    </div>
                                    <p className="text-5xl font-black text-slate-900 tracking-tighter">5/5</p>
                                    <p className="text-sm font-semibold text-slate-500">Avail Units</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Critical Load */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                            <CardContent className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-xl shadow-rose-500/30 group-hover:shadow-2xl group-hover:shadow-rose-500/40 group-hover:scale-110 transition-all duration-300">
                                        <Shield className="h-7 w-7 text-white" />
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-0 font-black text-xs px-3 py-1">
                                        +15%
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-rose-400 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Critical Load</p>
                                    </div>
                                    <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.critical_patients || 2}</p>
                                    <p className="text-sm font-semibold text-slate-500">Emergency</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Operational Yield */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                            <CardContent className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/30 group-hover:shadow-2xl group-hover:shadow-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                                        <IndianRupee className="h-7 w-7 text-white" />
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-0 font-black text-xs px-3 py-1">
                                        +14%
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Operational Yield</p>
                                    </div>
                                    <p className="text-5xl font-black text-slate-900 tracking-tighter">₹{(totalRevenue / 100000).toFixed(1)}L</p>
                                    <p className="text-sm font-semibold text-slate-500">Net Revenue</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 4: Total Registry */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] transition-all duration-300 group">
                            <CardContent className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-xl shadow-purple-600/30 group-hover:shadow-2xl group-hover:shadow-purple-600/40 group-hover:scale-110 transition-all duration-300">
                                        <Users className="h-7 w-7 text-white" />
                                    </div>
                                    <Badge className="bg-rose-50 text-rose-700 border-0 font-black text-xs px-3 py-1">
                                        -5%
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Total Registry</p>
                                    </div>
                                    <p className="text-5xl font-black text-slate-900 tracking-tighter">13</p>
                                    <p className="text-sm font-semibold text-slate-500">Bio Records</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RESOURCE MATRIX & BIO RECORDS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Resource Matrix + Emergency Extraction */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Resource Matrix Card */}
                            <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden">
                                <CardHeader className="border-b border-slate-100 pb-5 pt-7 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-10 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30" />
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">RESOURCE MATRIX</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pb-6">
                                    <div className="grid grid-cols-5 gap-6">
                                        {[
                                            { icon: Building2, value: hospitals.length || 10, label: "Hospitals", color: "from-blue-500 to-blue-600" },
                                            { icon: Bed, value: 234, label: "ICU Mode", color: "from-emerald-500 to-emerald-600" },
                                            { icon: Stethoscope, value: 42, label: "Air Medics", color: "from-purple-500 to-purple-600" },
                                            { icon: UserCog, value: 18, label: "Captains", color: "from-amber-500 to-amber-600" },
                                            { icon: Zap, value: 124, label: "Tech Staff", color: "from-slate-500 to-slate-600" },
                                        ].map((item, i) => (
                                            <div key={i} className="text-center group cursor-pointer">
                                                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} shadow-xl ${item.color.includes('blue') ? 'shadow-blue-600/20' : item.color.includes('emerald') ? 'shadow-emerald-600/20' : item.color.includes('purple') ? 'shadow-purple-600/20' : item.color.includes('amber') ? 'shadow-amber-600/20' : 'shadow-slate-600/20'} flex items-center justify-center group-hover:scale-110 group-hover:shadow-2xl transition-all duration-300`}>
                                                    <item.icon className="h-8 w-8 text-white" />
                                                </div>
                                                <div className="text-4xl font-black text-slate-900 mb-1.5">{item.value}</div>
                                                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Emergency Extraction Dark Card */}
                            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] p-8">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.12),transparent)]" />
                                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-700/5 rounded-full blur-3xl" />

                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                                            <span className="text-emerald-300 text-xs font-black uppercase tracking-[0.2em]">Ready to Launch</span>
                                        </div>
                                        <h3 className="text-4xl font-black text-white mb-3 italic tracking-tight">EMERGENCY EXTRACTION</h3>
                                        <p className="text-slate-400 text-sm font-medium mb-1">Direct satellite uplink for immediate aircraft mobilization.</p>
                                        <p className="text-slate-600 text-xs font-bold">Locked Channel secured.</p>
                                    </div>

                                    <Button
                                        onClick={handleDispatchClick}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-7 rounded-2xl font-black text-base shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 hover:translate-y-[-2px] transition-all duration-300"
                                    >
                                        <Send className="mr-3 h-6 w-6" />
                                        DISPATCH AIRCRAFT
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Bio Records Donut Chart */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-5 pt-7 px-8">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">BIO RECORDS</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <DonutChart />
                            </CardContent>
                        </Card>
                    </div>

                    {/* MISSION TELEMETRY */}
                    <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden mb-8">
                        <CardHeader className="border-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-3xl py-6 px-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                        <Navigation className="h-6 w-6 text-white" />
                                    </div>
                                    <CardTitle className="text-2xl font-black italic tracking-tight">MISSION TELEMETRY</CardTitle>
                                </div>
                                <Badge className="bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-200 font-black px-4 py-2 text-xs backdrop-blur-sm">
                                    <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse mr-2 shadow-lg shadow-emerald-500/50" />
                                    SIGNAL: STABLE
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {["AF-BK-KUMARAN-003", "AF-BK-APOLLO-001", "AF-BK-SARAN-002", "AF-BK-001"].map((code, i) => (
                                    <Card key={i} className="border-0 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06)] rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300 group">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-all duration-300">
                                                    <Plane className="h-5 w-5 text-white" />
                                                </div>
                                                <Badge className="bg-slate-100 text-slate-700 border-0 font-black text-[10px] px-3 py-1.5">
                                                    DISPATCH REVIEW
                                                </Badge>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Tracking Active</p>
                                                    <p className="text-xl font-black text-slate-900">{code}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleLiveRouteClick(code)}
                                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm group/btn transition-colors"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                    <span>Live Route</span>
                                                    <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* CHARTS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Chart */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-5 pt-7 px-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-blue-100 rounded-2xl">
                                        <IndianRupee className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">HOSPITAL REVENUE YIELD</CardTitle>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Operational Financial Analytics</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <RevenueAreaChart hospitals={hospitals} />
                            </CardContent>
                        </Card>

                        {/* Volume Chart */}
                        <Card className="border-0 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl overflow-hidden">
                            <CardHeader className="border-b border-slate-100 pb-5 pt-7 px-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="p-3 bg-rose-100 rounded-2xl">
                                        <Activity className="h-6 w-6 text-rose-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">MISSION VOLUME ANALYSIS</CardTitle>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Live Status Distribution</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <VolumeBarChart bookings={bookings} />
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>

            {/* Route Visualization Dialog */}
            <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
                <DialogContent className="max-w-4xl bg-white rounded-3xl border-0 shadow-2xl p-0">
                    <DialogHeader className="p-8 pb-6 border-b border-slate-100">
                        <DialogTitle className="text-3xl font-black text-slate-900 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-2xl">
                                <Navigation2 className="h-7 w-7 text-blue-600" />
                            </div>
                            <div>
                                <div>Live Route Tracking</div>
                                <p className="text-sm font-medium text-slate-500 mt-1">{selectedRoute?.code}</p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRoute && (
                        <div className="p-8 space-y-6">
                            {/* Route Map Visualization */}
                            <RouteMapVisualization route={selectedRoute} />

                            {/* Hospital Details */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-blue-600 rounded-xl">
                                            <MapPin className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Origin Hospital</p>
                                            <p className="text-xl font-black text-blue-900">{selectedRoute.origin.name}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-blue-700">
                                        📍 {selectedRoute.origin.coordinates.lat.toFixed(4)}, {selectedRoute.origin.coordinates.lng.toFixed(4)}
                                    </p>
                                </div>

                                <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-emerald-600 rounded-xl">
                                            <Building2 className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">Destination Hospital</p>
                                            <p className="text-xl font-black text-emerald-900">{selectedRoute.destination.name}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-emerald-700">
                                        📍 {selectedRoute.destination.coordinates.lat.toFixed(4)}, {selectedRoute.destination.coordinates.lng.toFixed(4)}
                                    </p>
                                </div>
                            </div>

                            {/* Distance & Time */}
                            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white shadow-xl">
                                <div className="text-center flex-1 border-r border-white/20">
                                    <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-2">Total Distance</p>
                                    <p className="text-5xl font-black">{selectedRoute.distance}</p>
                                    <p className="text-sm font-bold opacity-80 mt-1">kilometers</p>
                                </div>
                                <div className="text-center flex-1">
                                    <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-2">Estimated Time</p>
                                    <p className="text-5xl font-black">{Math.round(parseFloat(selectedRoute.distance) / 8)}</p>
                                    <p className="text-sm font-bold opacity-80 mt-1">minutes</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

// Donut Chart Component
function DonutChart() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const data = [
        { label: "Female", value: 4, color: "#3b82f6" },
        { label: "Male", value: 9, color: "#10b981" },
        { label: "Other", value: 0, color: "#f59e0b" },
    ];
    const total = data.reduce((sum, item) => sum + item.value, 0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = 95;
        const innerRadius = 65;

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

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 42px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(total), centerX, centerY - 8);
        ctx.font = 'bold 13px Inter';
        ctx.fillStyle = '#64748b';
        ctx.fillText('REGISTRY', centerX, centerY + 18);
    }, [data, total]);

    return (
        <div className="flex flex-col items-center gap-8">
            <canvas ref={canvasRef} width={240} height={240} />
            <div className="space-y-4 w-full">
                {data.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-black uppercase tracking-wide text-slate-700">{item.label}</span>
                        </div>
                        <span className="text-2xl font-black text-slate-900">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Revenue Area Chart
function RevenueAreaChart({ hospitals }: { hospitals: any[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const data = hospitals.slice(0, 3).map((h, i) => ({
        name: (h?.name || h?.hospital_name || `Hospital ${i + 1}`).split(' ')[0].toUpperCase(),
        value: [500, 400, 50][i] || 100,
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;

        ctx.clearRect(0, 0, width, height);

        const max = Math.max(...data.map(d => d.value));
        const stepX = (width - padding * 2) / (data.length - 1);

        // Draw grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i / 5) * (height - padding * 2);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw area fill
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        data.forEach((point, i) => {
            const x = padding + i * stepX;
            const y = height - padding - (point.value / max) * (height - padding * 2);
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
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
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw points
        data.forEach((point, i) => {
            const x = padding + i * stepX;
            const y = height - padding - (point.value / max) * (height - padding * 2);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        // Draw labels
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        data.forEach((point, i) => {
            const x = padding + i * stepX;
            ctx.fillText(point.name, x, height - 15);
        });

        // Draw Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = max - (i / 5) * max;
            const y = padding + (i / 5) * (height - padding * 2);
            ctx.fillText(`₹${Math.round(value)}k`, padding - 15, y + 5);
        }
    }, [data]);

    return <canvas ref={canvasRef} width={540} height={320} className="w-full" />;
}

// Volume Bar Chart
function VolumeBarChart({ bookings }: { bookings: any[] }) {
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
        <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4 h-64 items-end">
                {data.map((item, index) => (
                    <div key={item.label} className="flex flex-col items-center gap-3">
                        <div className="w-full relative">
                            <div
                                className="w-full rounded-t-2xl shadow-lg transition-all duration-700 ease-out group hover:shadow-xl"
                                style={{
                                    height: `${(item.value / maxValue) * 200}px`,
                                    backgroundColor: item.color,
                                    animation: `slideUp 0.8s ease-out ${index * 0.12}s both`,
                                    boxShadow: `0 4px 20px ${item.color}40`,
                                }}
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-slate-900 mb-1">{item.value}</div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slideUp {
          from { height: 0; opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
