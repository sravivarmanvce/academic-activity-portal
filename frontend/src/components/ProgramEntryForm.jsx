import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../Api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ departmentId, academicYearId, userRole }) {
  const [mergedData, setMergedData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [principalRemarks, setPrincipalRemarks] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentFullName, setDepartmentFullName] = useState("");
  const [hodRemarks, setHodRemarks] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [deadlineDisplay, setDeadlineDisplay] = useState("Invalid Date");
  const [isEditable, setIsEditable] = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDuration, setOverrideDuration] = useState(24);
  const [overrideInfo, setOverrideInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  
  // New workflow states
  const [submissionStatus, setSubmissionStatus] = useState('draft'); // 'draft', 'submitted', 'approved', 'events_planned', 'completed'
  const [canPlanEvents, setCanPlanEvents] = useState(false); // Can access events tab
  const [canEditEvents, setCanEditEvents] = useState(false); // Can edit events (Admin or HoD)
  const [activeTab, setActiveTab] = useState('budget'); // 'budget' or 'events'
  
  // Event planning states
  const [programEvents, setProgramEvents] = useState({});
  const [eventsSaving, setEventsSaving] = useState({}); // Changed to object to track saving state per program
  
  // Real-time data sync states
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [dataUpdatedNotification, setDataUpdatedNotification] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    // Fetch academic years on mount
    API.get("/academic-years")
      .then((res) => {
        setAcademicYears(res.data);
        if (res.data.length > 0) {
          setSelectedAcademicYearId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load academic years", err));
  }, []);

  useEffect(() => {
    if (!departmentId || !selectedAcademicYearId) return;

    const fetchAll = async () => {
      try {
        const [
          typesRes,
          countsRes,
          deptRes,
          principalRes,
          hodRes,
          yearsRes,
          eventsRes
        ] = await Promise.all([
          API.get("/program-types"),
          API.get(`/program-counts?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
          API.get("/departments"),
          API.get(`/principal-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          API.get(`/hod-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          API.get("/academic-years"),
          API.get(`/events?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err)))
        ]);

        const departmentObj = deptRes.data.find((d) => d.id === departmentId);
        if (departmentObj) {
          setDepartmentName(departmentObj.name || "");
          setDepartmentFullName(departmentObj.full_name || "");
        }

        setPrincipalRemarks(principalRes.data.remarks || "");
        setHodRemarks(hodRes.data.remarks || "");

        const filteredTypes = typesRes.data.filter(
          (p) =>
            p.departments === "ALL" ||
            p.departments.split(",").map((d) => d.trim()).includes(departmentObj.name)
        );

        const merged = filteredTypes.map((type) => {
          const match = countsRes.data.find(
            (c) =>
              c.program_type === type.program_type &&
              c.sub_program_type === type.sub_program_type
          );
          return {
            ...type,
            count: match?.count ?? 0,
            total_budget: match?.total_budget ?? 0,
            remarks: match?.remarks ?? "",
            program_count_id: match?.id || null, // Keep the program count ID separate
          };
        });

        const groupedObj = {};
        merged.forEach((item) => {
          if (!groupedObj[item.activity_category]) {
            groupedObj[item.activity_category] = [];
          }
          groupedObj[item.activity_category].push(item);
        });

        setMergedData(merged);
        setGrouped(groupedObj);
        
        // Load and organize saved events from database
        const savedEvents = eventsRes.data || [];
        console.log('📥 Loaded saved events:', savedEvents);
        
        // Group events by program type and populate programEvents
        const eventsByProgram = {};
        
        // First, create event structures for programs with counts > 0
        merged.forEach(program => {
          const count = program.count || 0;
          const totalBudget = program.total_budget || 0;
          
          if (count > 0) {
            const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
            
            // Get events for this program type from saved events
            const programEvents = savedEvents.filter(event => 
              event.program_type_id === program.id
            );
            
            // Create event rows
            const events = [];
            for (let i = 0; i < count; i++) {
              const existingEvent = programEvents[i];
              
              if (existingEvent) {
                // Use saved event data
                events.push({
                  id: `${programKey}_${i + 1}`,
                  eventNumber: i + 1,
                  title: existingEvent.title || '',
                  description: existingEvent.description || '',
                  event_date: existingEvent.event_date || '',
                  budget_amount: existingEvent.budget_amount || (program.budget_mode === 'Fixed' ? program.budget_per_event : Math.round(totalBudget / count)),
                  coordinator_name: existingEvent.coordinator_name || '',
                  coordinator_contact: existingEvent.coordinator_contact || '',
                  status: 'completed' // Mark as completed since it's saved in DB
                });
              } else {
                // Create new empty event
                events.push({
                  id: `${programKey}_${i + 1}`,
                  eventNumber: i + 1,
                  title: '',
                  description: '',
                  event_date: '',
                  budget_amount: program.budget_mode === 'Fixed' ? program.budget_per_event : Math.round(totalBudget / count),
                  coordinator_name: '',
                  coordinator_contact: '',
                  status: 'pending'
                });
              }
            }
            
            eventsByProgram[programKey] = {
              programInfo: program,
              totalCount: count,
              totalBudget: totalBudget,
              events: events
            };
            
            console.log(`📊 ${program.program_type}: Loaded ${programEvents.length}/${count} events from database`);
          }
        });
        
        setProgramEvents(eventsByProgram);
        console.log('✅ Event loading complete, events:', Object.keys(eventsByProgram));

        // 🔁 Academic year name
        const yearObj = yearsRes.data.find((y) => y.id === selectedAcademicYearId);
        setSelectedAcademicYear(yearObj?.year || "");

        // 🔁 Fetch deadline from module_deadlines
        try {
          const deadlineRes = await API.get(
            `/module-deadlines?academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
          );
          const deadline = new Date(deadlineRes.data.deadline);
          const today = new Date();
          const isBeforeDeadline = today <= deadline;

          setDeadlineDisplay(
            deadline instanceof Date && !isNaN(deadline)
              ? deadline.toLocaleString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata"
                }).replaceAll("/", "-")
              : "Invalid Date"
          );

          // Check for deadline override
          let hasOverride = false;
          try {
            const overrideRes = await API.get(
              `/deadline-override?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
            );
            hasOverride = overrideRes.data.has_override;
            setOverrideInfo(overrideRes.data); // Store override info including expiration
          } catch (e) {
            setOverrideInfo(null);
          }

          // Set editability based on role and deadline
          if (userRole === "admin") {
            setIsEditable(true);
          } else if (userRole === "principal") {
            // Principals can edit, but we need to track if deadline passed for override button logic
            setIsEditable(true);
            // Store deadline status for override button logic
            setDeadlinePassed(!isBeforeDeadline && !hasOverride);
          } else if (userRole === "hod") {
            setIsEditable(yearObj?.is_enabled && (isBeforeDeadline || hasOverride));
          }
        } catch (e) {
          console.warn("No module deadline found");
          setDeadlineDisplay("No deadline set");
          setIsEditable(false);
        }

        // 🔁 Fetch submission status
        try {
          const statusRes = await API.get(`/workflow-status?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`);
          setSubmissionStatus(statusRes.data.status || 'draft');
          
          // Update event planning permissions based on status and user role
          const status = statusRes.data.status || 'draft';
          
          if (userRole === 'admin') {
            // Admin can always view and edit events
            setCanPlanEvents(true);
            setCanEditEvents(true);
          } else if (userRole === 'principal') {
            // Principal can view events once approved, but cannot edit
            if (status === 'approved' || status === 'events_planned') {
              setCanPlanEvents(true);
              setCanEditEvents(false);
            }
          } else if (userRole === 'hod') {
            // HoD can view and edit events once approved
            if (status === 'approved') {
              setCanPlanEvents(true);
              setCanEditEvents(true);
            }
          }
        } catch (e) {
          console.warn("Could not fetch submission status, defaulting to draft");
          setSubmissionStatus('draft');
          
          // Set default permissions for unknown status
          if (userRole === 'admin') {
            setCanPlanEvents(true);
            setCanEditEvents(true);
          } else {
            setCanPlanEvents(false);
            setCanEditEvents(false);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAll();
  }, [departmentId, selectedAcademicYearId, userRole]);

  // Update time remaining every minute for active overrides
  useEffect(() => {
    if (overrideInfo && overrideInfo.has_override && overrideInfo.expires_at) {
      const updateTimeRemaining = () => {
        const now = new Date();
        const expires = new Date(overrideInfo.expires_at);
        const diff = expires - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m remaining`);
          } else if (minutes > 0) {
            setTimeRemaining(`${minutes}m remaining`);
          } else {
            setTimeRemaining("Expires in < 1 minute");
          }
        } else {
          setTimeRemaining("Expired");
        }
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      
      return () => clearInterval(interval);
    } else {
      setTimeRemaining("");
    }
  }, [overrideInfo]);

  // Regenerate events whenever mergedData changes (but only if not already loaded from DB)
  useEffect(() => {
    if (mergedData.length > 0 && Object.keys(programEvents).length === 0) {
      console.log('🔄 Generating new events (no saved events found)...');
      const eventRows = {};
      
      mergedData.forEach(program => {
        const count = program.count || 0;
        const totalBudget = program.total_budget || 0;
        
        console.log(`📊 ${program.program_type}: Count=${count}, Budget=${totalBudget}`);
        
        // Only create events if count > 0
        if (count > 0) {
          const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
          console.log(`✅ Creating ${count} new events for: ${programKey}`);
          
          // Generate individual event rows based on count
          const rows = [];
          for (let i = 0; i < count; i++) {
            const budgetPerEvent = program.budget_mode === 'Fixed' 
              ? program.budget_per_event 
              : Math.round(totalBudget / count);
              
            rows.push({
              id: `${programKey}_${i}`,
              eventNumber: i + 1,
              title: `Event ${i + 1}`,
              description: '',
              event_date: '',
              coordinator_name: '',
              coordinator_contact: '',
              budget_amount: budgetPerEvent,
              status: 'planning'
            });
          }
          
          eventRows[programKey] = {
            programInfo: program,
            totalCount: count,
            totalBudget: totalBudget,
            events: rows
          };
        } else {
          console.log(`❌ No events for ${program.program_type} (count = 0)`);
        }
      });
      
      console.log('🎯 Final eventRows:', Object.keys(eventRows));
      setProgramEvents(eventRows);
    } else {
      console.log('⚠️ No new events to generate (mergedData empty or events already loaded)');
    }
  }, [mergedData, programEvents]);

  // Real-time data synchronization
  const refreshData = useCallback(async () => {
    if (!departmentId || !selectedAcademicYearId || isPolling) return;
    
    setIsPolling(true);
    try {
      console.log('🔄 Refreshing data...');
      
      const [
        countsRes,
        principalRes,
        hodRes,
        eventsRes,
        statusRes
      ] = await Promise.all([
        API.get(`/program-counts?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
        API.get(`/principal-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch(() => ({ data: { remarks: "" } })),
        API.get(`/hod-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch(() => ({ data: { remarks: "" } })),
        API.get(`/events?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
        API.get(`/workflow-status?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch(() => ({ data: { status: 'draft' } }))
      ]);

      // Check for changes to show notification
      let hasChanges = false;
      
      // Check remarks changes
      if (principalRemarks !== (principalRes.data.remarks || "")) {
        hasChanges = true;
      }
      if (hodRemarks !== (hodRes.data.remarks || "")) {
        hasChanges = true;
      }
      
      // Check status changes
      if (submissionStatus !== (statusRes.data.status || 'draft')) {
        hasChanges = true;
      }
      
      // Check program counts changes
      const newCounts = JSON.stringify(countsRes.data);
      const currentCounts = JSON.stringify(mergedData.map(m => ({
        program_type: m.program_type,
        sub_program_type: m.sub_program_type,
        count: m.count,
        total_budget: m.total_budget
      })));
      if (newCounts !== currentCounts) {
        hasChanges = true;
      }
      
      // Check events changes
      const currentEventCount = Object.values(programEvents).reduce((total, program) => 
        total + program.events.filter(e => e.status === 'completed').length, 0
      );
      const newEventCount = eventsRes.data.length;
      if (currentEventCount !== newEventCount) {
        hasChanges = true;
      }

      // Update remarks
      setPrincipalRemarks(principalRes.data.remarks || "");
      setHodRemarks(hodRes.data.remarks || "");

      // Update submission status and permissions
      const status = statusRes.data.status || 'draft';
      setSubmissionStatus(status);
      
      // Update permissions based on user role and status
      if (userRole === 'admin') {
        setCanPlanEvents(true);
        setCanEditEvents(true);
      } else if (userRole === 'principal') {
        if (status === 'approved' || status === 'events_planned') {
          setCanPlanEvents(true);
          setCanEditEvents(false);
        }
      } else if (userRole === 'hod') {
        if (status === 'approved') {
          setCanPlanEvents(true);
          setCanEditEvents(true);
        }
      }

      // Update program counts and regenerate merged data
      const currentProgramTypes = mergedData;
      if (currentProgramTypes.length > 0) {
        const updatedMerged = currentProgramTypes.map((type) => {
          const match = countsRes.data.find(
            (c) =>
              c.program_type === type.program_type &&
              c.sub_program_type === type.sub_program_type
          );
          return {
            ...type,
            count: match?.count ?? 0,
            total_budget: match?.total_budget ?? 0,
            remarks: match?.remarks ?? "",
            program_count_id: match?.id || null,
          };
        });

        setMergedData(updatedMerged);

        // Update grouped data
        const groupedObj = {};
        updatedMerged.forEach((item) => {
          if (!groupedObj[item.activity_category]) {
            groupedObj[item.activity_category] = [];
          }
          groupedObj[item.activity_category].push(item);
        });
        setGrouped(groupedObj);
      }

      // Update events if any exist
      const savedEvents = eventsRes.data || [];
      if (savedEvents.length > 0) {
        console.log('📥 Updated events from server:', savedEvents.length);
        
        // Update existing program events with fresh data from server
        const eventsByProgram = {};
        
        currentProgramTypes.forEach(program => {
          const count = countsRes.data.find(c => 
            c.program_type === program.program_type && 
            c.sub_program_type === program.sub_program_type
          )?.count || 0;
          
          if (count > 0) {
            const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
            
            // Get events for this program type from saved events
            const programEvents = savedEvents.filter(event => 
              event.program_type_id === program.id
            );
            
            // Create event rows
            const events = [];
            for (let i = 0; i < count; i++) {
              const existingEvent = programEvents[i];
              
              if (existingEvent) {
                // Use saved event data
                events.push({
                  id: `${programKey}_${i + 1}`,
                  eventNumber: i + 1,
                  title: existingEvent.title || '',
                  description: existingEvent.description || '',
                  event_date: existingEvent.event_date || '',
                  budget_amount: existingEvent.budget_amount || (program.budget_mode === 'Fixed' ? program.budget_per_event : Math.round((countsRes.data.find(c => c.program_type === program.program_type)?.total_budget || 0) / count)),
                  coordinator_name: existingEvent.coordinator_name || '',
                  coordinator_contact: existingEvent.coordinator_contact || '',
                  status: 'completed'
                });
              } else {
                // Create new empty event
                const totalBudget = countsRes.data.find(c => c.program_type === program.program_type)?.total_budget || 0;
                events.push({
                  id: `${programKey}_${i + 1}`,
                  eventNumber: i + 1,
                  title: '',
                  description: '',
                  event_date: '',
                  budget_amount: program.budget_mode === 'Fixed' ? program.budget_per_event : Math.round(totalBudget / count),
                  coordinator_name: '',
                  coordinator_contact: '',
                  status: 'pending'
                });
              }
            }
            
            eventsByProgram[programKey] = {
              programInfo: program,
              totalCount: count,
              totalBudget: countsRes.data.find(c => c.program_type === program.program_type)?.total_budget || 0,
              events: events
            };
          }
        });
        
        setProgramEvents(eventsByProgram);
      }

      setLastUpdateTime(new Date());
      
      // Show notification if there were changes and this was an auto-refresh
      if (hasChanges && lastUpdateTime) {
        setDataUpdatedNotification(true);
        setTimeout(() => setDataUpdatedNotification(false), 5000); // Hide after 5 seconds
      }
      
      console.log('✅ Data refresh complete');
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setIsPolling(false);
    }
  }, [
    departmentId, 
    selectedAcademicYearId, 
    isPolling, 
    principalRemarks, 
    hodRemarks, 
    submissionStatus, 
    mergedData, 
    programEvents, 
    userRole, 
    lastUpdateTime
  ]);

  // Auto-refresh data every 30 seconds when viewing (not editing)
  useEffect(() => {
    if (!autoRefreshEnabled || !departmentId || !selectedAcademicYearId) return;
    
    // Only auto-refresh for viewing users (Principal) or when not actively editing
    const shouldAutoRefresh = userRole === 'principal' || (userRole === 'hod' && submissionStatus !== 'draft');
    
    if (shouldAutoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [departmentId, selectedAcademicYearId, userRole, submissionStatus, autoRefreshEnabled, refreshData]);

  const handleChange = (index, field, value) => {
    setMergedData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "count" || field === "total_budget" ? Number(value) : value,
      };
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    const invalidRows = mergedData.filter(
      (entry) =>
        entry.budget_mode === "Variable" &&
        ((entry.count > 0 && entry.total_budget <= 0) ||
          (entry.count <= 0 && entry.total_budget > 0))
    );

    if (invalidRows.length > 0) {
      const errors = invalidRows.map((entry) =>
        `${entry.program_type}${entry.sub_program_type ? ' - ' + entry.sub_program_type : ''}`
      );
      setValidationErrors(errors);
      setShowValidationModal(true);
      setSubmitting(false);
      return;
    }

    try {
      const payload = mergedData.map((entry) => ({
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
        program_type: entry.program_type,
        sub_program_type: entry.sub_program_type,
        activity_category: entry.activity_category,
        budget_mode: entry.budget_mode,
        count: entry.count || 0,
        total_budget:
          entry.budget_mode === "Fixed"
            ? (entry.count || 0) * (entry.budget_per_event || 0)
            : entry.total_budget || 0,
        remarks: entry.remarks || "",
      }));

      await API.post("/program-counts", { entries: payload });

      if (userRole === "hod") {
        await API.post("/hod-remarks", {
          department_id: departmentId,
          academic_year_id: selectedAcademicYearId,
          remarks: hodRemarks,
        });
      }

      if (userRole === "principal") {
        await API.post("/principal-remarks", {
          department_id: departmentId,
          academic_year_id: selectedAcademicYearId,
          remarks: principalRemarks,
        });
      }

      setStatus("success");
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");

    printWindow.document.write(`
    <html>
      <head>
        <title>Budget Proposals for Student Activities - ${departmentName}</title>
        <style>
          body {
            font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            margin: 15px;
            padding: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            word-wrap: break-word;
          }

          td input[type="number"] {
            width: 80px;           /* or 60px if tighter */
            text-align: center;
            font-size: 11pt;
            padding: 4px;
            box-sizing: border-box;
          }

          input[type="number"] {
            border: none;
            outline: none;
            background-color: transparent;
            width: 70px;
            text-align: center;
            font-size: 11pt;
          }

          th {
            background-color: #f2f2f2;
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
          }

          tr.table-warning td {
            font-weight: bold;
            background-color: #fff3cd; /* Light yellow like Bootstrap */
          }

          tr.table-info td {
            font-weight: bold;
            background-color: #d1ecf1; /* Light blue like Bootstrap */
          }

          /* Chrome, Safari, Edge, Opera */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          /* Firefox */
          input[type="number"] {
            -moz-appearance: textfield;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            display: block;
            margin: 0 auto 10px;
            max-height: 100px;
          }
          .remarks {
            white-space: pre-wrap;
            text-align: left;
            margin-top: 10px;
            border: 1px solid #ccc;
            padding: 10px;
            font-size: 11pt;
          }
          .no-print {
            display: none;
          }
          tr, td, th {
           page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="assets/logo.png" alt="College Logo" class="logo" />
          <div>
            <strong>Department of ${departmentFullName} - Budget Proposals for Student Activities</strong><br/>
            <strong>Academic Year: ${selectedAcademicYear}</strong>
          </div>
        </div>
        ${printContents}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };


  const handleDownloadExcel = () => {
    const table = printRef.current.querySelector("table");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Program Data" });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "program_entry.xlsx");
  };

  const renderInput = (index, field, value, editable, type = "number") => {
    return editable ? (
      <input
        type={type}
        min="0"
        className="form-control"
        value={value}
        onChange={(e) => handleChange(index, field, e.target.value)}
      />
    ) : (
      <span>{value}</span>
    );
  };

  // Status Indicator Component
  const StatusIndicator = ({ status, userRole }) => {
    const statusSteps = [
      { key: 'draft', label: 'Entry', icon: '📝', desc: 'HoD enters counts & budgets' },
      { key: 'submitted', label: 'Submitted', icon: '📤', desc: 'Awaiting Principal approval' },
      { key: 'approved', label: 'Approved', icon: '✅', desc: 'Ready for event planning' },
      { key: 'events_planned', label: 'Events Planned', icon: '📅', desc: 'Individual events added' },
      { key: 'completed', label: 'Completed', icon: '🎯', desc: 'All events executed' }
    ];

    const getCurrentStepIndex = () => {
      return statusSteps.findIndex(step => step.key === status);
    };

    return (
      <div className="mb-4">
        <div className="d-flex justify-content-center">
          <div className="row text-center" style={{ maxWidth: '800px' }}>
            {statusSteps.map((step, index) => {
              const isActive = step.key === status;
              const isCompleted = getCurrentStepIndex() > index;
              const stepClass = isActive ? 'text-primary fw-bold' : isCompleted ? 'text-success' : 'text-muted';
              
              return (
                <div key={step.key} className="col">
                  <div className={stepClass}>
                    <div style={{ fontSize: '1.5rem' }}>{step.icon}</div>
                    <div className="small fw-bold">{step.label}</div>
                    <div className="small" style={{ fontSize: '0.75rem' }}>{step.desc}</div>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className="position-absolute" style={{ 
                      top: '50%', 
                      right: '-50%', 
                      transform: 'translateY(-50%)',
                      color: isCompleted ? '#198754' : '#6c757d'
                    }}>
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Workflow Management Functions
  const handleSubmitForApproval = async () => {
    try {
      // Validate form first
      const isValid = mergedData.every(entry => 
        entry.count >= 0 && entry.total_budget >= 0
      );
      
      if (!isValid) {
        alert('Please ensure all counts and budgets are valid');
        return;
      }

      // Submit data first
      await handleSubmit();
      
      // Update status to 'submitted'
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: departmentId,
        status: 'submitted'
      });
      
      setSubmissionStatus('submitted');
      alert('Successfully submitted for Principal approval!');
    } catch (error) {
      console.error('Error submitting for approval:', error);
      alert('Error submitting for approval');
    }
  };

  const handlePrincipalApproval = async () => {
    try {
      // Update status to 'approved'
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: departmentId,
        status: 'approved'
      });
      
      setSubmissionStatus('approved');
      
      // Update permissions based on user role
      if (userRole === 'principal') {
        setCanPlanEvents(true);  // Principal can view events
        setCanEditEvents(false); // But cannot edit them
      } else if (userRole === 'hod') {
        setCanPlanEvents(true);  // HoD can view events
        setCanEditEvents(true);  // And can edit them
      }
      
      alert('Successfully approved! Department can now plan individual events.');
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Error approving submission');
    }
  };

  const handlePlanEvents = () => {
    setActiveTab('events');
  };

  const handleEventChange = (programKey, eventIndex, field, value) => {
    setProgramEvents(prev => ({
      ...prev,
      [programKey]: {
        ...prev[programKey],
        events: prev[programKey].events.map((event, idx) => 
          idx === eventIndex 
            ? { ...event, [field]: value }
            : event
        )
      }
    }));
  };

  const validateEvents = (programKey) => {
    const program = programEvents[programKey];
    if (!program) {
      alert('Program data not found');
      return false;
    }
    
    // Check if program has valid ID
    if (!program.programInfo?.id) {
      alert('Program type ID is missing. Please contact system administrator.');
      console.error('Missing program_type_id for:', program.programInfo);
      return false;
    }
    
    // Check if we have required IDs
    if (!departmentId || !selectedAcademicYearId) {
      alert('Department or Academic Year information is missing');
      return false;
    }
    
    // Check if all events have required fields
    const invalidEvents = program.events.filter(event => 
      !event.title.trim() || 
      !event.event_date ||
      isNaN(parseFloat(event.budget_amount)) ||
      parseFloat(event.budget_amount) <= 0
    );
    
    if (invalidEvents.length > 0) {
      alert(`Please fill in all required fields (Event Title, Date, and Budget > 0) for all ${program.totalCount} events`);
      return false;
    }
    
    // Validate total budget allocation
    const totalAllocated = program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0);
    if (Math.abs(totalAllocated - program.totalBudget) > 1) { // Allow ₹1 difference for rounding
      alert(`Total budget allocation (₹${totalAllocated.toLocaleString()}) must equal approved budget (₹${program.totalBudget.toLocaleString()})`);
      return false;
    }
    
    return true;
  };

  const handleSaveProgramEvents = async (programKey) => {
    if (!validateEvents(programKey)) return;
    
    setEventsSaving(prev => ({ ...prev, [programKey]: true }));
    try {
      const program = programEvents[programKey];
      
      // Use the correct program_type_id from the database
      // This will work for both existing and newly added program types
      const correctProgramTypeId = program.programInfo.id;
      
      // Validate that the program type ID exists
      if (!correctProgramTypeId) {
        console.error(`❌ Missing program_type_id for program: ${program.programInfo.program_type}`);
        alert(`Error: Missing program type ID for "${program.programInfo.program_type}". Please contact system administrator.`);
        return;
      }
      
      console.log(`🔧 Using program_type_id ${correctProgramTypeId} for "${program.programInfo.program_type}"`);
      
      const eventsData = program.events.map(event => ({
        title: event.title,
        description: event.description,
        program_type_id: correctProgramTypeId,
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
        event_date: event.event_date,
        budget_amount: parseFloat(event.budget_amount),
        coordinator_name: event.coordinator_name,
        coordinator_contact: event.coordinator_contact
      }));
      
      console.log('📤 Sending events data:', eventsData);
      console.log('🏷️ Program info:', program.programInfo);
      
      // Save all events for this program type - handle each individually to see which one fails
      const results = [];
      for (let i = 0; i < eventsData.length; i++) {
        try {
          console.log(`💾 Saving event ${i + 1}:`, eventsData[i]);
          const result = await API.post("/events", eventsData[i]);
          results.push(result);
          console.log(`✅ Event ${i + 1} saved successfully`);
        } catch (eventError) {
          console.error(`❌ Failed to save event ${i + 1}:`, eventError);
          console.error('📋 Event data that failed:', eventsData[i]);
          
          // Show specific validation errors
          if (eventError.response?.data?.detail) {
            console.error('🔍 Validation details:', eventError.response.data.detail);
            
            // Format validation errors for better readability
            if (Array.isArray(eventError.response.data.detail)) {
              const errorMessages = eventError.response.data.detail.map((err, idx) => 
                `${idx + 1}. Field: ${err.loc?.join('.')} - ${err.msg}${err.input ? ` (Input: ${err.input})` : ''}`
              ).join('\n');
              console.error('📝 Formatted errors:\n', errorMessages);
              alert(`Failed to save event ${i + 1}:\n${errorMessages}`);
            } else {
              alert(`Failed to save event ${i + 1}: ${JSON.stringify(eventError.response.data.detail)}`);
            }
          } else {
            alert(`Failed to save event ${i + 1}. Check console for details.`);
          }
          throw eventError;
        }
      }
      
      alert(`Successfully saved ${program.totalCount} events for ${program.programInfo.program_type}!`);
      
      // Mark as completed
      setProgramEvents(prev => ({
        ...prev,
        [programKey]: {
          ...prev[programKey],
          events: prev[programKey].events.map(event => ({
            ...event,
            status: 'completed'
          }))
        }
      }));
      
    } catch (error) {
      console.error("Error saving events:", error);
      if (error.response?.data?.detail) {
        alert(`Failed to save events: ${JSON.stringify(error.response.data.detail)}`);
      } else {
        alert("Failed to save events. Please check console for details.");
      }
    } finally {
      setEventsSaving(prev => ({ ...prev, [programKey]: false }));
    }
  };

  // Helper function to get events for a specific program type
  const getEventsForProgram = (programType, subProgramType) => {
    const programKey = `${programType}_${subProgramType || 'default'}`;
    const events = programEvents[programKey]?.events || [];
    return events;
  };

  const handleEnableSubmissionOverride = () => {
    // Show modal to select time limit
    setShowOverrideModal(true);
  };

  const confirmEnableOverride = async () => {
    try {
      // Create a deadline override for this department with time limit
      await API.post('/deadline-override', {
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
        module_name: 'program_entry',
        enabled_by_principal: true,
        duration_hours: overrideDuration,
        reason: `Principal override - late submission allowed for ${overrideDuration} hours`
      });

      alert(`Deadline override enabled for ${overrideDuration} hours!`);
      // Refresh the page data to reflect the override
      window.location.reload();
      
    } catch (error) {
      console.error('Error enabling submission override:', error);
      alert('Error enabling submission override. Please try again.');
    }
  };

  const grandTotal = { count: 0, budget: 0 };

  return (
    <div className="container mt-4">
      {/* Data Update Notification */}
      {dataUpdatedNotification && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          padding: '12px 16px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '14px',
          color: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>🔄</span>
          Data has been updated by another user
        </div>
      )}

      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Budget Proposals for Student Activities</h4>
          <p className="text-muted mb-0">
            Department of {departmentName} - {selectedAcademicYear}
            {lastUpdateTime && (
              <small className="text-success ms-2">
                <i className="fas fa-sync-alt"></i> Last updated: {lastUpdateTime.toLocaleTimeString()}
              </small>
            )}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {/* Auto-refresh toggle */}
          <div className="form-check form-switch me-3">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="autoRefreshSwitch"
              checked={autoRefreshEnabled}
              onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="autoRefreshSwitch">
              Auto-refresh
            </label>
          </div>
          
          {/* Manual refresh button */}
          <button 
            className="btn btn-outline-primary btn-sm me-2" 
            onClick={refreshData}
            disabled={isPolling}
            title="Refresh data to see latest updates"
          >
            <i className={`fas fa-sync-alt ${isPolling ? 'fa-spin' : ''}`}></i> 
            {isPolling ? ' Refreshing...' : ' Refresh'}
          </button>
          
          <button className="btn btn-outline-danger btn-sm" onClick={handleDownloadPDF}>
            <i className="fas fa-file-pdf"></i> Download PDF
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={handleDownloadExcel}>
            <i className="fas fa-file-excel"></i> Download Excel
          </button>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-3">
            <label className="form-label mb-0 text-nowrap">
              <strong><i className="fas fa-graduation-cap"></i> Academic Year:</strong>
            </label>
            <select
              className="form-select"
              style={{ maxWidth: "200px" }}
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
            >
              <option value="">-- Select Academic Year --</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.year}</option>
              ))}
            </select>
            
            <div className="vr mx-2"></div>
            <label className="form-label mb-0 text-nowrap">
              <strong><i className="fas fa-calendar-alt"></i> Submission Deadline:</strong>
            </label>
            <div>
              <div className="fw-semibold text-primary">{deadlineDisplay}</div>
              {overrideInfo && overrideInfo.has_override && overrideInfo.expires_at && (
                <small className="text-warning">
                  <i className="fas fa-unlock"></i> Override Active {timeRemaining && `(${timeRemaining})`}
                </small>
              )}
              {overrideInfo && overrideInfo.expired && (
                <small className="text-danger">
                  <i className="fas fa-clock"></i> Override Expired
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Status */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0"><i className="fas fa-tasks"></i> Workflow Status</h6>
        </div>
        <div className="card-body">
          {/* Status Indicator */}
          <StatusIndicator status={submissionStatus} userRole={userRole} />

          {/* Action Buttons */}
          <div className="mt-3">
            <div className="row">
              <div className="col-md-8">
                {submissionStatus === 'draft' && userRole === 'hod' && (
                  <button 
                    className="btn btn-primary me-2 mb-2"
                    onClick={handleSubmitForApproval}
                    disabled={submitting || !isEditable}
                    title={!isEditable ? "Submission deadline has passed" : "Submit your budget for Principal approval"}
                  >
                    <i className="fas fa-paper-plane"></i> {!isEditable ? "Submission Deadline Passed" : "Submit for Principal Approval"}
                  </button>
                )}
                
                {submissionStatus === 'submitted' && userRole === 'principal' && (
                  <button 
                    className="btn btn-success me-2 mb-2"
                    onClick={handlePrincipalApproval}
                  >
                    <i className="fas fa-check"></i> Approve Budget
                  </button>
                )}

                {canPlanEvents && submissionStatus === 'approved' && userRole === 'hod' && (
                  <button 
                    className="btn btn-info me-2 mb-2"
                    onClick={handlePlanEvents}
                  >
                    <i className="fas fa-calendar"></i> Plan Individual Events
                  </button>
                )}
              </div>
              
              <div className="col-md-4">
                {/* Principal Override Actions */}
                {submissionStatus === 'draft' && userRole === 'principal' && (
                  <div className="text-end">
                    {((userRole === "principal" && deadlinePassed) || (!isEditable && userRole !== "principal")) && (
                      <button 
                        className="btn btn-warning btn-sm mb-2"
                        onClick={handleEnableSubmissionOverride}
                        title="Allow this department to submit after deadline"
                      >
                        <i className="fas fa-unlock"></i> Enable Submission Override
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status Messages */}
            {submissionStatus === 'submitted' && userRole === 'hod' && (
              <div className="alert alert-warning mb-0">
                <i className="fas fa-paper-plane"></i> Submitted for Principal approval. Awaiting approval to plan events.
              </div>
            )}

            {submissionStatus === 'approved' && userRole === 'principal' && (
              <div className="alert alert-success mb-0">
                <i className="fas fa-check-circle"></i> Budget approved. Department can now plan individual events.
              </div>
            )}

            {submissionStatus === 'events_planned' && userRole === 'principal' && (
              <div className="alert alert-info mb-0">
                <i className="fas fa-calendar-check"></i> Events have been planned by the department.
              </div>
            )}

            {submissionStatus === 'events_planned' && userRole === 'hod' && (
              <div className="alert alert-success mb-0">
                <i className="fas fa-calendar-check"></i> Events planned successfully. Ready for execution and reporting.
              </div>
            )}

            {submissionStatus === 'draft' && userRole === 'principal' && (
              <div className="alert alert-secondary mb-0">
                <i className="fas fa-edit"></i> Department is still drafting their budget proposal.
                
                {((userRole === "principal" && deadlinePassed) || (!isEditable && userRole !== "principal")) && (
                  <div className="mt-2">
                    <small className="text-muted">Note: Submission deadline has passed.</small>
                  </div>
                )}
                
                {isEditable && overrideInfo && overrideInfo.has_override && overrideInfo.expires_at && (
                  <div className="mt-2">
                    <small className="text-warning">
                      <i className="fas fa-clock"></i> Deadline override active until: {new Date(overrideInfo.expires_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="card">
        <div className="card-header bg-success text-white p-0">
          <ul className="nav nav-tabs card-header-tabs border-0" id="programTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'budget' ? 'active' : ''} text-white border-0`}
                style={{ backgroundColor: activeTab === 'budget' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                id="budget-tab"
                data-bs-toggle="tab"
                data-bs-target="#budget"
                type="button"
                role="tab"
                aria-controls="budget"
                aria-selected={activeTab === 'budget'}
                onClick={() => setActiveTab('budget')}
              >
                <i className="fas fa-table"></i> Budget Proposals
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'events' ? 'active' : ''} text-white border-0 ${!canPlanEvents ? 'disabled' : ''}`}
                style={{ 
                  backgroundColor: activeTab === 'events' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  opacity: !canPlanEvents ? 0.5 : 1
                }}
                id="events-tab"
                data-bs-toggle="tab"
                data-bs-target="#events"
                type="button"
                role="tab"
                aria-controls="events"
                aria-selected={activeTab === 'events'}
                onClick={() => canPlanEvents && setActiveTab('events')}
                disabled={!canPlanEvents}
                title={!canPlanEvents ? "Events planning available after budget approval" : (canEditEvents ? "Plan individual events" : "View individual events")}
              >
                <i className="fas fa-calendar-plus"></i> {canEditEvents ? "Event Planning" : "Event Viewing"}
                {!canPlanEvents && <small className="ms-1">(Locked)</small>}
              </button>
            </li>
          </ul>
        </div>
        
        <div className="tab-content" id="programTabsContent">
          {/* Budget Proposals Tab */}
          <div 
            className={`tab-pane fade ${activeTab === 'budget' ? 'show active' : ''}`} 
            id="budget" 
            role="tabpanel" 
            aria-labelledby="budget-tab"
          >
            {/* Budget Proposals Table */}
            <div className="card-body p-0">
              <div ref={printRef}>
                <table className="table table-bordered table-striped mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>Activity Category</th>
                      <th>Program Type</th>
                      <th>Sub Type</th>
                      <th className="text-center">Budget / Event</th>
                      <th className="text-center">Count</th>
                      <th className="text-center">Total Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center">
                          No program types found for your department.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(grouped).map(([category, items]) => {
                        const subtotal = { count: 0, budget: 0 };

                        // Calculate total rowspan for category including events
                        let categoryRowSpan = items.length;
                        items.forEach(item => {
                          const events = getEventsForProgram(item.program_type, item.sub_program_type);
                          categoryRowSpan += events.length;
                        });

                        return (
                          <React.Fragment key={category}>
                            {items.map((item, idx) => {
                              const globalIndex = mergedData.findIndex(
                                (d) =>
                                  d.program_type === item.program_type &&
                                  d.sub_program_type === item.sub_program_type
                              );

                              const count = mergedData[globalIndex].count || 0;
                              const budget =
                                item.budget_mode === "Fixed"
                                  ? count * (item.budget_per_event || 0)
                                  : mergedData[globalIndex].total_budget || 0;

                              subtotal.count += count;
                              subtotal.budget += budget;
                              grandTotal.count += count;
                              grandTotal.budget += budget;

                              const isVariableAndPrincipal =
                                userRole === "principal" && item.budget_mode === "Variable";

                              // Get events for this program type
                              const events = getEventsForProgram(item.program_type, item.sub_program_type);

                              return (
                                <React.Fragment key={item.program_type + (item.sub_program_type || "")}>
                                  {/* Main Program Row */}
                                  <tr>
                                    {idx === 0 && <td className="bold" rowSpan={categoryRowSpan}>{category}</td>}
                                    <td className="fw-bold">{item.program_type}</td>
                                    <td className="fw-bold">{item.sub_program_type || "-"}</td>
                                    <td align="center">{item.budget_per_event || "-"}</td>
                                    <td align="center">
                                      {renderInput(
                                        globalIndex,
                                        "count",
                                        mergedData[globalIndex].count,
                                        (userRole === "hod" || userRole === "principal") && isEditable
                                      )}
                                    </td>
                                    <td align="center">
                                      {item.budget_mode === "Fixed" ? (
                                        budget
                                      ) : (
                                        renderInput(
                                          globalIndex,
                                          "total_budget",
                                          mergedData[globalIndex].total_budget,
                                          isEditable &&
                                          (userRole === "hod" || isVariableAndPrincipal)
                                        )
                                      )}
                                    </td>
                                  </tr>
                                  
                                  {/* Event Rows - Only show if events exist */}
                                  {events.map((event) => (
                                    <tr key={event.id} className="table-light">
                                      <td className="ps-4 text-muted small">
                                        <i className="fas fa-calendar me-1"></i>
                                        {event.title || `Event ${event.eventNumber}`}
                                      </td>
                                      <td className="text-muted small">
                                        {event.event_date ? new Date(event.event_date).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="text-muted small">-</td>
                                      <td className="text-muted small text-center">-</td>
                                      <td className="text-muted small text-center">
                                        ₹{event.budget_amount?.toLocaleString() || 0}
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            <tr className="table-info fw-bold">
                              <td colSpan="4" className="text-end">
                                Subtotal for {category}
                              </td>
                              <td align="center">{subtotal.count}</td>
                              <td align="center">{subtotal.budget}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Grand Total Row */}
                    {Object.entries(grouped).length > 0 && (
                      <tr className="table-warning fw-bold">
                        <td colSpan="4" className="text-end">Grand Total</td>
                        <td align="center">{grandTotal.count}</td>
                        <td align="center">{grandTotal.budget}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div style={{ height: "24px" }}></div>
                
                <table className="table table-bordered mt-3">
                  <tbody>
                    {/* HoD Remarks Row */}
                    {hodRemarks && (
                      <tr>
                        <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                          HoD Remarks:<br />
                          <span style={{ fontWeight: "normal" }}>{hodRemarks}</span>
                        </td>
                      </tr>
                    )}

                    {/* Principal Remarks Row */}
                    {principalRemarks && (
                      <tr>
                        <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                          Principal Remarks:<br />
                          <span style={{ fontWeight: "normal" }}>{principalRemarks}</span>
                          <div style={{ height: "14px" }}></div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div style={{ height: "24px" }}></div>
                
                <table border="0">
                  <tbody>
                    <tr>
                      <td align="center">
                        <div style={{ height: "50px" }}></div>
                        <strong>HoD, {departmentName}</strong>
                      </td>
                      <td align="center">
                        <div style={{ height: "50px" }}></div>
                        <strong>Principal</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Events Planning Tab */}
          <div 
            className={`tab-pane fade ${activeTab === 'events' ? 'show active' : ''}`} 
            id="events" 
            role="tabpanel" 
            aria-labelledby="events-tab"
          >
            <div className="card-body">
              {!canPlanEvents ? (
                <div className="text-center py-5">
                  <i className="fas fa-lock fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Event Planning Locked</h5>
                  <p className="text-muted">
                    Events planning will be available after budget approval by Principal.
                  </p>
                </div>
              ) : mergedData.filter(program => (program.count || 0) > 0).length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No Approved Programs Found</h5>
                  <p className="text-muted">
                    No programs with approved counts available for event planning.
                  </p>
                </div>
              ) : (
                <>
                  {/* Header Info */}
                  <div className="alert alert-info">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="alert-heading mb-2">
                          <i className="fas fa-info-circle"></i> Event Planning Instructions
                        </h6>
                        <p className="mb-1">
                          {canEditEvents 
                            ? "Plan individual events based on your approved program counts and budgets. Fill in details for each event and ensure total budget allocation matches the approved amount."
                            : "View individual events planned by the department. Events are based on approved program counts and budgets."
                          }
                          Event titles will appear in the Budget tab once added.
                        </p>
                      </div>
                      {canEditEvents && (
                        <div>
                          <button 
                            className="btn btn-outline-primary btn-sm"
                          onClick={() => {
                            console.log('� Regenerating all events...');
                            setProgramEvents({});
                            
                            // Immediately regenerate events
                            setTimeout(() => {
                              console.log('🔄 Regenerating events...');
                              const eventRows = {};
                              
                              mergedData.forEach(program => {
                                const count = program.count || 0;
                                if (count > 0) {
                                  const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
                                  const rows = [];
                                  
                                  for (let i = 0; i < count; i++) {
                                    const budgetPerEvent = program.budget_mode === 'Fixed' 
                                      ? program.budget_per_event 
                                      : Math.round((program.total_budget || 0) / count);
                                      
                                    rows.push({
                                      id: `${programKey}_${i}`,
                                      eventNumber: i + 1,
                                      title: `Event ${i + 1}`,
                                      description: '',
                                      event_date: '',
                                      coordinator_name: '',
                                      coordinator_contact: '',
                                      budget_amount: budgetPerEvent,
                                      status: 'planning'
                                    });
                                  }
                                  
                                  eventRows[programKey] = {
                                    programInfo: program,
                                    totalCount: count,
                                    totalBudget: program.total_budget || 0,
                                    events: rows
                                  };
                                }
                              });
                              
                              setProgramEvents(eventRows);
                              const programsWithCounts = Object.keys(eventRows).length;
                              console.log(`✅ Regenerated events for ${programsWithCounts} program types`);
                              alert(`✅ Events regenerated! Now showing ${programsWithCounts} program types with events.`);
                            }, 100);
                          }}
                          title="Regenerate all event forms based on current program counts"
                        >
                          <i className="fas fa-sync-alt"></i> Regenerate Events
                        </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Program Event Tables */}
                  {Object.entries(programEvents).map(([programKey, program]) => (
                    <div key={programKey} className="card mb-4">
                      <div className="card-header bg-primary text-white">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">
                              <i className="fas fa-calendar-check"></i> {program.programInfo.program_type}
                              {program.programInfo.sub_program_type && ` - ${program.programInfo.sub_program_type}`}
                            </h6>
                            <small>
                              Approved: {program.totalCount} events | Budget: ₹{program.totalBudget.toLocaleString()}
                              {program.programInfo.budget_mode === 'Fixed' && 
                                ` (₹${program.programInfo.budget_per_event} per event)`
                              }
                            </small>
                          </div>
                          <div>
                            {program.events.every(e => e.status === 'completed') ? (
                              <span className="badge bg-success">
                                <i className="fas fa-check"></i> Events Planned
                              </span>
                            ) : canEditEvents ? (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleSaveProgramEvents(programKey)}
                                disabled={eventsSaving[programKey]}
                              >
                                {eventsSaving[programKey] ? (
                                  <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                ) : (
                                  <><i className="fas fa-save"></i> Save All Events</>
                                )}
                              </button>
                            ) : (
                              <span className="badge bg-info">
                                <i className="fas fa-eye"></i> View Only
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="card-body p-0">
                        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          <table className="table table-bordered mb-0" style={{ minWidth: '1200px' }}>
                            <thead className="table-light">
                              <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th style={{ width: '250px' }}>Event Title *</th>
                                <th style={{ width: '150px' }}>Date *</th>
                                <th style={{ width: '150px' }}>Budget (₹) *</th>
                                <th style={{ width: '180px' }}>Coordinator</th>
                                <th style={{ width: '150px' }}>Contact</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {program.events.map((event, eventIndex) => (
                                <tr key={event.id} className={event.status === 'completed' ? 'table-success' : ''}>
                                  <td className="text-center fw-bold">{event.eventNumber}</td>
                                  
                                  {/* Event Title */}
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={event.title}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'title', e.target.value)}
                                      placeholder="Event title"
                                      disabled={!canEditEvents || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                  
                                  {/* Event Date */}
                                  <td>
                                    <input
                                      type="date"
                                      className="form-control form-control-sm"
                                      value={event.event_date}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'event_date', e.target.value)}
                                      min={new Date().toISOString().split('T')[0]}
                                      disabled={!canEditEvents || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                  
                                  {/* Budget Amount */}
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      value={event.budget_amount}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'budget_amount', parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      disabled={!canEditEvents || program.programInfo.budget_mode === 'Fixed' || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                  
                                  {/* Coordinator Name */}
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={event.coordinator_name}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'coordinator_name', e.target.value)}
                                      placeholder="Name"
                                      disabled={!canEditEvents || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                  
                                  {/* Coordinator Contact */}
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={event.coordinator_contact}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'coordinator_contact', e.target.value)}
                                      placeholder="Phone/Email"
                                      disabled={!canEditEvents || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                  
                                  {/* Description */}
                                  <td>
                                    <textarea
                                      className="form-control form-control-sm"
                                      rows="2"
                                      value={event.description}
                                      onChange={(e) => handleEventChange(programKey, eventIndex, 'description', e.target.value)}
                                      placeholder="Brief description"
                                      disabled={!canEditEvents || event.status === 'completed'}
                                      readOnly={!canEditEvents}
                                    />
                                  </td>
                                </tr>
                              ))}
                              
                              {/* Budget Summary Row */}
                              <tr className="table-warning">
                                <td colSpan="3" className="text-end fw-bold">Total Budget Allocation:</td>
                                <td className="fw-bold text-primary">
                                  ₹{program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0).toLocaleString()}
                                </td>
                                <td colSpan="3" className="text-muted small">
                                  {program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0) === program.totalBudget ? (
                                    <span className="text-success">
                                      <i className="fas fa-check"></i> Budget allocation matches approved amount
                                    </span>
                                  ) : (
                                    <span className="text-danger">
                                      <i className="fas fa-exclamation-triangle"></i> Must equal ₹{program.totalBudget.toLocaleString()}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remarks Section */}
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0"><i className="fas fa-comment"></i> HoD Remarks</h6>
            </div>
            <div className="card-body">
              {userRole === "hod" ? (
                <>
                  <textarea
                    rows={4}
                    className="form-control"
                    value={hodRemarks}
                    onChange={(e) => setHodRemarks(e.target.value)}
                    readOnly={!isEditable}
                    style={{ whiteSpace: "pre-wrap" }}
                    placeholder="Enter your remarks here..."
                  />
                  {/* Printable version for PDF */}
                  <div
                    className="d-none d-print-block mt-2"
                    style={{
                      whiteSpace: "pre-wrap",
                      border: "1px solid #ccc",
                      padding: "10px",
                      marginTop: "10px",
                    }}
                  >
                    {hodRemarks}
                  </div>
                </>
              ) : (
                <div
                  className="form-control bg-light"
                  style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}
                >
                  {hodRemarks || "No remarks provided yet."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0"><i className="fas fa-star"></i> Principal Remarks</h6>
            </div>
            <div className="card-body">
              {userRole === "principal" ? (
                <textarea
                  rows={4}
                  className="form-control"
                  value={principalRemarks}
                  onChange={(e) => setPrincipalRemarks(e.target.value)}
                  readOnly={!isEditable}
                  style={{ whiteSpace: "pre-wrap" }}
                  placeholder="Enter your remarks here..."
                />
              ) : (
                <div
                  className="form-control bg-light"
                  style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}>
                  {principalRemarks || "No remarks provided yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card mt-4">
        <div className="card-body text-center">
          {isEditable && submissionStatus === 'draft' && userRole === 'hod' && (
            <button
              className="btn btn-outline-secondary me-2"
              onClick={handleSubmit}
              disabled={submitting}>
              <i className="fas fa-save"></i> {submitting ? "Saving..." : "Save Draft"}
            </button>
          )}
          
          {isEditable && submissionStatus !== 'draft' && (userRole === 'hod' || userRole === 'principal') && (
            <button
              className="btn btn-outline-primary"
              onClick={handleSubmit}
              disabled={submitting}>
              <i className="fas fa-sync"></i> {submitting ? "Updating..." : "Update Data"}
            </button>
          )}
        </div>
      </div>

      {/* Submission Status Modal */}
      {status === "success" || status === "error" ? (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal-container bg-white border rounded shadow">
            <div className="modal-header border-bottom">
              <h5 className={`modal-title ${status === "success" ? "text-success" : "text-danger"}`}>
                {status === "success" ? "Success" : "Error"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setStatus(null)}
              ></button>
            </div>
            <div className="modal-body text-center">
              <p>
                {status === "success"
                  ? "✅ Submission successful!"
                  : "❌ Submission failed. Please try again."}
              </p>
            </div>
            <div className="modal-footer border-top text-end">
              <button
                className="btn btn-secondary"
                onClick={() => setStatus(null)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Add white space at the bottom of the page */}
      <div style={{ height: "100px" }}></div>

      {/* Validation Modal */}
      {showValidationModal && (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal-container bg-white border rounded shadow">
            <div className="modal-header border-bottom">
              <h5 className="modal-title text-danger">Validation Error</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowValidationModal(false)}
              ></button>
            </div>
            <div className="modal-body text-center">
              <p className="mb-3">
                The following entries have inconsistent <br />
                <strong>Count / Budget</strong>:
              </p>
              <ul className="text-start">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err}</strong>
                  </li>
                ))}
              </ul>
              <p className="text-muted mt-3">
                Both <span className="text-primary">Count</span> and{" "}
                <span className="text-danger">Total Budget</span> must be either non-zero or both zero.
              </p>
            </div>
            <div className="modal-footer border-top text-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowValidationModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Time Limit Override Modal */}
      {showOverrideModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🕒 Set Deadline Override Duration</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowOverrideModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  How long should <strong>{departmentName}</strong> be allowed to submit after the deadline?
                </p>
                
                <div className="mb-3">
                  <label className="form-label">Duration (hours)</label>
                  <select 
                    className="form-select" 
                    value={overrideDuration} 
                    onChange={(e) => setOverrideDuration(parseInt(e.target.value))}
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (1 day)</option>
                    <option value={48}>48 hours (2 days)</option>
                    <option value={72}>72 hours (3 days)</option>
                    <option value={168}>168 hours (1 week)</option>
                  </select>
                </div>

                <div className="alert alert-info">
                  <small>
                    <strong>Note:</strong> This override will automatically expire after the selected duration. 
                    The department will only be able to submit during this extended time window.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={confirmEnableOverride}
                >
                  🔓 Enable Override for {overrideDuration} hours
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOverrideModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default ProgramEntryForm;
