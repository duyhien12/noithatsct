'use client';
import { useState, useEffect } from 'react';
import TaskTable from './TaskTable';
import TaskGantt from './TaskGantt';

// CV Thiết kế: một trang, hai dạng xem — Bảng (sửa trực tiếp) và Tiến độ (Gantt, kéo thả ngày).
// /design-orders/gantt cũ chuyển hướng về đây với ?view=gantt.
const VIEW_KEY = 'design-task-view';

export default function DesignTaskCvPage() {
    const [view, setView] = useState('table');

    useEffect(() => {
        let initial = new URLSearchParams(window.location.search).get('view');
        if (!initial) {
            try { initial = localStorage.getItem(VIEW_KEY); } catch {}
        }
        if (initial === 'gantt') setView('gantt');
    }, []);

    const changeView = (v) => {
        setView(v);
        try { localStorage.setItem(VIEW_KEY, v); } catch {}
    };

    const viewSwitch = (
        <div style={{ display: 'flex' }}>
            <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeView('table')}>📋 Bảng</button>
            <button className={`btn btn-sm ${view === 'gantt' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => changeView('gantt')}>📊 Tiến độ</button>
        </div>
    );

    return view === 'gantt' ? <TaskGantt viewSwitch={viewSwitch} /> : <TaskTable viewSwitch={viewSwitch} />;
}
