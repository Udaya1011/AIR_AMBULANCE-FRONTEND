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
import {
  Settings as SettingsIcon, User, Bell, Shield, Globe, Save
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();

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
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" />
                </div>
                <Button className="mt-2">Update Password</Button>

                <div className="pt-5 border-t space-y-4">
                  <h4 className="font-semibold">Recent Login Devices</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Windows Chrome — Chennai, India</li>
                    <li>iPhone Safari — Madurai, India</li>
                  </ul>
                  <Button variant="outline" size="sm">Logout from all devices</Button>
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
                    <Select defaultValue="light">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System Default</SelectItem>
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
