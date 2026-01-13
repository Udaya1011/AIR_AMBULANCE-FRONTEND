import React, { useState, useRef, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { DashboardService, DashboardStats } from "@/services/dashboard.service";
import { BookingService } from "@/services/booking.service";
import { HospitalService } from "@/services/hospital.service";
import { usePatients } from "@/contexts/PatientsContext";
import { calculateDistance, calculateRevenue } from "@/utils/revenueUtils";
import { toast } from "sonner";

// Enhanced KPI Card with gradient and animation
const KpiCard = ({
    title,
    value,
    icon,
    gradient,
    trend,
    trendValue,
}: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    gradient: string;
    trend?: "up" | "down";
    trendValue?: string;
}) => (
    <Card className={`border-0 shadow-lg rounded-2xl bg-gradient-to-br ${gradient} text-white overflow-hidden relative group hover:scale-[1.02] transition-all duration-300`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
        <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`}>
                        {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span className="text-xs font-bold">{trendValue}</span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
                <p className="text-4xl font-black tracking-tight">{value}</p>
            </div>
        </CardContent>
    </Card>
);

// Live Status Indicator
const LiveIndicator = ({ status }: { status: string }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'in_transit':
            case 'en_route':
                return 'bg-emerald-500';
            case 'requested':
            case 'pending':
                return 'bg-amber-500';
            case 'completed':
                return 'bg-blue-500';
            case 'cancelled':
                return 'bg-rose-500';
            default:
                return 'bg-slate-500';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
                <div className={`absolute inset-0 h-2 w-2 rounded-full ${getStatusColor()} animate-ping opacity-75`} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">
                {status.replace('_', ' ')}
            </span>
        </div>
    );
};

// Pie Chart Component (Simple Canvas-based)
const PieChart = ({ data, title }: { data: { label: string; value: number; color: string }[]; title: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        const total = data.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let currentAngle = -Math.PI / 2;

        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const isHovered = hoveredIndex === index;
            const sliceRadius = isHovered ? radius + 10 : radius;

            ctx.beginPath();
            ctx.arc(centerX, centerY, sliceRadius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = item.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw percentage in the middle of slice
            const midAngle = currentAngle + sliceAngle / 2;
            const textRadius = sliceRadius * 0.7;
            const textX = centerX + Math.cos(midAngle) * textRadius;
            const textY = centerY + Math.sin(midAngle) * textRadius;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const percentage = Math.round((item.value / total) * 100);
            if (percentage > 5) {
                ctx.fillText(`${percentage}%`, textX, textY);
            }

            currentAngle += sliceAngle;
        });
    }, [data, hoveredIndex]);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">{title}</h3>
            <div className="flex flex-col lg:flex-row items-center gap-6">
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="max-w-full"
                />
                <div className="space-y-3 w-full lg:w-auto">
                    {data.map((item, index) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-3 cursor-pointer hover:translate-x-2 transition-transform"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: item.color }} />
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    <span className="text-lg font-black text-slate-900">{item.value}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Bar Chart Component
const BarChart = ({ data, title }: { data: { label: string; value: number; color: string }[]; title: string }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600">{title}</h3>
            <div className="space-y-3">
                {data.map((item, index) => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-700">{item.label}</span>
                            <span className="font-black text-slate-900">{item.value}</span>
                        </div>
                        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                            <div
                                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-3"
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: item.color,
                                    animation: `slideIn 0.7s ease-out ${index * 0.1}s both`
                                }}
                            >
                                <span className="text-white font-bold text-xs">{item.value > 0 && item.value}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
        @keyframes slideIn {
          from {
            width: 0%;
          }
        }
      `}</style>
        </div>
    );
};

