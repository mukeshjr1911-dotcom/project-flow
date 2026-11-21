from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from api.models import Role, User, Project, ProjectMember, Task


class OverdueDetectionUnitTests(TestCase):
    def setUp(self):
        pm_role = Role.objects.create(role_name=Role.PROJECT_MANAGER)
        member_role = Role.objects.create(role_name=Role.TEAM_MEMBER)

        self.pm = User.objects.create_user(
            email='pm_overdue@test.local',
            password='Password@123',
            full_name='PM Overdue',
            role=pm_role
        )
        self.member = User.objects.create_user(
            email='mem_overdue@test.local',
            password='Password@123',
            full_name='Member Overdue',
            role=member_role
        )

        today = timezone.now().date()
        self.project = Project.objects.create(
            owner=self.pm,
            project_name='Overdue Test Project',
            start_date=today - timedelta(days=10),
            deadline=today + timedelta(days=20),
            status=Project.STATUS_ON_TRACK
        )
        ProjectMember.objects.create(project=self.project, user=self.pm, project_role='Project Manager')
        ProjectMember.objects.create(project=self.project, user=self.member, project_role='Team Member')

    def test_past_due_date_uncompleted_is_overdue(self):
        """TR-03, TC-08: Task whose deadline has passed and status is not Completed is flagged overdue"""
        past_time = timezone.now() - timedelta(days=2)
        task = Task.objects.create(
            project=self.project,
            assignee=self.member,
            created_by=self.pm,
            title='Late Task',
            due_date=past_time,
            status=Task.STATUS_TODO
        )
        self.assertTrue(task.is_overdue)

    def test_past_due_date_completed_is_not_overdue(self):
        """TR-03: Completed task past deadline is NOT flagged overdue"""
        past_time = timezone.now() - timedelta(days=2)
        task = Task.objects.create(
            project=self.project,
            assignee=self.member,
            created_by=self.pm,
            title='Completed Late Task',
            due_date=past_time,
            status=Task.STATUS_COMPLETED
        )
        self.assertFalse(task.is_overdue)

    def test_future_due_date_is_not_overdue(self):
        """TR-03: Task with deadline in future is NOT overdue"""
        future_time = timezone.now() + timedelta(days=3)
        task = Task.objects.create(
            project=self.project,
            assignee=self.member,
            created_by=self.pm,
            title='Upcoming Task',
            due_date=future_time,
            status=Task.STATUS_IN_PROGRESS
        )
        self.assertFalse(task.is_overdue)
