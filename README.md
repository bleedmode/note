# Task Management App

A minimalist task management application with a focus on clean design and efficient task organization, featuring both task management and note-taking capabilities.

## Features

- Work/Private task separation
- Todo and Waiting sections
- Single-level nested tasks
- Task completion tracking
- Auto-archiving after 24 hours
- Drag-and-drop reordering
- Cross-list task movement
- Note organization with folders
- Real-time note saving
- Apple Notes-style text editing
- Pomodoro timer integration

## Getting Started

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Install dependencies:
```bash
cd task-app
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Tech Stack

- React
- Vite
- Local Storage for data persistence
- CSS for styling (no UI framework)

## Project Structure

```
task-app/
├── src/
│   ├── components/
│   │   ├── Notes.jsx
│   │   └── Pomodoro.jsx
│   ├── App.jsx
│   └── App.css
├── public/
│   └── vite.svg
├── PRD.md
└── README.md
```

## Documentation

See [PRD.md](PRD.md) for detailed product requirements and implementation details.