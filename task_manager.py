"""
task_manager.py - Smart To-Do Manager

A module for managing tasks with local JSON file storage.
Each task has a unique UUID, title, description, priority level,
due date, and completion tracking.
"""

import json
import os
import uuid
from datetime import date


# Path to the JSON file storing all tasks (same directory as this script)
TASKS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tasks.json")


class TaskManager:
    """Manages a collection of tasks persisted to a local JSON file."""

    def __init__(self):
        """Initialize the TaskManager and load existing tasks from disk."""
        self.tasks = []
        self.load_tasks()

    def load_tasks(self):
        """
        Load tasks from the JSON file.
        If the file doesn't exist or is invalid, start with an empty list.
        """
        if os.path.exists(TASKS_FILE):
            try:
                with open(TASKS_FILE, "r", encoding="utf-8") as f:
                    self.tasks = json.load(f)
            except (json.JSONDecodeError, IOError):
                # Corrupted or unreadable file — start fresh
                self.tasks = []
        else:
            self.tasks = []

    def save_tasks(self):
        """Write the current task list to the JSON file with pretty formatting."""
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(self.tasks, f, indent=2)

    def add_task(self, title, description, priority, due_date, due_time=""):
        """
        Create a new task and persist it.

        Args:
            title (str): Short name for the task.
            description (str): Detailed description.
            priority (str): One of 'high', 'medium', or 'low'.
            due_date (str): Target completion date in YYYY-MM-DD format.
            due_time (str): Target completion time in HH:MM format.

        Returns:
            dict: The newly created task.
        """
        task = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "priority": priority,
            "due_date": due_date,
            "due_time": due_time,
            "completed": False,
            "completed_date": None,
            "created_date": date.today().isoformat(),
        }
        self.tasks.append(task)
        self.save_tasks()
        return task

    def update_task(self, task_id, updates):
        """
        Update one or more fields of an existing task.

        Automatically manages the completed_date:
        - Sets it to today when a task is marked completed.
        - Clears it when a task is un-completed.

        Args:
            task_id (str): UUID of the task to update.
            updates (dict): Key-value pairs of fields to change.

        Returns:
            dict or None: The updated task, or None if not found.
        """
        for task in self.tasks:
            if task["id"] == task_id:
                # Detect completion state changes before applying updates
                was_completed = task["completed"]
                task.update(updates)
                is_completed = task["completed"]

                # Auto-set completed_date when marking as completed
                if is_completed and not was_completed:
                    task["completed_date"] = date.today().isoformat()

                # Clear completed_date when un-completing
                if not is_completed and was_completed:
                    task["completed_date"] = None

                self.save_tasks()
                return task

        return None

    def delete_task(self, task_id):
        """
        Remove a task by its ID.

        Args:
            task_id (str): UUID of the task to delete.
        """
        self.tasks = [t for t in self.tasks if t["id"] != task_id]
        self.save_tasks()

    def get_all_tasks(self):
        """
        Return every task in the list.

        Returns:
            list[dict]: All tasks.
        """
        return self.tasks

    def search_tasks(self, query):
        """
        Case-insensitive search for tasks whose title contains the query.

        Args:
            query (str): Search string to match against task titles.

        Returns:
            list[dict]: Tasks with matching titles.
        """
        query_lower = query.lower()
        return [t for t in self.tasks if query_lower in t["title"].lower()]
