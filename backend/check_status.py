from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check event statuses
    result = conn.execute(text('SELECT id, title, status FROM events ORDER BY id'))
    events = result.fetchall()
    print('Current event statuses:')
    for event in events:
        print(f'Event {event[0]}: {event[1][:30]}... - Status: {event[2]}')
    
    # Check workflow statuses
    result = conn.execute(text('SELECT department_id, academic_year, status FROM workflow_status ORDER BY department_id'))
    workflows = result.fetchall()
    print('\nWorkflow statuses:')
    for wf in workflows:
        print(f'Dept {wf[0]} - {wf[1]}: {wf[2]}')
