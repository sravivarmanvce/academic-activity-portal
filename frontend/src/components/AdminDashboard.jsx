// Enhanced Administrative Dashboard Component
import React, { useState, useEffect } from 'react';
import API from '../Api';
import './AdminDashboard.css';

const AdminDashboard = ({ userRole }) => {
  const [dashboardData, setDashboardData] = useState({
    departmentStats: [],
    budgetAllocation: [],
    submissionTimeline: [],
    overallStats: {
      totalDepartments: 0,
      submittedBudgets: 0,
      approvedBudgets: 0,
      totalBudgetAllocated: 0,
      pendingApprovals: 0
    }
  });
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load academic years
  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const response = await API.get('/api/academic-years');
        setAcademicYears(response.data);
        if (response.data.length > 0) {
          setSelectedAcademicYear(response.data[0].id);
        }
      } catch (error) {
        console.error('Error loading academic years:', error);
      }
    };
    loadAcademicYears();
  }, []);

  // Load dashboard data
  useEffect(() => {
    if (!selectedAcademicYear) return;
    
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Load multiple data sources in parallel
        const [
          departmentsResponse,
          statusSummaryResponse,
          programCountsResponse
        ] = await Promise.all([
          API.get('/departments'),
          API.get(`/program-counts/status-summary?academic_year_id=${selectedAcademicYear}`),
          API.get(`/program-counts?academic_year_id=${selectedAcademicYear}`)
        ]);

        const departments = departmentsResponse.data;
        const statusSummary = statusSummaryResponse.data;
        const programCounts = programCountsResponse.data;

        // Process department statistics
        const departmentStats = departments.map(dept => {
          const deptStatus = statusSummary[dept.id] || {};
          const deptBudgets = programCounts.filter(pc => pc.department_id === dept.id);
          const totalBudget = deptBudgets.reduce((sum, pc) => sum + (pc.total_budget || 0), 0);
          
          return {
            id: dept.id,
            name: dept.name,
            fullName: dept.full_name,
            status: deptStatus.stage || 'not_started',
            totalBudget: totalBudget,
            programCount: deptBudgets.length,
            lastUpdated: deptStatus.last_updated || null,
            isOverdue: deptStatus.stage === 'deadline_missed'
          };
        });

        // Calculate overall statistics
        const overallStats = {
          totalDepartments: departments.length,
          submittedBudgets: departmentStats.filter(d => ['submitted', 'approved', 'events_planned'].includes(d.status)).length,
          approvedBudgets: departmentStats.filter(d => ['approved', 'events_planned'].includes(d.status)).length,
          totalBudgetAllocated: departmentStats.reduce((sum, d) => sum + d.totalBudget, 0),
          pendingApprovals: departmentStats.filter(d => d.status === 'submitted').length
        };

        // Process budget allocation for pie chart
        const budgetAllocation = departmentStats
          .filter(d => d.totalBudget > 0)
          .map(d => ({
            name: d.name,
            value: d.totalBudget,
            percentage: ((d.totalBudget / overallStats.totalBudgetAllocated) * 100).toFixed(1)
          }));

        setDashboardData({
          departmentStats,
          budgetAllocation,
          overallStats
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedAcademicYear]);

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'not_started': '#6c757d',
      'drafting': '#ffc107',
      'submitted': '#17a2b8',
      'approved': '#28a745',
      'events_planned': '#007bff',
      'deadline_missed': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      'not_started': 'Not Started',
      'drafting': 'In Progress',
      'submitted': 'Submitted',
      'approved': 'Approved',
      'events_planned': 'Events Planned',
      'deadline_missed': 'Overdue'
    };
    return labels[status] || status;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    return dashboardData.overallStats.totalDepartments > 0 
      ? Math.round((dashboardData.overallStats.approvedBudgets / dashboardData.overallStats.totalDepartments) * 100)
      : 0;
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading dashboard...</span>
          </div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Administrative Dashboard</h1>
          <div className="header-controls">
            <select 
              className="form-select"
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
            >
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>{year.year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>{dashboardData.overallStats.totalDepartments}</h3>
            <p>Total Departments</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <h3>{dashboardData.overallStats.submittedBudgets}</h3>
            <p>Budgets Submitted</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{dashboardData.overallStats.approvedBudgets}</h3>
            <p>Budgets Approved</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{dashboardData.overallStats.pendingApprovals}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{formatCurrency(dashboardData.overallStats.totalBudgetAllocated)}</h3>
            <p>Total Budget</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{getProgressPercentage()}%</h3>
            <p>Completion Rate</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <h4>Overall Progress</h4>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <span className="progress-text">{getProgressPercentage()}% Complete</span>
        </div>
      </div>

      {/* Department Status Table */}
      <div className="departments-section">
        <div className="section-header">
          <h4>📋 Department Status Overview</h4>
        </div>
        
        <div className="departments-table-container">
          <table className="departments-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Status</th>
                <th>Budget Amount</th>
                <th>Programs</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.departmentStats.map(dept => (
                <tr key={dept.id} className={dept.isOverdue ? 'overdue-row' : ''}>
                  <td>
                    <div className="dept-info">
                      <strong>{dept.name}</strong>
                      <small>{dept.fullName}</small>
                    </div>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ 
                        backgroundColor: getStatusColor(dept.status),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    >
                      {getStatusLabel(dept.status)}
                    </span>
                  </td>
                  <td className="budget-amount">
                    {formatCurrency(dept.totalBudget)}
                  </td>
                  <td>{dept.programCount}</td>
                  <td>
                    {dept.lastUpdated 
                      ? new Date(dept.lastUpdated).toLocaleDateString()
                      : 'Not updated'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      {userRole === 'principal' && dept.status === 'submitted' && (
                        <button className="btn btn-sm btn-primary">
                          Review
                        </button>
                      )}
                      {dept.status === 'not_started' && (
                        <button className="btn btn-sm btn-warning">
                          Send Reminder
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Allocation Chart */}
      {dashboardData.budgetAllocation.length > 0 && (
        <div className="budget-chart-section">
          <h4>💰 Budget Allocation by Department</h4>
          <div className="budget-chart">
            {dashboardData.budgetAllocation.map((item, index) => (
              <div key={index} className="budget-item">
                <div className="budget-bar">
                  <div 
                    className="budget-fill"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: `hsl(${(index * 50) % 360}, 70%, 50%)`
                    }}
                  ></div>
                </div>
                <div className="budget-label">
                  <strong>{item.name}</strong>
                  <span>{formatCurrency(item.value)} ({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
