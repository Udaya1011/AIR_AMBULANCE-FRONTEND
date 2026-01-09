# AIR AMBULANCE FRONTEND - COMPLETE FLOWCHARTS DOCUMENTATION

## TABLE OF CONTENTS
1. [Login & Authentication Module](#1-login--authentication-module)
2. [Dashboard Module](#2-dashboard-module)
3. [Patients Management Module](#3-patients-management-module)
4. [Bookings Management Module](#4-bookings-management-module)
5. [Hospitals Management Module](#5-hospitals-management-module)
6. [Aircraft Management Module](#6-aircraft-management-module)
7. [Reports Module](#7-reports-module)
8. [Settings Module](#8-settings-module)

---

## 1. LOGIN & AUTHENTICATION MODULE

### Flow Diagram (See Generated Image Above)

**Key Components:**
- Login Form with Email & Password
- CAPTCHA Verification
- JWT Token Management
- Role-Based Routing

**Process Flow:**
```
START
  ↓
Display Login Page
  ↓
User Input (Email, Password, CAPTCHA)
  ↓
Validate CAPTCHA
  ├─ Invalid → Show Error → Regenerate CAPTCHA
  └─ Valid → Continue
  ↓
Submit to Backend API (/api/auth/login)
  ↓
Validate Credentials
  ├─ Invalid → Show Error → Regenerate CAPTCHA
  └─ Valid → Continue
  ↓
Receive JWT Token
  ↓
Store in localStorage
  ↓
Set AuthContext (user, role, token)
  ↓
Route Based on Role
  ├─ Admin → Dashboard
  ├─ Doctor/Nurse → Patients
  └─ Dispatcher → Bookings
  ↓
END (User Logged In)
```

**State Management:**
- `email`: string
- `password`: string
- `captcha`: string (generated)
- `userInputCaptcha`: string
- `showPassword`: boolean
- `loading`: boolean

**API Endpoints:**
- POST `/api/auth/login`

---

## 2. DASHBOARD MODULE

### Flow Diagram (See Generated Image Above)

**Key Components:**
- KPI Cards (4 metrics)
- Bookings Table
- Search & Filters
- Pagination
- Chatbot Assistant

**Process Flow:**
```
START
  ↓
Check Authentication
  ├─ Not Authenticated → Redirect to Login
  └─ Authenticated → Continue
  ↓
Initialize State
  ↓
Parallel API Calls:
  ├─ BookingService.list()
  ├─ DashboardService.getStats()
  ├─ DashboardService.getActivities()
  └─ HospitalService.getHospitals()
  ↓
Wait for All Responses
  ↓
Process Data
  ├─ Success → Store in State
  └─ Error → Show Toast, Set Empty Data
  ↓
Calculate Metrics:
  ├─ Total Revenue
  ├─ Active Transfers
  ├─ Pending Approvals
  ├─ Critical Patients
  └─ Available Aircraft
  ↓
Render UI Components
  ↓
User Interactions:
  ├─ Search Bookings
  ├─ Filter by Status/Urgency
  ├─ View Booking Details
  ├─ Change Page
  ├─ Chat with Assistant
  └─ Export Data
  ↓
END (Dashboard Active)
```

**State Management:**
- `bookings`: Booking[]
- `stats`: DashboardStats
- `activities`: Activity[]
- `hospitals`: Hospital[]
- `searchTerm`: string
- `statusFilter`: string
- `urgencyFilter`: string
- `currentPage`: number
- `itemsPerPage`: number
- `viewingBooking`: Booking | null

**API Endpoints:**
- GET `/api/bookings/`
- GET `/api/dashboard/stats`
- GET `/api/dashboard/activities`
- GET `/api/hospitals/`

---

## 3. PATIENTS MANAGEMENT MODULE

### Flow Diagram (See Generated Image Above)

**Key Components:**
- Patients Table with Avatars
- 3-Step Add/Edit Wizard
- Search & Filters
- Pagination
- Patient Details Dialog

**Process Flow:**
```
START
  ↓
Load Patients (PatientsContext)
  ↓
Fetch Hospitals List
  ↓
Display Patients Table
  ↓
User Actions:

[ADD PATIENT]
  Click "Add Patient"
    ↓
  Open 3-Step Wizard
    ↓
  Step 1: Basic Info
    - Name, DOB, Gender
    - Weight, Blood Group
    - Diagnosis, Acuity Level
    - Allergies, Hospital
    ↓
  Validate → Next
    ↓
  Step 2: Insurance
    - Provider
    - Policy Number
    - Group Number
    ↓
  Next
    ↓
  Step 3: Emergency Contact
    - Kin Name
    - Relationship
    - Phone, Email
    ↓
  Validate → Submit
    ↓
  API Call: PatientsService.create()
    ├─ Success → Add to List, Close Dialog
    └─ Error → Show Error Message

[VIEW PATIENT]
  Click "View"
    ↓
  Display Details Dialog
    - Patient Info
    - Age Calculation
    - Insurance Details
    - Next of Kin
    - Hospital Assignment

[EDIT PATIENT]
  Click "Edit"
    ↓
  Open 3-Step Edit Wizard
    ↓
  Pre-fill Existing Data
    ↓
  Same 3 Steps as Add
    ↓
  Submit: PatientsService.update()
    ├─ Success → Update List
    └─ Error → Show Error

[DELETE PATIENT]
  Click "Delete"
    ↓
  Confirm Deletion
    ├─ No → Cancel
    └─ Yes → PatientsService.remove()
      ↓
    Remove from List

[SEARCH & FILTER]
  Enter Search Term
    ↓
  Filter by Name/ID
    ↓
  Apply Gender Filter
    ↓
  Apply Acuity Filter
    ↓
  Update Results

[PAGINATION]
  Select Items Per Page
    ↓
  Navigate Pages
    ↓
  Update Display

END (Patients Module Active)
```

**State Management:**
- `patients`: Patient[] (from Context)
- `hospitals`: Hospital[]
- `form`: PatientFormData
- `editingPatientId`: string | null
- `isDialogOpen`: boolean
- `isEditOpen`: boolean
- `step`: number (1-3)
- `searchTerm`: string
- `genderFilter`: 'all' | 'male' | 'female'
- `statusFilter`: 'all' | 'stable' | 'urgent' | 'critical'
- `currentPage`: number
- `itemsPerPage`: number

**API Endpoints:**
- GET `/api/patients`
- POST `/api/patients`
- PUT `/api/patients/:id`
- DELETE `/api/patients/:id`

---

## 4. BOOKINGS MANAGEMENT MODULE

### Flow Diagram (See Generated Image Above)

**Key Components:**
- Bookings Table
- Add/Edit Booking Dialog
- Pending Approvals Dropdown
- Search & Filters
- Expandable Rows
- Chatbot

**Process Flow:**
```
START
  ↓
Fetch Data:
  ├─ BookingService.list()
  ├─ PatientsContext
  └─ HospitalService.getHospitals()
  ↓
Display Bookings Table
  ↓
User Actions:

[ADD BOOKING]
  Click "New Booking"
    ↓
  Open Booking Dialog
    ↓
  Select Patient (dropdown)
    ↓
  Select Origin Hospital
    ↓
  Select Destination Hospital
    ↓
  Set Urgency Level
    ↓
  Set Pickup Date/Time
    ↓
  Add Required Equipment
    ↓
  Calculate Distance & Cost
    ↓
  Submit: BookingService.create()
    ├─ Success → Refresh List, Close Dialog
    └─ Error → Show Error

[VIEW BOOKING]
  Click "View" (Eye Icon)
    ↓
  Display Details Dialog:
    - Patient Information
    - Transfer Route
    - Timeline/Activity Log
    - Equipment List
    - Cost & Duration
    - Status History

[EDIT BOOKING]
  Click "Edit" (Pencil Icon)
    ↓
  Open Edit Dialog
    ↓
  Pre-fill Data
    ↓
  Allow Modifications
    ↓
  Submit: BookingService.update()
    ├─ Success → Update List
    └─ Error → Show Error

[DELETE BOOKING]
  Click "Delete" (Trash Icon)
    ↓
  Confirm Deletion
    ├─ No → Cancel
    └─ Yes → BookingService.remove()
      ↓
    Refresh List

[APPROVE/REJECT]
  View Pending Approvals Dropdown
    ↓
  Click "Approve" or "Reject"
    ↓
  Update Booking Status
    ↓
  Refresh List

[SEARCH & FILTER]
  Enter Search Term
    ↓
  Filter by Patient/Booking ID
    ↓
  Apply Status Filter
    ↓
  Apply Urgency Filter
    ↓
  Update Results

[EXPAND ROW]
  Click Patient Name
    ↓
  Expand Row Showing:
    - Transport Path Details
    - Equipment & Billing
    - Recent Activity

[PAGINATION]
  Select Items Per Page
    ↓
  Navigate Pages
    ↓
  Update Display

[CHATBOT]
  Click Chatbot Icon
    ↓
  Ask Questions
    ↓
  Get Insights

END (Bookings Module Active)
```

**State Management:**
- `bookings`: Booking[]
- `patients`: Patient[] (from Context)
- `hospitals`: Hospital[]
- `form`: BookingFormData
- `editingBookingId`: string | null
- `isDialogOpen`: boolean
- `searchTerm`: string
- `statusFilter`: string
- `urgencyFilter`: string
- `expandedRowId`: string | null
- `currentPage`: number
- `itemsPerPage`: number

**API Endpoints:**
- GET `/api/bookings/`
- POST `/api/bookings/`
- PUT `/api/bookings/:id/`
- DELETE `/api/bookings/:id/`

---

## 5. HOSPITALS MANAGEMENT MODULE

**Process Flow:**
```
START
  ↓
Fetch Hospitals (HospitalService.getHospitals())
  ↓
Display Hospitals Table
  ↓
User Actions:

[ADD HOSPITAL]
  Click "Add Hospital"
    ↓
  Open Hospital Form Dialog
    ↓
  Enter Details:
    - Hospital Name
    - Address
    - Level of Care (dropdown)
    - ICU Capacity
    - Occupied Beds
    - Contact Person
    - Phone & Email
    - Preferred Pickup Location
    - Click Map to Set Coordinates
    ↓
  Validate Required Fields
    ↓
  Submit: HospitalService.create()
    ├─ Success → Add to List, Close Dialog
    └─ Error → Show Error

[VIEW HOSPITAL]
  Click Hospital Name (Expandable Row)
    ↓
  Expand Row Showing:
    - Full Address Details
    - Contact Information
    - Capacity Metrics
    - Bed Availability Chart
    - Coordinates on Mini-Map
    - Pickup Location Details

[EDIT HOSPITAL]
  Click "Edit" (Pencil Icon)
    ↓
  Open Edit Form Dialog
    ↓
  Pre-fill Data
    ↓
  Allow Modifications
    ↓
  Update Coordinates if Needed
    ↓
  Submit: HospitalService.update()
    ├─ Success → Update List
    └─ Error → Show Error

[DELETE HOSPITAL]
  Click "Delete" (Trash Icon)
    ↓
  Confirm Deletion
    ├─ No → Cancel
    └─ Yes → HospitalService.remove()
      ↓
    Refresh List

[SEARCH]
  Enter Search Term
    ↓
  Filter by Name/Address
    ↓
  Update Results

[PAGINATION]
  Select Items Per Page
    ↓
  Navigate Pages
    ↓
  Update Display

[MAP INTERACTION]
  Click "View on Map"
    ↓
  Open Live Map Component
    ↓
  Display All Hospitals as Markers
    ↓
  Click Marker → Show Hospital Details
    ↓
  Show Routes Between Hospitals

[CAPACITY FILTER]
  Filter by Bed Availability
    ↓
  Show Only Available Hospitals
    ↓
  Update Results

END (Hospitals Module Active)
```

**State Management:**
- `hospitals`: Hospital[]
- `form`: HospitalFormData
- `editingHospitalId`: string | null
- `isDialogOpen`: boolean
- `isEditOpen`: boolean
- `searchTerm`: string
- `expandedRowId`: string | null
- `selectedCoordinates`: { lat: number, lng: number }
- `currentPage`: number
- `itemsPerPage`: number

**API Endpoints:**
- GET `/api/hospitals/`
- POST `/api/hospitals/`
- PUT `/api/hospitals/:id/`
- DELETE `/api/hospitals/:id/`

---

## 6. AIRCRAFT MANAGEMENT MODULE

**Process Flow:**
```
START
  ↓
Fetch Aircraft (AircraftService.list())
  ↓
Display Aircraft Grid/Table
  ↓
User Actions:

[ADD AIRCRAFT]
  Click "Add Aircraft"
    ↓
  Open Aircraft Form Dialog
    ↓
  Enter Details:
    - Registration Number
    - Aircraft Type
    - Operator
    - Base Location
    - Crew Assigned
    - Status (Available/In Flight/Maintenance)
    - Medical Equipment
    - Click Map to Set Coordinates
    - Upload Image (optional)
    ↓
  Validate Required Fields
    ↓
  Submit: AircraftService.create()
    ├─ Success → Add to List, Close Dialog
    └─ Error → Show Error

[VIEW AIRCRAFT]
  Click Aircraft Card
    ↓
  Display Details Dialog:
    - Aircraft Information
    - Current Status
    - Location on Map
    - Equipment List
    - Hours Flown
    - Next Maintenance Due
    - Crew Details

[EDIT AIRCRAFT]
  Click "Edit" (Pencil Icon)
    ↓
  Open Edit Form Dialog
    ↓
  Pre-fill Data
    ↓
  Allow Modifications
    ↓
  Submit: AircraftService.update()
    ├─ Success → Update List
    └─ Error → Show Error

[DELETE AIRCRAFT]
  Click "Delete" (Trash Icon)
    ↓
  Confirm Deletion
    ├─ No → Cancel
    └─ Yes → AircraftService.remove()
      ↓
    Refresh List

[FILTER BY STATUS]
  Select Status Filter
    ├─ Available
    ├─ In Flight
    └─ Maintenance
    ↓
  Update Displayed Aircraft

[MAP VIEW]
  Click "Map View" Tab
    ↓
  Display Live Map
    ↓
  Show All Aircraft as Markers
    ↓
  Click Marker → Show Aircraft Details
    ↓
  Real-time Position Updates

[SEARCH]
  Enter Search Term
    ↓
  Filter by Registration/Type
    ↓
  Update Results

END (Aircraft Module Active)
```

**State Management:**
- `aircraft`: Aircraft[]
- `form`: AircraftFormData
- `editingAircraftId`: string | null
- `isDialogOpen`: boolean
- `isEditOpen`: boolean
- `searchTerm`: string
- `statusFilter`: 'all' | 'available' | 'in_flight' | 'maintenance'
- `viewMode`: 'grid' | 'map'
- `selectedCoordinates`: { lat: number, lng: number }

**API Endpoints:**
- GET `/api/aircraft/`
- POST `/api/aircraft/`
- PUT `/api/aircraft/:id/`
- DELETE `/api/aircraft/:id/`

---

## 7. REPORTS MODULE

**Process Flow:**
```
START
  ↓
Fetch Data:
  ├─ BookingService.list()
  ├─ AircraftService.list()
  ├─ PatientsService.list()
  └─ HospitalService.getHospitals()
  ↓
Calculate Summary Statistics:
  ├─ Total Bookings
  ├─ Total Revenue
  ├─ Average Flight Time
  ├─ Completion Rate
  ├─ Bookings by Status
  └─ Bookings by Urgency
  ↓
Display Reports Dashboard
  ↓
User Interactions:

[TAB NAVIGATION]
  Switch Between Tabs:
    ├─ Bookings Report
    ├─ Revenue Analytics
    ├─ Aircraft Utilization
    └─ Patient Statistics

[BOOKINGS REPORT TAB]
  Display Bookings Table
    ↓
  Apply Filters:
    ├─ Status Filter
    ├─ Urgency Filter
    └─ Search by ID
    ↓
  View Actions:
    ├─ View Details
    ├─ Download Invoice (PDF)
    ├─ Edit Booking
    └─ Delete Booking
    ↓
  Pagination Controls

[REVENUE ANALYTICS TAB]
  Display Charts:
    ├─ Revenue Trend (Line Chart)
    ├─ Revenue by Status (Pie Chart)
    └─ Monthly Comparison (Bar Chart)
    ↓
  Show Metrics:
    ├─ Total Revenue
    ├─ Average per Booking
    └─ Completion Rate

[AIRCRAFT UTILIZATION TAB]
  Display Charts:
    ├─ Aircraft Status Distribution
    ├─ Hours Flown Comparison
    └─ Utilization Rate
    ↓
  Show Metrics:
    ├─ Total Aircraft
    ├─ Available Count
    └─ In Maintenance

[PATIENT STATISTICS TAB]
  Display Charts:
    ├─ Patients by Acuity
    ├─ Age Distribution
    └─ Gender Distribution
    ↓
  Show Metrics:
    ├─ Total Patients
    ├─ Critical Count
    └─ Average Age

[EXPORT FUNCTIONALITY]
  Click "Export"
    ↓
  Generate PDF Report
    ↓
  Download File

[CHATBOT]
  Click Chatbot Icon
    ↓
  Ask Report-Related Questions
    ↓
  Get Insights & Analytics

END (Reports Module Active)
```

**State Management:**
- `bookings`: Booking[]
- `aircraft`: Aircraft[]
- `patients`: Patient[]
- `hospitals`: Hospital[]
- `activeTab`: string
- `searchTerm`: string
- `statusFilter`: string
- `urgencyFilter`: string
- `currentPageBookings`: number
- `itemsPerPage`: number
- `summaryStats`: SummaryStats
- `viewBooking`: Booking | null
- `editOpen`: boolean
- `addOpen`: boolean

**API Endpoints:**
- GET `/api/bookings/`
- GET `/api/aircraft/`
- GET `/api/patients`
- GET `/api/hospitals/`

---

## 8. SETTINGS MODULE

**Process Flow:**
```
START
  ↓
Load Current User (AuthContext)
  ↓
Display Settings Page
  ↓
User Actions:

[PROFILE SETTINGS]
  View Current Profile:
    - Name
    - Email
    - Role
    - Avatar
    ↓
  Edit Profile:
    - Update Name
    - Upload Avatar
    - Change Email
    ↓
  Save Changes
    ├─ Success → Update User Context
    └─ Error → Show Error

[THEME SETTINGS]
  Select Theme:
    ├─ Light Mode
    ├─ Dark Mode
    └─ System Default
    ↓
  Apply Theme
    ↓
  Update CSS Variables
    ↓
  Save Preference to localStorage

[NOTIFICATION SETTINGS]
  Toggle Notifications:
    ├─ Email Notifications
    ├─ Push Notifications
    └─ SMS Notifications
    ↓
  Set Notification Preferences
    ↓
  Save to Backend

[SECURITY SETTINGS]
  Change Password:
    - Enter Current Password
    - Enter New Password
    - Confirm New Password
    ↓
  Validate Passwords
    ├─ Invalid → Show Error
    └─ Valid → Submit
      ↓
    Update Password
      ├─ Success → Show Success Message
      └─ Error → Show Error

[LOGOUT]
  Click "Logout"
    ↓
  Confirm Logout
    ├─ No → Cancel
    └─ Yes → Continue
      ↓
    Clear localStorage
      ↓
    Clear AuthContext
      ↓
    Redirect to Login

END (Settings Module Active)
```

**State Management:**
- `user`: User (from AuthContext)
- `theme`: 'light' | 'dark' | 'system'
- `notifications`: NotificationSettings
- `passwordForm`: PasswordFormData
- `profileForm`: ProfileFormData

**API Endpoints:**
- PUT `/api/users/profile`
- PUT `/api/users/password`
- PUT `/api/users/notifications`

---

## COMMON PATTERNS ACROSS ALL MODULES

### 1. Authentication Check
```
Every Module Start
  ↓
Check AuthContext
  ├─ Not Authenticated → Redirect to Login
  └─ Authenticated → Continue
```

### 2. Error Handling
```
API Call
  ↓
Try-Catch Block
  ├─ Success → Process Data
  └─ Error → 
      ├─ 401 Unauthorized → Logout User
      ├─ 404 Not Found → Show "Not Found" Message
      ├─ 500 Server Error → Show "Server Error" Message
      └─ Other → Show Generic Error
```

### 3. Loading States
```
Before API Call
  ↓
Set Loading = true
  ↓
Show Loading Spinner
  ↓
API Call Completes
  ↓
Set Loading = false
  ↓
Hide Loading Spinner
  ↓
Display Data
```

### 4. Form Validation
```
User Submits Form
  ↓
Validate Required Fields
  ├─ Invalid → Show Validation Errors
  └─ Valid → Continue
    ↓
  Validate Data Types
    ├─ Invalid → Show Type Errors
    └─ Valid → Continue
      ↓
    Submit to API
```

### 5. Pagination Pattern
```
Display Data
  ↓
Calculate Total Pages = ceil(totalItems / itemsPerPage)
  ↓
Slice Data = data.slice(startIndex, endIndex)
  ↓
Display Current Page Data
  ↓
User Clicks Page Navigation
  ↓
Update Current Page
  ↓
Recalculate Slice
  ↓
Update Display
```

---

## STATE MANAGEMENT ARCHITECTURE

### Context Providers
1. **AuthContext**
   - User authentication state
   - JWT token management
   - Login/Logout functions
   - Role-based access control

2. **PatientsContext**
   - Patients list
   - CRUD operations
   - Loading states
   - Error handling

### Local Component State
- Form data
- UI states (dialogs, dropdowns)
- Filters and search terms
- Pagination state
- Loading indicators

---

## API INTEGRATION FLOW

```
Frontend Component
  ↓
Call Service Function
  ↓
Service Layer (e.g., BookingService)
  ↓
API Client (axios)
  ↓
Add Authorization Header (JWT)
  ↓
Send HTTP Request
  ↓
Backend API
  ↓
Response
  ↓
Transform Data (if needed)
  ↓
Return to Component
  ↓
Update State
  ↓
Re-render UI
```

---

## ROUTING FLOW

```
User Navigates
  ↓
React Router Intercepts
  ↓
Check Route Protection
  ├─ Public Route → Render Component
  └─ Protected Route →
      ↓
    Check Authentication
      ├─ Not Authenticated → Redirect to Login
      └─ Authenticated →
          ↓
        Check Role Permission
          ├─ Not Authorized → Show Unauthorized Page
          └─ Authorized → Render Component
```

**Protected Routes:**
- `/dashboard` - All authenticated users
- `/patients` - Doctors, Nurses, Admins
- `/bookings` - Dispatchers, Admins
- `/hospitals` - Admins
- `/aircraft` - Admins, Dispatchers
- `/reports` - Admins
- `/settings` - All authenticated users

---

## END OF FLOWCHARTS DOCUMENTATION

**Created:** 2026-01-09
**Version:** 1.0
**Project:** Air Ambulance Management System (Frontend)
