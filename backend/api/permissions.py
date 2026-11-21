from rest_framework import permissions
from .models import Role, ProjectMember


class IsAdmin(permissions.BasePermission):
    """Allows access only to Admin users."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and
            request.user.role and request.user.role.role_name == Role.ADMIN
        )


class IsProjectManagerOrAdmin(permissions.BasePermission):
    """Allows access to Admins and Project Managers."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if not request.user.role:
            return False
        return request.user.role.role_name in [Role.ADMIN, Role.PROJECT_MANAGER]


class IsProjectMemberOrAdmin(permissions.BasePermission):
    """
    Object-level permission: user must be an Admin, the project owner,
    or a confirmed member of the project.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role and request.user.role.role_name == Role.ADMIN:
            return True

        # If obj is a Project
        if hasattr(obj, 'owner'):
            if obj.owner == request.user:
                return True
            return ProjectMember.objects.filter(project=obj, user=request.user).exists()

        # If obj is a Task
        if hasattr(obj, 'project'):
            if obj.project.owner == request.user or obj.assignee == request.user:
                return True
            return ProjectMember.objects.filter(project=obj.project, user=request.user).exists()

        return False


class CanUpdateTaskStatus(permissions.BasePermission):
    """
    FR-33: Assignees can update only their own task status;
    a manager or admin can update any task in the project.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role and request.user.role.role_name == Role.ADMIN:
            return True
        if obj.project.owner == request.user:
            return True
        # If user is assignee, they can only PATCH status
        if obj.assignee == request.user:
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return True
            if request.method == 'PATCH':
                # Allowed to update status
                return True
            return False
        return False
