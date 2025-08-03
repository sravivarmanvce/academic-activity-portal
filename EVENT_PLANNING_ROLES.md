# Event Planning Module - Role-Based Access Control

## Changes Made for HoD-Only Event Planning

### Frontend Changes (ProgramEntrySummary.jsx)
- **"Plan Events" button** now only appears for:
  - Departments with `approved` status
  - Users with `hod` role
- **Access Control**: `userRole === "hod"` condition added

### Backend Changes (events.py)
- **Create Events**: Only HoDs can create new events (403 error for others)
- **Update Events**: Only HoDs can modify existing events
- **Delete Events**: Only HoDs can delete events
- **Update Status**: Both HoDs and Principals can update event status

### Modal Changes (EventPlanningModal.jsx)
- **Title Updated**: Now shows "Event Planning - {Department} (HoD)" to clarify role

## Current Workflow

1. **Department submits** program counts
2. **Principal approves** department budgets
3. **HoD plans events** for approved programs using the Event Planning Modal
4. **Principal can monitor** event status and update status if needed

## Access Matrix

| Action | HoD | Principal | Others |
|--------|-----|-----------|--------|
| Plan Events | ✅ | ❌ | ❌ |
| Create Events | ✅ | ❌ | ❌ |
| Edit Events | ✅ | ❌ | ❌ |
| Delete Events | ✅ | ❌ | ❌ |
| Update Event Status | ✅ | ✅ | ❌ |
| View Events | ✅ | ✅ | Based on permissions |

## Error Messages

- **Non-HoD tries to create event**: "Only HoDs can create events" (HTTP 403)
- **Non-HoD tries to edit event**: "Only HoDs can update events" (HTTP 403)
- **Non-HoD tries to delete event**: "Only HoDs can delete events" (HTTP 403)
- **Non-HoD/Principal tries to update status**: "Only HoDs and Principals can update event status" (HTTP 403)

## Testing

1. **Login as HoD**: Should see "Plan Events" button for approved departments
2. **Login as Principal**: Should NOT see "Plan Events" button
3. **Login as other roles**: Should NOT see "Plan Events" button
4. **API Testing**: Try accessing event endpoints with different roles to verify 403 errors

This ensures proper separation of duties where:
- **Principals**: Focus on budget approval and oversight
- **HoDs**: Handle detailed event planning and execution
- **System**: Maintains proper audit trail and access control
