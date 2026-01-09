import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Settings as SettingsIcon, User, Bell, Shield, Globe, Save, Sun, Moon, Monitor, Eye, EyeOff, MapPin
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Location and device state
  const [currentLocation, setCurrentLocation] = useState('Fetching location...');
  const [browserInfo, setBrowserInfo] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Get browser and device info
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown Browser';
    let device = 'Unknown Device';

    // Detect browser
    if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
      browser = 'Chrome Browser';
    } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
      browser = 'Safari Browser';
    } else if (userAgent.indexOf('Firefox') > -1) {
      browser = 'Firefox Browser';
    } else if (userAgent.indexOf('Edg') > -1) {
      browser = 'Edge Browser';
    }

    // Detect device
    if (userAgent.indexOf('Windows') > -1) {
      device = 'Windows';
    } else if (userAgent.indexOf('Mac') > -1) {
      device = 'MacOS';
    } else if (userAgent.indexOf('Linux') > -1) {
      device = 'Linux';
    } else if (userAgent.indexOf('iPhone') > -1) {
      device = 'iPhone';
    } else if (userAgent.indexOf('iPad') > -1) {
      device = 'iPad';
    } else if (userAgent.indexOf('Android') > -1) {
      device = 'Android';
    }

    setBrowserInfo(browser);
    setDeviceInfo(device);

    // Set current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    setCurrentTime(`Today at ${timeStr}`);
  }, []);

  // Fetch current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use OpenStreetMap Nominatim for reverse geocoding (free)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();

            const city = data.address.city || data.address.town || data.address.village || 'Unknown City';
            const state = data.address.state || '';
            const country = data.address.country || 'Unknown Country';

            setCurrentLocation(`${city}${state ? ', ' + state : ''}, ${country}`);
          } catch (error) {
            console.error('Error fetching location:', error);
            setCurrentLocation('Location unavailable');
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setCurrentLocation('Location permission denied');
        }
      );
    } else {
      setCurrentLocation('Geolocation not supported');
    }
  }, []);

  // Handle password update
  const handlePasswordUpdate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    // TODO: Call API to update password
    console.log('Updating password...');
    alert('Password updated successfully!');

    // Clear form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Manage your preferences and account configurations
            </p>
          </div>
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>Update your personal and work information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input defaultValue={user?.name || ''} placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" defaultValue={user?.email || ''} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input type="tel" placeholder="+91 9876543210" defaultValue={(user as any)?.phone || ''} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select defaultValue={user?.role || 'Admin'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Doctor">Doctor</SelectItem>
                        <SelectItem value="Pilot">Pilot</SelectItem>
                        <SelectItem value="Hospital_Staff">Hospital Staff</SelectItem>
                        <SelectItem value="Dispatcher">Dispatcher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Emergency Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input placeholder="Contact person name" />
                  </div>
                  <div>
                    <Label>Emergency Contact Number</Label>
                    <Input placeholder="+91 9876543210" />
                  </div>
                </div>

                <div >
                  <Label>Home / Base Location</Label>
                  <Input placeholder="City or Base Station" />
                </div>

                <Button className="gap-2 mt-4">
                  <Save className="h-4 w-4" /> Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>Control how you get notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Notifications */}
                {[
                  { title: 'Flight Alerts', desc: 'Get notified about new or delayed air ambulance flights' },
                  { title: 'Patient Updates', desc: 'Receive updates when patient data changes' },
                  { title: 'Maintenance Alerts', desc: 'Aircraft maintenance notifications' },
                  { title: 'Emergency Broadcasts', desc: 'Urgent emergency push notifications' },
                  { title: 'Approval Requests', desc: 'Approval notifications for dispatch operations' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}

                {/* Additional Notifications & Alerts */}
                {[
                  { title: 'SMS/Email Notifications', desc: 'Flight updates via SMS or Email' },
                  { title: 'Emergency Alerts', desc: 'Receive critical emergency alerts instantly' },
                  { title: 'System Reminders', desc: 'Maintenance, schedule, and other system reminders' },
                ].map((item, i) => (
                  <div key={`alert-${i}`} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}

                <Button className="gap-2">
                  <Save className="h-4 w-4" /> Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Security</CardTitle>
                </div>
                <CardDescription>Protect your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input type={showCurrentPassword ? "text" : "password"} className="pr-10" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input type={showNewPassword ? "text" : "password"} className="pr-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} className="pr-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button className="mt-2" onClick={handlePasswordUpdate}><Save className="h-4 w-4 mr-2" />Update Password</Button>

                <div className="pt-5 border-t space-y-4">
                  <h4 className="font-semibold text-lg">Recent Login Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Monitor className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deviceInfo} • {browserInfo}</p>
                        <p className="text-xs text-muted-foreground">{currentLocation}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground">Last active: {currentTime}</p>
                          <button
                            className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors"
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLocation)}`, '_blank')}
                          >
                            <MapPin className="w-3 h-3" />
                            Live Track
                          </button>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Active</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Monitor className="h-5 w-5 text-slate-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">iPhone • Safari Browser</p>
                        <p className="text-xs text-muted-foreground">Madurai, Tamil Nadu, India</p>
                        <p className="text-xs text-muted-foreground mt-1">Last active: Yesterday at 11:20 AM</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">Inactive</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full"><Shield className="h-4 w-4 mr-2" />Logout from all devices</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SYSTEM TAB */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <CardTitle>System Configuration</CardTitle>
                </div>
                <CardDescription>Adjust appearance and regional preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            <span>Light</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            <span>Dark</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span>System Default</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-1">
                    <p className="font-medium">Live Data Sync</p>
                    <p className="text-sm text-muted-foreground">Automatically refresh system data</p>
                  </div>
                  <Switch />
                </div>
                <Button className="gap-2">
                  <Save className="h-4 w-4" /> Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
