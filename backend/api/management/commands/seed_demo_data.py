from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date, datetime
from decimal import Decimal

from api.models import (
    Role, User, Project, ProjectMember, Task, TaskComment,
    Notification, ActivityLog, UserPreference
)


class Command(BaseCommand):
    help = 'Seeds demo data for ProjectFlow to match the reference UI and SRS requirements'

    def handle(self, *args, **options):
        self.stdout.write("Starting demo data seeding...")

        # 1. Create Roles
        admin_role, _ = Role.objects.get_or_create(role_name=Role.ADMIN)
        pm_role, _ = Role.objects.get_or_create(role_name=Role.PROJECT_MANAGER)
        member_role, _ = Role.objects.get_or_create(role_name=Role.TEAM_MEMBER)

        # 2. Create Users
        # Admin
        admin_user = User.objects.filter(email='admin@projectflow.local').first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email='admin@projectflow.local',
                password='Admin@12345',
                full_name='System Admin'
            )
            admin_user.designation = 'Administrator'
            admin_user.save()

        # Mukesh Kumar V (Project Manager / Student per screenshot)
        mukesh = User.objects.filter(email='mukesh@projectflow.local').first()
        if not mukesh:
            mukesh = User.objects.create_user(
                email='mukesh@projectflow.local',
                password='Mukesh@12345',
                full_name='Mukesh Kumar V',
                role=pm_role,
                designation='Student',
                theme_preference='dark'
            )
        else:
            mukesh.full_name = 'Mukesh Kumar V'
            mukesh.designation = 'Student'
            mukesh.role = pm_role
            mukesh.set_password('Mukesh@12345')
            mukesh.save()

        # Rahul Sharma (Team Member / Developer)
        rahul = User.objects.filter(email='rahul@projectflow.local').first()
        if not rahul:
            rahul = User.objects.create_user(
                email='rahul@projectflow.local',
                password='Member@12345',
                full_name='Rahul Sharma',
                role=member_role,
                designation='Full-Stack Developer'
            )

        # Priya Patel (Team Member / Designer)
        priya = User.objects.filter(email='priya@projectflow.local').first()
        if not priya:
            priya = User.objects.create_user(
                email='priya@projectflow.local',
                password='Member@12345',
                full_name='Priya Patel',
                role=member_role,
                designation='UI/UX Designer'
            )

        # Ananya Rao (Team Member / QA Tester)
        ananya = User.objects.filter(email='ananya@projectflow.local').first()
        if not ananya:
            ananya = User.objects.create_user(
                email='ananya@projectflow.local',
                password='Member@12345',
                full_name='Ananya Rao',
                role=member_role,
                designation='QA Engineer'
            )

        now = timezone.now()
        today = now.date()

        # 3. Create Projects (Matching Screenshot)
        # Project 1: Online Quiz System
        p1, _ = Project.objects.get_or_create(
            project_name='Online Quiz System',
            defaults={
                'owner': mukesh,
                'description': 'A web-based quiz platform with real-time results.',
                'start_date': today - timedelta(days=45),
                'deadline': today + timedelta(days=25),
                'status': Project.STATUS_ON_TRACK,
                'progress_percent': Decimal('75.00')
            }
        )

        # Project 2: College Portal
        p2, _ = Project.objects.get_or_create(
            project_name='College Portal',
            defaults={
                'owner': mukesh,
                'description': 'Student portal for SKASC with modern UI.',
                'start_date': today - timedelta(days=30),
                'deadline': today + timedelta(days=8),
                'status': Project.STATUS_AT_RISK,
                'progress_percent': Decimal('40.00')
            }
        )

        # Project 3: Analytics Dashboard
        p3, _ = Project.objects.get_or_create(
            project_name='Analytics Dashboard',
            defaults={
                'owner': mukesh,
                'description': 'Data visualization dashboard for better insights.',
                'start_date': today - timedelta(days=20),
                'deadline': today + timedelta(days=40),
                'status': Project.STATUS_ON_TRACK,
                'progress_percent': Decimal('60.00')
            }
        )

        # 4. Project Memberships
        memberships_data = [
            # P1
            (p1, mukesh, 'Project Manager', 'Project Lead'),
            (p1, rahul, 'Team Member', 'Backend Lead'),
            (p1, priya, 'Team Member', 'Frontend & UI'),
            (p1, ananya, 'Team Member', 'QA & Testing'),
            # P2
            (p2, mukesh, 'Project Manager', 'Project Lead'),
            (p2, rahul, 'Team Member', 'Full Stack Developer'),
            (p2, priya, 'Team Member', 'UI Designer'),
            # P3
            (p3, mukesh, 'Project Manager', 'Project Lead'),
            (p3, rahul, 'Team Member', 'Data Engineer'),
            (p3, priya, 'Team Member', 'Dashboard Designer'),
            (p3, ananya, 'Team Member', 'Tester'),
        ]

        for proj, usr, p_role, resp in memberships_data:
            ProjectMember.objects.get_or_create(
                project=proj,
                user=usr,
                defaults={'project_role': p_role, 'responsibility': resp}
            )

        # 5. Create Tasks (~40 tasks total across projects)
        # Clear existing tasks for fresh demo state
        Task.objects.all().delete()

        # Exact Upcoming Tasks from the Screenshot:
        # Task 1: "Finalize project report" — Today • 7 PM
        today_7pm = timezone.make_aware(datetime.combine(today, datetime.strptime("19:00", "%H:%M").time()))
        t1 = Task.objects.create(
            project=p1,
            assignee=mukesh,
            created_by=mukesh,
            title='Finalize project report',
            description='Compile all test results and submit final draft of project report.',
            priority=Task.PRIORITY_HIGH,
            status=Task.STATUS_COMPLETED,
            start_date=today - timedelta(days=2),
            due_date=today_7pm,
            completed_at=now - timedelta(hours=1)
        )

        # Task 2: "Fix authentication bug" — Tomorrow • 10 AM
        tomorrow_10am = timezone.make_aware(datetime.combine(today + timedelta(days=1), datetime.strptime("10:00", "%H:%M").time()))
        t2 = Task.objects.create(
            project=p2,
            assignee=rahul,
            created_by=mukesh,
            title='Fix authentication bug',
            description='Investigate token expiration issue on page refresh.',
            priority=Task.PRIORITY_CRITICAL,
            status=Task.STATUS_IN_PROGRESS,
            start_date=today,
            due_date=tomorrow_10am
        )

        # Task 3: "Prepare presentation" — Nov 21 • 2 PM
        nov21_2pm = timezone.make_aware(datetime.combine(today + timedelta(days=2), datetime.strptime("14:00", "%H:%M").time()))
        t3 = Task.objects.create(
            project=p1,
            assignee=priya,
            created_by=mukesh,
            title='Prepare presentation',
            description='Design slide deck for upcoming project review committee.',
            priority=Task.PRIORITY_MEDIUM,
            status=Task.STATUS_TODO,
            start_date=today,
            due_date=nov21_2pm
        )

        # Task 4: "Update database schema" — Nov 22 • 11 AM
        nov22_11am = timezone.make_aware(datetime.combine(today + timedelta(days=3), datetime.strptime("11:00", "%H:%M").time()))
        t4 = Task.objects.create(
            project=p3,
            assignee=rahul,
            created_by=mukesh,
            title='Update database schema',
            description='Add indexing on timestamp fields and migrate user preferences table.',
            priority=Task.PRIORITY_HIGH,
            status=Task.STATUS_TODO,
            start_date=today,
            due_date=nov22_11am
        )

        # Overdue tasks (5 overdue tasks to match screenshot card count "5 Overdue Tasks")
        overdue_titles = [
            (p2, rahul, 'Implement LDAP student authentication', Task.PRIORITY_CRITICAL, 4),
            (p2, priya, 'Course registration responsive form', Task.PRIORITY_HIGH, 3),
            (p2, ananya, 'Load test examination server', Task.PRIORITY_HIGH, 2),
            (p1, rahul, 'Fix real-time score WebSocket sync', Task.PRIORITY_MEDIUM, 5),
            (p3, ananya, 'Automated report generation script', Task.PRIORITY_MEDIUM, 1),
        ]
        for proj, assignee, title, prio, days_ago in overdue_titles:
            Task.objects.create(
                project=proj,
                assignee=assignee,
                created_by=mukesh,
                title=title,
                description=f'Overdue task requiring immediate attention ({title}).',
                priority=prio,
                status=Task.STATUS_IN_PROGRESS if days_ago % 2 == 0 else Task.STATUS_TODO,
                start_date=today - timedelta(days=days_ago + 5),
                due_date=now - timedelta(days=days_ago, hours=3)
            )

        # Completed tasks (to achieve ~75% for P1, ~40% for P2, ~60% for P3)
        completed_p1 = [
            'Setup React and Tailwind project structure',
            'Design database schema for questions & answers',
            'Build timed quiz interface component',
            'Develop instant evaluation scoring algorithm',
            'Implement user leaderboard with caching',
            'Add question categories and difficulty levels',
            'Write unit tests for quiz grading logic',
            'Create teacher dashboard for question banks',
            'Add export feature for student scorecards'
        ]
        for title in completed_p1:
            Task.objects.create(
                project=p1,
                assignee=priya if 'Design' in title or 'interface' in title else rahul,
                created_by=mukesh,
                title=title,
                priority=Task.PRIORITY_MEDIUM,
                status=Task.STATUS_COMPLETED,
                start_date=today - timedelta(days=25),
                due_date=now - timedelta(days=10),
                completed_at=now - timedelta(days=10)
            )

        completed_p2 = [
            'Setup Django backend project with REST framework',
            'Create student registration and profile endpoints',
            'Design mobile responsive dashboard layout',
            'Integrate student timetable API'
        ]
        for title in completed_p2:
            Task.objects.create(
                project=p2,
                assignee=rahul if 'backend' in title or 'API' in title else priya,
                created_by=mukesh,
                title=title,
                priority=Task.PRIORITY_MEDIUM,
                status=Task.STATUS_COMPLETED,
                start_date=today - timedelta(days=20),
                due_date=now - timedelta(days=5),
                completed_at=now - timedelta(days=5)
            )

        pending_p2 = [
            'Fee payment gateway integration',
            'Faculty feedback submission portal',
            'Notification system for exam circulars',
            'Hostel room allotment module'
        ]
        for title in pending_p2:
            Task.objects.create(
                project=p2,
                assignee=rahul if 'integration' in title else ananya,
                created_by=mukesh,
                title=title,
                priority=Task.PRIORITY_HIGH,
                status=Task.STATUS_IN_PROGRESS,
                start_date=today,
                due_date=now + timedelta(days=6)
            )

        completed_p3 = [
            'Connect SQLite and PostgreSQL data sources',
            'Create data aggregation pipeline',
            'Build Recharts line chart integration',
            'Implement interactive date range filters',
            'Add export to CSV utility',
            'Performance profiling on aggregation queries'
        ]
        for title in completed_p3:
            Task.objects.create(
                project=p3,
                assignee=mukesh if 'pipeline' in title else rahul,
                created_by=mukesh,
                title=title,
                priority=Task.PRIORITY_HIGH,
                status=Task.STATUS_COMPLETED,
                start_date=today - timedelta(days=15),
                due_date=now - timedelta(days=3),
                completed_at=now - timedelta(days=3)
            )

        pending_p3 = [
            'Real-time streaming metrics with SSE',
            'User role access controls for sensitive metrics',
            'Dark mode color palette optimization for charts',
            'Automated email dispatch of weekly summary'
        ]
        for title in pending_p3:
            Task.objects.create(
                project=p3,
                assignee=priya if 'palette' in title else rahul,
                created_by=mukesh,
                title=title,
                priority=Task.PRIORITY_MEDIUM,
                status=Task.STATUS_TODO,
                start_date=today,
                due_date=now + timedelta(days=12)
            )

        # Recalculate progress for all projects
        for p in [p1, p2, p3]:
            p.recalculate_progress()

        # 6. Add Comments to tasks (FR-37)
        TaskComment.objects.all().delete()
        TaskComment.objects.create(
            task=t2,
            user=mukesh,
            comment_text='Please ensure the refresh token rotation is covered in the fix.'
        )
        TaskComment.objects.create(
            task=t2,
            user=rahul,
            comment_text='Working on it now. Will test with both local storage and session storage.'
        )

        # 7. Activity Log (Matching Screenshot Activity Feed)
        # - "You completed Task: Design UI Layout" — 2h ago
        # - "New project created: College Portal" — 4h ago
        # - "Rahul joined the project" — 5h ago
        ActivityLog.objects.all().delete()
        ActivityLog.objects.create(
            user=mukesh,
            project=p1,
            task=t1,
            action="You completed Task: Design UI Layout",
            created_at=now - timedelta(hours=2)
        )
        ActivityLog.objects.create(
            user=mukesh,
            project=p2,
            action="New project created: College Portal",
            created_at=now - timedelta(hours=4)
        )
        ActivityLog.objects.create(
            user=rahul,
            project=p2,
            action="Rahul joined the project",
            created_at=now - timedelta(hours=5)
        )
        ActivityLog.objects.create(
            user=priya,
            project=p1,
            action="Priya updated task status to In Review",
            created_at=now - timedelta(hours=8)
        )

        # 8. Notifications (FR-54 to FR-59)
        Notification.objects.all().delete()
        Notification.objects.create(
            user=mukesh,
            project=p2,
            task=t2,
            type=Notification.TYPE_ASSIGNMENT,
            message="Rahul started working on 'Fix authentication bug'.",
            is_read=False,
            created_at=now - timedelta(hours=1)
        )
        Notification.objects.create(
            user=mukesh,
            project=p1,
            task=t1,
            type=Notification.TYPE_REMINDER,
            message="Task 'Finalize project report' is due today at 7:00 PM.",
            is_read=False,
            created_at=now - timedelta(hours=3)
        )
        Notification.objects.create(
            user=mukesh,
            project=p2,
            type=Notification.TYPE_OVERDUE,
            message="Project 'College Portal' has 3 overdue tasks.",
            is_read=False,
            created_at=now - timedelta(hours=6)
        )
        Notification.objects.create(
            user=mukesh,
            project=p3,
            type=Notification.TYPE_PROJECT_UPDATE,
            message="Ananya joined Analytics Dashboard as QA Engineer.",
            is_read=True,
            created_at=now - timedelta(days=1)
        )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded demo data!\n"
            f"- Admin: admin@projectflow.local / Admin@12345\n"
            f"- Project Manager: mukesh@projectflow.local / Mukesh@12345 (Mukesh Kumar V)\n"
            f"- Team Members: rahul@, priya@, ananya@ with password Member@12345\n"
            f"- Projects: {p1.project_name} ({p1.progress_percent}%), {p2.project_name} ({p2.progress_percent}%), {p3.project_name} ({p3.progress_percent}%)\n"
            f"- Total Tasks: {Task.objects.count()} (Completed: {Task.objects.filter(status=Task.STATUS_COMPLETED).count()}, Overdue: {Task.objects.filter(due_date__lt=now).exclude(status=Task.STATUS_COMPLETED).count()})"
        ))
