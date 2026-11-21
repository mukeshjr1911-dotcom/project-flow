import re
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import (
    Role, User, PasswordReset, Project, ProjectMember,
    Task, TaskComment, Notification, ActivityLog, UserPreference
)


def validate_password_policy(password):
    """
    FR-02: Password policy: minimum 8 characters with uppercase, lowercase, digit and special character.
    """
    if len(password) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")
    if not re.search(r'\d', password):
        raise serializers.ValidationError("Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise serializers.ValidationError("Password must contain at least one special character.")
    return password


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['role_id', 'role_name']


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['preference_id', 'email_notifications', 'reminder_hours', 'default_period_days']


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    role_id = serializers.IntegerField(source='role.role_id', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id', 'email', 'full_name', 'role_id', 'role_name',
            'designation', 'profile_image', 'theme_preference',
            'is_active', 'created_at'
        ]
        read_only_fields = ['user_id', 'created_at', 'is_active']


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default='Team Member')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_password(self, value):
        return validate_password_policy(value)

    def create(self, validated_data):
        role_name = validated_data.get('role', Role.TEAM_MEMBER)
        role, _ = Role.objects.get_or_create(role_name=role_name)
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=role
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return validate_password_policy(value)


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return validate_password_policy(value)


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.user_id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    designation = serializers.CharField(source='user.designation', read_only=True)
    profile_image = serializers.CharField(source='user.profile_image', read_only=True)
    system_role = serializers.CharField(source='user.role.role_name', read_only=True)
    assigned_tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = [
            'member_id', 'project', 'user', 'user_id', 'full_name', 'email',
            'designation', 'profile_image', 'system_role', 'project_role',
            'responsibility', 'joined_at', 'assigned_tasks_count'
        ]
        read_only_fields = ['member_id', 'joined_at']

    def get_assigned_tasks_count(self, obj):
        return Task.objects.filter(project=obj.project, assignee=obj.user).count()


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='user.full_name', read_only=True)
    author_image = serializers.CharField(source='user.profile_image', read_only=True)
    author_id = serializers.IntegerField(source='user.user_id', read_only=True)

    class Meta:
        model = TaskComment
        fields = ['comment_id', 'task', 'user', 'author_id', 'author_name', 'author_image', 'comment_text', 'created_at']
        read_only_fields = ['comment_id', 'created_at', 'user']


class TaskSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    assignee_name = serializers.CharField(source='assignee.full_name', read_only=True)
    assignee_image = serializers.CharField(source='assignee.profile_image', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)

    class Meta:
        model = Task
        fields = [
            'task_id', 'project', 'project_name', 'assignee', 'assignee_name', 'assignee_image',
            'created_by', 'created_by_name', 'title', 'description', 'priority',
            'status', 'start_date', 'due_date', 'completed_at', 'created_at',
            'is_overdue', 'comments_count'
        ]
        read_only_fields = ['task_id', 'created_at', 'completed_at', 'created_by', 'is_overdue']

    def validate(self, attrs):
        project = attrs.get('project') or (self.instance.project if self.instance else None)
        assignee = attrs.get('assignee') or (self.instance.assignee if self.instance else None)
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        due_date = attrs.get('due_date') or (self.instance.due_date if self.instance else None)

        # FR-30: Verify assignee is a member of the project
        if project and assignee:
            is_member = ProjectMember.objects.filter(project=project, user=assignee).exists()
            if not is_member and project.owner != assignee:
                raise serializers.ValidationError({
                    'assignee': f"User '{assignee.full_name}' is not a member of project '{project.project_name}'."
                })

        # Start date and deadline verification
        if start_date and due_date:
            due_date_day = due_date.date() if hasattr(due_date, 'date') else due_date
            if due_date_day < start_date:
                raise serializers.ValidationError({
                    'due_date': "Task deadline cannot precede the start date."
                })

        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_email = serializers.CharField(source='owner.email', read_only=True)
    members_count = serializers.IntegerField(source='members.count', read_only=True)
    tasks_count = serializers.IntegerField(source='tasks.count', read_only=True)
    completed_tasks_count = serializers.SerializerMethodField()
    pending_tasks_count = serializers.SerializerMethodField()
    overdue_tasks_count = serializers.SerializerMethodField()
    members_summary = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'project_id', 'owner', 'owner_name', 'owner_email', 'project_name',
            'description', 'start_date', 'deadline', 'status', 'progress_percent',
            'created_at', 'members_count', 'tasks_count', 'completed_tasks_count',
            'pending_tasks_count', 'overdue_tasks_count', 'members_summary'
        ]
        read_only_fields = ['project_id', 'created_at', 'progress_percent', 'owner']

    def get_completed_tasks_count(self, obj):
        return obj.tasks.filter(status=Task.STATUS_COMPLETED).count()

    def get_pending_tasks_count(self, obj):
        return obj.tasks.exclude(status=Task.STATUS_COMPLETED).count()

    def get_overdue_tasks_count(self, obj):
        return obj.tasks.filter(
            due_date__lt=timezone.now()
        ).exclude(status=Task.STATUS_COMPLETED).count()

    def get_members_summary(self, obj):
        members = obj.members.select_related('user')[:5]
        return [
            {
                'user_id': m.user.user_id,
                'full_name': m.user.full_name,
                'profile_image': m.user.profile_image,
                'project_role': m.project_role,
                'responsibility': m.responsibility,
            }
            for m in members
        ]

    def validate(self, attrs):
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        deadline = attrs.get('deadline') or (self.instance.deadline if self.instance else None)

        # FR-24: reject a deadline earlier than the start date
        if start_date and deadline and deadline < start_date:
            raise serializers.ValidationError({
                'deadline': "Project deadline cannot precede the start date."
            })
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['notification_id', 'user', 'project', 'task', 'type', 'message', 'is_read', 'created_at']
        read_only_fields = ['notification_id', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_image = serializers.CharField(source='user.profile_image', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['activity_id', 'user', 'user_name', 'user_image', 'project', 'project_name', 'task', 'action', 'created_at']
        read_only_fields = ['activity_id', 'created_at']
