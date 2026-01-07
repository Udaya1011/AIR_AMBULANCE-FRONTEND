# Task: Add Patient Image Capture Feature

## Objective
The user requested a new feature to capture/upload a patient image during the "Add Patient" process, and to display this image when viewing the patient's details (clicking the "see" icon). The feature was refined to separate the "Upload from Device" action (clicking the main circle) from the "Capture with Camera" action (clicking the camera icon).

## Changes Implemented

### 1. `src/types/index.ts`
- **Updated Interface**: Added optional `photo_url: string;` to the `Patient` interface definition.

### 2. `src/services/patients.service.ts`
- **Updated Service**: Modified the `create` method to explicitly include `photo_url` in the payload sent to the backend, preventing the field from being stripped out during data transmission.

### 3. `src/pages/Patients.tsx`
- **Imports**: Added `Camera` icon from `lucide-react`.
- **State Management**: Updated the `form` state initialization and type definition to include `photo_url`.
- **Refs**: Added `cameraInputRef` alongside `fileInputRef` to handle the separate camera input.
- **Image Handler**: Implemented `handleImageUpload` function using `FileReader` to convert uploaded images to Base64 strings for local preview and storage. Added a file size check (5MB limit).
- **UI Update (Add Wizard)**: Added a new "Photo Upload" section in **Step 1** of the Add Patient wizard.
  - **Main Circle**: Clicking the circular avatar preview triggers the standard file upload (`fileInputRef`).
  - **Camera Icon**: Clicking the overlay camera icon triggers the camera capture input (`cameraInputRef` with `capture="environment"`), requesting the device's rear camera.
  - **Visuals**: Added hover effects, shadows, and tooltips to distinguish the actions.
- **Save Logic**: Updated the `addPatient` payload construction to include the `photo_url` field.
- **UI Update (View Dialog)**: Updated the "Patient Intelligence Profile" dialog (View Patient) to display the patient's photo in the header if available, falling back to the default `User` icon if not.

## Result
Users can now choose to either upload an existing photo or capture a new one using their device camera when creating a patient record. The captured/uploaded image is stored and subsequently displayed in the detailed patient view popup.
