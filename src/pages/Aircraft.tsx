import React, { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import chatBotImage from '../emoji.jpeg';
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, BarChart3, Edit, Trash2, Search, Map, Plus, Plane, PlaneTakeoff, PlaneLanding, Activity, MessageSquare, Send, List, Eye, Building2, Users, Clock, MapPin, Calendar, AlertCircle, ChevronLeft, ChevronRight, Loader2, Navigation, Filter } from "lucide-react";

import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import LiveMapComponent from "../pages/LiveMapComponent";
import { format } from "date-fns";
import { AircraftService } from "@/services/aircraft.service";
import { Aircraft as AircraftType } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Fix Leaflet marker icons
const iconRetinaUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Map Click Handler Component
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// -------------------- Types --------------------
type AircraftStatus = "available" | "in_flight" | "maintenance";

// -------------------- Defaults --------------------
const DEFAULT_IMAGES = [
  "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg",
  "https://images.pexels.com/photos/358220/pexels-photo-358220.jpeg",
  "https://images.pexels.com/photos/912050/pexels-photo-912050.jpeg",
  "https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg",
  "https://images.pexels.com/photos/46147/aircraft-start-take-off-plane-46147.jpeg",
];

// -------------------- Helpers --------------------
const statusLabel = (s: AircraftStatus) =>
  s === "available" ? "Available" : s === "in_flight" ? "In Flight" : "Maintenance";

const statusColorClass = (s: AircraftStatus) =>
  s === "available"
    ? "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-green-100 text-green-800"
    : s === "in_flight"
      ? "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
      : // maintenance -> neutral (no background)
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-800";

