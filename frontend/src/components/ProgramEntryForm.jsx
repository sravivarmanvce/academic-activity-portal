import React, { useEffect, useState, useRef, useCallback } from "react";
import API from "../Api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ academicYearId, userRole }) {
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
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  
  // New workflow states
  const [submissionStatus, setSubmissionStatus] = useState('draft'); // 'draft', 'submitted', 'approved', 'events_submitted', 'events_planned', 'completed'
  const [canPlanEvents, setCanPlanEvents] = useState(false); // Can access events tab
  const [canEditEvents, setCanEditEvents] = useState(false); // Can edit events (Admin or HoD)
  const [activeTab, setActiveTab] = useState('budget'); // 'budget' or 'events'
  
  // Event planning states
  const [programEvents, setProgramEvents] = useState({});
  const [eventsSaving, setEventsSaving] = useState({}); // Changed to object to track saving state per program
  
  // Real-time data sync states
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  // Auto-refresh is disabled to prevent losing unsaved event planning data
  const [dataUpdatedNotification, setDataUpdatedNotification] = useState(false);
  
  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Export options state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState(''); // 'pdf' or 'excel'
  const [includeHodRemarks, setIncludeHodRemarks] = useState(true);
  const [includePrincipalRemarks, setIncludePrincipalRemarks] = useState(true);
  
  // Remarks modal states
  const [showHodRemarksModal, setShowHodRemarksModal] = useState(false);
  const [showPrincipalRemarksModal, setShowPrincipalRemarksModal] = useState(false);
  const [tempHodRemarks, setTempHodRemarks] = useState('');
  const [tempPrincipalRemarks, setTempPrincipalRemarks] = useState('');
  
  // Edit event modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventData, setEditEventData] = useState({
    title: '',
    event_date: '',
    budget_amount: '',
    coordinator_name: '',
    coordinator_contact: ''
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Documents state
  const [eventDocuments, setEventDocuments] = useState([]);

  const printRef = useRef();
  const refreshDataRef = useRef();

  useEffect(() => {
    // Get user information for HOD filtering
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userDepartmentId = user?.department_id;
    const isHoD = userRole && userRole.toLowerCase().includes('hod');
    
    // Fetch academic years and departments on mount
    Promise.all([
      API.get("/api/academic-years"),
      API.get("/departments")
    ]).then(([academicRes, deptRes]) => {
      setAcademicYears(academicRes.data);
      
      // Filter departments for HOD users
      let filteredDepartments = deptRes.data;
      if (isHoD && userDepartmentId) {
        filteredDepartments = deptRes.data.filter(dept => dept.id === userDepartmentId);
      }
      setDepartments(filteredDepartments);
      
      if (academicRes.data.length > 0 && !selectedAcademicYearId) {
        setSelectedAcademicYearId(academicRes.data[0].id);
      }
      
      // Auto-select department based on user role
      if (filteredDepartments.length > 0 && !selectedDepartmentId) {
        if (isHoD && userDepartmentId) {
          // HOD users get their department auto-selected
          setSelectedDepartmentId(userDepartmentId);
        } else {
          // Admin/Principal get first department
          setSelectedDepartmentId(filteredDepartments[0].id);
        }
      }
    }).catch((err) => console.error("Failed to load initial data", err));
  }, [selectedAcademicYearId, selectedDepartmentId, userRole]);

  useEffect(() => {
    if (!selectedDepartmentId || !selectedAcademicYearId) return;

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
          API.get(`/program-counts?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
          API.get("/departments"),
          API.get(`/principal-remarks?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: { remarks: "" } } : { data: { remarks: "" } })),
          API.get(`/hod-remarks?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: { remarks: "" } } : { data: { remarks: "" } })),
          API.get("/api/academic-years"),
          API.get(`/events?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err)))
        ]);

        const departmentObj = deptRes.data.find((d) => d.id === selectedDepartmentId);
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
          }
        });
        
        setProgramEvents(eventsByProgram);

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
              `/deadline-override?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
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
            // HoDs initial editability based on deadline - will be further restricted by status later
            setIsEditable(yearObj?.is_enabled && (isBeforeDeadline || hasOverride));
          }
        } catch (e) {
          console.warn("No module deadline found");
          setDeadlineDisplay("No deadline set");
          setIsEditable(false);
        }

        // 🔁 Fetch submission status
        try {
          const statusRes = await API.get(`/workflow-status?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`);
          setSubmissionStatus(statusRes.data.status || 'draft');
          
          // Update event planning permissions based on status and user role
          const status = statusRes.data.status || 'draft';
          
          if (userRole === 'admin') {
            // Admin can always view and edit events
            setCanPlanEvents(true);
            setCanEditEvents(true);
          } else if (userRole === 'principal') {
            // Principal can view events once approved, but cannot edit
            if (status === 'approved' || status === 'events_submitted' || status === 'events_planned' || status === 'completed') {
              setCanPlanEvents(true);
              setCanEditEvents(false);
            }
          } else if (userRole === 'hod') {
            // HoD can view and edit events once approved, view-only after submitted for approval
            if (status === 'approved') {
              setCanPlanEvents(true);
              setCanEditEvents(true);
              // Disable budget editing once approved
              setIsEditable(false);
            } else if (status === 'events_submitted' || status === 'events_planned' || status === 'completed') {
              setCanPlanEvents(true);
              setCanEditEvents(false); // Read-only after submission
              setIsEditable(false); // Budget editing disabled
            }
            // For draft/submitted status, budget editing depends on deadline and current isEditable state
            // The isEditable was already set based on deadline/override above
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
  }, [selectedDepartmentId, selectedAcademicYearId, userRole]);

  // Update department name when selectedDepartmentId changes
  useEffect(() => {
    if (selectedDepartmentId && departments.length > 0) {
      const dept = departments.find(d => d.id === selectedDepartmentId);
      if (dept) {
        setDepartmentName(dept.name || "");
        setDepartmentFullName(dept.full_name || "");
      }
    }
  }, [selectedDepartmentId, departments]);

  // Update academic year name when selectedAcademicYearId changes
  useEffect(() => {
    if (selectedAcademicYearId && academicYears.length > 0) {
      const year = academicYears.find(y => y.id === selectedAcademicYearId);
      if (year) {
        setSelectedAcademicYear(year.year || "");
      }
    }
  }, [selectedAcademicYearId, academicYears]);

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

  // Note: Event generation is now handled in the refreshData function
  // This prevents infinite loops and ensures events are properly loaded from database

  // Real-time data synchronization
  const refreshData = useCallback(async () => {
    if (!selectedDepartmentId || !selectedAcademicYearId || isPolling) return;
    
    setIsPolling(true);
    try {
      const [
        countsRes,
        principalRes,
        hodRes,
        eventsRes,
        statusRes,
        documentsRes
      ] = await Promise.all([
        API.get(`/program-counts?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
        API.get(`/principal-remarks?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: { remarks: "" } } : { data: { remarks: "" } })),
        API.get(`/hod-remarks?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: { remarks: "" } } : { data: { remarks: "" } })),
        API.get(`/events?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
        API.get(`/workflow-status?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`)
          .catch(() => ({ data: { status: 'draft' } })),
        API.get(`/documents/list`)
          .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err)))
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
        setIsEditable(true); // Admin can always edit
      } else if (userRole === 'principal') {
        if (status === 'approved' || status === 'events_submitted' || status === 'events_planned' || status === 'completed') {
          setCanPlanEvents(true);
          setCanEditEvents(false);
        }
        setIsEditable(true); // Principal can always edit budget
      } else if (userRole === 'hod') {
        if (status === 'approved') {
          setCanPlanEvents(true);
          setCanEditEvents(true);
          // Disable budget editing once approved
          setIsEditable(false);
        } else if (status === 'events_submitted' || status === 'events_planned' || status === 'completed') {
          setCanPlanEvents(true);
          setCanEditEvents(false); // Read-only after submission
          setIsEditable(false); // Budget editing disabled
        } else {
          // For draft/submitted status, keep current isEditable state (based on deadline)
          // Don't change isEditable here as it depends on deadline logic
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
                  id: existingEvent.id, // Use actual database ID
                  eventNumber: i + 1,
                  title: existingEvent.title || '',
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
        
        // Update documents after events are loaded
        const documents = documentsRes.data || [];
        
        // Filter documents for current department events
        const currentEventIds = Object.values(eventsByProgram).flatMap(program => 
          program.events.map(event => event.id).filter(id => id != null)
        );
        
        const filteredDocuments = documents.filter(doc => 
          doc.event_id && currentEventIds.includes(doc.event_id)
        );
        
        setEventDocuments(filteredDocuments);
      } else {
        // No events loaded, use all documents
        const documents = documentsRes.data || [];
        setEventDocuments(documents);
      }

      setLastUpdateTime(new Date());
      
      // Show notification if there were changes and this was an auto-refresh
      if (hasChanges && lastUpdateTime) {
        setDataUpdatedNotification(true);
        setTimeout(() => setDataUpdatedNotification(false), 5000); // Hide after 5 seconds
      }
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setIsPolling(false);
    }
  }, [
    selectedDepartmentId, 
    selectedAcademicYearId, 
    isPolling, 
    principalRemarks, 
    hodRemarks, 
    submissionStatus, 
    userRole, 
    lastUpdateTime,
    mergedData,
    programEvents
  ]);

  // Update the ref whenever refreshData changes
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // Call refreshData when academic year changes to load documents
  useEffect(() => {
    // Only call refreshData if we have the basic data loaded (after initial fetchAll)
    if (selectedDepartmentId && selectedAcademicYearId && mergedData.length > 0) {
      // Small delay to ensure initial data is loaded first
      const timer = setTimeout(() => {
        refreshDataRef.current();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedAcademicYearId, selectedDepartmentId, mergedData.length]);

  // Check event completion status whenever programEvents changes
  useEffect(() => {
    if (Object.keys(programEvents).length > 0 && submissionStatus === 'approved') {
      // Note: Removed automatic status update - now manual submission required
    }
  }, [programEvents, submissionStatus]);

  // Manual refresh only - auto-refresh disabled to prevent data loss
  useEffect(() => {
    // Auto-refresh is now disabled to prevent losing unsaved event planning data
    // Users can manually refresh using the refresh button
    return; // No auto-refresh
  }, [selectedDepartmentId, selectedAcademicYearId, userRole, submissionStatus]);

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleChange = (index, field, value) => {
    setMergedData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "count" || field === "total_budget" ? Number(value) : value,
      };
      return updated;
    });
    
    // Mark as having unsaved changes for budget modifications
    if (field === "count" || field === "total_budget" || field === "remarks") {
      setHasUnsavedChanges(true);
    }
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
        `${entry.program_type}`
      );
      setValidationErrors(errors);
      setShowValidationModal(true);
      setSubmitting(false);
      return;
    }

    try {
      const payload = mergedData.map((entry) => ({
        department_id: selectedDepartmentId,
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

      setStatus("success");
      setHasUnsavedChanges(false); // Clear unsaved changes after successful save
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    setExportType('pdf');
    setShowExportModal(true);
  };

  const handleDownloadExcel = () => {
    setExportType('excel');
    setShowExportModal(true);
  };

  const handleExportConfirm = () => {
    if (exportType === 'pdf') {
      generatePDF();
    } else if (exportType === 'excel') {
      generateExcel();
    }
    setShowExportModal(false);
  };

  const generatePDF = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");

    printWindow.document.write(`
    <html>
      <head>
        <title>Budget Proposals for Student Activities - ${departmentName}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
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
          
          /* Hide buttons and non-printable elements */
          .d-print-none,
          button,
          .btn {
            display: none !important;
          }
          
          /* Hide the remarks action buttons specifically */
          .d-flex.justify-content-center.gap-3.mb-3 {
            display: none !important;
          }
          .exclude-remarks {
            display: none !important;
          }
          
          /* Print Header and Footer */
          @media print {
            @page {
              @top-left {
                content: "Budget Proposals for Student Activities - ${departmentName}";
                font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
              }
              @top-right {
                content: "Academic Year: ${selectedAcademicYear}";
                font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
              }
              @bottom-left {
                content: "Generated on: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}";
                font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
              }
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
              }
            }
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
            // Hide remarks based on selections
            ${!includeHodRemarks ? `
            const hodRemarksRows = document.querySelectorAll('tr');
            hodRemarksRows.forEach(row => {
              const firstCell = row.querySelector('td');
              if (firstCell && firstCell.innerHTML.includes('HoD Remarks:')) {
                row.style.display = 'none';
              }
            });
            ` : ''}
            
            ${!includePrincipalRemarks ? `
            const principalRemarksRows = document.querySelectorAll('tr');
            principalRemarksRows.forEach(row => {
              const firstCell = row.querySelector('td');
              if (firstCell && firstCell.innerHTML.includes('Principal Remarks:')) {
                row.style.display = 'none';
              }
            });
            ` : ''}
            
            window.print();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  };

  const generateExcel = () => {
    // Clone the table to modify it without affecting the original
    const table = printRef.current.querySelector("table").cloneNode(true);
    
    // Remove remarks rows based on selections
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const firstCell = row.querySelector('td');
      if (firstCell) {
        const cellContent = firstCell.innerHTML;
        if ((!includeHodRemarks && cellContent.includes('HoD Remarks:')) ||
            (!includePrincipalRemarks && cellContent.includes('Principal Remarks:'))) {
          row.remove();
        }
      }
    });
    
    const wb = XLSX.utils.table_to_book(table, { sheet: "Program Data" });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "program_entry.xlsx");
  };

  // Remarks modal handlers
  const handleOpenHodRemarksModal = () => {
    setTempHodRemarks(hodRemarks);
    setShowHodRemarksModal(true);
  };

  const handleOpenPrincipalRemarksModal = () => {
    setTempPrincipalRemarks(principalRemarks);
    setShowPrincipalRemarksModal(true);
  };

  const handleSaveHodRemarks = async () => {
    try {
      await API.post("/hod-remarks", {
        department_id: selectedDepartmentId,
        academic_year_id: selectedAcademicYearId,
        remarks: tempHodRemarks,
      });
      setHodRemarks(tempHodRemarks);
      setShowHodRemarksModal(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save HoD remarks", error);
      alert("Failed to save remarks. Please try again.");
    }
  };

  const handleSavePrincipalRemarks = async () => {
    try {
      await API.post("/principal-remarks", {
        department_id: selectedDepartmentId,
        academic_year_id: selectedAcademicYearId,
        remarks: tempPrincipalRemarks,
      });
      setPrincipalRemarks(tempPrincipalRemarks);
      setShowPrincipalRemarksModal(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save Principal remarks", error);
      alert("Failed to save remarks. Please try again.");
    }
  };

  const handleCancelRemarksModal = (type) => {
    if (type === 'hod') {
      setShowHodRemarksModal(false);
      setTempHodRemarks('');
    } else {
      setShowPrincipalRemarksModal(false);
      setTempPrincipalRemarks('');
    }
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
      <span>
        {field === "total_budget" ? `₹${(value || 0).toLocaleString()}` : value}
      </span>
    );
  };

  // Status Indicator Component
  const StatusIndicator = ({ status, userRole }) => {
    const statusSteps = [
      { key: 'draft', label: 'Form Entry', icon: 'fas fa-edit', desc: 'HoD enters counts & budgets' },
      { key: 'approved', label: 'Budget Approved', icon: 'fas fa-check-circle', desc: 'Budget approved, plan events' },
      { key: 'events_planned', label: 'Events Planned', icon: 'fas fa-calendar-check', desc: 'Events planned by HoD' },
      { key: 'completed', label: 'Completed', icon: 'fas fa-trophy', desc: 'All events executed' }
    ];

    // Check if all events have BOTH documents approved (not just status completed)
    const allEventsDocumentsApproved = Object.values(programEvents).every(program => 
      program.events.every(event => {
        if (!Array.isArray(eventDocuments)) return false;
        
        const eventDocs = eventDocuments.filter(doc => 
          doc.event_id && doc.event_id === event.id
        );
        
        const reportDoc = eventDocs.find(doc => doc.document_type === 'complete_report');
        const zipDoc = eventDocs.find(doc => doc.document_type === 'supporting_documents');
        
        return reportDoc && reportDoc.status === 'approved' && 
               zipDoc && zipDoc.status === 'approved';
      })
    );

    // Override status if all events have approved documents
    const displayStatus = allEventsDocumentsApproved && Object.keys(programEvents).length > 0 ? 'completed' : status;

    const getCurrentStepIndex = () => {
      // Map actual status to display status for visual flow
      const statusMapping = {
        'draft': -1,          // Show Form Entry as next (blue), others gray
        'submitted': 0,       // Show Form Entry as completed (green), Budget Approved as next (blue)
        'approved': 1,        // Show Form Entry + Budget Approved as completed (green), Events Planned as next (blue)
        'events_submitted': 1, // Show Form Entry + Budget Approved as completed (green), Events Planned as next (blue)
        'events_planned': 2,  // Show Form Entry + Budget Approved + Events Planned as completed (green), Completed as next (blue)
        'completed': 3        // Show all as completed (green)
      };
      
      return statusMapping[displayStatus] !== undefined ? statusMapping[displayStatus] : -1;
    };

    const currentIndex = getCurrentStepIndex();

    return (
      <div className="mb-4">
        <div className="d-flex justify-content-center">
          <div className="d-flex align-items-center" style={{ maxWidth: '900px', gap: '1rem' }}>
            {statusSteps.map((step, index) => {
              const isCompleted = currentIndex > index;
              const isCurrentStep = index === currentIndex;
              const isNextStep = index === currentIndex + 1;
              
              let stepClass, iconColor, bgClass;
              
              // Green for completed steps OR current step (when it's a completed action)
              if (isCompleted || (isCurrentStep && status !== 'draft')) {
                stepClass = 'text-success';
                iconColor = '#198754';
                bgClass = 'bg-success bg-opacity-10 border-success';
              } 
              // Blue for next step that needs action (one step ahead)
              else if (isNextStep) {
                stepClass = 'text-primary';
                iconColor = '#0d6efd';
                bgClass = 'bg-primary bg-opacity-10 border-primary';
              } 
              // Muted for pending future steps
              else {
                stepClass = 'text-muted';
                iconColor = '#6c757d';
                bgClass = 'bg-light border';
              }
              
              return (
                <React.Fragment key={step.key}>
                  <div className="text-center" style={{ minWidth: '120px' }}>
                    <div className={`card ${bgClass} border-2 p-3 position-relative`} style={{ minHeight: '100px' }}>
                      {/* Step Status Badge */}
                      {(isCompleted || (isCurrentStep && status !== 'draft')) && (
                        <div 
                          className={`badge rounded-circle position-absolute bg-success text-white`}
                          style={{ 
                            top: '-10px', 
                            right: '-10px', 
                            width: '25px', 
                            height: '25px', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          <i className="fas fa-check" style={{ fontSize: '0.7rem' }}></i>
                        </div>
                      )}
                      
                      {/* Status Icon */}
                      <div className="mb-2">
                        <i 
                          className={step.icon} 
                          style={{ 
                            fontSize: '1.8rem', 
                            color: iconColor
                          }}
                        ></i>
                      </div>
                      
                      {/* Status Label */}
                      <div className={`fw-bold mb-1 ${stepClass}`} style={{ fontSize: '0.9rem' }}>
                        {step.label}
                      </div>
                      
                      {/* Active Indicator */}
                      {isNextStep && (
                        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-1">
                          <div className="badge bg-primary rounded-pill px-2 py-1" style={{ fontSize: '0.6rem' }}>
                            <i className="fas fa-sync-alt fa-spin me-1"></i>
                            Current
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow Connector */}
                  {index < statusSteps.length - 1 && (
                    <div className="d-flex align-items-center">
                      <i 
                        className="fas fa-chevron-right" 
                        style={{ 
                          fontSize: '1.2rem',
                          color: isCompleted ? '#198754' : '#dee2e6'
                        }}
                      ></i>
                    </div>
                  )}
                </React.Fragment>
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
        department_id: selectedDepartmentId,
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
        department_id: selectedDepartmentId,
        status: 'approved'
      });
      
      setSubmissionStatus('approved');
      
      // Update permissions based on user role
      if (userRole === 'admin') {
        setCanPlanEvents(true);  // Admin can view events
        setCanEditEvents(true);  // And can edit them
      } else if (userRole === 'principal') {
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

  // New function to submit events for Principal approval
  const handleSubmitEventsForApproval = async () => {
    try {
      // First validate that all events are complete
      const programsWithApprovedCounts = mergedData.filter(program => (program.count || 0) > 0);
      
      const allEventsComplete = programsWithApprovedCounts.every(program => {
        const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
        const programEventData = programEvents[programKey];
        
        if (!programEventData) return false;
        
        return programEventData.events.every(event => {
          return event.title && event.title.trim() !== '' &&
                 event.event_date && event.event_date !== '' &&
                 event.budget_amount && parseFloat(event.budget_amount) > 0;
        });
      });

      if (!allEventsComplete) {
        alert('❌ Cannot submit events!\n\nPlease complete all required fields (Title, Date, Budget) for all events before submitting for Principal approval.');
        return;
      }

      // Update workflow status to 'events_submitted'
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: selectedDepartmentId,
        status: 'events_submitted'
      });
      
      setSubmissionStatus('events_submitted');
      alert('✅ Events submitted successfully!\n\nYour event plans have been sent to the Principal for approval.');
    } catch (error) {
      console.error('Error submitting events for approval:', error);
      alert('❌ Error submitting events for approval. Please try again.');
    }
  };

  // Function for Principal to approve events
  const handlePrincipalEventApproval = async () => {
    try {
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: selectedDepartmentId,
        status: 'events_planned'
      });
      
      setSubmissionStatus('events_planned');
      alert('✅ Events approved!\n\nThe department\'s event plans have been approved.');
    } catch (error) {
      console.error('Error approving events:', error);
      alert('❌ Error approving events. Please try again.');
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingNavigation('refresh');
      return;
    }
    
    setIsRefreshing(true);
    try {
      await refreshDataRef.current();
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check for unsaved changes in events
  const checkForUnsavedEventChanges = (currentEvents) => {
    for (const programKey in currentEvents) {
      const program = currentEvents[programKey];
      if (program && program.events) {
        for (const event of program.events) {
          if (event.status === 'pending' && (
            event.title.trim() || 
            event.event_date || 
            event.coordinator_name.trim() || 
            event.coordinator_contact.trim()
          )) {
            return true; // Found unsaved changes
          }
        }
      }
    }
    return false;
  };

  // Handle tab switching with unsaved changes warning
  const handleTabSwitch = (newTab) => {
    if (activeTab === 'events' && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingNavigation(newTab);
      return;
    }
    setActiveTab(newTab);
  };
  // Confirm navigation and lose changes
  const confirmNavigationAndLoseChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    
    if (pendingNavigation === 'refresh') {
      setIsRefreshing(true);
      refreshDataRef.current().finally(() => setIsRefreshing(false));
    } else if (pendingNavigation && pendingNavigation !== 'refresh') {
      setActiveTab(pendingNavigation);
    }
    
    setPendingNavigation(null);
  };

  // Cancel navigation and keep changes
  const cancelNavigationKeepChanges = () => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  };

  const handleEventChange = (programKey, eventIndex, field, value) => {
    const updatedProgramEvents = {
      ...programEvents,
      [programKey]: {
        ...programEvents[programKey],
        events: programEvents[programKey].events.map((event, idx) => 
          idx === eventIndex 
            ? { ...event, [field]: value }
            : event
        )
      }
    };
    
    setProgramEvents(updatedProgramEvents);
    
    // Check for unsaved changes after update
    const hasUnsaved = checkForUnsavedEventChanges(updatedProgramEvents);
    setHasUnsavedChanges(hasUnsaved);
    
    // Note: Removed automatic status update - now manual submission required
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
    if (!selectedDepartmentId || !selectedAcademicYearId) {
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
      
      const eventsData = program.events.map(event => ({
        title: event.title,
        description: '', // Empty description since we removed the field
        program_type_id: correctProgramTypeId,
        department_id: selectedDepartmentId,
        academic_year_id: selectedAcademicYearId,
        event_date: event.event_date,
        budget_amount: parseFloat(event.budget_amount),
        coordinator_name: event.coordinator_name,
        coordinator_contact: event.coordinator_contact
      }));
      
      // Save all events for this program type - handle each individually to see which one fails
      const results = [];
      for (let i = 0; i < eventsData.length; i++) {
        try {
          const result = await API.post("/events", eventsData[i]);
          results.push(result);
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
      const updatedProgramEvents = {
        ...programEvents,
        [programKey]: {
          ...programEvents[programKey],
          events: programEvents[programKey].events.map(event => ({
            ...event,
            status: 'completed'
          }))
        }
      };
      
      setProgramEvents(updatedProgramEvents);
      
      // Clear unsaved changes after successful save
      const hasUnsaved = checkForUnsavedEventChanges(updatedProgramEvents);
      setHasUnsavedChanges(hasUnsaved);
      
      // Note: Removed automatic status update - now manual submission required
      
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

  // Admin Functions - Extended permissions for system administrators
  const handleAdminDeleteEvent = async (programKey, eventIndex, eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone and will also delete all associated documents.')) {
      return;
    }

    try {
      // Delete the event from backend if it has an ID
      if (eventId && typeof eventId === 'number') {
        await API.delete(`/events/${eventId}`);
      }

      // Update local state - remove the event from the program
      setProgramEvents(prevEvents => {
        const updatedEvents = { ...prevEvents };
        const program = { ...updatedEvents[programKey] };
        
        // Remove the event at the specified index
        program.events = program.events.filter((_, index) => index !== eventIndex);
        
        // Update event numbers for remaining events
        program.events = program.events.map((event, index) => ({
          ...event,
          eventNumber: index + 1,
          id: `${programKey}_${index + 1}`
        }));
        
        updatedEvents[programKey] = program;
        return updatedEvents;
      });

      // Refresh data to sync with backend
      await refreshDataRef.current();
      
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Handle admin edit event
  const handleAdminEditEvent = (programKey, eventIndex, event) => {
    setEditingEvent({ programKey, eventIndex, eventId: event.id });
    setEditEventData({
      title: event.title || '',
      event_date: event.event_date || '',
      budget_amount: event.budget_amount || '',
      coordinator_name: event.coordinator_name || '',
      coordinator_contact: event.coordinator_contact || ''
    });
    setShowEditModal(true);
  };

  // Save edited event
  const handleSaveEditedEvent = async () => {
    if (!editingEvent) return;

    try {
      const { programKey, eventIndex, eventId } = editingEvent;

      // Get the program info to extract required IDs
      const program = programEvents[programKey];
      if (!program) {
        alert('Program information not found. Please try again.');
        return;
      }

      // Prepare the event data with all required fields
      const eventPayload = {
        ...editEventData,
        description: '', // Optional field - empty string as default
        department_id: selectedDepartmentId,
        academic_year_id: selectedAcademicYearId,
        program_type_id: program.programInfo.id // Get from the program info
      };

      // Update event in backend if it has an ID
      if (eventId) {
        await API.put(`/events/${eventId}`, eventPayload);
      }

      // Update local state
      setProgramEvents(prevEvents => {
        const updatedEvents = { ...prevEvents };
        const updatedProgram = { ...updatedEvents[programKey] };
        const updatedEventList = [...updatedProgram.events];
        
        updatedEventList[eventIndex] = {
          ...updatedEventList[eventIndex],
          ...editEventData
        };
        
        updatedProgram.events = updatedEventList;
        updatedEvents[programKey] = updatedProgram;
        return updatedEvents;
      });

      setShowEditModal(false);
      setEditingEvent(null);
      setEditEventData({
        title: '',
        event_date: '',
        budget_amount: '',
        coordinator_name: '',
        coordinator_contact: ''
      });

      // Refresh data to sync with backend
      await refreshDataRef.current();
      
      alert('Event updated successfully!');
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event. Please try again.');
    }
  };

  const handleAdminDeleteDocument = async (documentId, documentType, eventId) => {
    if (!window.confirm(`Are you sure you want to delete this ${documentType} document? This action cannot be undone.`)) {
      return;
    }

    try {
      await API.delete(`/documents/delete/${documentId}`);
      
      // Refresh data to sync with backend
      await refreshDataRef.current();
      
      alert(`${documentType} document deleted successfully!`);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handleAdminAddEvent = (programKey) => {
    setProgramEvents(prevEvents => {
      const updatedEvents = { ...prevEvents };
      const program = { ...updatedEvents[programKey] };
      
      // Get the next event number
      const nextEventNumber = program.events.length + 1;
      
      // Add new empty event
      const newEvent = {
        id: `${programKey}_${nextEventNumber}`,
        eventNumber: nextEventNumber,
        title: '',
        event_date: '',
        budget_amount: program.programInfo.budget_mode === 'Fixed' 
          ? program.programInfo.budget_per_event 
          : Math.round(program.totalBudget / program.totalCount),
        coordinator_name: '',
        coordinator_contact: '',
        status: 'pending'
      };
      
      program.events.push(newEvent);
      updatedEvents[programKey] = program;
      
      return updatedEvents;
    });

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  };

  // Helper function to get events for a specific program type
  const getEventsForProgram = (programType, subProgramType) => {
    const programKey = `${programType}_${subProgramType || 'default'}`;
    const events = programEvents[programKey]?.events || [];
    return events;
  };

  // Helper function to check event completion progress (uses actual event status from backend)
  const checkEventCompletionProgress = () => {
    const programsWithApprovedCounts = mergedData.filter(program => (program.count || 0) > 0);
    
    if (programsWithApprovedCounts.length === 0) {
      return false;
    }
    
    // Check if all events across all programs are marked as 'completed' (meaning they have approved documents)
    const allProgramsCompleted = programsWithApprovedCounts.every(program => {
      const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
      const programEventData = programEvents[programKey];
      
      if (!programEventData) {
        return false;
      }
      
      // Check if all events in this program have status 'completed' (set by backend when documents are approved)
      const allEventsCompleted = programEventData.events.every((event) => {
        return event.status === 'completed';
      });
      
      return allEventsCompleted;
    });
    
    return allProgramsCompleted;
  };

  // Helper function to calculate event completion progress
  const getEventCompletionProgress = () => {
    const programsWithApprovedCounts = mergedData.filter(program => (program.count || 0) > 0);
    
    if (programsWithApprovedCounts.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    let totalEvents = 0;
    let completedEvents = 0;
    
    programsWithApprovedCounts.forEach(program => {
      const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
      const programEventData = programEvents[programKey];
      
      if (programEventData) {
        totalEvents += programEventData.events.length;
        
        // Count events that have status 'completed' (set by backend when documents are approved)
        const completed = programEventData.events.filter(event => {
          return event.status === 'completed';
        }).length;
        
        completedEvents += completed;
      }
    });
    
    const percentage = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;
    
    return { completed: completedEvents, total: totalEvents, percentage };
  };

  const handleEnableSubmissionOverride = () => {
    // Show modal to select time limit
    setShowOverrideModal(true);
  };

  const confirmEnableOverride = async () => {
    try {
      // Create a deadline override for this department with time limit
      await API.post('/deadline-override', {
        department_id: selectedDepartmentId,
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
          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <span className="badge bg-warning text-dark d-flex align-items-center gap-1 me-2">
              <i className="fas fa-exclamation-triangle"></i>
              Unsaved Changes
            </span>
          )}
          
          {/* Manual refresh button */}
          <button 
            className="btn btn-outline-primary btn-sm me-2" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh data to see latest updates"
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'fa-spin' : ''}`}></i> 
            {isRefreshing ? ' Refreshing...' : ' Refresh'}
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
              style={{ maxWidth: "150px" }}
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.year}</option>
              ))}
            </select>
            
            {/* Department Dropdown - Only show for non-HOD users */}
            {!(userRole && userRole.toLowerCase().includes('hod')) && (
              <>
                <div className="vr mx-2"></div>
                <label className="form-label mb-0 text-nowrap">
                  <strong><i className="fas fa-building"></i> Select Deptartment:</strong>
                </label>
                <select
                  className="form-select"
                  style={{ maxWidth: "150px" }}
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </>
            )}
            
            <div className="vr mx-2"></div>
            <label className="form-label mb-0 text-nowrap">
              <strong><i className="fas fa-calendar-alt"></i> Submission Deadline:</strong>
            </label>
            <div className="fw-semibold text-primary">
              <div>{deadlineDisplay}</div>
              {overrideInfo && overrideInfo.has_override && overrideInfo.expires_at && (
                <div className="text-warning">
                  <i className="fas fa-unlock"></i> Override Active{timeRemaining && `: ${timeRemaining}`}
                </div>
              )}
              {overrideInfo && overrideInfo.expired && (
                <div className="text-danger">
                  <i className="fas fa-clock"></i> Override Expired
                </div>
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

                {/* New: Submit Events for Principal Approval */}
                {submissionStatus === 'approved' && userRole === 'hod' && Object.keys(programEvents).length > 0 && (
                  <button 
                    className="btn btn-success me-2 mb-2"
                    onClick={handleSubmitEventsForApproval}
                  >
                    <i className="fas fa-paper-plane"></i> Submit Events for Approval
                  </button>
                )}

                {/* New: Principal Approve Events */}
                {submissionStatus === 'events_submitted' && userRole === 'principal' && (
                  <button 
                    className="btn btn-success me-2 mb-2"
                    onClick={handlePrincipalEventApproval}
                  >
                    <i className="fas fa-check-circle"></i> Approve Events
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

            {submissionStatus === 'approved' && userRole === 'hod' && (
              <div className="alert alert-info mb-0">
                <i className="fas fa-calendar-plus"></i> Budget approved! Plan your events and submit them for Principal approval.
              </div>
            )}

            {/* New: Events Submitted Status */}
            {submissionStatus === 'events_submitted' && userRole === 'hod' && (
              <div className="alert alert-warning mb-0">
                <i className="fas fa-calendar-check"></i> Events submitted for Principal approval. Awaiting Principal approval of your event plans.
              </div>
            )}

            {submissionStatus === 'events_submitted' && userRole === 'principal' && (
              <div className="alert alert-info mb-0">
                <i className="fas fa-calendar-check"></i> Department has submitted their event plans for your approval.
              </div>
            )}

            {submissionStatus === 'events_planned' && userRole === 'principal' && (
              <div className="alert alert-success mb-0">
                <i className="fas fa-calendar-check"></i> Events have been approved! Department can now execute their planned events.
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
                onClick={() => handleTabSwitch('budget')}
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
                onClick={() => canPlanEvents && handleTabSwitch('events')}
                disabled={!canPlanEvents}
                title={!canPlanEvents ? "Events planning available after budget approval" : (canEditEvents ? "Plan individual events" : "View individual events (read-only)")}
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
                      <th className="text-center">Budget / Event (₹)</th>
                      <th className="text-center">Count</th>
                      <th className="text-center">Total Budget (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(grouped).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center">
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
                                    <td align="center">{item.budget_per_event ? `₹${item.budget_per_event.toLocaleString()}` : "-"}</td>
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
                                        `₹${budget.toLocaleString()}`
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
                                      <td className="ps-4 text-muted small" style={{ fontStyle: 'italic', backgroundColor: '#f0f8ff' }}>
                                        <i className="fas fa-calendar me-1">&nbsp;</i>
                                        {event.title || `Event ${event.eventNumber}`}
                                      </td>
                                      <td className="text-center" style={{ backgroundColor: '#e6ffe6' }} align="center">
                                        ₹{(item.budget_mode === 'Fixed' ? item.budget_per_event : event.budget_amount)?.toLocaleString() || 0}
                                      </td>
                                      <td className="text-center" align="center" style={{ backgroundColor: '#fff9e6' }}>1</td>
                                      <td className="text-center" align="center" style={{ backgroundColor: '#f0e6ff' }}>
                                        ₹{event.budget_amount?.toLocaleString() || 0}
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            <tr className="table-info fw-bold">
                              <td colSpan="3" className="text-end">
                                Subtotal for {category}
                              </td>
                              <td align="center">{subtotal.count}</td>
                              <td align="center">₹{subtotal.budget.toLocaleString()}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Grand Total Row */}
                    {Object.entries(grouped).length > 0 && (
                      <tr className="table-warning fw-bold">
                        <td colSpan="3" className="text-end">Grand Total</td>
                        <td align="center">{grandTotal.count}</td>
                        <td align="center">₹{grandTotal.budget.toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                <div style={{ height: "24px" }}></div>
                
                {/* Remarks Action Buttons */}
                <div className="d-flex justify-content-center gap-3 mb-3 d-print-none">
                  {userRole === "hod" && (
                    <button
                      type="button"
                      className="btn btn-info btn-sm"
                      onClick={handleOpenHodRemarksModal}
                      disabled={!isEditable}
                    >
                      <i className="fas fa-comment me-2"></i>
                      {hodRemarks ? 'Edit HoD Remarks' : 'Add HoD Remarks'}
                    </button>
                  )}
                  {userRole === "principal" && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={handleOpenPrincipalRemarksModal}
                      disabled={!isEditable}
                    >
                      <i className="fas fa-star me-2"></i>
                      {principalRemarks ? 'Edit Principal Remarks' : 'Add Principal Remarks'}
                    </button>
                  )}
                </div>
                
                <table className="table table-bordered mt-3">
                  <tbody>
                    {/* HoD Remarks Row */}
                    <tr>
                      <td colSpan="5" style={{ 
                        whiteSpace: "pre-wrap", 
                        fontWeight: "bold",
                        backgroundColor: hodRemarks ? "#f8f9fa" : "#e9ecef",
                        minHeight: "60px",
                        verticalAlign: "top",
                        padding: "12px"
                      }}>
                        HoD Remarks:<br />
                        <span style={{ fontWeight: "normal", color: hodRemarks ? "#000" : "#6c757d" }}>
                          {hodRemarks || "No remarks provided yet."}
                        </span>
                      </td>
                    </tr>

                    {/* Principal Remarks Row */}
                    <tr>
                      <td colSpan="5" style={{ 
                        whiteSpace: "pre-wrap", 
                        fontWeight: "bold",
                        backgroundColor: principalRemarks ? "#fff3cd" : "#e9ecef",
                        minHeight: "60px",
                        verticalAlign: "top",
                        padding: "12px"
                      }}>
                        Principal Remarks:<br />
                        <span style={{ fontWeight: "normal", color: principalRemarks ? "#000" : "#6c757d" }}>
                          {principalRemarks || "No remarks provided yet."}
                        </span>
                        <div style={{ height: "14px" }}></div>
                      </td>
                    </tr>
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
                            className="btn btn-outline-danger btn-sm"
                          onClick={async () => {
                            // Show confirmation dialog first
                            const confirmed = window.confirm(
                              '⚠️ WARNING: This will delete ALL saved events from the database and create fresh forms.\n\n' +
                              'This action cannot be undone. All your event planning progress will be permanently lost.\n\n' +
                              'Are you sure you want to continue?'
                            );
                            
                            if (!confirmed) return;
                            
                            try {
                              
                              
                              // Delete all events for this department and academic year from database
                              await API.delete(`/events?department_id=${selectedDepartmentId}&academic_year_id=${selectedAcademicYearId}`);
                              
                              
                              
                              // Clear local state
                              setProgramEvents({});
                              
                              // Add error handling
                            } catch (error) {
                              console.error('❌ Error clearing database events:', error);
                              alert('❌ Error clearing events from database. The regeneration will still proceed with local forms only.');
                            }
                            
                            setProgramEvents({});
                            
                            // Immediately regenerate events
                            setTimeout(() => {
                              
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
                              
                                alert(`✅ Events regenerated successfully!\n\n` +
                                      `• Database cleared: All previous events deleted\n` +
                                      `• Fresh forms created: ${programsWithCounts} program types\n` +
                                      `• Ready for new event planning`);
                            }, 100);
                          }}
                          title="⚠️ WARNING: This will clear all saved events from database and create fresh forms"
                        >
                          <i className="fas fa-trash-restore"></i> Clear & Regenerate Events
                        </button>
                        
                        {/* Debug button for checking status update */}
                        <button 
                          className="btn btn-outline-info btn-sm ms-2"
                          onClick={() => {
                            
                            
                            
                            
                            
                            // Show detailed incomplete events info
                            const programsWithApprovedCounts = mergedData.filter(program => (program.count || 0) > 0);
                            const incompleteDetails = [];
                            
                            programsWithApprovedCounts.forEach(program => {
                              const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
                              const programEventData = programEvents[programKey];
                              
                              if (programEventData) {
                                programEventData.events.forEach((event, index) => {
                                  const hasTitle = event.title && event.title.trim() !== '';
                                  const hasDate = event.event_date && event.event_date !== '';
                                  const hasBudget = event.budget_amount && parseFloat(event.budget_amount) > 0;
                                  
                                  if (!hasTitle || !hasDate || !hasBudget) {
                                    const missing = [];
                                    if (!hasTitle) missing.push('Title');
                                    if (!hasDate) missing.push('Date');
                                    if (!hasBudget) missing.push('Budget');
                                    
                                    incompleteDetails.push({
                                      program: `${program.program_type}${program.sub_program_type ? ' - ' + program.sub_program_type : ''}`,
                                      event: `Event ${index + 1}`,
                                      missing: missing.join(', ')
                                    });
                                  }
                                });
                              }
                            });
                            
                            if (incompleteDetails.length > 0) {
                              
                              incompleteDetails.forEach(detail => {
                                
                              });
                              alert('❌ Incomplete Events Found:\n\n' + 
                                    incompleteDetails.map(d => `• ${d.program} > ${d.event}: Missing ${d.missing}`).join('\n') +
                                    '\n\nComplete all required fields (Title, Date, Budget) to auto-update status to "Events Planned".');
                            } else {
                              
                            }
                            
                            // Check completion but don't auto-update
                            const allComplete = checkEventCompletionProgress();
                            if (allComplete) {
                              alert('✅ All Events Complete!\n\nAll required fields (Title, Date, Budget) are filled.\nYou can now submit events for Principal approval.');
                            }
                          }}
                          title="Debug: Check if status should update to 'Events Planned'"
                        >
                          <i className="fas fa-bug"></i> Debug Status Check
                        </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Automatic Completion Status Indicator */}
                  {submissionStatus === 'approved' && userRole === 'hod' && Object.keys(programEvents).length > 0 && (() => {
                    const progress = getEventCompletionProgress();
                    const isComplete = progress.percentage === 100;
                    
                    return (
                      <div className={`alert ${isComplete ? 'alert-success' : 'alert-info'} border-left-success`} 
                           style={{ borderLeft: `4px solid ${isComplete ? '#28a745' : '#17a2b8'}` }}>
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            <i className={`fas ${isComplete ? 'fa-check-circle' : 'fa-magic'} fa-lg ${isComplete ? 'text-success' : 'text-info'}`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className={`mb-2 ${isComplete ? 'text-success' : 'text-info'}`}>
                              <i className="fas fa-hand-paper"></i> {isComplete ? 'Ready for Manual Submission!' : 'Event Planning Progress'}
                            </h6>
                            <p className="mb-2 small">
                              {isComplete 
                                ? 'All event details are complete! Click "Submit Events for Approval" to send your events to the Principal for approval.'
                                : 'Fill in all required event details (title, date, and budget) to enable submission for Principal approval.'
                              }
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="d-flex align-items-center gap-2">
                              <div className="flex-grow-1">
                                <div className="progress" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${isComplete ? 'bg-success' : 'bg-info'}`}
                                    style={{ width: `${progress.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                              <small className={`fw-bold ${isComplete ? 'text-success' : 'text-info'}`}>
                                {progress.completed}/{progress.total} events ({progress.percentage}%)
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Program Event Tables */}
                  {Object.entries(programEvents).map(([programKey, program]) => (
                    <div key={programKey} className="card mb-4">
                      <div className="card-header bg-primary text-white">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">
                              <i className="fas fa-calendar-check"></i> {program.programInfo.program_type}
                            </h6>
                            <small>
                              Approved: {program.totalCount} events | Budget: ₹{program.totalBudget.toLocaleString()}
                              {program.programInfo.budget_mode === 'Fixed' && 
                                ` (₹${program.programInfo.budget_per_event} per event)`
                              }
                            </small>
                          </div>
                          <div>
                            {(() => {
                              // Check if ALL events in this program have BOTH documents approved
                              const allEventsHaveApprovedDocuments = program.events.every(event => {
                                if (!Array.isArray(eventDocuments)) return false;
                                
                                const eventDocs = eventDocuments.filter(doc => 
                                  doc.event_id && doc.event_id === event.id
                                );
                                
                                const reportDoc = eventDocs.find(doc => doc.document_type === 'complete_report');
                                const zipDoc = eventDocs.find(doc => doc.document_type === 'supporting_documents');
                                
                                return reportDoc && reportDoc.status === 'approved' && 
                                       zipDoc && zipDoc.status === 'approved';
                              });

                              if (allEventsHaveApprovedDocuments && program.events.length > 0) {
                                return (
                                  <div className="d-flex gap-2 align-items-center">
                                    <span className="badge bg-success">
                                      <i className="fas fa-trophy"></i> Events Completed
                                    </span>
                                    {userRole === 'admin' && (
                                      <button
                                        className="btn btn-outline-light btn-sm"
                                        onClick={() => handleAdminAddEvent(programKey)}
                                        title="Add New Event (Admin)"
                                      >
                                        <i className="fas fa-plus"></i> Add Event
                                      </button>
                                    )}
                                  </div>
                                );
                              } else if (canEditEvents) {
                                return (
                                  <div className="d-flex gap-2 align-items-center">
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
                                    {userRole === 'admin' && (
                                      <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleAdminAddEvent(programKey)}
                                        title="Add New Event (Admin)"
                                      >
                                        <i className="fas fa-plus"></i> Add Event
                                      </button>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="badge bg-info">
                                    <i className="fas fa-eye"></i> View Only
                                  </span>
                                );
                              }
                            })()}
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
                                <th style={{ width: '200px' }}>Documents</th>
                                {userRole === 'admin' && <th style={{ width: '80px' }}>Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {program.events.map((event, eventIndex) => {
                                // Check if this event is complete for visual indicator
                                const isEventComplete = event.title && event.title.trim() !== '' &&
                                                       event.event_date && event.event_date !== '' &&
                                                       event.budget_amount && parseFloat(event.budget_amount) > 0;
                                
                                return (
                                <tr key={event.id} className={
                                  isEventComplete ? 'table-success' : 
                                  event.status === 'completed' ? 'table-success' : 
                                  (event.title || event.event_date || event.budget_amount) ? 'table-warning' : ''
                                }>
                                  <td className="text-center fw-bold">
                                    <div className="d-flex align-items-center justify-content-center">
                                      {event.eventNumber}
                                      {isEventComplete ? (
                                        <span className="badge bg-success ms-1" title="Event Complete">
                                          <i className="fas fa-check"></i>
                                        </span>
                                      ) : (
                                        <span className="badge bg-warning ms-1" title="Event Incomplete">
                                          <i className="fas fa-exclamation"></i>
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  
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
                                  <td align="center">
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
                                  
                                  {/* Documents */}
                                  <td>
                                    <div className="d-flex gap-1 flex-wrap">
                                      {(() => {
                                        // Ensure eventDocuments is always an array
                                        if (!Array.isArray(eventDocuments)) {
                                          return (
                                            <>
                                              <div className="text-muted small">Report: <span className="text-danger">Not uploaded</span></div>
                                              <div className="text-muted small">ZIP: <span className="text-danger">Not uploaded</span></div>
                                            </>
                                          );
                                        }

                                        // Find documents for this event
                                        const eventDocs = eventDocuments.filter(doc => 
                                          doc.event_id && doc.event_id === event.id
                                        );
                                        
                                        const reportDoc = eventDocs.find(doc => doc.document_type === 'complete_report');
                                        const zipDoc = eventDocs.find(doc => doc.document_type === 'supporting_documents');
                                        
                                        const handleDocumentDownload = async (documentId, filename) => {
                                          try {
                                            const response = await API.get(`/documents/download/${documentId}`, {
                                              responseType: 'blob'
                                            });
                                            
                                            const url = window.URL.createObjectURL(new Blob([response.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', filename);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                            window.URL.revokeObjectURL(url);
                                          } catch (error) {
                                            console.error('Error downloading document:', error);
                                            alert('Failed to download document');
                                          }
                                        };
                                        
                                        const renderDocumentStatus = (doc, type) => {
                                          if (!doc) {
                                            return <span className="text-danger">Not uploaded</span>;
                                          }
                                          
                                          switch (doc.status) {
                                            case 'approved':
                                              return (
                                                <div className="d-flex align-items-center gap-2">
                                                  <span className="text-success">Approved</span>
                                                  <button
                                                    onClick={() => handleDocumentDownload(doc.id, doc.original_filename || doc.filename)}
                                                    className="btn btn-sm btn-outline-primary"
                                                    title={`Download ${doc.original_filename || doc.filename}`}
                                                  >
                                                    <i className="fas fa-download"></i> DL
                                                  </button>
                                                  {userRole === 'admin' && (
                                                    <button
                                                      onClick={() => handleAdminDeleteDocument(doc.id)}
                                                      className="btn btn-sm btn-outline-danger"
                                                      title={`Delete ${doc.original_filename || doc.filename}`}
                                                    >
                                                      <i className="fas fa-trash"></i>
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            case 'pending':
                                              return <span className="text-info">Pending Review</span>;
                                            case 'rejected':
                                              return <span className="text-danger">Rejected</span>;
                                            default:
                                              return <span className="text-muted">Unknown Status</span>;
                                          }
                                        };
                                        
                                        return (
                                          <>
                                            <div className="text-muted small d-flex justify-content-between align-items-center mb-1">
                                              <span>Report:&nbsp;</span>
                                              {renderDocumentStatus(reportDoc, 'report')}
                                            </div>
                                            <div className="text-muted small d-flex justify-content-between align-items-center">
                                              <span>ZIP:&nbsp;</span>
                                              {renderDocumentStatus(zipDoc, 'zip')}
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  
                                  {/* Admin Actions Column */}
                                  {userRole === 'admin' && (
                                    <td className="text-center">
                                      <button
                                        onClick={() => handleAdminEditEvent(programKey, eventIndex, event)}
                                        className="btn btn-sm btn-outline-primary"
                                        title="Edit Event (Admin)"
                                      >
                                        <i className="fas fa-edit"></i>
                                      </button>
                                    </td>
                                  )}
                                </tr>
                                );
                              })}
                              
                              {/* Budget Summary Row */}
                              <tr className="table-warning">
                                <td colSpan="3" className="text-end fw-bold">Total Budget Allocation:</td>
                                <td className="fw-bold text-primary">
                                  ₹{program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0).toLocaleString()}
                                </td>
                                <td colSpan={userRole === 'admin' ? "4" : "3"} className="text-muted small">
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

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <>
          <div className="modal show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i>
                    Unsaved Changes Detected
                  </h5>
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    <strong>You have unsaved changes that will be lost!</strong>
                  </p>
                  <p className="mb-3">
                    {pendingNavigation === 'refresh' ? (
                      <>Refreshing the data will overwrite any unsaved event planning information you've entered.</>
                    ) : (
                      <>Switching tabs will lose any unsaved event planning information you've entered.</>
                    )}
                  </p>
                  <div className="alert alert-info d-flex align-items-center gap-2">
                    <i className="fas fa-info-circle"></i>
                    <span>
                      <strong>Tip:</strong> Save your events first using the "Save Events" button, then try again.
                    </span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={cancelNavigationKeepChanges}
                  >
                    <i className="fas fa-arrow-left"></i> Keep Changes
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-warning"
                    onClick={confirmNavigationAndLoseChanges}
                  >
                    <i className="fas fa-trash-alt"></i> Discard Changes & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit me-2"></i>
                    Edit Event
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Event Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editEventData.title}
                        onChange={(e) => setEditEventData({...editEventData, title: e.target.value})}
                        placeholder="Enter event title"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Event Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editEventData.event_date}
                        onChange={(e) => setEditEventData({...editEventData, event_date: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Budget Amount *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editEventData.budget_amount}
                        onChange={(e) => setEditEventData({...editEventData, budget_amount: e.target.value})}
                        placeholder="Enter budget amount"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Coordinator Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editEventData.coordinator_name}
                        onChange={(e) => setEditEventData({...editEventData, coordinator_name: e.target.value})}
                        placeholder="Enter coordinator name (optional)"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Coordinator Contact</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editEventData.coordinator_contact}
                        onChange={(e) => setEditEventData({...editEventData, coordinator_contact: e.target.value})}
                        placeholder="Enter coordinator contact - phone/email (optional)"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleSaveEditedEvent}
                    disabled={!editEventData.title || !editEventData.event_date || !editEventData.budget_amount}
                  >
                    <i className="fas fa-save me-2"></i>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <>
          <div 
            className="modal-backdrop fade show"
            onClick={() => setShowExportModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
          ></div>
          <div 
            className="modal fade show" 
            tabIndex="-1" 
            role="dialog"
            style={{ 
              display: 'block',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1050,
              overflow: 'auto'
            }}
          >
            <div 
              className="modal-dialog" 
              role="document"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                margin: 0,
                maxWidth: '500px',
                width: '90%'
              }}
            >
              <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fas ${exportType === 'pdf' ? 'fa-file-pdf' : 'fa-file-excel'} me-2`}></i>
                  Export Options - {exportType.toUpperCase()}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowExportModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">Choose which remarks to include in the export:</p>
                
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeHodRemarks"
                    checked={includeHodRemarks}
                    onChange={(e) => setIncludeHodRemarks(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includeHodRemarks">
                    <i className="fas fa-comment text-info me-2"></i>
                    Include HoD Remarks
                    {hodRemarks && (
                      <small className="d-block text-muted">
                        Preview: {hodRemarks.substring(0, 100)}
                        {hodRemarks.length > 100 && '...'}
                      </small>
                    )}
                  </label>
                </div>
                
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includePrincipalRemarks"
                    checked={includePrincipalRemarks}
                    onChange={(e) => setIncludePrincipalRemarks(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includePrincipalRemarks">
                    <i className="fas fa-comment text-warning me-2"></i>
                    Include Principal Remarks
                    {principalRemarks && (
                      <small className="d-block text-muted">
                        Preview: {principalRemarks.substring(0, 100)}
                        {principalRemarks.length > 100 && '...'}
                      </small>
                    )}
                  </label>
                </div>

                {!includeHodRemarks && !includePrincipalRemarks && (
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    No remarks will be included in the export.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${exportType === 'pdf' ? 'btn-danger' : 'btn-success'}`}
                  onClick={handleExportConfirm}
                >
                  <i className={`fas ${exportType === 'pdf' ? 'fa-file-pdf' : 'fa-file-excel'} me-2`}></i>
                  Export {exportType.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* HoD Remarks Modal */}
      {showHodRemarksModal && (
        <>
          <div 
            className="modal-backdrop fade show"
            onClick={() => handleCancelRemarksModal('hod')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
          ></div>
          <div 
            className="modal fade show" 
            tabIndex="-1" 
            role="dialog"
            style={{ 
              display: 'block',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1050,
              overflow: 'auto'
            }}
          >
            <div 
              className="modal-dialog" 
              role="document"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                margin: 0,
                maxWidth: '600px',
                width: '90%'
              }}
            >
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-comment me-2"></i>
                    {hodRemarks ? 'Edit HoD Remarks' : 'Add HoD Remarks'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => handleCancelRemarksModal('hod')}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="hodRemarksTextarea" className="form-label">
                      <strong>Enter your remarks:</strong>
                    </label>
                    <textarea
                      id="hodRemarksTextarea"
                      rows={6}
                      className="form-control"
                      value={tempHodRemarks}
                      onChange={(e) => setTempHodRemarks(e.target.value)}
                      placeholder="Enter your remarks here..."
                      style={{ whiteSpace: "pre-wrap" }}
                    />
                    <small className="form-text text-muted">
                      These remarks will be included in the official budget proposal document.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleCancelRemarksModal('hod')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={handleSaveHodRemarks}
                  >
                    <i className="fas fa-save me-2"></i>
                    Save Remarks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Principal Remarks Modal */}
      {showPrincipalRemarksModal && (
        <>
          <div 
            className="modal-backdrop fade show"
            onClick={() => handleCancelRemarksModal('principal')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1040
            }}
          ></div>
          <div 
            className="modal fade show" 
            tabIndex="-1" 
            role="dialog"
            style={{ 
              display: 'block',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1050,
              overflow: 'auto'
            }}
          >
            <div 
              className="modal-dialog" 
              role="document"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                margin: 0,
                maxWidth: '600px',
                width: '90%'
              }}
            >
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title">
                    <i className="fas fa-star me-2"></i>
                    {principalRemarks ? 'Edit Principal Remarks' : 'Add Principal Remarks'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => handleCancelRemarksModal('principal')}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="principalRemarksTextarea" className="form-label">
                      <strong>Enter your remarks:</strong>
                    </label>
                    <textarea
                      id="principalRemarksTextarea"
                      rows={6}
                      className="form-control"
                      value={tempPrincipalRemarks}
                      onChange={(e) => setTempPrincipalRemarks(e.target.value)}
                      placeholder="Enter your remarks here..."
                      style={{ whiteSpace: "pre-wrap" }}
                    />
                    <small className="form-text text-muted">
                      These remarks will be included in the official budget proposal document.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleCancelRemarksModal('principal')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={handleSavePrincipalRemarks}
                  >
                    <i className="fas fa-save me-2"></i>
                    Save Remarks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default ProgramEntryForm;
