// Analytics Dashboard with Advanced Features
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { 
  Calendar, RefreshCw,
  PieChart as PieChartIcon
} from 'lucide-react';
import analyticsService from '../services/analyticsService';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ userRole }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [budgetData, setBudgetData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Academic year filtering
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [yearsLoading, setYearsLoading] = useState(true);

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userDepartmentId = user?.department_id;
  const departmentName = user?.department_name || user?.department || '';

  // Enhanced Color palette for charts
  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#ffecd2', '#fcb69f'];

  // Generate comprehensive trend analysis data from real API data
  const generateTrendData = useMemo(() => {
    if (!monthlyData?.monthly_data) {
      // If no monthly data, create a basic structure from timeline data
      if (!timelineData.length) return [];
      
      // Get all unique months from timeline data and create basic trend
      const monthsMap = new Map();
      timelineData.forEach(event => {
        const eventDate = new Date(event.date);
        const monthKey = eventDate.toLocaleString('default', { month: 'short' });
        
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, { month: monthKey, events: 0, completed: 0, budget: 0 });
        }
        
        monthsMap.get(monthKey).events++;
        if (event.status === 'Completed' || event.status === 'completed') {
          monthsMap.get(monthKey).completed++;
        }
        monthsMap.get(monthKey).budget += (event.budget || 0);
      });
      
      return Array.from(monthsMap.values()).map(item => ({
        month: item.month,
        budget: item.budget,
        events: item.events,
        completion: item.events > 0 ? Math.round((item.completed / item.events) * 100) : 0
      }));
    }
    
    // Create comprehensive trend analysis combining monthly budget data with event counts
    const trendData = monthlyData.monthly_data.map(monthItem => {
      // Count events in this month
      const monthEventsCount = timelineData.filter(event => {
        const eventDate = new Date(event.date);
        const eventMonth = eventDate.toLocaleString('default', { month: 'short' });
        return eventMonth === monthItem.month;
      }).length;

      // Calculate completion rate based on completed vs total events
      const monthEvents = timelineData.filter(event => {
        const eventDate = new Date(event.date);
        const eventMonth = eventDate.toLocaleString('default', { month: 'short' });
        return eventMonth === monthItem.month;
      });

      const completedEvents = monthEvents.filter(event => 
        event.status === 'Completed' || event.status === 'completed'
      ).length;

      const completionRate = monthEvents.length > 0 ? 
        Math.round((completedEvents / monthEvents.length) * 100) : 0;

      return {
        month: monthItem.month,
        budget: monthItem.utilized || 0,
        events: monthEventsCount,
        completion: completionRate
      };
    });

    return trendData;
  }, [monthlyData, timelineData]);

  // Generate radar chart data
  const generateRadarData = useMemo(() => {
    if (!performanceData.length) return [];
    
    return performanceData.map(dept => ({
      department: dept.department,
      Budget: dept.utilization_percentage || 0,
      Events: dept.completion_rate || 0,
      Efficiency: dept.efficiency_score || 0,
      Quality: Math.random() * 100, // Mock data
      Innovation: Math.random() * 100 // Mock data
    }));
  }, [performanceData]);

  // Timeline data (no filtering)
  // (Note: timelineData is used directly instead of filteredTimelineData)

  // Load academic years for dropdown
  const loadAcademicYears = useCallback(async () => {
    setYearsLoading(true);
    try {
      const years = await analyticsService.getEnabledAcademicYears();
      setAcademicYears(years);
      
      // Set the most recent year as default if none selected
      if (years.length > 0 && !selectedAcademicYear) {
        const currentYear = years.find(y => y.is_current) || years[years.length - 1];
        setSelectedAcademicYear(currentYear.id.toString());
      }
    } catch (error) {
      console.error('❌ Failed to load academic years:', error);
    } finally {
      setYearsLoading(false);
    }
  }, [selectedAcademicYear]);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert selectedAcademicYear to number for API calls
      const academicYearId = selectedAcademicYear ? parseInt(selectedAcademicYear) : null;
      
      // Load all analytics data in parallel with academic year filter
      // Backend automatically filters by department for HOD users
      const [overview, budget, timeline, monthly] = await Promise.all([
        analyticsService.getDashboardOverview(academicYearId),
        analyticsService.getBudgetByDepartment(academicYearId),
        analyticsService.getEventsTimeline(academicYearId),
        analyticsService.getMonthlyBudgetUtilization(academicYearId)
      ]);

      setDashboardData(overview);
      setBudgetData(budget.map((item, index) => ({
        ...item,
        percentage: budget.length > 0 ? (item.value / budget.reduce((sum, d) => sum + d.value, 0) * 100) : 0
      })));
      setTimelineData(timeline);
      setMonthlyData(monthly);

      // Load performance data for Principal
      if (userRole === 'principal') {
        const performance = await analyticsService.getDepartmentPerformance(academicYearId);
        setPerformanceData(performance);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, userRole]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    if (selectedAcademicYear && !yearsLoading) {
      loadAnalyticsData();
    }
  }, [userRole, userDepartmentId, selectedAcademicYear, yearsLoading, loadAnalyticsData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {`${entry.name}: ${typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">
          <div>📊 Loading analytics data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-error">
          <h3>⚠️ Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadAnalyticsData} className="refresh-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Enhanced Header with Advanced Controls */}
      <div className="analytics-header">
        <div className="header-main">
          <div className="header-title-section">
            <h1 className="analytics-title">📊 Analytics Dashboard</h1>
            <p className="analytics-subtitle">
              {userRole === 'principal' 
                ? 'Institution-wide' 
                : userRole === 'hod' 
                  ? `${departmentName} Department`
                  : 'Department'
              } insights and performance metrics
              {lastUpdated && ` • Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        <div className="analytics-controls">
          {/* Academic Year Dropdown */}
          <div className="academic-year-filter">
            <label htmlFor="academic-year-select">📅 Academic Year:</label>
            <select
              id="academic-year-select"
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              disabled={yearsLoading || loading}
              className="academic-year-dropdown"
            >
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>
                  {year.year}
                  {year.is_current ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={loadAnalyticsData} 
            className="refresh-button"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {dashboardData && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">💰</div>
              <h3 className="stat-title">Total Budget</h3>
            </div>
            <p className="stat-value">{formatCurrency(dashboardData.budget_overview.total_budget)}</p>
            <p className="stat-subtitle">
              {dashboardData.budget_overview.total_programs} programs • 
              Avg: {formatCurrency(dashboardData.budget_overview.avg_budget_per_program)}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">🎯</div>
              <h3 className="stat-title">Events Status</h3>
            </div>
            <p className="stat-value">{dashboardData.events_overview.total_events}</p>
            <p className="stat-subtitle">
              ✅ {dashboardData.events_overview.completed_events} completed • 
              🔄 {dashboardData.events_overview.ongoing_events} ongoing •
              📋 {dashboardData.events_overview.planned_events} planned
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📈</div>
              <h3 className="stat-title">Completion Rate</h3>
            </div>
            <div style={{ width: 80, height: 80, margin: '10px auto' }}>
              <CircularProgressbar
                value={dashboardData.events_overview.completion_rate}
                text={`${Math.round(dashboardData.events_overview.completion_rate)}%`}
                styles={buildStyles({
                  textColor: '#2c3e50',
                  pathColor: '#667eea',
                  trailColor: '#f8f9fa'
                })}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📋</div>
              <h3 className="stat-title">Workflow Status</h3>
            </div>
            <div className="progress-list">
              <div className="progress-item">
                <span className="progress-label">Approved</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(dashboardData.workflow_status.approved / 
                        (dashboardData.workflow_status.approved + dashboardData.workflow_status.submitted + 
                         dashboardData.workflow_status.draft + dashboardData.workflow_status.completed) * 100) || 0}%` 
                    }}
                  ></div>
                </div>
                <span className="progress-value">{dashboardData.workflow_status.approved}</span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Submitted</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(dashboardData.workflow_status.submitted / 
                        (dashboardData.workflow_status.approved + dashboardData.workflow_status.submitted + 
                         dashboardData.workflow_status.draft + dashboardData.workflow_status.completed) * 100) || 0}%` 
                    }}
                  ></div>
                </div>
                <span className="progress-value">{dashboardData.workflow_status.submitted}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Budget Distribution Pie Chart */}
        {budgetData.length > 0 ? (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">💰 Budget Distribution</h3>
              <p className="chart-subtitle">Budget allocation across departments</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  >
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">💰 Budget Distribution</h3>
              <p className="chart-subtitle">No budget data available</p>
            </div>
            <div className="no-data-message">
              <PieChartIcon size={48} color="#ccc" />
              <p>No budget data found for {userRole === 'hod' ? `${departmentName} department` : 'your department'}</p>
              <p>Budget data will appear here once program counts and budgets are submitted.</p>
            </div>
          </div>
        )}

        {/* Department Radar Chart */}
        {userRole === 'principal' && generateRadarData.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">🎯 Department Radar</h3>
              <p className="chart-subtitle">Multi-dimensional performance view</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={generateRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="department" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Budget" dataKey="Budget" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Radar name="Events" dataKey="Events" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Trend Analysis - Full Width */}
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <h3 className="chart-title">📊 Comprehensive Trend Analysis</h3>
            <p className="chart-subtitle">12-month budget utilization, events count, and completion rate trends</p>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={generateTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                <XAxis dataKey="month" stroke="#7f8c8d" />
                <YAxis stroke="#7f8c8d" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="budget" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                  name="Budget (₹)"
                />
                <Area 
                  type="monotone" 
                  dataKey="events" 
                  stackId="2" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                  name="Events Count"
                />
                <Area 
                  type="monotone" 
                  dataKey="completion" 
                  stackId="3" 
                  stroke="#ffc658" 
                  fill="#ffc658" 
                  fillOpacity={0.4}
                  name="Completion Rate (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance (Principal only) */}
        {userRole === 'principal' && performanceData.length > 0 && (
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <div className="chart-header">
              <h3 className="chart-title">🏆 Department Performance</h3>
              <p className="chart-subtitle">Efficiency and completion metrics by department</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                  <XAxis dataKey="department" stroke="#7f8c8d" />
                  <YAxis stroke="#7f8c8d" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="completion_rate" name="Completion Rate (%)" fill="#667eea" />
                  <Bar dataKey="utilization_percentage" name="Budget Utilization (%)" fill="#764ba2" />
                  <Bar dataKey="efficiency_score" name="Overall Efficiency (%)" fill="#f093fb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Events Timeline */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">📅 Upcoming Events</h3>
            <p className="chart-subtitle">Next 3 months event schedule</p>
          </div>
          {timelineData.length > 0 ? (
            <div className="timeline-container">
              {timelineData.slice(0, 8).map((event, index) => (
                <div 
                  key={index} 
                  className="timeline-item"
                >
                  <div className="timeline-single-line">
                    <span className="timeline-date">{formatDate(event.date)}</span>
                    <span className="timeline-department">{event.department}</span>
                    <span className="timeline-title">{event.title}</span>
                    <span className="timeline-budget">{formatCurrency(event.budget)}</span>
                    <span className={`timeline-status status-${event.status}`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
              {timelineData.length > 8 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#7f8c8d' }}>
                  ...and {timelineData.length - 8} more events
                </div>
              )}
            </div>
          ) : (
            <div className="no-data-message">
              <Calendar size={48} color="#ccc" />
              <p>No upcoming events found</p>
              <p>Events will appear here once they are planned and scheduled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
