# app/api/endpoints/analytics.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from app.database import get_db
from app.dependencies import get_current_user_role, get_current_department_id
from app.models import (
    ProgramCount, Event, Department, AcademicYear, 
    WorkflowStatus, Notification, User
)
from datetime import datetime, timedelta
from typing import Dict, List, Any

router = APIRouter()

@router.get("/analytics/dashboard-overview")
async def get_dashboard_overview(
    academic_year_id: int = None,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_user_dept_id: int = Depends(get_current_department_id)
):
    """Get comprehensive dashboard overview with key metrics"""
    
    # Get current academic year if not specified
    if not academic_year_id:
        current_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
        academic_year_id = current_year.id if current_year else None
    
    if not academic_year_id:
        raise HTTPException(status_code=404, detail="No active academic year found")
    
    # Filter by department for HoDs, all departments for Principal
    dept_filter = [current_user_dept_id] if current_user_role == 'hod' else None
    
    # 1. Budget Overview
    budget_query = db.query(ProgramCount).filter(ProgramCount.academic_year_id == academic_year_id)
    if dept_filter:
        budget_query = budget_query.filter(ProgramCount.department_id.in_(dept_filter))
    
    budget_data = budget_query.all()
    total_budget = sum([item.total_budget for item in budget_data])
    total_programs = sum([item.count for item in budget_data])
    
    # 2. Events Overview
    events_query = db.query(Event).filter(Event.academic_year_id == academic_year_id)
    if dept_filter:
        events_query = events_query.filter(Event.department_id.in_(dept_filter))
    
    total_events = events_query.count()
    completed_events = events_query.filter(Event.event_status == 'completed').count()
    ongoing_events = events_query.filter(Event.event_status == 'ongoing').count()
    planned_events = events_query.filter(Event.event_status == 'planned').count()
    
    # 3. Department Status
    status_query = db.query(WorkflowStatus).filter(WorkflowStatus.academic_year_id == academic_year_id)
    if dept_filter:
        status_query = status_query.filter(WorkflowStatus.department_id.in_(dept_filter))
    
    draft_count = status_query.filter(WorkflowStatus.status == 'draft').count()
    submitted_count = status_query.filter(WorkflowStatus.status == 'submitted').count()
    approved_count = status_query.filter(WorkflowStatus.status == 'approved').count()
    completed_count = status_query.filter(WorkflowStatus.status == 'completed').count()
    
    # 4. Recent Activity (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_notifications = db.query(Notification).filter(
        Notification.created_at >= week_ago
    ).count()
    
    return {
        "budget_overview": {
            "total_budget": total_budget,
            "total_programs": total_programs,
            "avg_budget_per_program": total_budget / total_programs if total_programs > 0 else 0
        },
        "events_overview": {
            "total_events": total_events,
            "completed_events": completed_events,
            "ongoing_events": ongoing_events,
            "planned_events": planned_events,
            "completion_rate": (completed_events / total_events * 100) if total_events > 0 else 0
        },
        "workflow_status": {
            "draft": draft_count,
            "submitted": submitted_count,
            "approved": approved_count,
            "completed": completed_count
        },
        "recent_activity": {
            "notifications_last_week": recent_notifications
        }
    }

@router.get("/analytics/budget-by-department")
async def get_budget_by_department(
    academic_year_id: int = None,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_user_dept_id: int = Depends(get_current_department_id)
):
    """Get budget allocation by department for pie chart"""
    
    if not academic_year_id:
        current_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
        academic_year_id = current_year.id if current_year else None
    
    # Filter by department for HoDs
    query = db.query(
        Department.name,
        Department.full_name,
        func.sum(ProgramCount.total_budget).label('total_budget')
    ).join(ProgramCount).filter(
        ProgramCount.academic_year_id == academic_year_id
    ).group_by(Department.id, Department.name, Department.full_name)
    
    if current_user_role == 'hod':
        query = query.filter(Department.id == current_user_dept_id)
    
    results = query.all()
    
    response_data = [
        {
            "name": result.name,
            "full_name": result.full_name,
            "value": float(result.total_budget),
            "percentage": 0  # Will be calculated on frontend
        }
        for result in results
    ]
    
    return response_data

