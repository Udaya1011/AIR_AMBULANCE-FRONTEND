# Dashboard Live Map & Telemetry Update

## Changes Implemented

### 1. **Live Map Integration on Dashboard**
   - **Feature**: Clicking on "Mission Telemetry" flight cards or the "Live Transfers" banner card now opens a full-screen **Satellite Uplink Live Map**.
   - **Component**: Reused the `LiveMapComponent` within a `Dialog` modal to show aircraft positions.
   - **Visuals**: Added a simulated flight path (origin -> current -> destination) and a pulsing "Live Track Active" indicator to give a premium, real-time feel.

### 2. **Interactive Elements**
   - **"Live Transfers" Banner**: Added `onClick` handler to the "Live Transfers" stats card in the top banner. It now acts as a shortcut to open the map.
   - **"Mission Telemetry" Feed**: Each flight card in the telemetry list is now clickable. Clicking a card simulates tracking that specific flight by centering the map on the corresponding aircraft.

### 3. **Navigation Fix**
   - **"Dispatch Aircraft" Button**: Connected this button to the router, so it now correctly navigates to the `/aircraft` page for operational control.

## Technical Details
- **State Management**: Added `isMapOpen` (boolean) and `mapTargetId` (string) state to `Dashboard.tsx` to control the map dialog and which aircraft to track.
- **Components**: Imported `Dialog`, `DialogContent`, etc., from existing UI components and `LiveMapComponent` from the local file.
- **Routing**: Used `useNavigate` hook for page transitions.

## Verification
- **Click "Live Transfers"**: Opens the map dialog.
- **Click a Flight Card**: Opens the map dialog and focuses on an aircraft (simulated mapping).
- **Click "Dispatch Aircraft"**: Navigates to the Aircraft page.
