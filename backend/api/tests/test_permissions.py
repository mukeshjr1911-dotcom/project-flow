from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from api.models import Role, User, Project, ProjectMember, Task


class PermissionsAndSecurityUnitTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin_role = Role.objects.create(role_name=Role.ADMIN)
        self.pm_role = Role.objects.create(role_name=Role.PROJECT_MANAGER)
        self.member_role = Role.objects.create(role_name=Role.TEAM_MEMBER)

        self.admin_user = User.objects.create_superuser(
            email='admin_perm@test.local',
            password='AdminPassword@1',
            full_name='Admin Perm'
        )

        self.pm = User.objects.create_user(
            email='pm_perm@test.local',
            password='PMPassword@1',
            full_name='PM Perm',
            role=self.pm_role
        )

        self.member1 = User.objects.create_user(
            email='mem1_perm@test.local',
            password='MemberPassword@1',
            full_name='Member One',
            role=self.member_role
        )

        self.member2 = User.objects.create_user(
            email='mem2_perm@test.local',
            password='MemberPassword@1',
            full_name='Member Two',
            role=self.member_role
        )

        today = timezone.now().date()
        self.project = Project.objects.create(
            owner=self.pm,
            project_name='Permission Test Project',
            start_date=today,
            deadline=today + timedelta(days=20),
            status=Project.STATUS_ON_TRACK
        )
        ProjectMember.objects.create(project=self.project, user=self.pm, project_role='Project Manager')
        ProjectMember.objects.create(project=self.project, user=self.member1, project_role='Team Member')
        ProjectMember.objects.create(project=self.project, user=self.member2, project_role='Team Member')

        self.task1 = Task.objects.create(
            project=self.project,
            assignee=self.member1,
            created_by=self.pm,
            title='Member 1 Task',
            due_date=timezone.now() + timedelta(days=2),
            status=Task.STATUS_TODO
        )

    def test_team_member_cannot_create_project(self):
        """TC-04, FR-06: Team Member attempting to create a project receives 403 Forbidden"""
        self.client.force_authenticate(user=self.member1)
        today = timezone.now().date()
        response = self.client.post('/api/projects/', {
            'project_name': 'Unauthorized Project',
            'start_date': str(today),
            'deadline': str(today + timedelta(days=10)),
            'status': Project.STATUS_NOT_STARTED
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_project_manager_can_create_project(self):
        """FR-06: Project Manager can create project"""
        self.client.force_authenticate(user=self.pm)
        today = timezone.now().date()
        response = self.client.post('/api/projects/', {
            'project_name': 'Authorized PM Project',
            'start_date': str(today),
            'deadline': str(today + timedelta(days=10)),
            'status': Project.STATUS_NOT_STARTED
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_assignee_can_update_own_task_status(self):
        """FR-33: Assignee can update status of their own task"""
        self.client.force_authenticate(user=self.member1)
        response = self.client.patch(f'/api/tasks/{self.task1.task_id}/status/', {
            'status': Task.STATUS_IN_PROGRESS
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.status, Task.STATUS_IN_PROGRESS)

    def test_other_member_cannot_update_task_status(self):
        """FR-33: Non-assignee team member cannot update another member's task status"""
        self.client.force_authenticate(user=self.member2)
        response = self.client.patch(f'/api/tasks/{self.task1.task_id}/status/', {
            'status': Task.STATUS_COMPLETED
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_account_lockout_after_five_failed_logins(self):
        """TC-03, FR-07: Account locked for 15 minutes after 5 consecutive failed login attempts"""
        # 4 failed attempts: account should not be locked
        for _ in range(4):
            response = self.client.post('/api/auth/login', {
                'email': 'mem1_perm@test.local',
                'password': 'WrongPassword123'
            })
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.member1.refresh_from_db()
        self.assertFalse(self.member1.is_locked)

        # 5th failed attempt: triggers 15 min lockout
        response = self.client.post('/api/auth/login', {
            'email': 'mem1_perm@test.local',
            'password': 'WrongPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("locked", response.data['detail'].lower())

        self.member1.refresh_from_db()
        self.assertTrue(self.member1.is_locked)
