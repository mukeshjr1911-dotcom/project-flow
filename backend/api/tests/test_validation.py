from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import ValidationError
from api.models import Role, User, Project, ProjectMember, Task
from api.serializers import validate_password_policy, ProjectSerializer, TaskSerializer, RegisterSerializer


class ValidationUnitTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_name=Role.ADMIN)
        self.pm_role = Role.objects.create(role_name=Role.PROJECT_MANAGER)
        self.member_role = Role.objects.create(role_name=Role.TEAM_MEMBER)

        self.pm = User.objects.create_user(
            email='pm@test.local',
            password='Password@123',
            full_name='PM Tester',
            role=self.pm_role
        )
        self.member = User.objects.create_user(
            email='member@test.local',
            password='Password@123',
            full_name='Member Tester',
            role=self.member_role
        )
        self.outsider = User.objects.create_user(
            email='outsider@test.local',
            password='Password@123',
            full_name='Outsider Tester',
            role=self.member_role
        )

        today = timezone.now().date()
        self.project = Project.objects.create(
            owner=self.pm,
            project_name='Test Validation Project',
            start_date=today,
            deadline=today + timedelta(days=30),
            status=Project.STATUS_ON_TRACK
        )
        ProjectMember.objects.create(project=self.project, user=self.pm, project_role='Project Manager')
        ProjectMember.objects.create(project=self.project, user=self.member, project_role='Team Member')

    def test_password_policy_valid(self):
        """FR-02: Valid password with upper, lower, digit and special char passes"""
        self.assertEqual(validate_password_policy("StrongPass@1"), "StrongPass@1")

    def test_password_policy_short(self):
        """FR-02: Reject password shorter than 8 chars"""
        with self.assertRaises(ValidationError):
            validate_password_policy("Ab1@")

    def test_password_policy_missing_uppercase(self):
        """FR-02: Reject password without uppercase"""
        with self.assertRaises(ValidationError):
            validate_password_policy("lowercase@123")

    def test_password_policy_missing_lowercase(self):
        """FR-02: Reject password without lowercase"""
        with self.assertRaises(ValidationError):
            validate_password_policy("UPPERCASE@123")

    def test_password_policy_missing_digit(self):
        """FR-02: Reject password without digit"""
        with self.assertRaises(ValidationError):
            validate_password_policy("NoDigitsHere@")

    def test_password_policy_missing_special(self):
        """FR-02: Reject password without special character"""
        with self.assertRaises(ValidationError):
            validate_password_policy("NoSpecialChars123")

    def test_duplicate_email_registration_rejected(self):
        """FR-02, TC-02: Registration with duplicate email is rejected"""
        serializer = RegisterSerializer(data={
            'email': 'pm@test.local',
            'password': 'SecurePassword@1',
            'full_name': 'Another PM'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_project_deadline_before_start_date_rejected(self):
        """FR-24, TC-05: Project deadline cannot precede start date"""
        today = timezone.now().date()
        serializer = ProjectSerializer(data={
            'project_name': 'Invalid Date Project',
            'start_date': today,
            'deadline': today - timedelta(days=5),
            'status': Project.STATUS_NOT_STARTED
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('deadline', serializer.errors)

    def test_task_assignee_must_be_project_member(self):
        """FR-30: Task assignee must be a member of the project"""
        today = timezone.now().date()
        serializer = TaskSerializer(data={
            'project': self.project.project_id,
            'assignee': self.outsider.user_id,
            'title': 'Test Assignee Task',
            'priority': Task.PRIORITY_MEDIUM,
            'status': Task.STATUS_TODO,
            'start_date': today,
            'due_date': timezone.now() + timedelta(days=2)
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('assignee', serializer.errors)
