# ProjectFlow — Modern Project Management System

**ProjectFlow** is a full-stack, web-based project management system built according to the IEEE 830-style Software Requirements Specification (SRS) and styled after the reference dark-theme dashboard.

---

## 1. Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Axios, Recharts, Tailwind CSS with custom design tokens, Lucide React icons.
- **Backend**: Django 6.1, Django REST Framework, SimpleJWT authentication, CORS headers.
- **Database**: SQLite (default for development), switchable to PostgreSQL or MySQL via environment variables.
- **Email Backend**: Django console email backend (`django.core.mail.backends.console.EmailBackend`) for single-use, 30-minute password reset links.

---

## 2. Quick Setup & Run Instructions

### Prerequisites
- Python 3.10+ (Python 3.13 tested)
- Node.js 18+ and npm

### Backend Setup

1. **Navigate to the backend directory and activate the virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Seed demo data** (Creates the exact dashboard data, projects, tasks, activities, and users matching the UI mockup):
   ```bash
   python manage.py seed_demo_data
   ```

5. **Run deadline & overdue check command** (Generates 24h reminders and overdue alerts):
   ```bash
   python manage.py check_deadlines
   ```

6. **Start the Django backend server**:
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```
   API runs at `http://127.0.0.1:8000/api/`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install npm dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Production Build**:
   ```bash
   npm run build
   ```

---

## 3. Demo Accounts

| Role | Name | Email | Password |
|---|---|---|---|
| **Project Manager** *(Screenshot Hero)* | Mukesh Kumar V | `mukesh@projectflow.local` | `Mukesh@12345` |
| **System Admin** | System Admin | `admin@projectflow.local` | `Admin@12345` |
| **Team Member (Developer)** | Rahul Sharma | `rahul@projectflow.local` | `Member@12345` |
| **Team Member (Designer)** | Priya Patel | `priya@projectflow.local` | `Member@12345` |
| **Team Member (QA Tester)** | Ananya Rao | `ananya@projectflow.local` | `Member@12345` |

*(Note: The login page includes quick one-click demo login buttons for evaluator convenience).*

---

## 4. Running Unit Tests

The backend includes a comprehensive unit test suite covering:
- **Validation** (password policy, duplicate emails, project deadline preceding start date, task assignee membership)
- **Progress Calculation** (0 tasks, partial completion, 100% full completion updating project status)
- **Overdue Detection** (past deadlines, future deadlines, completed tasks past deadline)
- **Role Permissions & Security** (role-based project creation, task status update restrictions, 15-minute account lockout after 5 consecutive failed logins)

Run the tests with:
```bash
cd backend
python manage.py test api
```

Expected result:
```
Ran 20 tests ... OK
```

---

## 5. Feature-to-SRS Requirement Mapping

