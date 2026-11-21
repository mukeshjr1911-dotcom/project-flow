from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class Role(models.Model):
    ADMIN = 'Admin'
    PROJECT_MANAGER = 'Project Manager'
    TEAM_MEMBER = 'Team Member'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (PROJECT_MANAGER, 'Project Manager'),
        (TEAM_MEMBER, 'Team Member'),
    ]

    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=30, unique=True, choices=ROLE_CHOICES)

    class Meta:
        db_table = 'roles'

    def __str__(self):
        return self.role_name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, full_name='', role=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, role=role, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)

        # Create default preferences
        UserPreference.objects.get_or_create(user=user)
        return user

    def create_superuser(self, email, password=None, full_name='Admin User', **extra_fields):
        admin_role, _ = Role.objects.get_or_create(role_name=Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, full_name=full_name, role=admin_role, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(primary_key=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    full_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True, db_index=True)
    designation = models.CharField(max_length=80, null=True, blank=True)
    profile_image = models.CharField(max_length=255, null=True, blank=True)
    theme_preference = models.CharField(max_length=10, default='dark', choices=[('dark', 'Dark'), ('light', 'Light')])
    failed_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'

    @property
    def id(self):
        return self.user_id

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def is_locked(self):
        if self.locked_until and timezone.now() < self.locked_until:
            return True
        return False

    def record_failed_login(self, max_attempts=5, lock_minutes=15):
        self.failed_attempts += 1
        if self.failed_attempts >= max_attempts:
            self.locked_until = timezone.now() + timedelta(minutes=lock_minutes)
        self.save(update_fields=['failed_attempts', 'locked_until'])

    def reset_failed_logins(self):
        if self.failed_attempts > 0 or self.locked_until is not None:
            self.failed_attempts = 0
            self.locked_until = None
            self.save(update_fields=['failed_attempts', 'locked_until'])


class PasswordReset(models.Model):
    reset_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_resets'

    def is_valid(self):
        return not self.used and timezone.now() <= self.expires_at


class Project(models.Model):
    STATUS_NOT_STARTED = 'Not Started'
    STATUS_ON_TRACK = 'On Track'
    STATUS_AT_RISK = 'At Risk'
    STATUS_ON_HOLD = 'On Hold'
    STATUS_COMPLETED = 'Completed'

    STATUS_CHOICES = [
        (STATUS_NOT_STARTED, 'Not Started'),
        (STATUS_ON_TRACK, 'On Track'),
        (STATUS_AT_RISK, 'At Risk'),
        (STATUS_ON_HOLD, 'On Hold'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    project_id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_projects')
    project_name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default='')
    start_date = models.DateField()
    deadline = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED, db_index=True)
    progress_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projects'
        ordering = ['deadline']

    def __str__(self):
        return self.project_name

    def recalculate_progress(self):
        """Calculate progress automatically: (completed tasks / total tasks) * 100"""
        total = self.tasks.count()
        if total == 0:
            self.progress_percent = Decimal('0.00')
        else:
            completed = self.tasks.filter(status=Task.STATUS_COMPLETED).count()
            self.progress_percent = round(Decimal(completed * 100) / Decimal(total), 2)
            # If all completed and status was not explicitly Completed
            if completed == total and total > 0 and self.status != self.STATUS_COMPLETED:
                self.status = self.STATUS_COMPLETED
            elif completed < total and self.status == self.STATUS_COMPLETED:
                self.status = self.STATUS_ON_TRACK
        self.save(update_fields=['progress_percent', 'status'])
        return self.progress_percent


class ProjectMember(models.Model):
    member_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_memberships')
    project_role = models.CharField(max_length=40, default='Team Member')
    responsibility = models.CharField(max_length=80, blank=True, default='')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_members'
        unique_together = ('project', 'user')

    def __str__(self):
        return f"{self.user.full_name} in {self.project.project_name} ({self.responsibility})"


class Task(models.Model):
    PRIORITY_LOW = 'Low'
    PRIORITY_MEDIUM = 'Medium'
    PRIORITY_HIGH = 'High'
    PRIORITY_CRITICAL = 'Critical'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_CRITICAL, 'Critical'),
    ]

    STATUS_TODO = 'To Do'
    STATUS_IN_PROGRESS = 'In Progress'
    STATUS_IN_REVIEW = 'In Review'
    STATUS_COMPLETED = 'Completed'

    STATUS_CHOICES = [
        (STATUS_TODO, 'To Do'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_IN_REVIEW, 'In Review'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    task_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    assignee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_tasks')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_TODO, db_index=True)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateTimeField(db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['due_date']

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def is_overdue(self):
        """FR-34: automatically flag a task as overdue when deadline passes and not completed"""
        if self.status != self.STATUS_COMPLETED and self.due_date:
            return timezone.now() > self.due_date
        return False

    def save(self, *args, **kwargs):
        if self.status == self.STATUS_COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != self.STATUS_COMPLETED and self.completed_at:
            self.completed_at = None
        super().save(*args, **kwargs)
        # Recalculate parent project's progress
        self.project.recalculate_progress()


class TaskComment(models.Model):
    comment_id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_comments')
    comment_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.full_name} on {self.task.title}"


class Notification(models.Model):
    TYPE_ASSIGNMENT = 'Assignment'
    TYPE_REMINDER = 'Reminder'
    TYPE_OVERDUE = 'Overdue'
    TYPE_PROJECT_UPDATE = 'Project Update'

    TYPE_CHOICES = [
        (TYPE_ASSIGNMENT, 'Assignment'),
        (TYPE_REMINDER, 'Reminder'),
        (TYPE_OVERDUE, 'Overdue'),
        (TYPE_PROJECT_UPDATE, 'Project Update'),
    ]

    notification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} to {self.user.full_name}: {self.message}"


class ActivityLog(models.Model):
    activity_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    action = models.CharField(max_length=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_log'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.action} ({self.created_at})"


class UserPreference(models.Model):
    preference_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    email_notifications = models.BooleanField(default=True)
    reminder_hours = models.IntegerField(default=24)
    default_period_days = models.IntegerField(default=7)

    class Meta:
        db_table = 'user_preferences'

    def __str__(self):
        return f"Preferences for {self.user.email}"
