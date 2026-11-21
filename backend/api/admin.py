from django.contrib import admin
from .models import (
    Role, User, PasswordReset, Project, ProjectMember,
    Task, TaskComment, Notification, ActivityLog, UserPreference
)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('role_id', 'role_name')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'email', 'full_name', 'role', 'designation', 'is_active', 'created_at')
    search_fields = ('email', 'full_name')
    list_filter = ('role', 'is_active')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_id', 'project_name', 'owner', 'start_date', 'deadline', 'status', 'progress_percent')
    list_filter = ('status',)
    search_fields = ('project_name',)

@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('member_id', 'project', 'user', 'project_role', 'responsibility', 'joined_at')
    list_filter = ('project_role',)

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('task_id', 'title', 'project', 'assignee', 'priority', 'status', 'due_date')
    list_filter = ('priority', 'status', 'project')
    search_fields = ('title', 'description')

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('comment_id', 'task', 'user', 'created_at')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_id', 'user', 'type', 'message', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('activity_id', 'user', 'project', 'task', 'action', 'created_at')
    list_filter = ('created_at',)

@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('preference_id', 'user', 'email_notifications', 'reminder_hours', 'default_period_days')