// Live Tracking Card
const LiveTrackingCard = ({ booking, hospitals, getPatientById }: any) => {
    const patient = getPatientById(booking.patientId);
    const originHospital = hospitals.find((h: any) => h.id === booking.originHospitalId);
    const destHospital = hospitals.find((h: any) => h.id === booking.destinationHospitalId);

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'emergency':
                return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'urgent':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            default:
                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        }
    };

    return (
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Radio className="h-4 w-4 text-white animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 text-lg">{patient?.name || patient?.full_name || 'Patient'}</h4>
                            <p className="text-xs text-slate-500 font-medium">ID: {booking.id?.slice(0, 8)}</p>
                        </div>
                    </div>
                    <Badge className={`${getUrgencyColor(booking.urgency)} border font-black text-xs`}>
                        {booking.urgency}
                    </Badge>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">
                            {originHospital?.name || originHospital?.hospital_name || 'Origin'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                        <div className="h-8 w-0.5 bg-gradient-to-b from-blue-600 to-emerald-600 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-slate-700">
                            {destHospital?.name || destHospital?.hospital_name || 'Destination'}
                        </span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <LiveIndicator status={booking.status} />
                    <div className="flex items-center gap-1 text-blue-600">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-bold">{booking.estimatedFlightTime || 'N/A'} min</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function EnhancedDashboard() {
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
        // Refresh every 30 seconds for live updates
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Calculate metrics
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

    // Status distribution for pie chart
    const statusDistribution = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        bookings.forEach(b => {
            const status = b.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const colorMap: Record<string, string> = {
            'requested': '#f59e0b',
            'pending': '#f59e0b',
            'in_transit': '#10b981',
            'en_route': '#10b981',
            'completed': '#3b82f6',
            'cancelled': '#ef4444',
            'approved': '#8b5cf6',
            'scheduled': '#6366f1',
        };

        return Object.entries(statusCounts).map(([status, count]) => ({
            label: status.replace('_', ' ').toUpperCase(),
            value: count,
            color: colorMap[status] || '#64748b',
        }));
    }, [bookings]);

    // Urgency distribution for pie chart
    const urgencyDistribution = useMemo(() => {
        const urgencyCounts: Record<string, number> = { emergency: 0, urgent: 0, routine: 0 };
        bookings.forEach(b => {
            const urgency = b.urgency || 'routine';
            urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
        });

        return [
            { label: 'Emergency', value: urgencyCounts.emergency, color: '#ef4444' },
            { label: 'Urgent', value: urgencyCounts.urgent, color: '#f59e0b' },
            { label: 'Routine', value: urgencyCounts.routine, color: '#10b981' },
        ];
    }, [bookings]);

    // Hospital usage for bar chart
    const hospitalUsage = useMemo(() => {
        const hospitalCounts: Record<string, number> = {};
        bookings.forEach(b => {
            const hospitalId = b.originHospitalId;
            if (hospitalId) {
                hospitalCounts[hospitalId] = (hospitalCounts[hospitalId] || 0) + 1;
            }
        });

        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

        return Object.entries(hospitalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hospitalId, count], index) => {
                const hospital = hospitals.find(h => h.id === hospitalId);
                return {
                    label: hospital?.name || hospital?.hospital_name || 'Unknown',
                    value: count,
                    color: colors[index % colors.length],
                };
            });
    }, [bookings, hospitals]);

    // Live active bookings
    const activeBookings = useMemo(() => {
        return bookings.filter(b => ['in_transit', 'en_route', 'scheduled'].includes(b.status));
    }, [bookings]);

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

    if (loading) {
        return (
            <Layout subTitle="Mission Control Center" isFullHeight={true}>
                <div className="flex items-center justify-center h-full">
                    <LoadingSpinner text="Loading Intelligence..." />
                </div>
            </Layout>
        );
    }

    return (
        <Layout subTitle="Mission Control Center" isFullHeight={true}>
            <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="p-4 lg:p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Command Dashboard</h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">Real-time operational intelligence & analytics</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 border-2 border-emerald-200 rounded-xl">
                            <Zap className="h-4 w-4 text-emerald-600 animate-pulse" />
                            <span className="text-sm font-black text-emerald-700">LIVE</span>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard
                            title="Active Transfers"
                            value={stats?.active_transfers || 0}
                            icon={<Activity className="h-5 w-5 text-white" />}
                            gradient="from-blue-600 to-blue-700"
                            trend="up"
                            trendValue="+12%"
                        />
                        <KpiCard
                            title="Pending Approvals"
                            value={stats?.pending_approvals || 0}
                            icon={<Clock className="h-5 w-5 text-white" />}
                            gradient="from-amber-500 to-amber-600"
                        />
                        <KpiCard
                            title="Available Aircraft"
                            value={stats?.available_aircraft || 0}
                            icon={<Plane className="h-5 w-5 text-white" />}
                            gradient="from-emerald-500 to-emerald-600"
                            trend="up"
                            trendValue="+2"
                        />
                        <KpiCard
                            title="Critical Patients"
                            value={stats?.critical_patients || 0}
                            icon={<AlertCircle className="h-5 w-5 text-white" />}
                            gradient="from-rose-500 to-rose-600"
                            trend="down"
                            trendValue="-3"
                        />
                        <KpiCard
                            title="Total Revenue"
                            value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
                            icon={<IndianRupee className="h-5 w-5 text-white" />}
                            gradient="from-purple-600 to-purple-700"
                            trend="up"
                            trendValue="+18%"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Charts */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    Booking Status Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <PieChart data={statusDistribution} title="Status Breakdown" />
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-amber-50">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                    Urgency Level Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <PieChart data={urgencyDistribution} title="Priority Distribution" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bar Chart & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl lg:col-span-2">
                            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-purple-50">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-purple-600" />
                                    Top Hospital Facilities
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <BarChart data={hospitalUsage} title="Most Active Hospitals" />
                            </CardContent>
                        </Card>

                        {/* Performance Stats */}
                        <Card className="border-2 border-slate-200 shadow-xl rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                            <CardHeader className="border-b border-white/20">
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <Calendar className="h-5 w-5" />
                                    Performance Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <p className="text-white/70 text-sm font-medium mb-2">Total Bookings</p>
                                    <p className="text-5xl font-black">{totalBookings}</p>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium mb-2">Completion Rate</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-5xl font-black">{completionRate}%</p>
                                        <TrendingUp className="h-6 w-6 mb-2 text-emerald-300" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium mb-2">Avg. Response Time</p>
                                    <p className="text-3xl font-black">8.5 <span className="text-lg font-medium">min</span></p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Live Tracking Section */}
                    <Card className="border-2 border-blue-200 shadow-xl rounded-2xl">
                        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-indigo-700">
                            <CardTitle className="flex items-center gap-2 text-white text-lg">
                                <Radio className="h-5 w-5 animate-pulse" />
                                Live Tracking - Active Transfers
                                <Badge className="ml-auto bg-white text-blue-700 font-black">
                                    {activeBookings.length} LIVE
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {activeBookings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeBookings.slice(0, 6).map(booking => (
                                        <LiveTrackingCard
                                            key={booking.id}
                                            booking={booking}
                                            hospitals={hospitals}
                                            getPatientById={getPatientById}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Radio className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold text-lg">No active transfers at the moment</p>
                                    <p className="text-slate-400 text-sm mt-2">All systems ready for deployment</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