| SRS ID | Feature / Module | Implementation Location & Description |
|---|---|---|
| **FR-01** | User Registration | `api/views.py:RegisterView`, `frontend/src/pages/RegisterPage.jsx` |
| **FR-02** | Email uniqueness & Password policy | `api/serializers.py:validate_password_policy` (8+ chars, upper, lower, digit, special) |
| **FR-03** | User Login | `api/views.py:LoginView`, SimpleJWT token issue |
| **FR-04** | User Logout | `api/views.py:LogoutView`, blacklist refresh token |
| **FR-05** | Forgot/Reset Password | `api/views.py:ForgotPasswordView`, single-use token with 30-min expiry printed to console email |
| **FR-06** | Role-Based Access Control | `api/permissions.py`: Admin, Project Manager, Team Member |
| **FR-07** | Account Lockout | `api/models.py:User.record_failed_login`, 15-minute lock after 5 consecutive failed attempts |
| **FR-08** | Idle Session Timeout | `frontend/src/context/AuthContext.jsx`, resets on activity, ends session at 30 min |
| **FR-09** | Dashboard: Total Projects | `api/views.py:DashboardSummaryView`, `frontend/src/components/SummaryCard.jsx` |
| **FR-10** | Dashboard: Tasks Completed | Summary card with +12% indicator |
| **FR-11** | Dashboard: Pending Tasks | Summary card with pending count |
| **FR-12** | Dashboard: Overdue Tasks | Visually highlighted summary card with overdue count |
| **FR-13** | My Projects Cards | `frontend/src/components/ProjectCard.jsx`: icon, progress bar %, member avatars, status tag |
| **FR-14** | Project Overview Chart | `frontend/src/components/ProjectChart.jsx`: Recharts area/line chart with 7D/30D/90D toggle |
| **FR-15** | Recent Activity Feed | `frontend/src/components/ActivityFeed.jsx`: relative timestamps ("2h ago", "4h ago") |
| **FR-16** | Upcoming Tasks Panel | `frontend/src/components/UpcomingTasks.jsx`: nearest deadlines with time and completion toggle |
| **FR-17** | Mini Calendar | `frontend/src/components/MiniCalendar.jsx`: highlighted today and deadline markers |
| **FR-18** | Global Search | `frontend/src/components/Topbar.jsx`: searches projects and tasks by name or keyword |
| **FR-19** | Personal Greeting | `frontend/src/pages/DashboardPage.jsx`: "Good Evening, Mukesh 👋" with mountain hero art |
| **FR-20** | Create Project | `api/views.py:ProjectViewSet`, `frontend/src/components/ProjectModal.jsx` |
| **FR-21** | Edit Project | `api/views.py:ProjectViewSet.perform_update` |
| **FR-22** | Delete Project with Confirmation | `frontend/src/components/DeleteConfirmModal.jsx` |
| **FR-23** | Project Members Assignment | `api/views.py:ProjectMemberViewSet` |
| **FR-24** | Deadline cannot precede Start Date | `api/serializers.py:ProjectSerializer.validate` |
| **FR-25** | Project Statuses | Not Started, On Track, At Risk, On Hold, Completed |
| **FR-26** | Automatic Progress Calculation | `api/models.py:Project.recalculate_progress()`: `(completed / total) * 100` |
| **FR-27** | Project List Search, Filter, Sort | `frontend/src/pages/ProjectsPage.jsx` |
| **FR-28** | Project Detail Page | `frontend/src/pages/ProjectDetailPage.jsx`: tasks, members, progress, history |
| **FR-29** | Create Task | `frontend/src/components/TaskModal.jsx` |
| **FR-30** | Assignee must be Project Member | `api/serializers.py:TaskSerializer.validate` |
| **FR-31** | Task Priorities | Low, Medium, High, Critical |
| **FR-32** | Task Statuses | To Do, In Progress, In Review, Completed |
| **FR-33** | Status Update Permissions | Assignee can update only own task status; PM/Admin can update any |
| **FR-34** | Automatic Overdue Flag | `api/models.py:Task.is_overdue`: `now > due_date` and status != Completed |
| **FR-35** | Edit and Delete Tasks | `api/views.py:TaskViewSet` |
| **FR-36** | Task Filtering & Tabs | Separate All, Pending, Completed, Overdue views in `TasksPage.jsx` |
| **FR-37** | Task Comments | `api/views.py:TaskViewSet.comments`, comment drawer in `TasksPage.jsx` |
| **FR-38** | Add Registered User to Team | `api/views.py:TeamViewSet`, `ProjectMemberViewSet` |
| **FR-39** | Assign Team Role | Project Manager or Team Member |
| **FR-40** | Record Responsibilities | Designer, Developer, Tester, etc. |
| **FR-41** | Display Team Directory & Workload | `frontend/src/pages/TeamPage.jsx` with assigned, completed, overdue counts |
| **FR-42** | Remove Member with Reassignment | `api/views.py:ProjectMemberViewSet.destroy` prompts for open task reassignment |
| **FR-43** | Monthly Calendar with Navigation | `frontend/src/pages/CalendarPage.jsx` with prev/next navigation |
| **FR-44** | Mark Project Deadlines on Calendar | Star marker / chip on deadline date |
| **FR-45** | List Upcoming Tasks on Due Dates | Calendar day agenda panel |
| **FR-46** | Create / Reschedule from Calendar | `CalendarPage.jsx` task creation modal with date pre-selected |
| **FR-47** | Distinct Colors / Icons | Amber for project deadlines, purple for tasks, red for overdue |
| **FR-48** | Project Progress Report | `frontend/src/pages/ReportsPage.jsx` horizontal bar chart & table |
| **FR-49** | Task Completion Report | Donut chart for status, bar chart for priority, metrics summary |
| **FR-50** | Team Performance Report | Grouped bar chart of assigned, completed, and overdue per member |
| **FR-51** | Graphical Analytics | Recharts Area, Bar, Donut charts |
| **FR-52** | Filter Reports by Project, Member | Dropdown filters on Reports page |
| **FR-53** | Export Reports as CSV / Print | CSV export button and formatted print layout |
| **FR-54** | Upcoming Deadline Reminders (24h) | `check_deadlines` command creates notifications for tasks due within window |
| **FR-55** | Overdue Task Alerts | Assignee and Project Manager notified when deadline passes |
| **FR-56** | Project Update Notifications | Members notified when project status/details change |
| **FR-57** | Task Assignment Notification | User notified on task assignment |
| **FR-58** | Notification Bell & Unread Dot | `frontend/src/components/Topbar.jsx` bell with unread counter |
| **FR-59** | Mark Notifications Read / Mark All | In-app notification modal with "Mark all read" button |
| **FR-60** | View & Edit Profile | `frontend/src/pages/SettingsPage.jsx`: name, email, designation, avatar |
| **FR-61** | Change Password | Settings password form with policy verification |
| **FR-62** | User Preferences | Dark/Light theme toggle, email notifications toggle, reminder hours, chart period |
| **UI-01–10** | UI & Layout Requirements | Dark theme default, violet accent, left sidebar, top bar, responsive to 360px |

---

## 6. Architecture & Database Design

The system implements the 3NF relational database schema from Section 8 of the SRS:
- `roles`
- `users`
- `password_resets`
- `projects`
- `project_members`
- `tasks`
- `task_comments`
- `notifications`
- `activity_log`
- `user_preferences`

All foreign keys, unique constraints (such as `(project_id, user_id)`), and indexes on `email`, `project`, `assignee`, `status`, and `due_date` are strictly enforced.
