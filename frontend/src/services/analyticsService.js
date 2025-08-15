// Frontend analytics service for API calls
import API from '../Api';

class AnalyticsService {
  // Get dashboard overview with key metrics
  async getDashboardOverview(academicYearId = null, departmentId = null) {
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (departmentId) params.append('department_id', departmentId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await API.get(`/api/analytics/dashboard-overview${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch dashboard overview:', error);
      throw error;
    }
  }

  // Get budget allocation by department
  async getBudgetByDepartment(academicYearId = null, departmentId = null) {
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (departmentId) params.append('department_id', departmentId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await API.get(`/api/analytics/budget-by-department${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch budget by department:', error);
      throw error;
    }
  }

  // Get events timeline
  async getEventsTimeline(academicYearId = null, departmentId = null) {
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (departmentId) params.append('department_id', departmentId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await API.get(`/api/analytics/events-timeline${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch events timeline:', error);
      throw error;
    }
  }

  // Get monthly budget utilization
  async getMonthlyBudgetUtilization(academicYearId = null, departmentId = null) {
    try {
      const params = new URLSearchParams();
      if (academicYearId) params.append('academic_year_id', academicYearId);
      if (departmentId) params.append('department_id', departmentId);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await API.get(`/api/analytics/monthly-budget-utilization${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch monthly budget utilization:', error);
      throw error;
    }
  }

  // Get department performance (Principal only)
  async getDepartmentPerformance(academicYearId = null) {
    try {
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await API.get(`/api/analytics/department-performance${params}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch department performance:', error);
      throw error;
    }
  }

  // Get list of enabled academic years for filtering
  async getEnabledAcademicYears() {
    try {
      const response = await API.get('/api/academic-years/enabled');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch academic years:', error);
      throw error;
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
