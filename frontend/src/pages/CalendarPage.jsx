import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  FolderKanban,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import client from '../api/client';
import TaskModal from '../components/TaskModal';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);

  // Selected Day state
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await client.get(`/calendar?month=${monthStr}`);
      setCalendarData(res.data.events_by_day || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const events = calendarData[d] || [];
    cells.push({
      day: d,
      isToday:
        new Date().getFullYear() === year &&
        new Date().getMonth() + 1 === month &&
        new Date().getDate() === d,
      isSelected: selectedDay === d,
      events,
    });
  }

  const selectedEvents = calendarData[selectedDay] || [];
  const selectedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Calendar
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Track milestones, task due dates, and project deadlines across the month.
          </p>
        </div>

        <button
          onClick={() => setTaskModalOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task on Date</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Grid (8 cols) */}
        <div className="lg:col-span-8 bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl">
          {/* Navigator Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              {monthNames[month - 1]} {year}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-[#182133] border border-[#2B3852] text-gray-300 hover:text-white hover:border-purple-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-[#182133] border border-[#2B3852] text-gray-300 hover:text-white hover:border-purple-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {daysOfWeek.map((d) => (
              <span key={d} className="text-xs font-bold text-gray-500 py-1 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {cells.map((cell, idx) => {
              if (!cell.day) {
                return <div key={idx} className="h-20 sm:h-24 rounded-2xl bg-transparent" />;
              }

              const hasDeadlines = cell.events.some((e) => e.type === 'project_deadline');
              const hasTasks = cell.events.some((e) => e.type === 'task');

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(cell.day)}
                  className={`h-20 sm:h-24 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isSelected
                      ? 'bg-[#1C2538] border-purple-500 shadow-md ring-1 ring-purple-500'
                      : cell.isToday
                      ? 'bg-purple-950/20 border-purple-500/50'
                      : 'bg-[#151C2C] border-[#1F293D] hover:border-[#2E3C57]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-[#7C3AED] text-white shadow-sm'
                          : 'text-gray-300'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Indicators */}
                    <div className="flex items-center space-x-1">
                      {hasDeadlines && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Project Deadline" />
                      )}
                      {hasTasks && (
                        <span className="w-2 h-2 rounded-full bg-purple-400" title="Task due" />
                      )}
                    </div>
                  </div>

                  {/* Tiny chips on desktop */}
                  <div className="hidden sm:block overflow-hidden space-y-1">
                    {cell.events.slice(0, 2).map((ev, eIdx) => (
                      <div
                        key={eIdx}
                        className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${
                          ev.type === 'project_deadline'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {cell.events.length > 2 && (
                      <span className="text-[9px] text-gray-500 font-bold block">
                        +{cell.events.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda (4 cols) */}
        <div className="lg:col-span-4 bg-[#121724] border border-[#1F293D] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1C2538] mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Schedule for {monthNames[month - 1]} {selectedDay}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedEvents.length} item(s) due today
                </p>
              </div>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="p-1.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                title="Create task for this day"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {selectedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    No deadlines or tasks scheduled for this day.
                  </p>
                </div>
              ) : (
                selectedEvents.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border ${
                      item.type === 'project_deadline'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[#182133] border-[#25324A]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                            item.type === 'project_deadline'
                              ? 'text-amber-400'
                              : 'text-purple-400'
                          }`}
                        >
                          {item.type === 'project_deadline'
                            ? '★ Project Deadline'
                            : 'Task Due'}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Project: {item.project_name}
                        </p>
                      </div>

                      {item.type === 'task' && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal with pre-selected date */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        defaultDate={selectedDateStr}
        onSuccess={fetchCalendar}
      />
    </div>
  );
}
