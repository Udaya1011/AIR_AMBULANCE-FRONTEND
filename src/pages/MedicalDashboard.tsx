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
    Stethoscope,
    Bed,
    UserPlus,
    Ambulance,
    Radio,
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

// Medical Dashboard Header Banner
const DashboardBanner = () => (
    <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 shadow-2xl mb-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-30" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute right-32 bottom-0 w-40 h-40 bg-white/10 rounded-full -mb-20" />

        <div className="relative z-10 flex items-center justify-between h-full px-8">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden border-4 border-white/30">
                    <Ambulance className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">AIR AMBULANCE COMMAND</h1>
                    <p className="text-blue-100 font-bold text-sm mt-1 tracking-wide">YOUR SAFETY IS OUR PRIORITY</p>
                </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-5 py-2 bg-white/20 backdrop-blur-sm rounded-xl border-2 border-white/30">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-white font-black text-sm">OPERATIONAL</span>
            </div>
        </div>
    </div>
);

// Medical Style KPI Card
const MedicalKpiCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = "blue",
}: {
    title: string;
    value: number | string;
    icon: any;
    trend?: "up" | "down";
    trendValue?: string;
    color?: string;
}) => {
    const colorClasses = {
        blue: "from-blue-500 to-blue-600",
        red: "from-rose-500 to-rose-600",
        green: "from-emerald-500 to-emerald-600",
        amber: "from-amber-500 to-amber-600",
    };

    return (
        <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden group">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            <span className="text-xs font-bold">{trendValue}</span>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
};

// Mini Line Chart for Reports
const MiniLineChart = ({ data, color = "#3b82f6" }: { data: number[]; color?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 10;

        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;

        ctx.clearRect(0, 0, width, height);

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((value - min) / range) * (height - padding * 2);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw area fill
        ctx.lineTo(width - padding, height - padding);
        ctx.lineTo(padding, height - padding);
        ctx.closePath();
        ctx.fillStyle = `${color}20`;
        ctx.fill();
    }, [data, color]);

    return <canvas ref={canvasRef} width={200} height={80} className="w-full" />;
};

// Donut Chart Component
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
        const outerRadius = 80;
        const innerRadius = 50;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentAngle = -Math.PI / 2;

        data.forEach((item) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;

            // Draw donut slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();

            currentAngle += sliceAngle;
        });

        // Draw center circle (white)
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Draw percentage in center
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 24px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('100%', centerX, centerY);
    }, [data, total]);

    return (
        <div className="flex items-center gap-6">
            <canvas ref={canvasRef} width={200} height={200} />
            <div className="space-y-2">
                {data.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                            <p className="text-sm font-bold text-slate-700">{item.label}</p>
                            <p className="text-xs text-slate-500">{Math.round((item.value / total) * 100)}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Hospital Overview Card
const OverviewCard = ({ icon: Icon, value, label, color }: any) => (
    <Card className="border-2 border-slate-200 hover:border-blue-300 transition-all duration-300 rounded-xl">
        <CardContent className="p-4 text-center">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <p className="text-3xl font-black text-slate-900 mb-1">{value}</p>
            <p className="text-xs font-medium text-slate-500">{label}</p>
        </CardContent>
    </Card>
);

export default function MedicalStyleDashboard() {
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
                setBookings([]);
                setStats({
                    active_transfers: 0,
                    pending_approvals: 0,
                    available_aircraft: 0,
                    critical_patients: 0,
                });
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
            const cost = calculatedCost > 0 ? calculatedCost : (Number(b.estimatedCost) || Number(b.actualCost) || 0);
            return sum + cost;
        }, 0);
    }, [bookings, hospitals]);

    const totalPatients = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;

    // Sample data for charts
    const weeklyData = [45, 52, 48, 65, 58, 72, 68];
    const urgencyData = [
        { label: "Emergency", value: bookings.filter(b => b.urgency === 'emergency').length, color: "#ef4444" },
        { label: "Urgent", value: bookings.filter(b => b.urgency === 'urgent').length, color: "#f59e0b" },
        { label: "Routine", value: bookings.filter(b => b.urgency === 'routine').length, color: "#10b981" },
    ];

    if (loading) {
        return (
            <Layout subTitle="Medical Command Center" isFullHeight={true}>
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading Dashboard..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout subTitle="Medical Command Center" isFullHeight={true}>
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-gradient-to-br from-slate-50 to-blue-50/20">
                <div className="p-4 lg:p-6 space-y-6">
                    {/* Header Banner */}
                    <DashboardBanner />

                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MedicalKpiCard
                            title="Total Doctors"
                            value={stats?.available_aircraft || 0}
                            icon={Stethoscope}
                            trend="up"
                            trendValue="96%"
                            color="blue"
                        />

                        <MedicalKpiCard
                            title="Total Patients"
                            value={`${totalPatients}+`}
                            icon={Users}
                            trend="up"
                            trendValue="65%"
                            color="green"
                        />

                        <Card className="border-2 border-slate-200 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                                        <Activity className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-500 text-white">Doctors</Badge>
                                        <Badge className="bg-blue-500 text-white">Patients</Badge>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 font-medium mb-2">Report</p>
                                <MiniLineChart data={weeklyData} color="#8b5cf6" />
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-slate-200 shadow-lg rounded-xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                                        <IndianRupee className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-blue-500 text-white text-xs">Income</Badge>
                                        <Badge className="bg-rose-500 text-white text-xs">Outcome</Badge>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 font-medium mb-2">Balance</p>
                                <MiniLineChart data={[30, 45, 35, 50, 40, 60, 55]} color="#06b6d4" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Hospital Overview & Gender Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Hospital Overview */}
                        <div className="lg:col-span-2">
                            <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                                    <CardTitle className="text-lg font-black text-slate-800">Hospital Overview</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <OverviewCard icon={Users} value={45} label="Total Staff" color="from-blue-500 to-blue-600" />
                                        <OverviewCard icon={Bed} value={180} label="Total Beds" color="from-cyan-500 to-cyan-600" />
                                        <OverviewCard icon={Activity} value={12} label="Daily Surgery" color="from-emerald-500 to-emerald-600" />
                                        <OverviewCard icon={UserPlus} value={28} label="New Patients" color="from-amber-500 to-amber-600" />
                                        <OverviewCard icon={Ambulance} value={stats?.active_transfers || 0} label="Active Transfers" color="from-rose-500 to-rose-600" />
                                    </div>

                                    <div className="mt-6">
                                        <Button className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-black py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                                            <Calendar className="mr-3 h-5 w-5" />
                                            BOOK YOUR APPOINTMENTS WITH EASE
                                            <span className="ml-auto bg-white text-slate-900 px-3 py-1 rounded-lg text-sm">
                                                Appointment
                                            </span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Gender/Priority Distribution */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                                <CardTitle className="text-lg font-black text-slate-800">Priority Level</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <DonutChart data={urgencyData} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Statistics Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg rounded-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-emerald-600 font-bold mb-1">Completed Transfers</p>
                                        <p className="text-4xl font-black text-emerald-700">{completedBookings}</p>
                                    </div>
                                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <Activity className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg rounded-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blue-600 font-bold mb-1">Total Revenue</p>
                                        <p className="text-4xl font-black text-blue-700">₹{(totalRevenue / 1000).toFixed(0)}K</p>
                                    </div>
                                    <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <IndianRupee className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-lg rounded-xl">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-purple-600 font-bold mb-1">Critical Cases</p>
                                        <p className="text-4xl font-black text-purple-700">{stats?.critical_patients || 0}</p>
                                    </div>
                                    <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                        <AlertCircle className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
