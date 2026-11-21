import csv
import uuid
import hashlib
from datetime import datetime, timedelta, time
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Case, When, IntegerField
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse

from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Role, User, PasswordReset, Project, ProjectMember,
    Task, TaskComment, Notification, ActivityLog, UserPreference
)
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    PasswordChangeSerializer, ForgotPasswordRequestSerializer,
    ResetPasswordConfirmSerializer, ProjectSerializer, ProjectMemberSerializer,
    TaskSerializer, TaskCommentSerializer, NotificationSerializer,
    ActivityLogSerializer, UserPreferenceSerializer
)
from .permissions import (
    IsAdmin, IsProjectManagerOrAdmin, IsProjectMemberOrAdmin, CanUpdateTaskStatus
)


# ==============================================================================
# AUTHENTICATION VIEWS (FR-01 to FR-08)
# ==============================================================================

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Registration successful.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        password = serializer.validated_data['password']

        user = User.objects.filter(email__iexact=email).first()

        if user:
            # FR-07: check if account is currently locked out
            if user.is_locked:
                remaining_mins = int((user.locked_until - timezone.now()).total_seconds() / 60) + 1
                return Response({
                    'detail': f"Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in {remaining_mins} minute(s)."
                }, status=status.HTTP_403_FORBIDDEN)

            if user.check_password(password):
                if not user.is_active:
                    return Response({'detail': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)
                
                # Reset failed login counter on success
                user.reset_failed_logins()

                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                }, status=status.HTTP_200_OK)
            else:
                # Password incorrect -> record failed attempt
                user.record_failed_login(
                    max_attempts=getattr(settings, 'MAX_FAILED_LOGIN_ATTEMPTS', 5),
                    lock_minutes=getattr(settings, 'LOCKOUT_DURATION_MINUTES', 15)
                )
                if user.is_locked:
                    return Response({
                        'detail': f"Account locked for {settings.LOCKOUT_DURATION_MINUTES} minutes due to 5 failed login attempts."
                    }, status=status.HTTP_403_FORBIDDEN)

                remaining = getattr(settings, 'MAX_FAILED_LOGIN_ATTEMPTS', 5) - user.failed_attempts
                return Response({
                    'detail': f"Invalid credentials. {remaining} attempt(s) remaining before temporary lockout."
                }, status=status.HTTP_401_UNAUTHORIZED)

        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower()
        user = User.objects.filter(email__iexact=email).first()

        # Always return neutral message so account existence is not revealed (Security requirement)
        neutral_message = "If an account with that email exists, a password reset link has been sent."

        if user:
            # Generate single-use token valid for 30 minutes (FR-05, NFR-10)
            raw_token = uuid.uuid4().hex
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            expires_at = timezone.now() + timedelta(minutes=30)

            PasswordReset.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=expires_at,
                used=False
            )

            reset_url = f"http://localhost:5173/reset-password?token={raw_token}"
            email_body = (
                f"Hello {user.full_name},\n\n"
                f"You requested a password reset for your ProjectFlow account.\n"
                f"Please click the link below or paste it into your browser to reset your password:\n\n"
                f"{reset_url}\n\n"
                f"This link is single-use and will expire in 30 minutes.\n"
                f"If you did not request this, please ignore this email."
            )

            send_mail(
                subject="ProjectFlow Password Reset",
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response({'message': neutral_message}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        raw_token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

        reset_record = PasswordReset.objects.filter(token_hash=token_hash).first()

        if not reset_record or not reset_record.is_valid():
            return Response({
                'detail': 'Invalid or expired password reset token. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = reset_record.user
        user.set_password(new_password)
        user.reset_failed_logins()
        user.save()

        # Invalidate the token (single use)
        reset_record.used = True
        reset_record.save(update_fields=['used'])

        return Response({'message': 'Password has been successfully reset. You may now log in.'}, status=status.HTTP_200_OK)


# ==============================================================================
# DASHBOARD SUMMARY VIEW (FR-09 to FR-19)
# ==============================================================================

class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        period_days = int(request.query_params.get('period', 7))
        now = timezone.now()

        # Scope projects to user
        if user.role and user.role.role_name == Role.ADMIN:
            projects_qs = Project.objects.all()
        else:
            projects_qs = Project.objects.filter(
                Q(owner=user) | Q(members__user=user)
            ).distinct()

        project_ids = projects_qs.values_list('project_id', flat=True)
        tasks_qs = Task.objects.filter(project_id__in=project_ids)

        # 4 Summary Cards counts
        total_projects = projects_qs.count()
        tasks_completed = tasks_qs.filter(status=Task.STATUS_COMPLETED).count()
        pending_tasks = tasks_qs.exclude(status=Task.STATUS_COMPLETED).count()
        overdue_tasks = tasks_qs.filter(due_date__lt=now).exclude(status=Task.STATUS_COMPLETED).count()

        # My Projects cards (Top 3 for dashboard matching screenshot)
        projects_data = ProjectSerializer(projects_qs[:6], many=True).data

        # Upcoming Tasks panel (due soonest, excluding completed)
        upcoming_tasks_qs = tasks_qs.order_by('due_date')[:5]
        upcoming_tasks_data = TaskSerializer(upcoming_tasks_qs, many=True).data

        # Recent Activity Feed (FR-15)
        activities = ActivityLog.objects.filter(
            Q(project_id__in=project_ids) | Q(user=user)
        ).select_related('user', 'project')[:10]
        activity_data = ActivityLogSerializer(activities, many=True).data

        # Project Overview Chart data (FR-14: 7D, 30D, 90D)
        # Generate trend datapoints showing completion curve
        start_date = (now - timedelta(days=period_days)).date()
        chart_data = []
        step = max(1, period_days // 7)
        for i in range(0, period_days + 1, step):
            d = start_date + timedelta(days=i)
            day_end = timezone.make_aware(datetime.combine(d, time.max))
            
            # Tasks completed on or before day_end
            cum_completed = tasks_qs.filter(
                status=Task.STATUS_COMPLETED,
                completed_at__lte=day_end
            ).count()
            total_at_point = tasks_qs.filter(created_at__lte=day_end).count()

            pct = round((cum_completed / total_at_point * 100), 1) if total_at_point > 0 else 0
            chart_data.append({
                'date': d.strftime('%b %d'),
                'progress': pct,
                'completed': cum_completed,
            })

        # Calendar markers for current month (FR-17)
        cur_year = now.year
        cur_month = now.month
        month_tasks = tasks_qs.filter(due_date__year=cur_year, due_date__month=cur_month)
        marked_days = set(month_tasks.values_list('due_date__day', flat=True))

        return Response({
            'user': {
                'full_name': user.full_name,
                'greeting': self.get_greeting(),
                'designation': user.designation or 'Member',
                'profile_image': user.profile_image
            },
            'summary': {
                'total_projects': total_projects,
                'projects_growth': '+2',
                'tasks_completed': tasks_completed,
                'completed_growth': '+12%',
                'pending_tasks': pending_tasks,
                'overdue_tasks': overdue_tasks,
            },
            'my_projects': projects_data,
            'upcoming_tasks': upcoming_tasks_data,
            'activity_feed': activity_data,
            'chart_data': chart_data,
            'mini_calendar': {
                'year': cur_year,
                'month': cur_month,
                'today': now.day,
                'deadline_days': list(marked_days),
            }
        }, status=status.HTTP_200_OK)

    def get_greeting(self):
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return "Good Morning"
        elif 12 <= hour < 17:
            return "Good Afternoon"
        else:
            return "Good Evening"


# ==============================================================================
# GLOBAL SEARCH VIEW (FR-18)
# ==============================================================================

class GlobalSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'projects': [], 'tasks': []})

        user = request.user
        if user.role and user.role.role_name == Role.ADMIN:
            projects_qs = Project.objects.all()
        else:
            projects_qs = Project.objects.filter(
                Q(owner=user) | Q(members__user=user)
            ).distinct()

        project_ids = projects_qs.values_list('project_id', flat=True)

        matching_projects = projects_qs.filter(
            Q(project_name__icontains=query) | Q(description__icontains=query)
        )[:10]

        matching_tasks = Task.objects.filter(
            project_id__in=project_ids
        ).filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        )[:15]

        return Response({
            'projects': ProjectSerializer(matching_projects, many=True).data,
            'tasks': TaskSerializer(matching_tasks, many=True).data,
        })


# ==============================================================================
# PROJECT VIEWSET (FR-20 to FR-28)
# ==============================================================================

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role and user.role.role_name == Role.ADMIN:
            qs = Project.objects.all()
        else:
            qs = Project.objects.filter(
                Q(owner=user) | Q(members__user=user)
            ).distinct()

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        # Search by keyword
        search_param = self.request.query_params.get('search')
        if search_param:
            qs = qs.filter(
                Q(project_name__icontains=search_param) | Q(description__icontains=search_param)
            )

        # Sort
        sort_by = self.request.query_params.get('sort', 'deadline')
        if sort_by in ['deadline', '-deadline', 'created_at', '-created_at', 'progress_percent', '-progress_percent']:
            qs = qs.order_by(sort_by)
        else:
            qs = qs.order_by('deadline')

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role and user.role.role_name == Role.TEAM_MEMBER:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Team Members are not authorized to create projects.")

        project = serializer.save(owner=user)
        # Automatically add the creator as Project Manager member
        ProjectMember.objects.create(
            project=project,
            user=user,
            project_role='Project Manager',
            responsibility='Project Lead'
        )

        # Log activity
        ActivityLog.objects.create(
            user=user,
            project=project,
            action=f"New project created: {project.project_name}"
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        project = serializer.save()

        # If status changed, notify project members (FR-56)
        if old_status != project.status:
            members = ProjectMember.objects.filter(project=project).select_related('user')
            notifications = [
                Notification(
                    user=m.user,
                    project=project,
                    type=Notification.TYPE_PROJECT_UPDATE,
                    message=f"Project '{project.project_name}' status changed to {project.status}."
                )
                for m in members if m.user != self.request.user
            ]
            Notification.objects.bulk_create(notifications)

            ActivityLog.objects.create(
                user=self.request.user,
                project=project,
                action=f"Updated status of project: {project.project_name} to {project.status}"
            )

    def perform_destroy(self, instance):
        # Only owner or admin can delete
        user = self.request.user
        if instance.owner != user and (not user.role or user.role.role_name != Role.ADMIN):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only project owners or administrators can delete projects.")

        ActivityLog.objects.create(
            user=user,
            action=f"Deleted project: {instance.project_name}"
        )
        instance.delete()

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """FR-28: project detail page showing tasks, members, progress and activity"""
        project = self.get_object()
        tasks = project.tasks.select_related('assignee', 'created_by').all()
        members = project.members.select_related('user').all()
        activities = ActivityLog.objects.filter(project=project)[:10]

        return Response({
            'project': ProjectSerializer(project).data,
            'tasks': TaskSerializer(tasks, many=True).data,
            'members': ProjectMemberSerializer(members, many=True).data,
            'activities': ActivityLogSerializer(activities, many=True).data,
        })


# ==============================================================================
# PROJECT MEMBERS VIEWSET (FR-38 to FR-42)
# ==============================================================================

class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return ProjectMember.objects.filter(project_id=project_id)
        return ProjectMember.objects.all()

    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project')
        user_id = request.data.get('user')
        project_role = request.data.get('project_role', 'Team Member')
        responsibility = request.data.get('responsibility', '')

        project = get_object_or_404(Project, pk=project_id)
        user_to_add = get_object_or_404(User, pk=user_id)

        # Check permission: only project owner or admin
        if project.owner != request.user and (not request.user.role or request.user.role.role_name != Role.ADMIN):
            return Response({'detail': 'Only the project manager or admin can add members.'}, status=status.HTTP_403_FORBIDDEN)

        member, created = ProjectMember.objects.get_or_create(
            project=project,
            user=user_to_add,
            defaults={
                'project_role': project_role,
                'responsibility': responsibility,
            }
        )
        if not created:
            return Response({'detail': 'User is already a member of this project.'}, status=status.HTTP_400_BAD_REQUEST)

        # Log activity
        ActivityLog.objects.create(
            user=user_to_add,
            project=project,
            action=f"{user_to_add.full_name} joined the project"
        )

        # Send notification to user
        Notification.objects.create(
            user=user_to_add,
            project=project,
            type=Notification.TYPE_PROJECT_UPDATE,
            message=f"You were added to project '{project.project_name}' as {project_role} ({responsibility})."
        )

        return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        project = member.project
        user_to_remove = member.user

        # Reassign open tasks if reassign_to provided (FR-42)
        reassign_to_id = request.query_params.get('reassign_to')
        open_tasks = Task.objects.filter(project=project, assignee=user_to_remove).exclude(status=Task.STATUS_COMPLETED)

        if open_tasks.exists():
            if not reassign_to_id:
                return Response({
                    'detail': f"Member has {open_tasks.count()} open task(s). Please specify a replacement team member to reassign them.",
                    'open_tasks_count': open_tasks.count(),
                    'requires_reassignment': True
                }, status=status.HTTP_400_BAD_REQUEST)

            reassign_to_user = get_object_or_404(User, pk=reassign_to_id)
            open_tasks.update(assignee=reassign_to_user)

            Notification.objects.create(
                user=reassign_to_user,
                project=project,
                type=Notification.TYPE_ASSIGNMENT,
                message=f"{open_tasks.count()} tasks in '{project.project_name}' were reassigned to you."
            )

        member.delete()
        ActivityLog.objects.create(
            user=request.user,
            project=project,
            action=f"Removed {user_to_remove.full_name} from project {project.project_name}"
        )

        return Response({'message': 'Member removed successfully.'}, status=status.HTTP_200_OK)


# ==============================================================================
# TASK VIEWSET (FR-29 to FR-37)
# ==============================================================================

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role and user.role.role_name == Role.ADMIN:
            qs = Task.objects.all()
        else:
            projects = Project.objects.filter(Q(owner=user) | Q(members__user=user)).values_list('project_id', flat=True)
            qs = Task.objects.filter(project_id__in=projects)

        # Filters (FR-36)
        project_param = self.request.query_params.get('project')
        if project_param:
            qs = qs.filter(project_id=project_param)

        assignee_param = self.request.query_params.get('assignee')
        if assignee_param:
            qs = qs.filter(assignee_id=assignee_param)

        priority_param = self.request.query_params.get('priority')
        if priority_param:
            qs = qs.filter(priority=priority_param)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        # View mode: pending vs completed
        view_mode = self.request.query_params.get('view')
        if view_mode == 'completed':
            qs = qs.filter(status=Task.STATUS_COMPLETED)
        elif view_mode == 'pending':
            qs = qs.exclude(status=Task.STATUS_COMPLETED)
        elif view_mode == 'overdue':
            qs = qs.filter(due_date__lt=timezone.now()).exclude(status=Task.STATUS_COMPLETED)

        search_param = self.request.query_params.get('search')
        if search_param:
            qs = qs.filter(Q(title__icontains=search_param) | Q(description__icontains=search_param))

        return qs.order_by('due_date')

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)

        # Send notification to assignee (FR-57)
        if task.assignee != self.request.user:
            Notification.objects.create(
                user=task.assignee,
                project=task.project,
                task=task,
                type=Notification.TYPE_ASSIGNMENT,
                message=f"You have been assigned task: '{task.title}' in '{task.project.project_name}'."
            )

        ActivityLog.objects.create(
            user=self.request.user,
            project=task.project,
            task=task,
            action=f"Created task: {task.title}"
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        task = serializer.save()

        # If status changed to Completed, log activity
        if old_status != task.status and task.status == Task.STATUS_COMPLETED:
            ActivityLog.objects.create(
                user=self.request.user,
                project=task.project,
                task=task,
                action=f"Completed Task: {task.title}"
            )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """FR-33: Assignee can update their own status; PM/Admin can update any"""
        task = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Task.STATUS_TODO, Task.STATUS_IN_PROGRESS, Task.STATUS_IN_REVIEW, Task.STATUS_COMPLETED]:
            return Response({'detail': 'Invalid status choice.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        is_admin = user.role and user.role.role_name == Role.ADMIN
        is_pm = task.project.owner == user
        is_assignee = task.assignee == user

        if not (is_admin or is_pm or is_assignee):
            return Response({'detail': 'You are not authorized to update this task status.'}, status=status.HTTP_403_FORBIDDEN)

        task.status = new_status
        task.save()

        # Log completion
        if new_status == Task.STATUS_COMPLETED:
            ActivityLog.objects.create(
                user=user,
                project=task.project,
                task=task,
                action=f"You completed Task: {task.title}" if is_assignee else f"{user.full_name} marked {task.title} as Completed"
            )

        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """FR-37: Task comments"""
        task = self.get_object()
        if request.method == 'GET':
            comments = task.comments.select_related('user').all()
            return Response(TaskCommentSerializer(comments, many=True).data)

        comment_text = request.data.get('comment_text', '').strip()
        if not comment_text:
            return Response({'detail': 'Comment text is required.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = TaskComment.objects.create(
            task=task,
            user=request.user,
            comment_text=comment_text
        )
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


# ==============================================================================
# TEAM DIRECTORY VIEW (FR-38 to FR-41)
# ==============================================================================

class TeamViewSet(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role and user.role.role_name == Role.ADMIN:
            users_qs = User.objects.all()
        else:
            projects = Project.objects.filter(Q(owner=user) | Q(members__user=user)).values_list('project_id', flat=True)
            member_user_ids = ProjectMember.objects.filter(project_id__in=projects).values_list('user_id', flat=True)
            users_qs = User.objects.filter(Q(user_id__in=member_user_ids) | Q(user_id=user.user_id)).distinct()

        results = []
        for u in users_qs:
            memberships = ProjectMember.objects.filter(user=u).select_related('project')
            assigned_tasks = Task.objects.filter(assignee=u)
            total_tasks = assigned_tasks.count()
            completed_tasks = assigned_tasks.filter(status=Task.STATUS_COMPLETED).count()
            pending_tasks = assigned_tasks.exclude(status=Task.STATUS_COMPLETED).count()
            overdue_tasks = assigned_tasks.filter(due_date__lt=timezone.now()).exclude(status=Task.STATUS_COMPLETED).count()

            responsibilities = list(set(filter(None, memberships.values_list('responsibility', flat=True))))
            projects_list = [{'id': m.project.project_id, 'name': m.project.project_name, 'role': m.project_role} for m in memberships]

            results.append({
                'user_id': u.user_id,
                'full_name': u.full_name,
                'email': u.email,
                'system_role': u.role.role_name if u.role else 'Team Member',
                'designation': u.designation or 'Member',
                'profile_image': u.profile_image,
                'responsibilities': responsibilities,
                'projects': projects_list,
                'workload': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'pending_tasks': pending_tasks,
                    'overdue_tasks': overdue_tasks,
                }
            })

        return Response(results, status=status.HTTP_200_OK)


# ==============================================================================
# CALENDAR VIEW (FR-43 to FR-47)
# ==============================================================================

class CalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        month_str = request.query_params.get('month')  # e.g. "2026-11"
        if month_str:
            try:
                year, month = map(int, month_str.split('-'))
            except ValueError:
                year, month = timezone.now().year, timezone.now().month
        else:
            year, month = timezone.now().year, timezone.now().month

        if user.role and user.role.role_name == Role.ADMIN:
            projects_qs = Project.objects.all()
        else:
            projects_qs = Project.objects.filter(Q(owner=user) | Q(members__user=user)).distinct()

        project_ids = projects_qs.values_list('project_id', flat=True)

        # Tasks due in this month
        tasks = Task.objects.filter(
            project_id__in=project_ids,
            due_date__year=year,
            due_date__month=month
        ).select_related('project', 'assignee')

        # Projects with deadlines in this month
        projects_deadlines = projects_qs.filter(
            deadline__year=year,
            deadline__month=month
        )

        events_by_day = {}
        for task in tasks:
            day = task.due_date.day
            if day not in events_by_day:
                events_by_day[day] = []
            events_by_day[day].append({
                'id': task.task_id,
                'type': 'task',
                'title': task.title,
                'project_name': task.project.project_name,
                'assignee_name': task.assignee.full_name,
                'priority': task.priority,
                'status': task.status,
                'due_date': task.due_date.isoformat(),
                'is_overdue': task.is_overdue
            })

        for proj in projects_deadlines:
            day = proj.deadline.day
            if day not in events_by_day:
                events_by_day[day] = []
            events_by_day[day].append({
                'id': proj.project_id,
                'type': 'project_deadline',
                'title': f"Project Deadline: {proj.project_name}",
                'project_name': proj.project_name,
                'status': proj.status,
                'progress_percent': str(proj.progress_percent),
                'deadline': proj.deadline.isoformat(),
            })

        return Response({
            'year': year,
            'month': month,
            'events_by_day': events_by_day
        }, status=status.HTTP_200_OK)

    def post(self, request):
        """FR-46: Create or reschedule a task from calendar"""
        action = request.data.get('action', 'create')
        if action == 'reschedule':
            task_id = request.data.get('task_id')
            new_due_date = request.data.get('due_date')
            task = get_object_or_404(Task, pk=task_id)
            task.due_date = new_due_date
            task.save()
            return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            task = serializer.save(created_by=request.user)
            return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# REPORTS & ANALYTICS VIEW (FR-48 to FR-53)
# ==============================================================================

class ReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, report_type):
        user = request.user
        export_csv = request.query_params.get('export') == 'csv'

        if user.role and user.role.role_name == Role.ADMIN:
            projects_qs = Project.objects.all()
        else:
            projects_qs = Project.objects.filter(Q(owner=user) | Q(members__user=user)).distinct()

        project_id = request.query_params.get('project')
        if project_id:
            projects_qs = projects_qs.filter(project_id=project_id)

        project_ids = projects_qs.values_list('project_id', flat=True)
        tasks_qs = Task.objects.filter(project_id__in=project_ids)

        member_id = request.query_params.get('member')
        if member_id:
            tasks_qs = tasks_qs.filter(assignee_id=member_id)

        # 1. Project Progress Report (FR-48)
        if report_type == 'project-progress':
            data = []
            for p in projects_qs:
                days_remaining = (p.deadline - timezone.now().date()).days
                data.append({
                    'project_id': p.project_id,
                    'project_name': p.project_name,
                    'status': p.status,
                    'progress_percent': float(p.progress_percent),
                    'start_date': str(p.start_date),
                    'deadline': str(p.deadline),
                    'days_remaining': days_remaining if days_remaining >= 0 else 0,
                    'is_overdue': days_remaining < 0 and p.status != Project.STATUS_COMPLETED,
                    'total_tasks': p.tasks.count(),
                    'completed_tasks': p.tasks.filter(status=Task.STATUS_COMPLETED).count()
                })

            if export_csv:
                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="project_progress_report.csv"'
                writer = csv.writer(response)
                writer.writerow(['Project Name', 'Status', 'Progress (%)', 'Start Date', 'Deadline', 'Days Remaining', 'Total Tasks', 'Completed Tasks'])
                for item in data:
                    writer.writerow([item['project_name'], item['status'], item['progress_percent'], item['start_date'], item['deadline'], item['days_remaining'], item['total_tasks'], item['completed_tasks']])
                return response

            return Response({'report': 'Project Progress', 'data': data})

        # 2. Task Completion Report (FR-49)
        elif report_type == 'task-completion':
            total = tasks_qs.count()
            completed = tasks_qs.filter(status=Task.STATUS_COMPLETED).count()
            pending = tasks_qs.exclude(status=Task.STATUS_COMPLETED).count()
            overdue = tasks_qs.filter(due_date__lt=timezone.now()).exclude(status=Task.STATUS_COMPLETED).count()

            # Status distribution (for donut chart - FR-51)
            status_dist = [
                {'name': 'Completed', 'value': completed, 'color': '#10B981'},
                {'name': 'In Progress', 'value': tasks_qs.filter(status=Task.STATUS_IN_PROGRESS).count(), 'color': '#8B5CF6'},
                {'name': 'In Review', 'value': tasks_qs.filter(status=Task.STATUS_IN_REVIEW).count(), 'color': '#3B82F6'},
                {'name': 'To Do', 'value': tasks_qs.filter(status=Task.STATUS_TODO).count(), 'color': '#6B7280'},
            ]

            # Priority distribution
            priority_dist = [
                {'name': 'Low', 'value': tasks_qs.filter(priority=Task.PRIORITY_LOW).count()},
                {'name': 'Medium', 'value': tasks_qs.filter(priority=Task.PRIORITY_MEDIUM).count()},
                {'name': 'High', 'value': tasks_qs.filter(priority=Task.PRIORITY_HIGH).count()},
                {'name': 'Critical', 'value': tasks_qs.filter(priority=Task.PRIORITY_CRITICAL).count()},
            ]

            data = {
                'total_tasks': total,
                'completed': completed,
                'pending': pending,
                'overdue': overdue,
                'completion_rate': round((completed / total * 100), 1) if total > 0 else 0,
                'status_distribution': status_dist,
                'priority_distribution': priority_dist,
            }

            if export_csv:
                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="task_completion_report.csv"'
                writer = csv.writer(response)
                writer.writerow(['Metric', 'Count'])
                writer.writerow(['Total Tasks', total])
                writer.writerow(['Completed Tasks', completed])
                writer.writerow(['Pending Tasks', pending])
                writer.writerow(['Overdue Tasks', overdue])
                writer.writerow(['Completion Rate (%)', data['completion_rate']])
                return response

            return Response({'report': 'Task Completion', 'data': data})

        # 3. Team Performance Report (FR-50)
        elif report_type == 'team-performance':
            team_members = User.objects.filter(
                assigned_tasks__project_id__in=project_ids
            ).distinct()

            data = []
            for tm in team_members:
                assigned = tasks_qs.filter(assignee=tm)
                t_count = assigned.count()
                c_count = assigned.filter(status=Task.STATUS_COMPLETED).count()
                o_count = assigned.filter(due_date__lt=timezone.now()).exclude(status=Task.STATUS_COMPLETED).count()
                p_count = t_count - c_count
                rate = round((c_count / t_count * 100), 1) if t_count > 0 else 0

                data.append({
                    'user_id': tm.user_id,
                    'full_name': tm.full_name,
                    'email': tm.email,
                    'designation': tm.designation or 'Member',
                    'assigned_tasks': t_count,
                    'completed_tasks': c_count,
                    'pending_tasks': p_count,
                    'overdue_tasks': o_count,
                    'completion_rate': rate,
                })

            if export_csv:
                response = HttpResponse(content_type='text/csv')
                response['Content-Disposition'] = 'attachment; filename="team_performance_report.csv"'
                writer = csv.writer(response)
                writer.writerow(['Member Name', 'Email', 'Assigned', 'Completed', 'Pending', 'Overdue', 'Completion Rate (%)'])
                for item in data:
                    writer.writerow([item['full_name'], item['email'], item['assigned_tasks'], item['completed_tasks'], item['pending_tasks'], item['overdue_tasks'], item['completion_rate']])
                return response

            return Response({'report': 'Team Performance', 'data': data})

        return Response({'detail': 'Unknown report type.'}, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# NOTIFICATIONS VIEWSET (FR-54 to FR-59)
# ==============================================================================

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


# ==============================================================================
# SETTINGS & PREFERENCES VIEWS (FR-60 to FR-62)
# ==============================================================================

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        user = request.user
        user.full_name = request.data.get('full_name', user.full_name)
        user.designation = request.data.get('designation', user.designation)
        user.profile_image = request.data.get('profile_image', user.profile_image)
        user.theme_preference = request.data.get('theme_preference', user.theme_preference)

        new_email = request.data.get('email', '').strip().lower()
        if new_email and new_email != user.email:
            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response({'email': 'This email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            user.email = new_email

        user.save()
        return Response(UserSerializer(user).data)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response({'old_password': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password updated successfully.'})


class PreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        return Response(UserPreferenceSerializer(pref).data)

    def put(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
