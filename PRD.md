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
- Smart title extraction from first non-empty content
- Separate preview content from title
- Auto-delete empty notes

#### Notes Layout
- Two-column layout with sidebar and content area
- No padding in main container for full-width experience
- Fixed 56px header height in both columns
- Full viewport height utilization (100vh)
- Transparent backgrounds for clean look

Implementation:
```css
.notes-layout {
  display: flex;
  width: 100%;
  height: 100vh;
}

.note-content {
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}
```

#### Notes Sidebar
- Width: 250px
- Border-right: 1px solid #e2e8f0
- Transparent background
- Scrollable note list
- Fixed header with folder name and delete button
- Trash icon for deleting selected note

Implementation:
```css
.notes-sidebar {
  width: 250px;
  height: 100vh;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  background-color: transparent;
}

.delete-note-button {
  border: none;
  background: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.delete-note-button:hover {
  color: #ef4444;
  opacity: 1;
}
```

#### Notes Content Area
- Flexible width (fills remaining space)
- Fixed header height (56px)
- Custom plus button for new notes
- Single text area for content
- First non-empty content becomes title
- Smart title/preview separation
- Auto-save functionality
- Clean, minimal styling
- Search functionality in header
- Search across all content

Implementation:
```css
.note-content-header {
  height: 56px;
  padding: 0 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: transparent;
}

/* Search bar styling */
.notes-search {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #64748b;
  width: 200px;
  outline: none;
}

.notes-search:focus {
  color: #0f172a;
  border: 1px solid #1e3a8a;
}
```

#### Note Interactions
- Click plus button to create new note
- First line automatically becomes title
- Auto-delete empty notes when clicking away
- Real-time saving
- Trash icon to delete selected note
- Smooth transitions between states
- Real-time search across titles and content

Implementation:
```jsx
// Search functionality
const [searchTerm, setSearchTerm] = useState('');

const filteredNotes = useMemo(() => {
  if (!searchTerm.trim()) return sortedNotes;
  
  const searchLower = searchTerm.toLowerCase();
  
  const filterNote = (note) => {
    const firstLine = note.content.split('\n')[0] || '';
    const matchesTitle = firstLine.toLowerCase().includes(searchLower);
    const matchesContent = note.content.toLowerCase().includes(searchLower);
    const matchingChildren = note.children?.some(filterNote) || false;
    
    return matchesTitle || matchesContent || matchingChildren;
  };
  
  return sortedNotes.filter(filterNote);
}, [sortedNotes, searchTerm]);

// Auto-delete functionality
const handleNoteBlur = (e) => {
  const noteContent = e.currentTarget.closest('.note-content');
  const newTarget = e.relatedTarget;
  
  if (!noteContent?.contains(newTarget) && isNoteEmpty(activeNote)) {
    deleteNote(activeNote.id);
  }
};

// Helper function to check if note is empty
const isNoteEmpty = (note) => {
  return !note.content.trim();
};
```

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