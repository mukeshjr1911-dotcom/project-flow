import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function MiniCalendar({ deadlineDays = [] }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in month calculation
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar cells
  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ day: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      isToday: isCurrentMonth && day === todayDate,
      hasDeadline: deadlineDays.includes(day),
    });
  }

  return (
    <div className="bg-[#121724] border border-[#1F293D] rounded-2xl p-5 shadow-lg">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          Calendar
        </h3>
        <Link
          to="/calendar"
          className="text-gray-400 hover:text-purple-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Month Navigator: < Nov 2026 > */}
      <div className="flex items-center justify-between mb-4 text-xs font-semibold text-gray-300">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-[#1E293B] text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-white">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-[#1E293B] text-gray-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((d) => (
          <span key={d} className="text-[11px] font-semibold text-gray-500">
            {d}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((cell, idx) => {
          if (!cell.day) {
            return <div key={idx} className="h-8" />;
          }

          return (
            <div
              key={idx}
              onClick={() => navigate(`/calendar?year=${year}&month=${month + 1}&day=${cell.day}`)}
              className={`relative h-8 flex items-center justify-center rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                cell.isToday
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/40'
                  : cell.hasDeadline
                  ? 'text-amber-400 font-bold hover:bg-[#1E293B]'
                  : 'text-gray-300 hover:bg-[#1A2233]'
              }`}
            >
              <span>{cell.day}</span>
              {cell.hasDeadline && !cell.isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