// -------------------- Component --------------------
const Aircraft: React.FC = () => {
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftType | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AircraftStatus | "all">("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<AircraftType | null>(null);

  const [form, setForm] = useState<Partial<AircraftType> & { medicalEquipment?: string | string[] }>({});
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [mapSearch, setMapSearch] = useState("");

  // Chatbot
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInactivityTimer, setChatInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const CHAT_INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome! How can I assist you with the Aircraft Fleet?", sender: "ai", time: format(new Date(), "h:mm a") },
  ]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    fetchAircraft();
  }, []);

  const fetchAircraft = async () => {
    try {
      setLoading(true);
      const data = await AircraftService.getAircrafts();
      // Filter out null or incomplete data
      const validAircraft = (data || []).filter((a: any) => a && (a.id || a._id) && a.registration);
      setAircraft(validAircraft);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch aircraft");
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return aircraft.filter((a) => {
      const matchesSearch =
        !s ||
        a.registration?.toLowerCase().includes(s) ||
        a.type?.toLowerCase().includes(s) ||
        a.operator?.toLowerCase().includes(s) ||
        a.baseLocation?.toLowerCase().includes(s);

      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [aircraft, searchTerm, statusFilter]);

  // Summary Stats
  const summaryStats = useMemo(
    () => ({
      total: aircraft.length,
      available: aircraft.filter((a) => a.status === "available").length,
      inFlight: aircraft.filter((a) => a.status === "in_flight").length,
      maintenance: aircraft.filter((a) => a.status === "maintenance").length,
    }),
    [aircraft]
  );

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedAircraft = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Chat inactivity timer
  useEffect(() => {
    if (!isChatOpen) return;

    const resetInactivityTimer = () => {
      if (chatInactivityTimer) clearTimeout(chatInactivityTimer);
      const timer = setTimeout(() => {
        if (isChatOpen) {
          setIsChatOpen(false);
        }
      }, CHAT_INACTIVITY_TIME);
      setChatInactivityTimer(timer);
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
      if (chatInactivityTimer) clearTimeout(chatInactivityTimer);
    };
  }, [isChatOpen, chatInactivityTimer, CHAT_INACTIVITY_TIME]);

  // Handlers
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    (e.currentTarget as HTMLImageElement).src = DEFAULT_IMAGES[0];
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleMapSearch = async () => {
    if (!mapSearch.trim()) return;
    setIsSearchingMap(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm(prev => ({ ...prev, latitude: Number(lat), longitude: Number(lon) }));
        toast({ title: "Success", description: "Location found and map centered." });
      } else {
        toast({ title: "Not Found", description: "Could not find that location on the map.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Map search error:", err);
      toast({ title: "Error", description: "Failed to search location.", variant: "destructive" });
    } finally {
      setIsSearchingMap(false);
    }
  };

  const startEdit = (a: AircraftType) => {
    setEditItem(a);
    setForm(a);
    setIsAddOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete Aircraft? This action cannot be undone.")) return;

    try {
      await AircraftService.deleteAircraft(id);
      toast({ title: 'Success', description: 'Aircraft deleted successfully' });
      await fetchAircraft();
    } catch (err: any) {
      console.error('Error deleting aircraft:', err);
      toast({
        title: 'Error',
        description: err?.message || err?.data?.detail || 'Failed to delete aircraft',
        variant: 'destructive'
      });
    }
  };

  const saveAdd = async () => {
    if (!form.registration || !form.type) {
      toast({ title: 'Validation Error', description: 'Please provide registration and aircraft type', variant: 'destructive' });
      return;
    }

    const normalizedForm = {
      ...form,
      medicalEquipment: typeof form.medicalEquipment === 'string'
        ? form.medicalEquipment.split(',').map(s => s.trim()).filter(Boolean)
        : form.medicalEquipment || []
    };

    try {
      if (editItem) {
        await AircraftService.updateAircraft(editItem.id, normalizedForm);
        toast({ title: 'Success', description: 'Aircraft updated successfully' });
        setEditItem(null);
      } else {
        await AircraftService.createAircraft(normalizedForm as any);
        toast({ title: 'Success', description: 'Aircraft added successfully' });
      }
      setIsAddOpen(false);
      setForm({});
      await fetchAircraft();
    } catch (err: any) {
      console.error('Error saving aircraft:', err);
      console.error('Error data:', err.data); // Log the actual error details

      let errorMessage = 'Failed to save aircraft';

      // Try to extract detailed validation error
      if (err.data) {
        if (typeof err.data === 'string') {
          errorMessage = err.data;
        } else if (err.data.detail) {
          if (Array.isArray(err.data.detail)) {
            // FastAPI validation errors
            errorMessage = err.data.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
          } else {
            errorMessage = err.data.detail;
          }
        } else if (err.data.message) {
          errorMessage = err.data.message;
        }
      } else if (err.message && err.message !== '[object Object]') {
        errorMessage = err.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Chatbot send (simple mocked response)
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    const userMsg = { id: Date.now(), text: newMessage.trim(), sender: "user", time: format(new Date(), "h:mm a") };
    setMessages((m) => [...m, userMsg]);
    setNewMessage("");

    setTimeout(() => {
      const lower = userMsg.text.toLowerCase();
      let reply = "How can I help with the fleet?";
      if (lower.includes("maintenance")) reply = `There are ${summaryStats.maintenance} aircraft in maintenance.`;
      if (lower.includes("available")) reply = `There are ${summaryStats.available} aircraft available for dispatch.`;
      const aiMsg = { id: Date.now() + 1, text: reply, sender: "ai", time: format(new Date(), "h:mm a") };
      setMessages((m) => [...m, aiMsg]);
    }, 700);
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      {/* Analytics Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group" title="Fleet Analytics">
            <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110 text-slate-500 group-hover:text-blue-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-5 rounded-3xl shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-300" align="end" sideOffset={10}>
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Fleet Analytics</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Assets</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:border-blue-100 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="h-3 w-3 text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-800 tracking-tighter">{summaryStats.total}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Aircraft</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl transition-all hover:border-rose-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <PlaneTakeoff className="h-3 w-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ready</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600 tracking-tighter">{summaryStats.available}</span>
                <span className="text-[8px] text-emerald-400 font-bold uppercase font-black italic">Avail</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl transition-all hover:border-amber-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <PlaneLanding className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Active</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600 tracking-tighter">{summaryStats.inFlight}</span>
                <span className="text-[8px] text-amber-400 font-bold uppercase font-black italic">Flight</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl transition-all hover:border-emerald-200 group/metric">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className="h-3 w-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Maint.</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600 tracking-tighter">{summaryStats.maintenance}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase font-black italic">Down</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Unified Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center justify-center h-10 w-10 p-0 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95 group relative" title="Filters">
            <Filter className={`h-4 w-4 transition-transform group-hover:rotate-12 ${statusFilter !== 'all' ? 'text-blue-600' : 'text-slate-500'}`} />
            {statusFilter !== 'all' && (
              <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[8px] font-black border-2 border-white shadow-sm animate-in zoom-in duration-300">
                1
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2 rounded-xl shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200" align="end">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 py-1.5">
            Fleet Status Filters
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          <DropdownMenuItem onClick={() => setStatusFilter('all')} className={`rounded-lg px-2 py-2 mb-1 cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusFilter === 'all' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <span className="font-bold text-xs capitalize">All Status</span>
              </div>
              {statusFilter === 'all' && <Activity className="h-3 w-3 text-blue-600" />}
            </div>
          </DropdownMenuItem>
          {(['available', 'in_flight', 'maintenance'] as const).map((status) => (
            <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-2 py-2 mb-1 cursor-pointer transition-colors ${statusFilter === status ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status === 'available' ? 'bg-emerald-500' : status === 'in_flight' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                  <span className="font-bold text-xs capitalize">{statusLabel(status)}</span>
                </div>
                {statusFilter === status && <Activity className="h-3 w-3 text-blue-600" />}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Global Search */}
      <div className="relative group flex-1 max-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          placeholder="Search fleet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-9 pr-4 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full"
        />
      </div>

      {/* Add Aircraft Button */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 group"
            onClick={() => {
              setEditItem(null);
              setForm({
                registration: "",
                type: "fixed_wing",
                status: "available",
                latitude: 0,
                longitude: 0,
                operator: "",
                baseLocation: "",
                medicalEquipment: []
              });
            }}
          >
            <Plus className="h-4 w-4 stroke-[3px] group-hover:rotate-90 transition-transform" />
            <span className="uppercase tracking-wider">Add Aircraft</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
            <Plus className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <Plus className="h-6 w-6" /> {editItem ? 'Refine Asset Configuration' : 'Register Global Asset'}
              </DialogTitle>
              <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest mt-1">Strategic Aviation Management</p>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 text-black bg-white">
            {/* ROW 1: Reg, Type, Operator, Status */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label className="font-semibold">Registration *</Label>
                <Input
                  placeholder="e.g., C-GFAH"
                  value={form.registration || ''}
                  onChange={(e) => setForm({ ...form, registration: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label className="font-semibold">Type</Label>
                <Select
                  value={form.type || 'fixed_wing'}
                  onValueChange={(v) => setForm({ ...form, type: v as any })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_wing">Fixed Wing</SelectItem>
                    <SelectItem value="rotary_wing">Rotary Wing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label className="font-semibold">Operator</Label>
                <Input
                  placeholder="e.g., AirSwift"
                  value={form.operator || ''}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label className="font-semibold">Status</Label>
                <Select
                  value={form.status || 'available'}
                  onValueChange={(v) => setForm({ ...form, status: v as AircraftStatus })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_flight">In Flight</SelectItem>
                    <SelectItem value="maintenance"> Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 2: Base Location, Latitude, Longitude */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="font-semibold">Base Location</Label>
                <Input
                  placeholder="e.g., Toronto Pearson (CYYZ)"
                  value={form.baseLocation || ''}
                  onChange={(e) => setForm({ ...form, baseLocation: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">Latitude</Label>
                <Input
                  type="number"
                  placeholder="e.g., 19.07"
                  value={form.latitude ?? ''}
                  onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">Longitude</Label>
                <Input
                  type="number"
                  placeholder="e.g., 72.87"
                  value={form.longitude ?? ''}
                  onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>

            {/* MAP PICKER */}
            <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-blue-800 flex items-center gap-2">
                    <Navigation className="h-3 w-3" /> Click on the map or search to select aircraft location
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="🔍 Search for airport or location..."
                      value={mapSearch}
                      onChange={(e) => setMapSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMapSearch()}
                      className="h-8 text-xs pl-8 bg-white border-blue-200 focus:border-blue-500"
                    />
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-xs px-3 gap-1"
                    onClick={handleMapSearch}
                    disabled={isSearchingMap}
                  >
                    {isSearchingMap ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    Search
                  </Button>
                </div>
              </div>
              <div className="h-[250px] w-full relative rounded-md overflow-hidden border border-blue-200">
                <MapContainer
                  {...{
                    key: form.latitude !== undefined ? `map-${form.latitude}-${form.longitude}` : 'map-default',
                    center: (form.latitude !== undefined && form.longitude !== undefined ? [form.latitude, form.longitude] : [20.5937, 78.9629]) as LatLngExpression,
                    zoom: form.latitude !== undefined ? 16 : 5,
                    scrollWheelZoom: true,
                    style: { height: "100%", width: "100%" }
                  } as any}
                >
                  <TileLayer
                    {...{
                      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    } as any}
                  />
                  <MapClickHandler onLocationSelect={handleMapLocationSelect} />
                  {form.latitude !== undefined && form.longitude !== undefined && (
                    <Marker position={[form.latitude, form.longitude] as LatLngExpression} />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* ROW 3: Medical Equipment */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4 space-y-1.5">
                <Label className="font-semibold">Medical Equipment</Label>
                <Textarea
                  placeholder="List equipment..."
                  value={
                    typeof form.medicalEquipment === 'string'
                      ? form.medicalEquipment
                      : Array.isArray(form.medicalEquipment)
                        ? form.medicalEquipment.join(', ')
                        : ''
                  }
                  onChange={(e) => setForm({ ...form, medicalEquipment: e.target.value })}
                  className="h-20 min-h-[80px]"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 pt-4 border-t mt-2">
              <Button variant="ghost" onClick={() => { setIsAddOpen(false); setEditItem(null); setForm({}); }}>
                Cancel
              </Button>
              <Button onClick={saveAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editItem ? 'Save Changes' : 'Add Aircraft'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <Layout subTitle="Fleet Tracking & Dispatch" headerActions={headerActions} isFullHeight={true}>
      <TooltipProvider>
        <div className="p-4 lg:p-6 space-y-4 h-full flex flex-col">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Aircraft Details</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className={`h-9 ${view === "list" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => {
                      setView("list");
                      setTrackingId(null);
                    }}
                  >
                    <List className="w-4 h-4 mr-2" /> List
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-9 ${view === "map" ? "bg-blue-600 text-white" : ""}`}
                    onClick={() => setView("map")}
                  >
                    <Map className="w-4 h-4 mr-2" /> Map
                  </Button>
                </div>
              </div>

              {view === "list" ? (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  {/* TABLE */}
                  <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-[#f8fafc] border-b border-slate-200">
                            <th className="px-6 py-2.5 text-left font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Registration</th>
                            <th className="px-6 py-2.5 text-left font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Operator</th>
                            <th className="px-6 py-2.5 text-left font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Base</th>
                            <th className="px-6 py-2.5 text-left font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Crew</th>
                            <th className="px-6 py-2.5 text-left font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Status</th>
                            <th className="px-6 py-2.5 text-center font-black text-[#64748b] uppercase tracking-widest bg-[#f8fafc]">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {paginatedAircraft.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-semibold">
                                No aircraft records found.
                              </td>
                            </tr>
                          ) : (
                            paginatedAircraft.map((ac, idx) => (
                              <tr key={ac.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                                <td className="px-6 py-2.5 font-black text-blue-800 tracking-tight">{ac.registration}</td>
                                <td className="px-6 py-2.5 text-slate-600 font-semibold">{ac.operator}</td>
                                <td className="px-6 py-2.5 text-slate-600 font-semibold">{ac.baseLocation}</td>
                                <td className="px-6 py-2.5 text-slate-600 font-semibold">{ac.crewAssigned} Pax</td>
                                <td className="px-6 py-2.5">
                                  <span className={statusColorClass(ac.status)}>
                                    {statusLabel(ac.status)}
                                  </span>
                                </td>
                                <td className="px-6 py-2.5 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedAircraft(ac)}
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 border border-slate-100 shadow-sm"
                                        title="View Details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => startEdit(ac)}
                                        className="h-8 w-8 text-amber-600 hover:bg-amber-50 border border-slate-100 shadow-sm"
                                        title="Edit Aircraft"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => remove(ac.id)}
                                        className="h-8 w-8 text-red-600 hover:bg-red-50 border border-slate-100 shadow-sm"
                                        title="Delete Aircraft"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>

                                    <Button
                                      className="h-7 w-full px-2 text-[9px] font-black uppercase tracking-tighter bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                                      onClick={() => {
                                        setTrackingId(ac.id);
                                        setIsTrackingDialogOpen(true);
                                      }}
                                    >
                                      <Map className="h-3 w-3 mr-1" /> Track Live
                                    </Button>
                                  </div>
                                </td>
                              </tr>
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
                          <select
                            value={itemsPerPage.toString()}
                            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                            className="h-9 w-20 bg-white border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none px-2"
                          >
                            {[10, 25, 50, 100].map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} <span className="text-slate-300 mx-1">/</span> {filtered.length} Aircraft
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
                          <ChevronLeft className="h-4 w-4" />
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
                </div>
              ) : (
                <div className="flex-1 rounded-2xl border-2 border-slate-300 bg-white shadow-xl overflow-hidden relative min-h-[600px] h-[75vh]">
                  <LiveMapComponent
                    aircraftData={(aircraft || []).filter(a => a && typeof a.latitude === 'number' && typeof a.longitude === 'number')}
                    initialTrackedId={trackingId}
                  />
                </div>
              )}
            </div>
          )}

          {/* Aircraft Detail View Dialog */}
          <Dialog open={!!selectedAircraft} onOpenChange={(open) => !open && setSelectedAircraft(null)}>
            <DialogContent className="w-full max-w-[980px] h-full max-h-[80vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
              <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-6 shrink-0 relative overflow-hidden text-left">
                <Plane className="absolute top-4 right-4 h-32 w-32 -rotate-12 opacity-10 text-white pointer-events-none" />
                <div className="relative z-10">
                  <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <Plane className="h-6 w-6 text-blue-200" />
                    Aircraft Intelligence — {selectedAircraft?.registration}
                  </DialogTitle>
                  <p className="text-blue-100 text-[10px] uppercase font-bold tracking-widest mt-1">Global Asset Tracking Metrics</p>
                </div>
              </DialogHeader>
              <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-black bg-slate-50/10">
                {selectedAircraft && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {/* Left Col: Aircraft Image and Primary Info */}
                    <div className="md:col-span-1 space-y-6">
                      <div className="aspect-video rounded-xl overflow-hidden border-2 border-slate-100 shadow-sm">
                        <img
                          src={selectedAircraft.imageUrl || DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)]}
                          alt={selectedAircraft.registration}
                          className="w-full h-full object-cover"
                          onError={handleImgError}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                          <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Status</Label>
                          <div className="flex items-center gap-3">
                            <span className={statusColorClass(selectedAircraft.status)}>
                              {statusLabel(selectedAircraft.status)}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                          <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Operator</Label>
                          <p className="font-bold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            {selectedAircraft.operator}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Middle Col: Technical Specs & Configuration */}
                    <div className="md:col-span-1 space-y-6">
                      <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">Technical Specifications</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Type</p>
                          <p className="text-sm font-bold capitalize">{selectedAircraft.type?.replace('_', ' ')}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Base Location</p>
                          <p className="text-sm font-bold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-red-500" />
                            {selectedAircraft.baseLocation}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Crew Capacity</p>
                          <p className="text-sm font-bold flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-500" />
                            {selectedAircraft.crewAssigned} persons
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Registration</p>
                          <p className="text-sm font-mono font-bold">{selectedAircraft.registration}</p>
                        </div>
                      </div>

                      <div className="pt-4 space-y-4">
                        <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">Medical Equipment</h4>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const eq = selectedAircraft.medicalEquipment;
                            if (Array.isArray(eq)) {
                              return eq.map((item, i) => (
                                <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium whitespace-nowrap">
                                  {item}
                                </Badge>
                              ));
                            } else if (typeof eq === 'string' && eq.trim()) {
                              return eq.split(',').map((item, i) => (
                                <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium whitespace-nowrap">
                                  {item.trim()}
                                </Badge>
                              ));
                            }
                            return <p className="text-xs text-slate-400 italic">No equipment listed</p>;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Maintenance & Tracking */}
                    <div className="md:col-span-1 space-y-6">
                      <h4 className="text-sm font-black uppercase text-slate-400 border-b pb-2">Operational Status</h4>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-md shadow-sm">
                              <Calendar className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Next Maintenance</p>
                              <p className="text-sm font-bold">{selectedAircraft.nextMaintenanceDue || "Not Scheduled"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <p className="text-xs font-bold text-blue-800 uppercase">Live Location</p>
                          </div>
                          <div className="text-[11px] font-mono text-blue-600 bg-white/50 p-2 rounded border border-blue-100">
                            Lat: {selectedAircraft.latitude?.toFixed(4) || "0.00"} | Lng: {selectedAircraft.longitude?.toFixed(4) || "0.00"}
                          </div>
                          <Button
                            className="w-full h-8 text-[11px] font-bold"
                            variant="default"
                            onClick={() => {
                              if (!selectedAircraft) return;
                              const currentId = selectedAircraft.id;
                              setSelectedAircraft(null); // Close detail dialog
                              setTrackingId(currentId);
                              setIsTrackingDialogOpen(true); // Open tracking dialog
                            }}
                          >
                            TRACK IN LIVE MAP
                          </Button>
                        </div>

                        <div className="p-2 border-2 border-dashed border-slate-200 rounded-lg">
                          <p className="text-[10px] text-slate-400 italic text-center">Last updated: {new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Chatbot Widget */}
          <div className="fixed bottom-6 right-6 z-50">
            {isChatOpen ? (
              <Card
                className="w-96 shadow-2xl flex flex-col rounded-2xl overflow-hidden border-2 border-blue-300 animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white max-h-[85vh]"
                onMouseLeave={() => setIsChatOpen(false)}
              >
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center border-b border-blue-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-inner flex-shrink-0">
                      <img src={chatBotImage} alt="AI Aircraft Assistant" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Aircraft Assistant</h3>
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
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
                      <div className={`max-w-xs px-4 py-3 rounded-2xl ${msg.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none shadow-lg'
                        : 'bg-blue-50 text-black rounded-bl-none shadow-sm border border-blue-200'
                        }`}>
                        <p className="text-sm font-medium">{msg.text}</p>
                        <span className={`text-xs mt-1 block opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-blue-600'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="border-t-2 border-blue-300 p-3 bg-white flex gap-2">
                  <Input
                    placeholder="Ask about aircraft..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1 rounded-full border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-black"
                  />
                  <Button
                    size="sm"
                    onClick={handleSend}
                    className="bg-blue-500 hover:bg-blue-600 text-white border border-blue-600 rounded-full h-10 w-10 p-0 flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-8 right-8 z-50 p-0 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-white animate-bounce overflow-hidden h-16 w-16 flex items-center justify-center"
              >
                <img src={chatBotImage} alt="Chatbot Assistant" className="w-full h-full object-cover rounded-full" />
              </Button>
            )}
          </div>

          {/* 🛰️ LIVE TRACKING MAP DIALOG */}
          <Dialog open={isTrackingDialogOpen} onOpenChange={(open) => !open && setIsTrackingDialogOpen(false)}>
            <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none bg-white p-6 overflow-hidden rounded-xl border-2 border-slate-200 shadow-2xl flex flex-col gap-0 backdrop-blur-sm">
              <DialogHeader className="mb-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                      <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
                        <Navigation className="h-5 w-5 text-white animate-pulse" />
                      </div>
                      Live Fleet Surveillance
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1 ml-12">
                      Real-time Positioning & Telemetry Tracking
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 rounded-2xl border-4 border-slate-100 bg-white overflow-hidden relative min-h-[500px] h-[70vh] shadow-inner">
                <LiveMapComponent
                  aircraftData={(aircraft || []).filter(a => a && typeof a.latitude === 'number' && typeof a.longitude === 'number')}
                  initialTrackedId={trackingId}
                />

                {/* Overlay with instructions */}
                <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Navigation Legend</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-700">In Flight</span>
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <span className="text-[10px] font-bold text-slate-700">Available</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </Layout>
  );
};

export default Aircraft;