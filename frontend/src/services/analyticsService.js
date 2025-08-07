// Frontend analytics service for API calls
import API from '../Api';

class AnalyticsService {
  // Get dashboard overview with key metrics
  async getDashboardOverview(academicYearId = null) {
    try {
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await API.get(`/api/analytics/dashboard-overview${params}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch dashboard overview:', error);
      throw error;
    }
  }

  // Get budget allocation by department
  async getBudgetByDepartment(academicYearId = null) {
    try {
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await API.get(`/api/analytics/budget-by-department${params}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch budget by department:', error);
      throw error;
    }
  }

  // Get events timeline
  async getEventsTimeline(academicYearId = null) {
    try {
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await API.get(`/api/analytics/events-timeline${params}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch events timeline:', error);
      throw error;
    }
  }

  // Get monthly budget utilization
  async getMonthlyBudgetUtilization(academicYearId = null) {
    try {
      const params = academicYearId ? `?academic_year_id=${academicYearId}` : '';
      const response = await API.get(`/api/analytics/monthly-budget-utilization${params}`);
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
}

const analyticsService = new AnalyticsService();
export default analyticsService;
