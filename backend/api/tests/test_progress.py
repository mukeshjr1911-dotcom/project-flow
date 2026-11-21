from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from api.models import Role, User, Project, ProjectMember, Task


class ProgressCalculationUnitTests(TestCase):
    def setUp(self):
        pm_role = Role.objects.create(role_name=Role.PROJECT_MANAGER)
        member_role = Role.objects.create(role_name=Role.TEAM_MEMBER)

        self.pm = User.objects.create_user(
            email='pm_prog@test.local',
            password='Password@123',
            full_name='PM Progress',
            role=pm_role
        )
        self.member = User.objects.create_user(
            email='mem_prog@test.local',
            password='Password@123',
            full_name='Member Progress',
            role=member_role
        )

        today = timezone.now().date()
        self.project = Project.objects.create(
            owner=self.pm,
            project_name='Progress Test Project',
            start_date=today,
            deadline=today + timedelta(days=20),
            status=Project.STATUS_NOT_STARTED
        )
        ProjectMember.objects.create(project=self.project, user=self.pm, project_role='Project Manager')
        ProjectMember.objects.create(project=self.project, user=self.member, project_role='Team Member')

    def test_zero_tasks_progress_is_zero(self):
        """TR-02: Progress calculation with 0 tasks should be 0.00%"""
        progress = self.project.recalculate_progress()
        self.assertEqual(progress, Decimal('0.00'))
        self.assertEqual(self.project.progress_percent, Decimal('0.00'))

    def test_partial_completion_progress(self):
        """TR-02: 2 of 4 completed tasks should result in 50.00% progress"""
        now = timezone.now()
        # Create 4 tasks
        t1 = Task.objects.create(
            project=self.project, assignee=self.member, created_by=self.pm,
            title='Task 1', due_date=now + timedelta(days=1), status=Task.STATUS_COMPLETED
        )
        t2 = Task.objects.create(
            project=self.project, assignee=self.member, created_by=self.pm,
            title='Task 2', due_date=now + timedelta(days=2), status=Task.STATUS_COMPLETED
        )
        t3 = Task.objects.create(
            project=self.project, assignee=self.member, created_by=self.pm,
            title='Task 3', due_date=now + timedelta(days=3), status=Task.STATUS_IN_PROGRESS
        )
        t4 = Task.objects.create(
            project=self.project, assignee=self.member, created_by=self.pm,
            title='Task 4', due_date=now + timedelta(days=4), status=Task.STATUS_TODO
        )

        self.project.refresh_from_db()
        self.assertEqual(self.project.progress_percent, Decimal('50.00'))

    def test_full_completion_updates_status(self):
        """TR-02, TC-07: When last open task is completed, progress is 100% and status updates to Completed"""
        now = timezone.now()
        t1 = Task.objects.create(
            project=self.project, assignee=self.member, created_by=self.pm,
            title='Only Task', due_date=now + timedelta(days=1), status=Task.STATUS_TODO
        )
        self.project.refresh_from_db()
        self.assertEqual(self.project.progress_percent, Decimal('0.00'))

        # Complete task
        t1.status = Task.STATUS_COMPLETED
        t1.save()

        self.project.refresh_from_db()
        self.assertEqual(self.project.progress_percent, Decimal('100.00'))
        self.assertEqual(self.project.status, Project.STATUS_COMPLETED)
