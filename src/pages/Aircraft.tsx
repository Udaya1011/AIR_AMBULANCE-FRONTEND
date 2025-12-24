// src/pages/Aircraft.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
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
  Edit,
  Trash2,
  Search,
  Map,
  Plus,
  PlaneTakeoff,
  PlaneLanding,
  Activity,
  MessageSquare,
  Send,
  List,
} from "lucide-react";

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
  const [view, setView] = useState<"list" | "map">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AircraftStatus | "all">("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<AircraftType | null>(null);

  const [form, setForm] = useState<Partial<AircraftType> & { medicalEquipment?: string | string[] }>({});

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
      setAircraft(data);
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
        a.registration.toLowerCase().includes(s) ||
        a.type.toLowerCase().includes(s) ||
        a.operator.toLowerCase().includes(s) ||
        a.baseLocation.toLowerCase().includes(s);

      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [aircraft, searchTerm, statusFilter]);

  // Counts
  const counts = useMemo(
    () => ({
      total: aircraft.length,
      available: aircraft.filter((a) => a.status === "available").length,
      inflight: aircraft.filter((a) => a.status === "in_flight").length,
      maintenance: aircraft.filter((a) => a.status === "maintenance").length,
    }),
    [aircraft]
  );

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

    try {
      if (editItem) {
        await AircraftService.updateAircraft(editItem.id, form);
        toast({ title: 'Success', description: 'Aircraft updated successfully' });
        setEditItem(null);
      } else {
        await AircraftService.createAircraft(form);
        toast({ title: 'Success', description: 'Aircraft created successfully' });
      }

      setForm({});
      setIsAddOpen(false);
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
      if (lower.includes("maintenance")) reply = `There are ${counts.maintenance} aircraft in maintenance.`;
      if (lower.includes("available")) reply = `There are ${counts.available} aircraft available for dispatch.`;
      const aiMsg = { id: Date.now() + 1, text: reply, sender: "ai", time: format(new Date(), "h:mm a") };
      setMessages((m) => [...m, aiMsg]);
    }, 700);
  };

  return (
    <Layout>
      <TooltipProvider>
        <div>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between py-3">
              <div>
                <h1 className="text-3xl font-bold">✈️ Aircraft Fleet</h1>
                <p className="mt-0.5 text-xs opacity-90">Manage dispatch and aircraft</p>
              </div>

              <Button
                className="px-4 py-2 rounded-lg font-semibold h-10 flex items-center"
                onClick={() => {
                  setEditItem(null);
                  setForm({});
                  setIsAddOpen(true);
                }}
              >
                <Plus /> Add Aircraft
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Aircraft", value: counts.total, icon: <Activity /> },
                { label: "Available", value: counts.available, icon: <PlaneTakeoff /> },
                { label: "In Flight", value: counts.inflight, icon: <PlaneLanding /> },
                { label: "Maintenance", value: counts.maintenance, icon: <Map /> },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4 flex items-center justify-between border border-gray-200"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-600">{item.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                  </div>
                  <div >{item.icon}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Container */}
          <div className="mt-6 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Aircraft Details</h2>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className={`h-9 ${view === "list" ? "bg-blue-600 text-white" : ""}`}
                  onClick={() => setView("list")}
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

            {/* Filters */}
            <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by registration, type, operator or base..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {(["all", "available", "in_flight", "maintenance"] as const).map((s) => (
                  <Button
                    key={s}
                    className={`px-4 py-2 rounded-full border font-semibold h-10 ${statusFilter === s ? "bg-blue-600 text-white" : "bg-transparent text-gray-700"
                      }`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All" : statusLabel(s)}
                  </Button>
                ))}

              </div>
            </div>

            {/* List or Map */}
            <div className="mt-6">
              {view === "list" ? (
                <Card className="p-4 border border-gray-200">
                  <div>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="p-3 text-left">Aircraft</th>
                          <th className="p-3 text-left">Registration</th>
                          <th className="p-3 text-left">Operator</th>
                          <th className="p-3 text-left">Base</th>
                          <th className="p-3 text-left">Crew</th>
                          <th className="p-3 text-left">Maintenance</th>
                          <th className="p-3 text-left">Status</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-muted-foreground">
                              No records found.
                            </td>
                          </tr>
                        ) : (
                          filtered.map((ac) => (
                            <tr key={ac.id} className="border-b">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={ac.imageUrl}
                                    onError={handleImgError}
                                    alt={ac.type}
                                    className="w-20 h-14 rounded-lg object-cover"
                                  />
                                  <div>
                                    <p className="font-semibold text-gray-800">{ac.type}</p>
                                    <p className="text-xs text-gray-600">Crew: {ac.crewAssigned}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-medium">{ac.registration}</td>
                              <td className="p-3">{ac.operator}</td>
                              <td className="p-3">{ac.baseLocation}</td>
                              <td className="p-3">{ac.crewAssigned} persons</td>
                              <td className="p-3 text-sm">{ac.nextMaintenanceDue || "None"}</td>
                              <td className="p-3">
                                <span className={statusColorClass(ac.status)}>
                                  {statusLabel(ac.status)}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => startEdit(ac)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>

                                  <Button variant="ghost" size="icon" onClick={() => remove(ac.id)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>

                                  <Button
                                    className="h-9"
                                    onClick={() => {
                                      setView("map");
                                      setTimeout(() => {
                                        window.dispatchEvent(
                                          new CustomEvent("flyToAircraft", {
                                            detail: {
                                              id: ac.id,
                                              lat: ac.latitude,
                                              lng: ac.longitude,
                                            },
                                          })
                                        );
                                      }, 250);
                                    }}
                                  >
                                    <Map className="h-4 w-4 mr-2" /> Live Location
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <div className="h-[70vh] rounded-lg border border-gray-200">
                  <LiveMapComponent aircraftData={aircraft} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chatbot Widget */}
        <Dialog
          open={isAddOpen}
          onOpenChange={() => {
            setIsAddOpen(false);
            setEditItem(null);
            setForm({});
          }}
        >
          <DialogContent
            className="
    w-[95vw]
    h-[95vh]
    max-w-none
    max-h-none
    bg-white
    p-6
    overflow-y-auto
    rounded-xl
    border
    space-y-6
  "
          >
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Aircraft" : "Add Aircraft"}</DialogTitle>
              <DialogDescription>
                {editItem
                  ? "Update aircraft details."
                  : "Fill the aircraft details below."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* ROW 1: Registration & Aircraft Type */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">🔖 Registration *</Label>
                  <Input
                    placeholder="e.g., N12345"
                    value={form.registration || ''}
                    onChange={(e) => setForm({ ...form, registration: e.target.value })}
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">✈️ Aircraft Type *</Label>
                  <Select
                    value={form.type || 'fixed_wing'}
                    onValueChange={(v) => setForm({ ...form, type: v })}
                  >
                    <SelectTrigger className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10">
                      <SelectValue placeholder="Select aircraft type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helicopter">🚁 Helicopter</SelectItem>
                      <SelectItem value="fixed_wing">✈️ Fixed Wing</SelectItem>
                      <SelectItem value="jet">🛩️ Jet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ROW 2: Operator & Base Location */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">🏢 Operator</Label>
                  <Input
                    placeholder="e.g., SkyMedic Air"
                    value={form.operator || ''}
                    onChange={(e) => setForm({ ...form, operator: e.target.value })}
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">📍 Base Location</Label>
                  <Input
                    placeholder="e.g., Toronto Pearson (CYYZ)"
                    value={form.baseLocation || ''}
                    onChange={(e) => setForm({ ...form, baseLocation: e.target.value })}
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                  />
                </div>
              </div>

              {/* ROW 3: Status & Latitude & Longitude */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-1 space-y-2">
                  <Label className="font-semibold">🚁 Status</Label>
                  <Select
                    value={form.status || 'available'}
                    onValueChange={(v) => setForm({ ...form, status: v as AircraftStatus })}
                  >
                    <SelectTrigger className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">✅ Available</SelectItem>
                      <SelectItem value="in_flight">🛫 In Flight</SelectItem>
                      <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 space-y-2">
                  <Label className="font-semibold">🗺️ Latitude</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 19.07"
                    value={form.latitude ?? ''}
                    onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="font-semibold">🗺️ Longitude</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 72.87"
                    value={form.longitude ?? ''}
                    onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                  />
                </div>
              </div>

              {/* ROW 4: Medical Equipment */}
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-4 space-y-2">
                  <Label className="font-semibold">🏥 Medical Equipment Onboard</Label>
                  <Textarea
                    placeholder="List all medical equipment (e.g., Ventilator, Oxygen, Defibrillator - separate with commas)"
                    value={
                      typeof form.medicalEquipment === 'string'
                        ? form.medicalEquipment
                        : Array.isArray(form.medicalEquipment)
                          ? form.medicalEquipment.join(', ')
                          : ''
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        medicalEquipment: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    className="bg-white text-black border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-20 resize-none"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition"
                  onClick={saveAdd}
                >
                  💾 {editItem ? 'Save Changes' : 'Add Aircraft'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditItem(null);
                    setForm({});
                  }}
                >
                  ❌ Cancel
                </Button>
              </div>
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
                  <MessageSquare className="h-6 w-6 text-white" />
                  <div>
                    <h3 className="font-bold text-white">✈️ Aircraft Assistant</h3>
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
      </TooltipProvider>
    </Layout>
  );
};

export default Aircraft;