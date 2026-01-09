import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination'; // Removed as we use custom buttons now
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { mockBookings, mockAircraft } from '@/data/mockData';
import { usePatients } from '@/contexts/PatientsContext';
import { Booking, BookingStatus, Patient, Hospital } from '@/types';
import { exportBookings } from '@/utils/exportBookings';
import { Plus, FileText, Trash, Edit2, Eye, Clock, AlertCircle, CheckCircle2, Bot, MessageCircle, Send, X, Settings, Zap, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Activity, IndianRupee, Users, Filter, BarChart3, Heart } from 'lucide-react';
import { format } from 'date-fns';
import chatBotImage from '../emoji.jpeg';
import { BookingService } from '@/services/booking.service';
import { HospitalService } from '@/services/hospital.service';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { calculateDistance, calculateRevenue } from '@/utils/revenueUtils';
import { calculateAge } from '@/utils/dateUtils';

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { patients, addPatient, updatePatient, getPatientById } = usePatients();

  const getStatusColor = (status: BookingStatus) => {
    const colors: Record<BookingStatus, string> = {
      requested: 'bg-blue-100 text-blue-800',
      clinical_review: 'bg-yellow-100 text-yellow-800',
      dispatch_review: 'bg-purple-100 text-purple-800',
      airline_confirmed: 'bg-indigo-100 text-indigo-800',
      crew_assigned: 'bg-pink-100 text-pink-800',
      in_transit: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPatientName = (patientId: string) => {
    if (!patientId) return '';
    const patient = getPatientById(patientId);
    if (!patient) return '';
    return patient.name || patient.full_name || '';
  };

  const getPatientAge = (patientId: string) => {
    if (!patientId) return '-';
    const patient = getPatientById(patientId);
    if (!patient) return '-';
    return calculateAge(patient.date_of_birth || patient.dob);
  };

  const getPatientInitials = (patientId: string) => {
    if (!patientId) return 'UP';
    const patient = getPatientById(patientId);
    if (!patient || !patient.name) return 'UP';
    const names = patient.name.split(' ');
    // Handle edge case of single name
    if (names.length === 0) return 'UP';
    return (names[0][0] + (names[1]?.[0] || '')).toUpperCase();
  };

  // Fetch bookings from API
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await BookingService.list();
      // Store raw bookings - filtering for 'Unknown' records will happen reactively in the filtered computed property
      const validData = (data || []).filter((b: any) => b && (b.id || b._id));
      setBookings(validData);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      // Fallback to mock data in development
      if (process.env.NODE_ENV === 'development') {
        setBookings(mockBookings);
        toast({
          title: 'Development Mode',
          description: 'Using mock data - API may not be available',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchBookings();
    const fetchHospitals = async () => {
      try {
        const data = await HospitalService.getHospitals();
        setHospitals((data || []).filter(h => h && h.id && h.name));
      } catch (err) {
        console.error('Failed to fetch hospitals', err);
      }
    };
    fetchHospitals();
  }, []);

  // Form / dialog state for add/edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Booking & { patientName?: string }>>({});
  const [patientSelectionMode, setPatientSelectionMode] = useState<'list' | 'id'>('list');
  const [patientIdLookup, setPatientIdLookup] = useState('');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

  // Filter logic
  const filteredBookings = (bookings || []).filter(booking => {
    // Robust check for empty/invalid records
    if (!booking || !(booking.id || booking._id)) return false;

    const patient = getPatientById(booking.patientId);
    // Use fallback names if lookup fails
    const patientName = (patient?.name || patient?.full_name || booking.patientName || "Restricted Info").toLowerCase();
    const bookingId = (booking.booking_id || booking.id || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = patientName.includes(search) || bookingId.includes(search);
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || booking.urgency === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const openNewBooking = () => {
    setEditingBookingId(null);
    setForm({});
    setPatientSelectionMode('list');
    setPatientIdLookup('');
    setIsDialogOpen(true);
  };

  const openEditBooking = (booking: Booking) => {
    setEditingBookingId(booking.id);
    setForm({
      ...booking,
      patientName: getPatientById(booking.patientId)?.name,
    });
    setPatientSelectionMode('list');
    setPatientIdLookup(booking.patientId);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBookingId(null);
    setForm({});
  };

  const handleFormChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };


  // Effect to calculate distance and cost when hospitals change
  useEffect(() => {
    if (form.originHospitalId && form.destinationHospitalId) {
      const origin = hospitals.find(h => h.id === form.originHospitalId);
      const dest = hospitals.find(h => h.id === form.destinationHospitalId);

      if (origin?.coordinates && dest?.coordinates) {
        const dist = calculateDistance(
          origin.coordinates.lat,
          origin.coordinates.lng,
          dest.coordinates.lat,
          dest.coordinates.lng
        );

        const calculatedCost = calculateRevenue(dist);

        setForm(prev => {
          // Only update if values actually changed to avoid infinite loop
          if (prev.estimatedCost === calculatedCost) return prev;
          return {
            ...prev,
            estimatedCost: calculatedCost,
            // We can also store the distance if we want to show it
            distance: dist
          };
        });
      }
    }
  }, [form.originHospitalId, form.destinationHospitalId, hospitals]);

  const saveBooking = async () => {
    if (!(form.patientId || form.patientName) || !form.originHospitalId || !form.destinationHospitalId || !form.urgency || !form.preferredPickupWindow) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (form.originHospitalId === form.destinationHospitalId) {
      toast({ title: 'Validation Error', description: 'Origin and destination cannot be the same', variant: 'destructive' });
      return;
    }

    const requiredEquipment = form.requiredEquipment || [];

    let patientId = form.patientId as string | undefined;

    // Handle Patient Name Change or Creation
    if (!patientId && form.patientName) {
      // New Patient
      try {
        const created = await addPatient({ name: form.patientName, dob: new Date().toISOString().slice(0, 10), gender: 'other', weight: 0, diagnosis: '', acuity_level: 'stable' });
        patientId = created.id;
      } catch (e) {
        toast({ title: 'Error', description: 'Failed to create patient', variant: 'destructive' });
        return;
      }
    } else if (patientId && form.patientName) {
      // Existing patient - check if name changed
      const currentPatient = getPatientById(patientId);
      if (currentPatient && currentPatient.name !== form.patientName) {
        try {
          await updatePatient(patientId, { name: form.patientName });
        } catch (e) {
          console.error("Failed to update patient name", e);
        }
      }
    }

    try {
      if (editingBookingId) {
        // Update existing booking
        const updateData = {
          patientId: patientId || (form.patientId as string),
          originHospitalId: form.originHospitalId as string,
          destinationHospitalId: form.destinationHospitalId as string,
          status: form.status,
          urgency: form.urgency,
          preferredPickupWindow: form.preferredPickupWindow as string,
          requiredEquipment,
          estimatedCost: form.estimatedCost,
          estimatedFlightTime: form.estimatedFlightTime,
        };

        await BookingService.update(editingBookingId, updateData);
        toast({ title: 'Success', description: 'Booking updated successfully' });
      } else {
        // Create new booking
        const newBooking = {
          patientId: patientId as string,
          originHospitalId: form.originHospitalId as string,
          destinationHospitalId: form.destinationHospitalId as string,
          urgency: form.urgency,
          preferredPickupWindow: form.preferredPickupWindow as string,
          requiredEquipment,
          estimatedCost: form.estimatedCost,
          estimatedFlightTime: form.estimatedFlightTime,
        };

        await BookingService.create(newBooking);
        toast({ title: 'Success', description: 'Booking created successfully' });
      }

      // Refresh bookings from API
      await fetchBookings();
      closeDialog();
    } catch (err: any) {
      console.error('Error saving booking:', err);
      console.error('Error data:', err.data);

      let errorMessage = 'Failed to save booking';
      if (err.data?.detail) {
        if (Array.isArray(err.data.detail)) {
          errorMessage = err.data.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
        } else {
          errorMessage = err.data.detail;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    exportBookings(bookings, patients as Patient[], hospitals);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Delete this booking? This action cannot be undone.')) return;
    try {
      await BookingService.remove(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Success', description: 'Booking deleted successfully' });
    } catch (err: any) {
      console.error('Failed to delete booking', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete booking',
        variant: 'destructive'
      });
    }
  };

  const summaryStats = {
    total: bookings.length,
    scheduled: bookings.filter(b => ['requested', 'clinical_review', 'dispatch_review', 'airline_confirmed', 'crew_assigned'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    emergency: bookings.filter(b => b.urgency === 'emergency').length,
    urgent: bookings.filter(b => b.urgency === 'urgent').length,
  };

  // Approval Handlers
  const handleApprove = async (id: string) => {
    try {
      if (!id) return;
      await BookingService.update(id, { status: 'clinical_review' });
      toast({
        title: "Booking Approved",
        description: "The request has been moved to Clinical Review state.",
      });
      fetchBookings();
    } catch (err) {
      console.error('Approve error:', err);
      toast({
        title: "Error",
        description: "Failed to process approval.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (!id) return;
      await BookingService.update(id, { status: 'cancelled' });
      toast({
        title: "Booking Rejected",
        description: "The request has been formally cancelled.",
        variant: "destructive",
      });
      fetchBookings();
    } catch (err) {
      console.error('Reject error:', err);
      toast({
        title: "Error",
        description: "Failed to process rejection.",
        variant: "destructive",
      });
    }
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Analytics Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group" title="View Booking Analytics">
            <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Booking Analytics</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Statistics</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-100 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{summaryStats.total}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Requests</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl transition-all hover:border-rose-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="h-3 w-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Emergency</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600 tracking-tighter">{summaryStats.emergency}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase font-black italic">Crit</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl transition-all hover:border-amber-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Heart className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Urgent</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600 tracking-tighter">{summaryStats.urgent}</span>
                <span className="text-[8px] text-amber-400 font-bold uppercase font-black italic">Urg</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:border-emerald-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Done</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600 tracking-tighter">{summaryStats.completed}</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase font-black italic">Comp</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Approvals Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-emerald-600 transition-all active:scale-95 group relative" title="Pending Approvals">
            <Zap className={`h-4 w-4 transition-transform group-hover:scale-110 ${bookings.filter(b => b.status === 'requested').length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
            {bookings.filter(b => b.status === 'requested').length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-bounce">
                {bookings.filter(b => b.status === 'requested').length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-2 rounded-2xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5 flex justify-between items-center">
            <span>Operational Approvals</span>
            <Badge variant="outline" className="text-[9px] border-emerald-200 text-emerald-600 bg-emerald-50 font-black">ACTION REQ</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            {bookings.filter(b => b.status === 'requested').length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-slate-100 mx-auto" />
                <p className="text-xs font-bold text-slate-400">All Requests Cleared</p>
              </div>
            ) : (
              bookings.filter(b => b.status === 'requested').map(b => (
                <div key={b.id} className="p-3 mb-2 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-100 hover:border-emerald-100 transition-all group/item shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 leading-none tracking-tight">#{(b.booking_id || b.id).slice(0, 8).toUpperCase()}</span>
                        {b.urgency === 'emergency' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 mt-1.5 uppercase tracking-wide">{getPatientName(b.patientId)}</span>
                    </div>
                    <Badge className={`text-[9px] font-black uppercase tracking-tighter ${b.urgency === 'emergency' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'} border`}>
                      {b.urgency}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-100 transition-all active:scale-95" onClick={() => handleApprove(b.id)}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-8 border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95" onClick={() => handleReject(b.id)}>Reject</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unified Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center justify-center h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative" title="Filters">
            <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${(statusFilter !== 'all' || urgencyFilter !== 'all') ? 'text-blue-600' : 'text-slate-500'}`} />
            {(statusFilter !== 'all' || urgencyFilter !== 'all') && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                {(statusFilter !== 'all' ? 1 : 0) + (urgencyFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
            Booking Filters
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <DropdownMenuItem
            onClick={() => { setStatusFilter('all'); setUrgencyFilter('all'); }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${statusFilter === 'all' && urgencyFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">All Bookings</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Flow</span>
          </div>

          {['requested', 'clinical_review', 'in_transit', 'completed', 'cancelled'].map(status => (
            <DropdownMenuItem
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${statusFilter === status ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
            >
              <span className="text-xs font-bold uppercase tracking-wide capitalize">{status.replace('_', ' ')}</span>
              <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">
                {bookings.filter(b => b.status === status).length}
              </span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          <div className="px-2 py-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urgency</span>
          </div>

          {['emergency', 'urgent', 'routine'].map(urg => (
            <DropdownMenuItem
              key={urg}
              onClick={() => setUrgencyFilter(urg)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${urgencyFilter === urg ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50'}`}
            >
              <span className="text-xs font-bold uppercase tracking-wide capitalize">{urg}</span>
              <span className="text-[10px] font-black bg-amber-100/50 px-1.5 py-0.5 rounded-md text-amber-600">
                {bookings.filter(b => b.urgency === urg).length}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search Bookings by ID or Patient..."
          className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-xl text-xs font-medium"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(open); }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 group"
            onClick={openNewBooking}
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="uppercase tracking-wider">New Booking</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
            <FileText className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <FileText className="h-6 w-6" /> {editingBookingId ? 'Refine Transfer Request' : 'Initialize Medical Dispatch'}
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Emergency logistics coordination</DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Selection Method</Label>
                <Select
                  value={patientSelectionMode}
                  onValueChange={(v: any) => setPatientSelectionMode(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">📝 Select from List</SelectItem>
                    <SelectItem value="id">🔍 Search by ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {patientSelectionMode === 'list' ? (
                <div className="space-y-1.5">
                  <Label>Select Patient</Label>
                  <Select
                    value={form.patientId as string | undefined}
                    onValueChange={(v) => {
                      handleFormChange('patientId', v);
                      const p = getPatientById(v);
                      if (p) handleFormChange('patientName', p.name);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search patients..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center justify-between w-[250px] gap-2">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 shrink-0">
                              {p.patient_id || p.id.slice(0, 8)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Patient ID</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Patient ID..."
                      value={patientIdLookup}
                      onChange={(e) => setPatientIdLookup(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="px-2"
                      onClick={() => {
                        if (!patientIdLookup.trim()) return;
                        const p = getPatientById(patientIdLookup.trim());
                        if (p) {
                          handleFormChange('patientId', p.id);
                          handleFormChange('patientName', p.name);
                          toast({
                            title: 'Patient Found',
                            description: `Name: ${p.name}`,
                          });
                        } else {
                          toast({
                            title: 'Not Found',
                            description: 'Check ID and try again',
                            variant: 'destructive'
                          });
                        }
                      }}
                    >
                      Find
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Patient Name (Update/New)</Label>
                <Input placeholder="Patient full name" value={form.patientName as string | undefined} onChange={(e) => handleFormChange('patientName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Urgency</Label>
                <Select value={form.urgency as string | undefined} onValueChange={(v) => handleFormChange('urgency', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status as string | undefined} onValueChange={(v) => handleFormChange('status', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="clinical_review">Clinical Review</SelectItem>
                    <SelectItem value="dispatch_review">Dispatch Review</SelectItem>
                    <SelectItem value="airline_confirmed">Airline Confirmed</SelectItem>
                    <SelectItem value="crew_assigned">Crew Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Origin Hospital</Label>
                <Select value={form.originHospitalId as string | undefined} onValueChange={(v) => handleFormChange('originHospitalId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id}>
                        <div className="flex flex-col">
                          <span>{h.name}</span>
                          <span className="text-[10px] text-muted-foreground">Available: {h.icuCapacity - (h.occupiedBeds || 0)} Seats</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destination Hospital</Label>
                <Select value={form.destinationHospitalId as string | undefined} onValueChange={(v) => handleFormChange('destinationHospitalId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id} disabled={(h.icuCapacity - (h.occupiedBeds || 0)) <= 0}>
                        <div className="flex flex-col">
                          <span>{h.name}</span>
                          <span className={`text-[10px] ${(h.icuCapacity - (h.occupiedBeds || 0)) <= 2 ? 'text-red-500' : 'text-green-600'}`}>
                            Available: {h.icuCapacity - (h.occupiedBeds || 0)} Seats
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Preferred Pickup Time</Label>
                <Input type="datetime-local" value={form.preferredPickupWindow as string | undefined} onChange={(e) => handleFormChange('preferredPickupWindow', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  readOnly
                  className="bg-slate-50 font-semibold text-blue-700"
                  value={(form as any).distance || 0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Cost (₹)</Label>
                <Input
                  type="number"
                  placeholder="Calculating..."
                  value={form.estimatedCost || ""}
                  onChange={(e) => handleFormChange('estimatedCost', parseInt(e.target.value) || 0)}
                  className="font-bold text-green-700"
                />
                <p className="text-[10px] text-muted-foreground">Rate: 1000/km</p>
              </div>
              <div className="space-y-1.5">
                <Label>Flight Time (mins)</Label>
                <Input
                  type="number"
                  value={form.estimatedFlightTime || ""}
                  onChange={(e) => handleFormChange('estimatedFlightTime', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Required Equipment</Label>
              <div className="flex flex-wrap gap-4 border p-3 rounded-md bg-slate-50">
                {[
                  { id: 'ventilator', label: 'Ventilator' },
                  { id: 'ecg_monitor', label: 'ECG Monitor' },
                  { id: 'defibrillator', label: 'Defibrillator' },
                  { id: 'oxygen_supply', label: 'Oxygen Supply' },
                  { id: 'infusion_pump', label: 'Infusion Pump' },
                  { id: 'patient_monitor', label: 'Patient Monitor' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equip-${item.id}`}
                      checked={form.requiredEquipment?.includes(item.id)}
                      onCheckedChange={(checked) => {
                        const current = form.requiredEquipment || [];
                        const updated = checked
                          ? [...current, item.id]
                          : current.filter(id => id !== item.id);
                        handleFormChange('requiredEquipment', updated);
                      }}
                    />
                    <label
                      htmlFor={`equip-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
              <Button className="w-1/4" onClick={saveBooking}>{editingBookingId ? 'Save Changes' : 'Submit Request'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Button variant="secondary" className="h-10 px-6 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl shadow-sm transition-all active:scale-95" onClick={handleExport}>
        <FileText size={16} className="mr-2" />
        EXPORT
      </Button>
    </div>
  );

  // Chatbot state and helpers
  type ChatMessage = { id: string; sender: 'user' | 'assistant' | 'system'; text: string; timestamp: string };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    [{ id: 's1', sender: 'system', text: 'Hello! I can help with bookings, suggestions and reports. Try asking: "Show urgent bookings for today".', timestamp: new Date().toISOString() }]
  );
  const [chatInput, setChatInput] = useState('');
  const [persona, setPersona] = useState<'assistant' | 'concise' | 'friendly'>('assistant');
  const [tone, setTone] = useState<'informal' | 'formal' | 'technical'>('informal');
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);

  const pushMessage = (msg: ChatMessage) => setChatMessages(prev => [...prev, msg]);

  const simulateAiReply = (userText: string) => {
    // Lightweight, deterministic simulated AI behavior (no external calls)
    const ts = new Date().toISOString();
    const lower = userText.toLowerCase();

    let reply = 'Sorry, I did not understand that. Try "list bookings" or "export bookings".';
    if (lower.includes('urgent')) reply = 'Found 3 urgent requests. You can filter the table by urgency or ask me to export them.';
    else if (lower.includes('export')) reply = 'I prepared an export. Click Export to download the full Excel file for current bookings.';
    else if (lower.includes('today')) reply = `There are ${bookings.filter(b => format(new Date(b.preferredPickupWindow), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length} bookings scheduled for today.`;
    else if (lower.includes('help') || lower.includes('how')) reply = 'Ask me to "filter by urgent", "show patient <name>", or "export bookings".';
    else if (lower.includes('hello') || lower.includes('hi')) reply = 'Hi! I can help triage bookings, suggest equipment, or summarize bookings.';

    // Persona/tone influence (simple variants)
    if (persona === 'concise') {
      if (reply.length > 80) reply = reply.split('. ')[0] + '.';
    } else if (persona === 'friendly') {
      reply = '🙂 ' + reply;
    }

    if (tone === 'formal') reply = reply.replace(/I'm/g, "I am");

    setTimeout(() => {
      pushMessage({ id: `a${Date.now()}`, sender: 'assistant', text: reply, timestamp: ts });
    }, 700 + Math.random() * 600);
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const ts = new Date().toISOString();
    pushMessage({ id: `u${Date.now()}`, sender: 'user', text, timestamp: ts });
    setChatInput('');
    simulateAiReply(text);
  };


  // Optional: keep panel scrolled to bottom
  useEffect(() => {
    const el = document.getElementById('chat-panel-body');
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatOpen]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Layout subTitle="Medical Transport Requests" headerActions={headerActions} isFullHeight={true}>
      <div className="p-4 lg:p-6 space-y-4 h-full flex flex-col">
        {/* Table */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#f8fafc] border-b border-slate-200">
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Patient Name</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Age</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Date</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Time</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Urgency</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Status</th>
                  <th className="px-6 py-2.5 text-left text-[11px] font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  currentItems.map((booking, idx) => (
                    <React.Fragment key={booking.id}>
                      <tr className={`border-b hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${expandedRowId === booking.id ? 'bg-blue-50/30' : ''}`}>

                        <td className="px-6 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-purple-100 bg-gradient-to-tr from-purple-200 via-purple-100 to-purple-50 shadow-sm shrink-0">
                              <AvatarImage
                                src={`/avatars/${(getPatientById(booking.patientId)?.gender?.toLowerCase() === 'male') ? 'male.png' : (getPatientById(booking.patientId)?.gender?.toLowerCase() === 'female') ? 'female.png' : ''}`}
                                alt="Patient Avatar"
                              />
                              <AvatarFallback className="bg-purple-50 text-purple-600 font-bold">
                                {getPatientInitials(booking.patientId)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <p
                                className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-all leading-tight text-base"
                                onClick={() => setExpandedRowId(expandedRowId === booking.id ? null : booking.id)}
                              >
                                {getPatientName(booking.patientId)}
                              </p>
                              <p className="text-[11px] font-medium text-slate-500 tracking-tight">{booking.booking_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-sm text-gray-900">{getPatientAge(booking.patientId)}</p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-sm text-gray-900">{format(new Date(booking.preferredPickupWindow), 'yyyy-MM-dd')}</p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-sm text-gray-900">{format(new Date(booking.preferredPickupWindow), 'HH:mm')}</p>
                        </td>
                        <td className="px-6 py-2.5">
                          <p className="text-sm text-gray-900 capitalize">{booking.urgency}</p>
                        </td>
                        <td className="px-6 py-2.5">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-2.5">
                          <div className="flex justify-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent
                                className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl"
                              >
                                <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
                                  <Activity className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
                                  <div className="relative z-10">
                                    <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                      <Activity className="h-6 w-6" /> Transfer Intelligence — #{(booking.booking_id || booking.id).toUpperCase().slice(0, 8)}
                                    </DialogTitle>
                                    <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest mt-1">Comprehensive audit trail and status</p>
                                  </div>
                                </DialogHeader>
                                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/10">

                                  <div className="space-y-6 px-6 py-4">
                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <h4 className="font-semibold mb-2">Patient</h4>
                                        <p className="text-sm">{getPatientName(booking.patientId)}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2">Status</h4>
                                        <Badge className={getStatusColor(booking.status)}>
                                          {booking.status.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-semibold mb-2">Timeline</h4>
                                      <div className="overflow-x-auto max-h-[60vh] px-2">
                                        <table className="w-full text-left border border-gray-300">
                                          <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                              <th className="px-4 py-2 text-sm font-medium border-b">Event</th>
                                              <th className="px-4 py-2 text-sm font-medium border-b">User</th>
                                              <th className="px-4 py-2 text-sm font-medium border-b">Timestamp</th>
                                              <th className="px-4 py-2 text-sm font-medium border-b">Details</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {booking.timeline.map((event) => (
                                              <tr key={event.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm">{event.event}</td>
                                                <td className="px-4 py-2 text-sm">{event.user}</td>
                                                <td className="px-4 py-2 text-sm">
                                                  {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                                                </td>
                                                <td className="px-4 py-2 text-sm">{event.details || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                  </div>
                                </div>

                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => openEditBooking(booking)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => deleteBooking(booking.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {expandedRowId === booking.id && (
                        <tr className="bg-blue-50/20 border-b">
                          <td colSpan={7} className="px-10 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {/* Column 1: Transfer Info */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                  <MapPin className="h-3 w-3" /> Transport Path
                                </h4>
                                <div className="flex items-center gap-3">
                                  <div className="w-1 h-12 bg-blue-200 rounded-full relative">
                                    <div className="absolute top-0 -left-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                                    <div className="absolute bottom-0 -left-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-sm" />
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-[10px] text-gray-500 uppercase">From</p>
                                      <p className="text-sm font-semibold">{hospitals.find(h => h.id === booking.originHospitalId)?.name || 'Unknown Hospital'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-gray-500 uppercase">To</p>
                                      <p className="text-sm font-semibold">{hospitals.find(h => h.id === booking.destinationHospitalId)?.name || 'Unknown Hospital'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Equipment & Cost */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                  <Activity className="h-3 w-3" /> Clinical & Billing
                                </h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase mb-1">Required Equipment</p>
                                    <div className="flex flex-wrap gap-1">
                                      {booking.requiredEquipment && booking.requiredEquipment.length > 0 ? (
                                        booking.requiredEquipment.map(eq => (
                                          <Badge key={eq} variant="outline" className="text-[10px] py-0 h-5 bg-white border-blue-100 text-blue-700 capitalize">
                                            {eq.replace(/_/g, ' ')}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-400">No special equipment listed</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-3 pt-2 border-t border-blue-100/50">
                                    {(() => {
                                      const origin = hospitals.find(h => h.id === booking.originHospitalId);
                                      const dest = hospitals.find(h => h.id === booking.destinationHospitalId);
                                      const dist = (origin?.coordinates && dest?.coordinates)
                                        ? calculateDistance(origin.coordinates.lat, origin.coordinates.lng, dest.coordinates.lat, dest.coordinates.lng)
                                        : 0;

                                      const displayCost = Math.round(dist * 1000) || (Number(booking.estimatedCost) || Number(booking.actualCost) || 0);
                                      const displayTime = (Number(booking.estimatedFlightTime) || (dist > 0 ? Math.round(dist / 8 + 15) : 0));

                                      return (
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-blue-600" />
                                            <div>
                                              <p className="text-[10px] text-gray-500 uppercase">Est. Distance</p>
                                              <p className="text-sm font-bold text-blue-700">{Math.round(dist * 100) / 100} km</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 px-4 border-l border-r border-blue-100/30">
                                            <IndianRupee className="h-4 w-4 text-green-600" />
                                            <div>
                                              <p className="text-[10px] text-gray-500 uppercase">Est. Cost</p>
                                              <p className="text-sm font-bold text-green-700">₹{displayCost.toLocaleString()}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-orange-600" />
                                            <div>
                                              <p className="text-[10px] text-gray-500 uppercase">Est. Time</p>
                                              <p className="text-sm font-bold text-orange-700">{displayTime} mins</p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Recent Activity */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                  <Clock className="h-3 w-3" /> Recent Activity
                                </h4>
                                <div className="space-y-2">
                                  {booking.timeline.slice(-2).reverse().map((log, i) => (
                                    <div key={log.id} className={`p-2 rounded-md ${i === 0 ? 'bg-white shadow-sm border border-blue-100' : 'bg-transparent text-gray-500 opacity-70'}`}>
                                      <div className="flex justify-between items-start">
                                        <p className="text-[11px] font-bold text-blue-900">{log.event}</p>
                                        <p className="text-[10px] opacity-60">{format(new Date(log.timestamp), 'HH:mm')}</p>
                                      </div>
                                      <p className="text-[10px] leading-tight mt-0.5 italic">"{log.details}"</p>
                                      <p className="text-[9px] mt-1 text-gray-400">— {log.user}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 📊 PREMIUM PAGINATION FOOTER */}
          <div className="bg-[#f8fafc] border-t border-slate-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="h-9 w-20 bg-white border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {[10, 25, 50, 100].map(val => (
                      <SelectItem key={val} value={val.toString()} className="text-xs font-black text-slate-600">{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBookings.length)} <span className="text-slate-300 mx-1">/</span> {filteredBookings.length} Bookings
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronLeft className="h-4 w-4" /> {/* Note: ChevronsLeft not imported, using ChevronLeft for now or checking imports */}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="bg-white border-2 border-blue-100 px-4 py-1.5 rounded-xl shadow-inner mx-1">
                <span className="text-xs font-black text-blue-600 uppercase tracking-tight">
                  Page {currentPage} <span className="text-blue-200 mx-1.5">OF</span> {totalPages || 1}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 bg-white rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="Last Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chatbot floating button */}
        < div >
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all bg-transparent border-4 border-white animate-bounce overflow-hidden"
          >
            <img src={chatBotImage} alt="Chatbot" className="w-full h-full object-cover" />
          </button>

          {/* Chat panel */}
          {
            chatOpen && (
              <div className="fixed right-6 bottom-20 z-50 w-[380px] max-h-[75vh] bg-white rounded-lg shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-200 overflow-hidden shadow-sm flex-shrink-0">
                      <img src={chatBotImage} alt="AI Assistant" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Smart Assistant</div>
                      <div className="text-xs text-muted-foreground">AI help for bookings</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Settings"
                      onClick={() => { }}
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <Settings className="h-4 w-4 text-slate-600" />
                    </button>
                    <button title="Close" onClick={() => setChatOpen(false)} className="p-1 rounded hover:bg-slate-100">
                      <X className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div id="chat-panel-body" className="px-4 py-3 overflow-auto space-y-3 flex-1">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'assistant' ? 'justify-start' : msg.sender === 'user' ? 'justify-end' : 'justify-center'}`}>
                      {msg.sender === 'assistant' && (
                        <div className="max-w-[80%] bg-slate-50 rounded-lg p-3 text-sm text-slate-900 shadow-sm">
                          <div className="font-medium text-xs text-muted-foreground mb-1">Assistant</div>
                          <div>{msg.text}</div>
                          <div className="text-xs text-muted-foreground text-right mt-1">{format(new Date(msg.timestamp), 'HH:mm')}</div>
                        </div>
                      )}
                      {msg.sender === 'user' && (
                        <div className="max-w-[80%] bg-indigo-600 text-white rounded-lg p-3 text-sm">
                          <div>{msg.text}</div>
                          <div className="text-xs text-indigo-100 text-right mt-1">{format(new Date(msg.timestamp), 'HH:mm')}</div>
                        </div>
                      )}
                      {msg.sender === 'system' && (
                        <div className="text-xs text-muted-foreground italic bg-transparent px-2">{msg.text}</div>
                      )}
                    </div>
                  ))}

                </div>

                {/* Footer controls */}
                <div className="px-3 py-2 border-t bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    <select value={persona} onChange={(e) => setPersona(e.target.value as any)} className="text-xs p-1 rounded border bg-white" title="AI Persona">
                      <option value="assistant">Balanced</option>
                      <option value="concise">Concise</option>
                      <option value="friendly">Friendly</option>
                    </select>
                    <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="text-xs p-1 rounded border bg-white" title="Tone">
                      <option value="informal">Informal</option>
                      <option value="formal">Formal</option>
                      <option value="technical">Technical</option>
                    </select>
                    <button
                      className={`ml-auto text-xs px-2 py-1 rounded ${suggestionsEnabled ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
                      onClick={() => setSuggestionsEnabled(s => !s)}
                      title="Toggle suggestions"
                    >
                      {suggestionsEnabled ? 'Suggestions On' : 'Suggestions Off'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                      placeholder="Ask me about bookings..."
                      className="flex-1 text-sm p-2 rounded border"
                    />
                    <button onClick={sendChat} className="px-3 py-2 rounded bg-indigo-600 text-white flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">Send</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </div>
    </Layout>
  );
};

export default Bookings;