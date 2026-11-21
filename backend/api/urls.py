from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView, LoginView, LogoutView, ForgotPasswordView, ResetPasswordView,
    DashboardSummaryView, GlobalSearchView,
    ProjectViewSet, ProjectMemberViewSet, TaskViewSet, TeamViewSet,
    CalendarView, ReportsView, NotificationViewSet,
    ProfileView, PasswordChangeView, PreferencesView
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'project-members', ProjectMemberViewSet, basename='project-member')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Auth endpoints (FR-01 to FR-08)
    path('auth/register', RegisterView.as_view(), name='register'),
    path('auth/login', LoginView.as_view(), name='login'),
    path('auth/logout', LogoutView.as_view(), name='logout'),
    path('auth/forgot-password', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password', ResetPasswordView.as_view(), name='reset-password'),

    # Dashboard & Search (FR-09 to FR-19)
    path('dashboard/summary', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('search', GlobalSearchView.as_view(), name='global-search'),

    # Team (FR-38 to FR-42)
    path('team', TeamViewSet.as_view(), name='team-directory'),

    # Calendar (FR-43 to FR-47)
    path('calendar', CalendarView.as_view(), name='calendar'),

    # Reports (FR-48 to FR-53)
    path('reports/<str:report_type>', ReportsView.as_view(), name='reports'),

    # Settings & Preferences (FR-60 to FR-62)
    path('settings/profile', ProfileView.as_view(), name='settings-profile'),
    path('settings/password', PasswordChangeView.as_view(), name='settings-password'),
    path('settings/preferences', PreferencesView.as_view(), name='settings-preferences'),

    # ViewSet routes
    path('', include(router.urls)),
]
