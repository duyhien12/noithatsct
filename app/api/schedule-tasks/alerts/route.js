import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';
import { getScheduleAlerts } from '@/lib/scheduleAlerts';

/**
 * GET /api/schedule-tasks/alerts?projectId=xxx
 * Returns material alerts for upcoming tasks.
 */
export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const alerts = await getScheduleAlerts(projectId);
    return NextResponse.json(alerts);
});
