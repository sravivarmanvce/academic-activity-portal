// Enhanced Analytics Dashboard with Charts and Visual Progress Tracking
import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
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

  // Color palette for charts
  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#ffecd2', '#fcb69f'];

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load all analytics data in parallel
      const [overview, budget, timeline, monthly] = await Promise.all([
        analyticsService.getDashboardOverview(),
        analyticsService.getBudgetByDepartment(),
        analyticsService.getEventsTimeline(),
        analyticsService.getMonthlyBudgetUtilization()
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
        const performance = await analyticsService.getDepartmentPerformance();
        setPerformanceData(performance);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [userRole]);

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
      day: 'numeric'
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
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">📊 Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            {userRole === 'principal' ? 'Institution-wide' : 'Department'} insights and performance metrics
            {lastUpdated && ` • Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <button 
          onClick={loadAnalyticsData} 
          className="refresh-button"
          disabled={loading}
        >
          🔄 Refresh Data
        </button>
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
        {budgetData.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">💰 Budget Distribution</h3>
              <p className="chart-subtitle">Budget allocation across departments</p>
            </div>
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
        )}

        {/* Monthly Budget Utilization */}
        {monthlyData && monthlyData.monthly_data && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">📈 Monthly Budget Utilization</h3>
              <p className="chart-subtitle">Budget usage trends over time</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData.monthly_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                <XAxis dataKey="month" stroke="#7f8c8d" />
                <YAxis stroke="#7f8c8d" tickFormatter={(value) => `₹${value/1000}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="utilized" 
                  stroke="#667eea" 
                  strokeWidth={3}
                  dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Department Performance (Principal only) */}
        {userRole === 'principal' && performanceData.length > 0 && (
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <div className="chart-header">
              <h3 className="chart-title">🏆 Department Performance</h3>
              <p className="chart-subtitle">Efficiency and completion metrics by department</p>
            </div>
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
        )}

        {/* Events Timeline */}
        {timelineData.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">📅 Upcoming Events</h3>
              <p className="chart-subtitle">Next 3 months event schedule</p>
            </div>
            <div className="timeline-container">
              {timelineData.slice(0, 8).map((event, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-date">{formatDate(event.date)}</div>
                  <div className="timeline-content">
                    <h4 className="timeline-title">{event.title}</h4>
                    <div className="timeline-meta">
                      <span className={`timeline-status status-${event.status}`}>
                        {event.status}
                      </span>
                      <span>{formatCurrency(event.budget)}</span>
                      <span>{event.department}</span>
                    </div>
                  </div>
                </div>
              ))}
              {timelineData.length > 8 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#7f8c8d' }}>
                  ...and {timelineData.length - 8} more events
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
