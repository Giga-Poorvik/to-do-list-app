"""
app.py - Smart To-Do Manager Flask Server

Provides a REST API and serves the frontend for managing tasks.

Routes:
    GET  /                      — Serve the main UI
    GET  /api/tasks             — List all tasks
    POST /api/tasks             — Create a new task
    PUT  /api/tasks/<task_id>   — Update an existing task
    DELETE /api/tasks/<task_id> — Delete a task
    GET  /api/tasks/search?q=   — Search tasks by title
"""

from flask import Flask, jsonify, render_template, request
from task_manager import TaskManager

# ---------------------------------------------------------------------------
# App & manager setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
task_manager = TaskManager()


# ---------------------------------------------------------------------------
# Frontend route
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Render the main To-Do Manager page."""
    return render_template("index.html")


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """Return all tasks as a JSON array."""
    return jsonify(task_manager.get_all_tasks())


@app.route("/api/tasks", methods=["POST"])
def add_task():
    """
    Create a new task.

    Expects JSON body with: title, description, priority, due_date.
    Returns the created task with HTTP 201.
    """
    data = request.json
    task = task_manager.add_task(
        title=data.get("title", ""),
        description=data.get("description", ""),
        priority=data.get("priority", "medium"),
        due_date=data.get("due_date", ""),
        due_time=data.get("due_time", ""),
    )
    return jsonify(task), 201


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    """
    Update an existing task.

    Expects JSON body with the fields to update.
    Returns the updated task or 404 if not found.
    """
    updates = request.json
    task = task_manager.update_task(task_id, updates)
    if task is None:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task)


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete a task by ID and return a confirmation message."""
    task_manager.delete_task(task_id)
    return jsonify({"message": "Task deleted successfully"})


@app.route("/api/tasks/search", methods=["GET"])
def search_tasks():
    """
    Search tasks by title (case-insensitive).

    Query parameter: q — the search string.
    """
    query = request.args.get("q", "")
    results = task_manager.search_tasks(query)
    return jsonify(results)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
