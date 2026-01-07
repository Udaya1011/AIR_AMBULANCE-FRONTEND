# Task: Filter Empty Hospital Records

## Objective
The user reported "two empty data hospitals" appearing on the Hospitals page. The goal is to filter out any invalid or incomplete hospital records from the displayed list to ensure data integrity and a clean UI.

## Changes Implemented

### 1. `src/pages/Hospitals.tsx`
- **Updated `fetchHospitals` Function**:
  - Implemented a robust filter on the API response data.
  - Criteria: Records must have a valid `id` (or `_id`) and a non-empty `name` property.
  - Logic: `data.filter((h: any) => h && (h.id || h._id) && h.name && h.name.trim().length > 0)`

- **Updated Mock Data Fallback**:
  - Applied a similar filter to the `mockHospitals` fallback in the catch block to ensure development mode also displays clean data.
  - Logic: `mockHospitals.filter((h: any) => h && h.name)`

## Result
Any hospital records missing critical information (specifically Name or ID) are now automatically excluded from the state, preventing empty rows or "ghost" entries in the hospital table.
