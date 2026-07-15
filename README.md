# do waise - Smart To-Do Manager

![do waise Preview](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge) ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**do waise** is a premium, locally-hosted Smart To-Do Management application built to solve the struggle of organizing daily tasks, prioritizing important work, and meeting deadlines efficiently. 

## 🌟 The Problem & Importance
In today's fast-paced environment, students and professionals often struggle to organize their daily tasks. Traditional task management methods (like paper notes or simple basic reminders) lack proper prioritization, real-time progress tracking, and task organization features.

**do waise** solves this by providing a digital, priority-based task management system. It introduces visual urgency, deadline tracking, and gamified streaks to improve productivity, ensure better time management, and help users stay hyper-organized.

## ✨ Key Features
- 🌗 **Premium Notion-like Interface:** A beautiful, responsive dark-themed dashboard.
- 🚦 **Smart Priority Tracking:** Sort and identify tasks visually.
  - 🔴 **Red:** Overdue tasks
  - 🟠 **Orange:** Nearing deadline (within 48 hours)
  - 🟣 **Purple:** Normal priority
  - 🟢 **Green:** Completed tasks
- ⏱️ **Live Countdown & Progress Bars:** Real-time countdown timers ticking down to your deadline, alongside dynamic progress bars.
- 🔥 **Activity & Streak Grid:** A GitHub-style contribution graph that gamifies your productivity by visually tracking your daily task completions.
- 🔍 **Real-time Search & Sort:** Instantly search through tasks or sort them by urgency and priority.
- 💾 **Local File Persistence:** Your data is 100% yours, stored locally in a highly readable `tasks.json` file.

## 🏗️ Architecture
The app uses a lightweight, decoupled architecture:
1. **Frontend:** Vanilla HTML, CSS (CSS variables, flexbox/grid), and JavaScript. No bulky frameworks.
2. **Backend:** Python with the Flask web framework serving a RESTful API.
3. **Storage:** Python's native `json` module providing simple, local file-based data persistence.

## 🚀 Getting Started

### Prerequisites
- Python 3.x installed on your machine.

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Giga-Poorvik/to-do-list-app.git
   cd to-do-list-app
   ```
2. **Install dependencies:**
   ```bash
   pip install flask
   ```
3. **Run the server:**
   ```bash
   python app.py
   ```
4. **Open the app:**
   Navigate to `http://127.0.0.1:5000` in your web browser.

## 📂 Folder Structure
```text
to-do-list-app/
├── app.py                 # Flask server and API routes
├── task_manager.py        # TaskManager class & CRUD operations
├── tasks.json             # Local database (auto-generated)
├── templates/
│   └── index.html         # Main dashboard markup
└── static/
    ├── css/
    │   └── style.css      # Premium dark theme styling
    └── js/
        └── app.js         # Frontend logic, API calls, and streak generation
```

---
*Built as a Smart Priority-Based Task Management System.*
