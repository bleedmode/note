# Task Management App PRD

## Overview
A minimalist task management application with a focus on clean design and efficient task organization, featuring both task management and note-taking capabilities.

## Design Principles
- Minimalist and clean interface
- Subtle visual feedback
- Consistent spacing and alignment
- Monochromatic color scheme
- Focus on content over decoration

## Visual Design

### Colors
- Background: White (#FFFFFF)
- Sidebar: Light gray-blue (#F8FAFC)
- Text: Slate-900 (#0F172A)
- Secondary text: Slate-500 (#64748B)
- Placeholder text: Slate-400 (#94A3B8)
- Borders & Strokes: Slate-200 (#E2E8F0)
- Accent Blue: Dark blue (#1E3A8A)
- Delete Red: #EF4444

### Typography
- Base font size: 14px
- Line height: 1.4
- Task text: 0.875rem
- Nested task text: 0.8125rem
- Counter text: 0.75rem
- Section headers: 1rem, Semi-bold
- Notes text: 0.875rem

### Layout
- Sidebar width: 200px
- Main content padding: 32px
- Section grid: 2 columns with 48px gap
- Vertical spacing: 16px between items
- Vertical separator between sections

### Interactive Elements

#### Task Editing
- Apple Notes-like direct text editing
- Click anywhere in text to place cursor
- ContentEditable text areas
- Real-time text updates
- Delete task when text is cleared
- Multi-line text support with automatic height adjustment
- Smooth text wrapping without overflow

#### Checkboxes
- Size: 16x16px
- Border: 1px solid Slate-600
- Border radius: 50%
- Checked state: Slate-900 background
- Checkmark: White
- Aligned with first line of text in multi-line tasks
- Position: 5px from top for optimal alignment
- Consistent alignment across single and multi-line tasks

#### Pomodoro Timer
- Digital clock display in sidebar
- Monospace font for timer
- Start/Pause button
- 25-minute countdown
- Minimal design matching app aesthetic
- Border: 1px solid Slate-500
- Subtle hover effects
- Centered time display

#### Add Task Input
- No visible border or background
- Plus icon: Dark blue, 26px
- Placeholder text in Slate-400
- Focus state: Text color changes to dark blue
- Hover state: Text color changes to dark blue

#### Task Counter
- Circle: 20x20px
- Border: 1px solid Slate-300
- No background fill
- Centered number
- Only counts main tasks (not nested)

#### Navigation Items
- Padding: 12px
- Border radius: 8px
- Hover: Light gray background (#F1F5F9)
- Active: White background

#### Drag Handle Design
- Visual appearance:
  - Three horizontal lines (hamburger menu style)
  - Line dimensions: 14px width, 1px height
  - Color: slate-400 (#94A3B8)
  - Spacing: 3px gap between lines
  - Height: 20px total
  - Vertical alignment: Centered with text
  - Margin-top: 4px for precise alignment
- Visibility:
  - Hidden by default (opacity: 0)
  - Appears on task hover (opacity: 0.5)
  - Full opacity on handle hover (opacity: 1.0)
- Transitions:
  - Smooth 0.2s ease for all state changes
  - Applies to opacity and color changes

#### Drag Handle CSS
```css
.drag-handle {
  opacity: 0;
  cursor: grab;
  color: #94a3b8;
  padding: 4px 8px;
  user-select: none;
  transition: all 0.2s ease;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: 20px;
  justify-content: center;
  align-self: center;
  margin-top: 4px;
}

/* Three horizontal lines */
.drag-handle::before,
.drag-handle::after,
.drag-handle span {
  content: '';
  display: block;
  width: 14px;
  height: 1px;
  background-color: currentColor;
  transition: all 0.2s ease;
}

/* Middle line */
.drag-handle span {
  content: none;
}

/* Hover states */
.task-item:hover .drag-handle {
  opacity: 0.5;
}

.drag-handle:hover {
  opacity: 1 !important;
  color: #64748b;
}
```

#### Drag and Drop Behavior
- Task dragging:
  - Only enabled when using drag handle
  - Cursor changes to grab/grabbing
  - Visual feedback during drag
  - Smooth transitions between states
- Drop zones:
  - Between tasks (blue line indicator)
  - End of uncompleted tasks section
  - End of completed tasks section
  - Maintains section separation
- Task ordering:
  - Preserves relative position within sections
  - Keeps completed tasks at bottom
  - Maintains order after list changes
  - Proper end-of-list handling

#### Drag and Drop Implementation
- Core functionality:
  ```jsx
  // Task item structure with drop handling
  <div 
    className="tasks-list"
    onDragOver={(e) => {
      e.preventDefault();
      if (e.target.classList.contains('tasks-list')) {
        e.currentTarget.classList.add('drag-over');
      }
    }}
    onDragLeave={(e) => {
      e.preventDefault();
      if (e.target.classList.contains('tasks-list')) {
        e.currentTarget.classList.remove('drag-over');
      }
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
      if (e.target.classList.contains('tasks-list')) {
        handleDrop(e, null, type);
      }
    }}
  >
    {/* Task items */}
  </div>
  ```

- Drop handling logic:
  ```jsx
  const handleDrop = (e, targetTaskId, targetType) => {
    e.preventDefault();
    const draggedTaskId = Number(e.dataTransfer.getData('taskId'));
    const draggedType = e.dataTransfer.getData('taskType');
    
    if (draggedTaskId === targetTaskId) return;

    const isWork = activeTab === 'work';
    const tasks = isWork ? [...workTasks] : [...privateTasks];
    const setTasks = isWork ? setWorkTasks : setPrivateTasks;

    // Find the task we're moving
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return;

    // Create new tasks array without the dragged task
    const newTasks = tasks.filter(t => t.id !== draggedTaskId);

    // Create a new task object with updated type
    const taskToInsert = { ...draggedTask, type: targetType };

    // Get all tasks of the target type and completion status
    const sectionTasks = newTasks.filter(t => 
      t.type === targetType && 
      t.completed === taskToInsert.completed
    );

    if (targetTaskId) {
      // Insert at specific position
      const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
      newTasks.splice(targetIndex, 0, taskToInsert);
    } else if (sectionTasks.length === 0) {
      // If section is empty, add at the start of the type section
      const firstTypeTask = newTasks.find(t => t.type === targetType);
      const insertIndex = firstTypeTask ? newTasks.indexOf(firstTypeTask) : newTasks.length;
      newTasks.splice(insertIndex, 0, taskToInsert);
    } else {
      // Add to end of section
      const lastSectionTask = sectionTasks[sectionTasks.length - 1];
      const insertIndex = newTasks.indexOf(lastSectionTask) + 1;
      newTasks.splice(insertIndex, 0, taskToInsert);
    }

    setTasks(newTasks);
  };
  ```

Key implementation features:
1. Precise drop target detection using classList checks
2. Immutable task updates when changing types
3. Section-aware task placement
4. Proper handling of empty sections
5. Consistent behavior across work/private contexts
6. Maintains completed/uncompleted task separation
7. Supports end-of-list drops
8. Clean state management
9. Preserves task properties during moves

### Nested Tasks
- Single level nesting only
- Indentation: 9px from parent
- Smaller checkboxes (16x16px)
- Slightly smaller text (0.8125rem)
- Compact spacing (2px padding)
- Add nested task button appears on hover

### Notes System
- Dedicated Notes section in sidebar
- Support for folder organization
- "All Notes" as default folder
- Ability to create custom folders
- Delete folder functionality
- Full-height text editor
- Automatic saving
- Clean, distraction-free interface

### Mobile Adaptations
- Sidebar moves to bottom
- Navigation becomes horizontal
- Grid becomes single column
- Preserved functionality with adjusted layout

### Task Layout
- Flexible height for multi-line content
- Consistent spacing with checkbox
- Smooth transitions for text editing
- No content overflow
- Clean text wrapping
- Preserved cursor position during editing
- Minimal visual feedback during interaction

- Drag handle:
  - Right-aligned in task container
  - Vertical dots (⋮) icon
  - Size: 18px
  - Color: slate-400 (#94A3B8)
  - Appears on task hover
  - Transitions: 0.2s ease all

- Completed tasks:
  - No background color
  - Text color: slate-400 (#94A3B8)
  - Text decoration: line-through
  - Smooth transition on state change

## Interactions
- Drag and drop between lists
- Drag and drop for reordering
- Click to add nested tasks
- Subtle color transitions on hover/focus
- Minimal visual feedback
- Focus on content editing
- Quick folder creation and deletion
- Automatic note saving

- Drag and drop behavior:
  - Handle appears on hover
  - Click and hold handle to initiate drag
  - Drop zones:
    - Between tasks
    - End of list
  - Visual feedback during drag
  - Maintains section separation
  - Preserves task state

## Key Features
1. Work/Private task separation
2. Todo and Waiting sections
3. Single-level nested tasks
4. Task completion tracking
5. Auto-archiving after 24 hours
6. Drag-and-drop reordering
7. Cross-list task movement
8. Note organization with folders
9. Real-time note saving
10. Folder management system
11. Apple Notes-style text editing
12. Pomodoro timer integration
13. Multi-line task support
14. Seamless text editing experience
15. Auto-deletion for empty tasks

## Technical Notes
- Local storage for data persistence
- React for UI components
- CSS for styling (no UI framework)
- Mobile-first responsive design
- Separate storage for tasks and notes
- ContentEditable implementation for text editing
- Custom checkbox alignment for multi-line text
- Timer state management
- Smooth height transitions for dynamic content

### Task Interaction Implementation
- Combined text editing and drag functionality:
  ```jsx
  <div
    className="task-item"
    draggable={false} // Default not draggable for text editing
    onDragOver={...}
    onDrop={...}
  >
    <div className="task-content">
      {/* Editable text area */}
      <div 
        className="task-text"
        contentEditable={true}
        suppressContentEditableWarning={true}
        spellCheck="false"
        onBlur={(e) => handleTextUpdate(e)}
        onKeyDown={(e) => handleEnterKey(e)}
      />
      
      {/* Drag handle with dynamic draggable behavior */}
      <div 
        className="drag-handle"
        onMouseDown={(e) => {
          const taskElement = e.currentTarget.closest('.task-item');
          taskElement.draggable = true;
          
          taskElement.ondragstart = (dragEvent) => {
            handleDragStart(dragEvent, taskId, type);
          };
          
          taskElement.ondragend = () => {
            taskElement.draggable = false;
            taskElement.ondragstart = null;
            taskElement.ondragend = null;
          };
        }}
      >
        ⋮
      </div>
    </div>
  </div>
  ```

- Key implementation details:
  1. Task container is not draggable by default
  2. Text area uses contentEditable for direct editing
  3. Drag handle enables dragging only when used
  4. Drag handlers are cleaned up after drag ends
  5. Event propagation is managed to prevent conflicts

- CSS considerations:
  ```css
  .task-text {
    flex: 1;
    cursor: text;
    min-width: 0;
    white-space: pre-wrap;
    word-break: break-word;
    -webkit-user-modify: read-write;
  }

  .drag-handle {
    opacity: 0;
    cursor: grab;
    user-select: none;
    margin-left: auto;
  }

  .task-item:hover .drag-handle {
    opacity: 0.5;
  }

  .drag-handle:hover {
    opacity: 1 !important;
  }
  ```

- State management:
  1. Text updates are handled through onBlur events
  2. Drag state is managed through HTML5 drag and drop API
  3. Task order is maintained in parent component state
  4. Completed tasks are rendered separately but follow same pattern

This implementation ensures:
- Seamless text editing experience
- Reliable drag and drop functionality
- No interference between the two features
- Clean and maintainable code structure
- Consistent behavior across browsers 