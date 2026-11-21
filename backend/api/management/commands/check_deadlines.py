from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Task, Notification, Project


class Command(BaseCommand):
    help = 'Checks tasks and projects for upcoming deadlines and overdue statuses, creating notifications'

    def handle(self, *args, **options):
        now = timezone.now()
        reminders_created = 0
        overdue_created = 0

        # 1. Upcoming Deadline Reminders (default 24h window)
        reminder_window_start = now
        reminder_window_end = now + timedelta(hours=24)

        upcoming_tasks = Task.objects.filter(
            due_date__gte=reminder_window_start,
            due_date__lte=reminder_window_end
        ).exclude(status=Task.STATUS_COMPLETED).select_related('assignee', 'project', 'project__owner')

        for task in upcoming_tasks:
            # Check if notification already sent in last 24h
            already_notified = Notification.objects.filter(
                user=task.assignee,
                task=task,
                type=Notification.TYPE_REMINDER,
                created_at__gte=now - timedelta(hours=24)
            ).exists()

            if not already_notified:
                Notification.objects.create(
                    user=task.assignee,
                    project=task.project,
                    task=task,
                    type=Notification.TYPE_REMINDER,
                    message=f"Upcoming deadline: Task '{task.title}' is due in less than 24 hours ({task.due_date.strftime('%b %d, %I:%M %p')})."
                )
                reminders_created += 1

        # 2. Overdue Alerts (FR-55: notify assignee and project manager when a task becomes overdue)
        overdue_tasks = Task.objects.filter(
            due_date__lt=now
        ).exclude(status=Task.STATUS_COMPLETED).select_related('assignee', 'project', 'project__owner')

        for task in overdue_tasks:
            # Check if overdue alert already sent in last 24h for assignee
            already_notified_assignee = Notification.objects.filter(
                user=task.assignee,
                task=task,
                type=Notification.TYPE_OVERDUE,
                created_at__gte=now - timedelta(hours=24)
            ).exists()

            if not already_notified_assignee:
                Notification.objects.create(
                    user=task.assignee,
                    project=task.project,
                    task=task,
                    type=Notification.TYPE_OVERDUE,
                    message=f"Overdue Alert: Task '{task.title}' passed its deadline on {task.due_date.strftime('%b %d, %I:%M %p')}."
                )
                overdue_created += 1

            # Also notify project manager if different from assignee
            pm = task.project.owner
            if pm != task.assignee:
                already_notified_pm = Notification.objects.filter(
                    user=pm,
                    task=task,
                    type=Notification.TYPE_OVERDUE,
                    created_at__gte=now - timedelta(hours=24)
                ).exists()

                if not already_notified_pm:
                    Notification.objects.create(
                        user=pm,
                        project=task.project,
                        task=task,
                        type=Notification.TYPE_OVERDUE,
                        message=f"Overdue Alert: Task '{task.title}' assigned to {task.assignee.full_name} is overdue."
                    )
                    overdue_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Check completed: {reminders_created} deadline reminders created, {overdue_created} overdue alerts created."
        ))
