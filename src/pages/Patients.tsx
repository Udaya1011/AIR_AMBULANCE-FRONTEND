import { useMemo, useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Patient, AcuityLevel } from '@/types';
import { usePatients } from '@/contexts/PatientsContext';
import { Users, Heart, AlertCircle, CheckCircle2, Plus, Edit, Trash2, MessageCircle, Send, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import chatBotImage from '../emoji.jpeg';
const Patients = () => {
  const { patients, isLoading, addPatient, removePatient, updatePatient } = usePatients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInactivityTimer, setChatInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const CHAT_INACTIVITY_TIME = 2 * 60 * 1000; // 2 minutes
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'bot'; text: string; timestamp: Date }>>([
    { id: '1', sender: 'bot', text: '👋 Welcome to Patient Management Assistant!\n\nI\'m your AI-powered healthcare companion. I can help you:\n\n📊 Analyze patient statistics\n🔴 Monitor critical cases\n🟡 Track urgent patients\n🟢 View stable patients\n👥 Get patient demographics\n🩺 Review diagnoses\n➕ Add new patients\n⚠️ Get clinical recommendations\n\nWhat would you like to know?', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [form, setForm] = useState<{
    name?: string;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
    weight?: number;
    diagnosis?: string;
    acuity_level?: AcuityLevel;
    blood_group?: string;
    allergies?: string;
    vitals?: string;
    specialEquipment?: string[];
  }>({
    name: '',
    dob: '',
    gender: 'other',
    weight: 0,
    diagnosis: '',
    acuity_level: 'stable',
    blood_group: 'O+',
    allergies: '',
    vitals: '',
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const params = useParams();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const id = params['id'];
    if (id) {
      const match = patients.find(p => p.id === id);
      if (match) setSelectedPatient(match);
    }
  }, [params, patients]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter Logic
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter(p => {
      const matchesGender = genderFilter === 'all' || (p.gender || 'other').toLowerCase() === genderFilter;
      const matchesSearch = !searchTerm ||
        (p.full_name || p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGender && matchesSearch;
    });
  }, [patients, genderFilter, searchTerm]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };


  // Chat inactivity timer
  useEffect(() => {
    if (!isChatOpen) return;

    const resetInactivityTimer = () => {
      if (chatInactivityTimer) clearTimeout(chatInactivityTimer);
      const timer = setTimeout(() => {
        if (isChatOpen) {
          setIsChatOpen(false);
          toast({ title: '⏱️ Chat Closed', description: 'Chat closed due to inactivity.' });
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

  const summaryStats = useMemo(() => {
    const total = patients.length;
    const critical = patients.filter(p => p.acuity_level === 'critical').length;
    const urgent = patients.filter(p => p.acuity_level === 'urgent').length;
    const stable = patients.filter(p => p.acuity_level === 'stable').length;
    return { total, critical, urgent, stable };
  }, [patients]);

  const getAcuityColor = (acuity: AcuityLevel) => {
    const colors: Record<AcuityLevel, string> = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      urgent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      stable: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[acuity] || colors.stable;
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;

    // Add user message
    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);

    // Generate intelligent bot response with proper analysis
    setTimeout(() => {
      let botResponse = '';
      const lowerInput = chatInput.toLowerCase().trim();

      // Analysis helpers
      const criticalPatients = patients.filter(p => p.acuity_level === 'critical');
      const urgentPatients = patients.filter(p => p.acuity_level === 'urgent');
      const stablePatients = patients.filter(p => p.acuity_level === 'stable');
      const totalPatients = patients.length;

      const getAverageAge = () => {
        if (totalPatients === 0) return 0;
        return Math.round(patients.reduce((sum, p) => sum + (new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear()), 0) / totalPatients);
      };

      // Keyword matching with better logic
      if (!patients || patients.length === 0) {
        if (lowerInput.includes('add') || lowerInput.includes('new')) {
          botResponse = '➕ **Getting Started**\n\nNo patients in the system yet!\n\nClick the "➕ Add Patient" button to add your first patient. You\'ll need:\n• Full Name\n• Date of Birth\n• Gender\n• Diagnosis\n• Acuity Level\n\nLet\'s get started! 🚀';
        } else {
          botResponse = '📋 **No Patients Yet**\n\nThe system is currently empty. Let\'s add your first patient!\n\n👉 Click "➕ Add Patient" to begin.\n\nOnce patients are added, I can help you with:\n✓ View statistics\n✓ Monitor critical cases\n✓ Analyze trends';
        }
      } else if (lowerInput.includes('summary') || lowerInput.includes('overview') || lowerInput === 'hi' || lowerInput === 'hello') {
        const criticalPercent = Math.round((criticalPatients.length / totalPatients) * 100);
        const urgentPercent = Math.round((urgentPatients.length / totalPatients) * 100);
        const stablePercent = Math.round((stablePatients.length / totalPatients) * 100);
        botResponse = `📊 **Patient Overview**\n\nTotal Patients: ${totalPatients}\n\n🔴 Critical: ${criticalPatients.length} (${criticalPercent}%)\n🟡 Urgent: ${urgentPatients.length} (${urgentPercent}%)\n🟢 Stable: ${stablePatients.length} (${stablePercent}%)\n\nAverage Age: ${getAverageAge()} years\n\n${criticalPatients.length > 0 ? '⚠️ ALERT: Critical patients need immediate attention!' : '✅ All patients stable!'}`;
      } else if (lowerInput.includes('critical')) {
        if (criticalPatients.length === 0) {
          botResponse = '✅ **Great News!**\n\nNo critical patients at the moment. The system is running smoothly! 🎉';
        } else {
          botResponse = `🔴 **CRITICAL ALERT** (${criticalPatients.length} patients)\n\n${criticalPatients.map((p, i) => `${i + 1}. ${p.full_name || p.name}\n   Age: ${new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear()} years\n   Diagnosis: ${p.diagnosis || 'Not specified'}`).join('\n\n')}\n\n⚠️ Immediate medical intervention required!`;
        }
      } else if (lowerInput.includes('urgent')) {
        if (urgentPatients.length === 0) {
          botResponse = '✅ **No Urgent Cases**\n\nThere are currently no urgent patients. System status: Normal ✓';
        } else {
          botResponse = `🟡 **Urgent Cases** (${urgentPatients.length} patients)\n\n${urgentPatients.map((p, i) => `${i + 1}. ${p.name} - ${p.diagnosis || 'No diagnosis'}`).join('\n')}\n\n⏰ Requires attention soon!`;
        }
      } else if (lowerInput.includes('stable')) {
        if (stablePatients.length === 0) {
          botResponse = '📋 No stable patients currently.';
        } else {
          botResponse = `🟢 **Stable Patients** (${stablePatients.length} total)\n\n${stablePatients.slice(0, 8).map((p, i) => `${i + 1}. ${p.name}`).join('\n')}${stablePatients.length > 8 ? `\n... and ${stablePatients.length - 8} more` : ''}\n\n✓ All stable patients under observation`;
        }
      } else if (lowerInput.includes('age') || lowerInput.includes('demographic')) {
        const ages = patients.map(p => new Date().getFullYear() - new Date(p.date_of_birth || p.dob || Date.now()).getFullYear());
        const oldest = Math.max(...ages);
        const youngest = Math.min(...ages);
        botResponse = `👥 **Demographic Analysis**\n\nTotal Patients: ${totalPatients}\nAverage Age: ${getAverageAge()} years\nYoungest: ${youngest} years\nOldest: ${oldest} years\n\nAge Range: ${oldest - youngest} years`;
      } else if (lowerInput.includes('diagnosis') || lowerInput.includes('condition')) {
        const diagnoses = [...new Set(patients.map(p => p.diagnosis).filter(d => d))];
        if (diagnoses.length === 0) {
          botResponse = '📋 No diagnoses recorded yet.';
        } else {
          botResponse = `🩺 **Active Diagnoses** (${diagnoses.length} types)\n\n${diagnoses.slice(0, 10).map((d, i) => `${i + 1}. ${d}`).join('\n')}${diagnoses.length > 10 ? `\n... and ${diagnoses.length - 10} more` : ''}`;
        }
      } else if (lowerInput.includes('add') || lowerInput.includes('new') || lowerInput.includes('create')) {
        botResponse = `➕ **How to Add a Patient**\n\n1️⃣ Click "➕ Add Patient" button (top right)\n2️⃣ Fill in patient details:\n   • Full Name *\n   • Date of Birth *\n   • Gender\n   • Weight\n   • Diagnosis\n   • Acuity Level\n   • Allergies\n   • Vitals\n\n3️⃣ Click "Add Patient" to save\n\n✓ Patient will appear in the list!`;
      } else if (lowerInput.includes('recommend') || lowerInput.includes('suggest') || lowerInput.includes('action')) {
        if (criticalPatients.length > 0) {
          botResponse = `⚠️ **Clinical Recommendation**\n\n🔴 PRIORITY: ${criticalPatients.length} critical patient(s)\n\nImmediate Actions:\n1. Review: ${criticalPatients.map(p => p.name).join(', ')}\n2. Check vitals and diagnosis\n3. Consider emergency transfer\n4. Notify medical team\n\n🚁 This requires immediate attention!`;
        } else if (urgentPatients.length > 0) {
          botResponse = `⚡ **Recommendation**\n\n🟡 ${urgentPatients.length} urgent patient(s) need review\n\nSuggested Actions:\n✓ Schedule consultations\n✓ Review treatment plans\n✓ Monitor progress\n✓ Plan follow-ups`;
        } else {
          botResponse = `✅ **System Status: OPTIMAL**\n\nAll patients stable ✓\n\nRecommendations:\n• Continue routine check-ups\n• Monitor vital signs regularly\n• Schedule follow-up appointments\n• Maintain patient records`;
        }
      } else if (lowerInput.includes('statistics') || lowerInput.includes('stats') || lowerInput.includes('report')) {
        botResponse = `📊 **Comprehensive Report**\n\n**Patient Count:**\nTotal: ${totalPatients}\nCritical: ${criticalPatients.length}\nUrgent: ${urgentPatients.length}\nStable: ${stablePatients.length}\n\n**Percentages:**\nCritical: ${totalPatients > 0 ? Math.round((criticalPatients.length / totalPatients) * 100) : 0}%\nUrgent: ${totalPatients > 0 ? Math.round((urgentPatients.length / totalPatients) * 100) : 0}%\nStable: ${totalPatients > 0 ? Math.round((stablePatients.length / totalPatients) * 100) : 0}%\n\n**Demographics:**\nAverage Age: ${getAverageAge()} years`;
      } else if (lowerInput.includes('help') || lowerInput.includes('what can')) {
        botResponse = `💡 **I Can Help With:**\n\n📊 ANALYTICS\n• Patient overview & summary\n• Statistics & reports\n• Demographic analysis\n\n🔍 SEARCH\n• Find critical patients\n• Find urgent patients\n• Find stable patients\n• View diagnoses\n\n➕ MANAGEMENT\n• Add new patients\n• Guidance on patient records\n\n⚠️ ALERTS\n• Critical case alerts\n• Recommendations\n• Clinical insights\n\nTry asking: "Show critical patients" or "Patient summary"`;
      } else if (lowerInput.includes('thank')) {
        botResponse = '😊 You\'re welcome! I\'m here 24/7 to help with patient management. Feel free to ask anything! 🏥';
      } else if (lowerInput.includes('status') || lowerInput.includes('how is')) {
        botResponse = `⚕️ **System Status**\n\n✅ System: OPERATIONAL\n👥 Patients: ${totalPatients}\n🔴 Critical: ${criticalPatients.length}\n🟡 Urgent: ${urgentPatients.length}\n🟢 Stable: ${stablePatients.length}\n\n${criticalPatients.length > 0 ? '⚠️ ACTION REQUIRED: Critical cases detected' : '✓ All clear - System running smoothly'}`;
      } else {
        botResponse = `👨‍⚕️ **I understand you're asking:** "${chatInput}"\n\n**What I can help with:**\n✓ Patient statistics\n✓ Critical/Urgent/Stable lists\n✓ Age & demographic data\n✓ Diagnosis information\n✓ Clinical recommendations\n✓ How to add patients\n✓ System status\n\nTry: "Show summary" or "Critical patients"`;
      }

      const botMsg = { id: (Date.now() + 1).toString(), sender: 'bot' as const, text: botResponse, timestamp: new Date() };
      setChatMessages(prev => [...prev, botMsg]);
    }, 700);

    setChatInput('');
  };



  return (
    <Layout>
      <div className="space-y-4">
        {/* Header - Simple Clean */}
        <div className="flex justify-between items-center py-3 text-black">
          <div>
            <h1 className="text-3xl font-bold">👥 Patients</h1>
            <p className="text-gray-600 font-medium text-xs mt-0.5">🏥 Manage patient records and medical information</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* SEARCH BAR */}
            <div className="relative w-full md:w-1/3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by name or ID..."
                className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* GENDER FILTERS */}
            <div className="flex gap-2">
              {(['all', 'male', 'female'] as const).map((g) => (
                <Button
                  key={g}
                  variant={genderFilter === g ? "default" : "outline"}
                  onClick={() => { setGenderFilter(g); setCurrentPage(1); }}
                  className={`capitalize ${genderFilter === g ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
                >
                  {g === 'male' ? '👨 Male' : g === 'female' ? '👩 Female' : 'All'}
                </Button>
              ))}
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-white hover:bg-gray-100 text-black font-bold shadow-lg border border-gray-300" onClick={() => { setForm({}); setIsDialogOpen(true); }}>

                ➕ Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
              <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
                <DialogTitle className="text-white text-xl">➕ Add New Patient</DialogTitle>
                <DialogDescription className="text-blue-100">Enter patient medical information</DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* ROW 1: Basics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">👤 Full Name *</Label>
                    <Input placeholder="Full Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">📅 DOB *</Label>
                    <Input type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">⚧ Gender</Label>
                    <Select value={form.gender || 'other'} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">🧑 Male</SelectItem>
                        <SelectItem value="female">👩 Female</SelectItem>
                        <SelectItem value="other">⚧ Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">⚖️ Weight (kg)</Label>
                    <Input type="number" placeholder="kg" value={form.weight as number | undefined} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} className="h-9" />
                  </div>
                </div>

                {/* ROW 2: Medical */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">🩸 Blood Group</Label>
                    <Select value={form.blood_group || 'O+'} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Blood Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="font-semibold">🩺 Diagnosis</Label>
                    <Input placeholder="Diagnosis" value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">🚨 Acuity</Label>
                    <Select value={form.acuity_level || 'stable'} onValueChange={(v) => setForm({ ...form, acuity_level: v as AcuityLevel })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Acuity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">🔴 Critical</SelectItem>
                        <SelectItem value="urgent">🟡 Urgent</SelectItem>
                        <SelectItem value="stable">🟢 Stable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ROW 3: Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">🧬 Allergies</Label>
                    <Input placeholder="Allergies (comma separated)" value={form.allergies || ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">💓 Current Vitals</Label>
                    <Input placeholder="BP, HR, SpO2..." value={form.vitals || ''} onChange={(e) => setForm({ ...form, vitals: e.target.value })} className="h-9" />
                  </div>
                </div>
                {/* ACTION BUTTONS */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg transition"
                    onClick={async () => {
                      if (!form.name || !form.dob) {
                        toast({ title: 'Validation', description: 'Name and DOB are required', variant: 'destructive' });
                        return;
                      }
                      try {
                        const p = await addPatient({
                          full_name: form.name as string,
                          date_of_birth: form.dob as string,
                          gender: (form.gender as any) || 'other',
                          weight_kg: (form.weight as number) || 70, // Default weight
                          diagnosis: form.diagnosis || 'Not specified',
                          acuity_level: (form.acuity_level as AcuityLevel) || 'stable',
                          blood_group: form.blood_group || 'O+',
                          allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
                          current_vitals: {
                            heart_rate: 80,
                            blood_pressure: "120/80",
                            oxygen_saturation: 98,
                            temperature: 37.0,
                            respiratory_rate: 16
                          },
                          special_equipment_needed: [],
                          insurance_details: {
                            provider: "N/A",
                            policy_number: "N/A",
                            group_number: "N/A",
                            verification_status: "pending"
                          },
                          next_of_kin: {
                            name: "N/A",
                            relationship: "N/A",
                            phone: "N/A",
                            email: "na@example.com"
                          }
                        });
                        toast({ title: '✅ Patient Added', description: `${p.name} was successfully added.`, variant: 'default' });
                        setIsDialogOpen(false);
                      } catch (error) {
                        toast({ title: '❌ Error', description: 'Failed to add patient.', variant: 'destructive' });
                      }
                    }}
                  >
                    💾 Save Patient
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    ❌ Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Statistics Cards - Professional */}
        <div className="grid grid-cols-4 gap-4">
          <Card >
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">👥 Total Patients</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.total}</p>
                    <p className="text-xs text-gray-400 font-medium">patients</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">🔴 Critical</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.critical}</p>
                    <p className="text-xs text-gray-400 font-medium">cases</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">🟡 Urgent</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.urgent}</p>
                    <p className="text-xs text-gray-400 font-medium">cases</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">🟢 Stable</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{summaryStats.stable}</p>
                    <p className="text-xs text-gray-400 font-medium">cases</p>
                  </div>
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Patient Dialog Trigger */}        {/* Patients Table */}
        {/* Selected patient detail dialog (opens when navigating to /patients/:id) */}
        <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => { if (!open) { setSelectedPatient(null); navigate('/patients'); } }}>
          <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
              <DialogTitle className="text-white text-xl">Patient Details - {selectedPatient?.full_name || selectedPatient?.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-black">
              {selectedPatient && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient ID</p>
                      <p className="text-lg font-medium">{selectedPatient.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="text-lg font-medium">{selectedPatient.dob ? format(new Date(selectedPatient.dob), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="text-lg font-medium capitalize">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="text-lg font-medium">{selectedPatient.weight || selectedPatient.weight_kg} kg</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="text-lg font-medium">{selectedPatient.diagnosis}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-white border-gray-300">
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Patient Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Age</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Diagnosis</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Acuity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Weight</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No patients found
                  </td>
                </tr>
              ) : (
                currentItems.map((patient) => {
                  const age = new Date().getFullYear() - new Date(patient.date_of_birth || patient.dob || Date.now()).getFullYear();
                  return (
                    <tr
                      key={patient.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.id}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">{age}</td>
                      <td className="px-6 py-4 text-sm">{patient.diagnosis}</td>

                      <td className="px-6 py-4">
                        <Badge className={getAcuityColor(patient.acuity_level)}>
                          {patient.acuity_level}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-sm">{patient.weight_kg} kg</td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingPatientId(patient.id);
                              setForm({
                                name: patient.full_name || patient.name,
                                dob: patient.date_of_birth || patient.dob,
                                gender: patient.gender,
                                weight: patient.weight_kg || patient.weight,
                                diagnosis: patient.diagnosis,
                                acuity_level: patient.acuity_level,
                                blood_group: patient.blood_group,
                                allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies || '',
                                vitals: patient.current_vitals ? JSON.stringify(patient.current_vitals) : '',
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
                            onClick={async () => {
                              try {
                                await removePatient(patient.id);
                                toast({ title: '✅ Patient Deleted', description: `${patient.full_name} was successfully deleted.` });
                              } catch (error) {
                                toast({ title: '❌ Error', description: 'Failed to delete patient.', variant: 'destructive' });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* EDIT DIALOG MOVED OUTSIDE LOOP */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditingPatientId(null); }}>
          <DialogContent className="w-[90vw] max-w-none max-h-[90vh] flex flex-col bg-white p-0 gap-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl">
            <DialogHeader className="bg-blue-600 text-white px-6 py-4 shrink-0">
              <DialogTitle className="text-white text-xl">✏️ Edit Patient</DialogTitle>
              <DialogDescription className="text-blue-100">Update patient medical information</DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-black">
              {/* ROW 1: Basics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">👤 Full Name</Label>
                  <Input
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">📅 DOB</Label>
                  <Input
                    type="date"
                    value={form.dob || ""}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">⚧ Gender</Label>
                  <Select value={form.gender || "other"} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">🧑 Male</SelectItem>
                      <SelectItem value="female">👩 Female</SelectItem>
                      <SelectItem value="other">⚧ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">⚖️ Weight (kg)</Label>
                  <Input
                    type="number"
                    value={form.weight || 0}
                    onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
              </div>

              {/* ROW 2: Medical */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">🩸 Blood Group</Label>
                  <Select value={form.blood_group || 'O+'} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="font-semibold">🩺 Diagnosis</Label>
                  <Input
                    value={form.diagnosis || ""}
                    onChange={(e) =>
                      setForm({ ...form, diagnosis: e.target.value })
                    }
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">🚨 Acuity</Label>
                  <Select
                    value={form.acuity_level || "stable"}
                    onValueChange={(v) =>
                      setForm({ ...form, acuity_level: v as AcuityLevel })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Acuity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="urgent">🟡 Urgent</SelectItem>
                      <SelectItem value="stable">🟢 Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ROW 3: Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">🧬 Allergies</Label>
                  <Input
                    placeholder="Allergies (comma separated)"
                    value={form.allergies || ""}
                    onChange={(e) =>
                      setForm({ ...form, allergies: e.target.value })
                    }
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">💓 Vitals</Label>
                  <Input
                    placeholder="BP, HR, SpO2..."
                    value={form.vitals || ""}
                    onChange={(e) =>
                      setForm({ ...form, vitals: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
              </div>

              {/* SAVE */}
              <div className="flex gap-4 pt-6 border-t mt-8 text-black">
                <Button
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-base rounded-lg transition"
                  onClick={async () => {
                    if (!form.name || !form.dob) {
                      toast({
                        title: "Validation",
                        description: "Name and DOB are required",
                        variant: "destructive",
                      });
                      return;
                    }
                    try {
                      if (!editingPatientId) return;

                      const payload: any = {
                        full_name: form.name,
                        date_of_birth: form.dob,
                        gender: form.gender,
                        weight_kg: form.weight,
                        diagnosis: form.diagnosis || 'Undiagnosed',
                        acuity_level: form.acuity_level,
                        blood_group: form.blood_group || 'O+',
                        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
                        current_vitals: {
                          // defaulting for update as well if empty/string
                          heart_rate: 80,
                          blood_pressure: "120/80"
                        },
                        // Handle update logic properly, partial updates might be safer but replacing for now
                        insurance_details: { provider: "N/A", policy_number: "N/A" },
                        next_of_kin: { name: "N/A", relationship: "N/A", phone: "N/A" }
                      };
                      await updatePatient(editingPatientId, payload);
                      toast({
                        title: "✅ Patient Updated",
                        description: `${form.name} was successfully updated.`,
                      });
                      setIsEditOpen(false);
                      setEditingPatientId(null);
                    } catch (error) {
                      toast({
                        title: "❌ Error",
                        description: "Failed to update patient.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  💾 Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-base rounded-lg border border-gray-300 hover:bg-gray-50 bg-white"
                  onClick={() => { setIsEditOpen(false); setEditingPatientId(null); }}
                >
                  ❌ Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pagination */}
        {patients && patients.length > 0 && (
          <div className="py-4 border-t border-gray-200">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => handlePageChange(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Chatbot Floating Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          title="Open Patient AI Assistant"
          aria-label="Open Patient AI Assistant"
          className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-all bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-4 border-white animate-bounce"
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Chatbot Window - Enhanced UI */}
      {isChatOpen && (
        <div
          className="fixed bottom-8 right-8 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border-2 border-blue-600 flex flex-col z-40 overflow-hidden"
        >
          {/* Chat Header - Enhanced */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-full border-2 border-white">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">🤖 AI Medical Assistant</h3>
                <p className="text-xs text-blue-100">💙 Always available</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} title="Close chat" aria-label="Close chat" className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages - Scrollable with better styling */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-200 scroll-smooth">
            {chatMessages.map((msg, idx) => (
              <div key={msg.id} className={`flex gap-2 animate-fadeIn ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-sm font-bold">🤖</span>
                  </div>
                )}
                <div className={`max-w-xs px-4 py-2.5 rounded-lg whitespace-pre-wrap break-words text-sm leading-relaxed shadow-md font-medium ${msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white border-2 border-gray-300 text-gray-800 rounded-bl-none'
                  }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input - Enhanced */}
          <div className="border-t-2 border-gray-200 p-3 bg-white flex gap-2 rounded-b-2xl">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800 placeholder-gray-500 font-medium"
            />
            <button
              onClick={handleChatSend}
              title="Send message"
              aria-label="Send message"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-2.5 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-blue-600 font-bold"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Layout >
  );
};
export default Patients;

