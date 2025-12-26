import { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockBookings, mockAircraft } from '@/data/mockData';
import { usePatients } from '@/contexts/PatientsContext';
import { Booking, BookingStatus, Patient, Hospital } from '@/types';
import { exportBookings } from '@/utils/exportBookings';
import { Plus, FileText, Trash, Edit2, Eye, Clock, AlertCircle, CheckCircle2, Bot, MessageCircle, Send, X, Settings, Zap, Search } from 'lucide-react';
import { format } from 'date-fns';
import chatBotImage from '../emoji.jpeg';
import { BookingService } from '@/services/booking.service';
import { HospitalService } from '@/services/hospital.service';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
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
    if (!patientId) return 'Unknown Patient';
    const patient = getPatientById(patientId);
    return patient?.name || 'Unknown Patient';
  };

  const getPatientAge = (patientId: string) => {
    if (!patientId) return '-';
    const patient = getPatientById(patientId);
    if (!patient || !patient.dob) return '-';
    const dob = new Date(patient.dob);
    if (isNaN(dob.getTime())) return '-';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
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
      setBookings(data);
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
        setHospitals(data);
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

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter logic
  const filteredBookings = bookings ? bookings.filter(booking => {
    if (!booking || !booking.patientId) return false;

    const matchesSearch = getPatientName(booking.patientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) : [];

  const openNewBooking = () => {
    setEditingBookingId(null);
    setForm({});
    setIsDialogOpen(true);
  };

  const openEditBooking = (booking: Booking) => {
    setEditingBookingId(booking.id);
    setForm({
      ...booking,
      patientName: getPatientById(booking.patientId)?.name,
    });
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
  };

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

  // Quick suggestion buttons
  const quickPrompts = [
    'Show urgent bookings',
    'Export bookings for today',
    'List cancelled bookings',
    'Suggest equipment for ICU transfer'
  ];

  // Optional: keep panel scrolled to bottom
  useEffect(() => {
    const el = document.getElementById('chat-panel-body');
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatOpen]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Layout>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bookings & Transfers</h1>
              <p className="text-muted-foreground">Manage all medical transport requests</p>
            </div>

            <div className="flex flex-col gap-3 items-end w-full md:w-auto">
              {/* Row 1: Filters */}
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    placeholder="Search by patient name..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
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

              {/* Row 2: Actions */}
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto justify-end">
                <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(open); }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full md:w-auto" onClick={openNewBooking}>
                      <Plus className="h-4 w-4" />
                      New Booking
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
                    <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                      <DialogTitle className="text-white text-xl">{editingBookingId ? 'Edit Booking' : 'Create New Booking'}</DialogTitle>
                      <DialogDescription className="text-blue-100">Request a new medical transfer</DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <Label>Patient Name</Label>
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
                                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
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
                                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label>Preferred Pickup Time</Label>
                          <Input type="datetime-local" value={form.preferredPickupWindow as string | undefined} onChange={(e) => handleFormChange('preferredPickupWindow', e.target.value)} />
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
                <Button variant="secondary" className="w-full md:w-auto" onClick={handleExport}>Export to Excel</Button>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-3xl font-bold">{summaryStats.total}</p>
                  </div>
                  <FileText className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Scheduled</p>
                    <p className="text-3xl font-bold">{summaryStats.scheduled}</p>
                  </div>
                  <Clock className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-3xl font-bold">{summaryStats.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Cancelled</p>
                    <p className="text-3xl font-bold">{summaryStats.cancelled}</p>
                  </div>
                  <AlertCircle className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Patient Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Age</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reason</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
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
                        <tr key={booking.id} className={`border-b hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-200 text-blue-800 text-xs">
                                {getPatientInitials(booking.patientId)} 
                              </AvatarFallback>
                            </Avatar> */}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{getPatientName(booking.patientId)}</p>
                                <p className="text-xs text-muted-foreground">{booking.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{getPatientAge(booking.patientId)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{format(new Date(booking.preferredPickupWindow), 'yyyy-MM-dd')}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{format(new Date(booking.preferredPickupWindow), 'HH:mm')}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 capitalize">{booking.urgency}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent
                                  className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl"
                                >
                                  <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                                    <DialogTitle className="text-white text-xl">
                                      Booking Details - #{booking.id.toUpperCase()}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="p-6 space-y-4 overflow-y-auto flex-1">

                                    <div className="space-y-6 px-6 py-4"> {/* Added px-6 for left/right padding */}
                                      {/* Patient & Status */}
                                      <div className="grid grid-cols-2 gap-6"> {/* Increased gap for better spacing */}
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

                                      {/* Timeline as Table */}
                                      <div>
                                        <h4 className="font-semibold mb-2">Timeline</h4>
                                        <div className="overflow-x-auto max-h-[60vh] px-2"> {/* Slight padding inside table container */}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {/* Pagination Controls (Matching Hospitals Style) */}
              {bookings.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-2 mt-6 pb-8">
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

          {/* Chatbot floating button */}
          <div>
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl hover:scale-105 transition-transform bg-transparent"
            >
              <img src={chatBotImage} alt="Chatbot" className="w-14 h-14 rounded-full object-cover" />
            </button>

            {/* Chat panel */}
            {chatOpen && (
              <div className="fixed right-6 bottom-20 z-50 w-[380px] max-h-[75vh] bg-white rounded-lg shadow-2xl ring-1 ring-slate-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-gradient-to-br from-indigo-100 to-pink-100 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Smart Assistant</div>
                      <div className="text-xs text-muted-foreground">AI help for bookings</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Settings"
                      onClick={() => alert('Persona & tone can be changed below.')}
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

                  {/* Quick prompts */}
                  {suggestionsEnabled && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {quickPrompts.map(q => (
                        <button
                          key={q}
                          onClick={() => { setChatInput(q); sendChat(); }}
                          className="text-xs px-2 py-1 bg-gradient-to-r from-slate-50 to-slate-100 rounded-full border text-slate-700 hover:brightness-95"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
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
            )}
          </div>

        </div>
      )}
    </Layout>
  );
};

export default Bookings;