@router.get("/analytics/events-timeline")
async def get_events_timeline(
    academic_year_id: int = None,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_user_dept_id: int = Depends(get_current_department_id)
):
    """Get events timeline for the next 3 months"""
    
    if not academic_year_id:
        current_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
        academic_year_id = current_year.id if current_year else None
    
    # Get events for next 3 months
    start_date = datetime.now()
    end_date = start_date + timedelta(days=90)
    
    query = db.query(
        Event.title,
        Event.event_date,
        Event.event_status,
        Event.budget_amount,
        Department.name.label('department_name')
    ).join(Department).filter(
        and_(
            Event.academic_year_id == academic_year_id,
            Event.event_date >= start_date,
            Event.event_date <= end_date
        )
    ).order_by(Event.event_date)
    
    if current_user_role == 'hod':
        query = query.filter(Event.department_id == current_user_dept_id)
    
    results = query.all()
    
    return [
        {
            "title": result.title,
            "date": result.event_date.isoformat(),
            "status": result.event_status,
            "budget": float(result.budget_amount),
            "department": result.department_name,
            "month": result.event_date.strftime("%B %Y")
        }
        for result in results
    ]

@router.get("/analytics/monthly-budget-utilization")
async def get_monthly_budget_utilization(
    academic_year_id: int = None,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_user_dept_id: int = Depends(get_current_department_id)
):
    """Get monthly budget utilization for line chart"""
    
    if not academic_year_id:
        current_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
        academic_year_id = current_year.id if current_year else None
    
    # Get events grouped by month
    query = db.query(
        func.date_trunc('month', Event.event_date).label('month'),
        func.sum(Event.budget_amount).label('utilized'),
        func.count(Event.id).label('event_count')
    ).filter(Event.academic_year_id == academic_year_id).group_by(
        func.date_trunc('month', Event.event_date)
    ).order_by('month')
    
    if current_user_role == 'hod':
        query = query.filter(Event.department_id == current_user_dept_id)
    
    results = query.all()
    
    # Get total allocated budget for comparison
    budget_query = db.query(func.sum(ProgramCount.total_budget)).filter(
        ProgramCount.academic_year_id == academic_year_id
    )
    if current_user_role == 'hod':
        budget_query = budget_query.filter(ProgramCount.department_id == current_user_dept_id)
    
    total_budget = budget_query.scalar() or 0
    
    return {
        "total_allocated": float(total_budget),
        "monthly_data": [
            {
                "month": result.month.strftime("%B %Y"),
                "utilized": float(result.utilized),
                "event_count": result.event_count,
                "percentage": (float(result.utilized) / total_budget * 100) if total_budget > 0 else 0
            }
            for result in results
        ]
    }

@router.get("/analytics/department-performance")
async def get_department_performance(
    academic_year_id: int = None,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Get department performance comparison (Principal only)"""
    
    if current_user_role != 'principal':
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not academic_year_id:
        current_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
        academic_year_id = current_year.id if current_year else None
    
    # Get performance metrics by department
    performance_data = db.query(
        Department.name,
        Department.full_name,
        func.coalesce(func.sum(ProgramCount.total_budget), 0).label('budget_allocated'),
        func.coalesce(func.count(Event.id), 0).label('events_planned'),
        func.coalesce(func.sum(
            case((Event.event_status == 'completed', Event.budget_amount), else_=0)
        ), 0).label('budget_utilized'),
        func.coalesce(func.count(
            case((Event.event_status == 'completed', 1), else_=None)
        ), 0).label('events_completed')
    ).outerjoin(ProgramCount, and_(
        Department.id == ProgramCount.department_id,
        ProgramCount.academic_year_id == academic_year_id
    )).outerjoin(Event, and_(
        Department.id == Event.department_id,
        Event.academic_year_id == academic_year_id
    )).group_by(Department.id, Department.name, Department.full_name).all()
    
    return [
        {
            "department": result.name,
            "full_name": result.full_name,
            "budget_allocated": float(result.budget_allocated),
            "budget_utilized": float(result.budget_utilized),
            "utilization_percentage": (float(result.budget_utilized) / float(result.budget_allocated) * 100) if result.budget_allocated > 0 else 0,
            "events_planned": result.events_planned,
            "events_completed": result.events_completed,
            "completion_rate": (result.events_completed / result.events_planned * 100) if result.events_planned > 0 else 0,
            "efficiency_score": ((result.events_completed / result.events_planned * 0.6) + (float(result.budget_utilized) / float(result.budget_allocated) * 0.4)) * 100 if result.events_planned > 0 and result.budget_allocated > 0 else 0
        }
        for result in performance_data
    ]
