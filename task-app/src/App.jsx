import { useState, useEffect, useRef } from 'react'
import './App.css'
import Notes from './components/Notes'
import Pomodoro from './components/Pomodoro'

function App() {
  // Add state to track active tab
  const [activeTab, setActiveTab] = useState('work') // 'work' or 'private'
  // Load initial state from localStorage or use empty arrays
  const [workTasks, setWorkTasks] = useState(() => {
    const saved = localStorage.getItem('workTasks')
    return saved ? JSON.parse(saved) : []
  })
  const [privateTasks, setPrivateTasks] = useState(() => {
    const saved = localStorage.getItem('privateTasks')
    return saved ? JSON.parse(saved) : []
  })
  const [newTask, setNewTask] = useState('')
  const [newWaitingTask, setNewWaitingTask] = useState('')
  const [newTodoTask, setNewTodoTask] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  // Add new state for note folders at the top of the App component
  const [noteFolders, setNoteFolders] = useState(() => {
    const saved = localStorage.getItem('noteFolders')
    return saved ? JSON.parse(saved) : ['All Notes']
  })
  // Add these state variables at the top with other state declarations
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  // Add dragOver state to track the drop target
  const [dragOverTask, setDragOverTask] = useState(null);

  // Save to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('workTasks', JSON.stringify(workTasks))
  }, [workTasks])

  useEffect(() => {
    localStorage.setItem('privateTasks', JSON.stringify(privateTasks))
  }, [privateTasks])

  // Check for tasks to archive every minute
  useEffect(() => {
    const archiveInterval = setInterval(archiveOldTasks, 60000)
    return () => clearInterval(archiveInterval)
  }, [workTasks, privateTasks])

  // Function to archive tasks completed more than 24 hours ago
  const archiveOldTasks = () => {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    setWorkTasks(workTasks.filter(task => 
      !task.completed || !task.completedAt || task.completedAt > twentyFourHoursAgo
    ))
    
    setPrivateTasks(privateTasks.filter(task => 
      !task.completed || !task.completedAt || task.completedAt > twentyFourHoursAgo
    ))
  }

  // Update handleAddTask to handle notes context
  const handleAddTask = (type, taskText) => {
    if (!taskText.trim()) return

    const task = {
      id: Date.now(),
      text: taskText,
      completed: false,
      type: type
    }

    if (activeTab === 'work') {
      setWorkTasks([task, ...workTasks])
    } else {
      setPrivateTasks([task, ...privateTasks])
    }
  }

  // Function to toggle task completion
  const toggleComplete = (taskId) => {
    const updateTask = task => {
      if (task.id === taskId) {
        const newCompleted = !task.completed
        return {
          ...task,
          completed: newCompleted,
          completedAt: newCompleted ? Date.now() : null
        }
      }
      return task
    }

    if (activeTab === 'work') {
      setWorkTasks(workTasks.map(updateTask))
    } else {
      setPrivateTasks(privateTasks.map(updateTask))
    }
  }

  // Update delete task to include confirmation
  const deleteTask = (taskId) => {
    if (activeTab === 'work') {
      setWorkTasks(workTasks.filter(task => task.id !== taskId));
    } else {
      setPrivateTasks(privateTasks.filter(task => task.id !== taskId));
    }
  };

  // Add function to check if task will be archived soon
  const willBeArchivedSoon = (task) => {
    if (!task.completed || !task.completedAt) return false
    const timeLeft = task.completedAt + (24 * 60 * 60 * 1000) - Date.now()
    return timeLeft < (60 * 60 * 1000) // Less than 1 hour left
  }

  // Helper function to sort tasks (completed at bottom)
  const sortTasks = tasks => {
    return [...tasks].sort((a, b) => {
      if (a.completed === b.completed) return 0
      return a.completed ? 1 : -1
    })
  }

  // Update getTasksByType to simply filter by type without sorting
  const getTasksByType = (tasks, type) => {
    return tasks.filter(task => task.type === type);
  }

  // Update handleDragStart
  const handleDragStart = (e, taskId, taskType) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('taskType', taskType);
    // Clear any existing dragOver state
    setDragOverTask(null);
  };

  // Update handleDrop function with simpler logic
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

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + / to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        document.querySelector('.search-input').focus()
      }
      // Ctrl/Cmd + N to focus new task input
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        document.querySelector('.add-task-form input[type="text"]').focus()
      }
      // 1 or 2 to switch tabs
      if (document.activeElement.tagName === 'BODY') {
        if (e.key === '1') setActiveTab('work')
        if (e.key === '2') setActiveTab('private')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Update getTaskCount to only count main tasks
  const getTaskCount = (tasks, type) => {
    return tasks.filter(task => 
      task.type === type && 
      !task.completed && 
      !task.parentId // Only count tasks without a parent
    ).length
  }

  // Update the updateTaskText function
  const updateTaskText = (taskId, newText) => {
    const updateTasks = tasks => tasks.map(task => 
      task.id === taskId 
        ? { ...task, text: newText }
        : task
    )

    if (activeTab === 'work') {
      setWorkTasks(updateTasks(workTasks))
    } else {
      setPrivateTasks(updateTasks(privateTasks))
    }
  }

  // Update TaskList component to handle drops better
  const TaskList = ({ tasks, type }) => {
    const filteredTasks = tasks.filter(task => task.type === type);
    const uncompletedTasks = filteredTasks.filter(task => !task.completed);
    const completedTasks = filteredTasks.filter(task => task.completed);

  return (
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
        {/* Render uncompleted tasks first */}
        {uncompletedTasks.map((task) => (
          <div
            key={task.id}
            className="task-item"
            draggable={false}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              handleDrop(e, task.id, task.type);
            }}
          >
            <div className="task-main">
              <div className="task-content">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleComplete(task.id);
                  }}
                />
                <div 
                  className="task-text"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  spellCheck="false"
                  data-gramm="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                  onBlur={(e) => {
                    const newText = e.target.innerText.trim();
                    if (newText === '') {
                      deleteTask(task.id);
                    } else if (newText !== task.text) {
                      updateTaskText(task.id, newText);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.target.blur();
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: task.text }}
                />
                <div className="drag-handle" onMouseDown={(e) => {
                  const taskElement = e.currentTarget.closest('.task-item');
                  taskElement.draggable = true;
                  
                  taskElement.ondragstart = (dragEvent) => {
                    handleDragStart(dragEvent, task.id, task.type);
                  };
                  
                  taskElement.ondragend = () => {
                    taskElement.draggable = false;
                    taskElement.ondragstart = null;
                    taskElement.ondragend = null;
                  };
                }}>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Render completed tasks at the bottom */}
        {completedTasks.map((task) => (
          <div
            key={task.id}
            className="task-item completed"
            draggable={false}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              handleDrop(e, task.id, task.type);
            }}
          >
            <div className="task-main">
              <div className="task-content">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleComplete(task.id);
                  }}
                />
                <div 
                  className="task-text"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  spellCheck="false"
                  data-gramm="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                  onBlur={(e) => {
                    const newText = e.target.innerText.trim();
                    if (newText === '') {
                      deleteTask(task.id);
                    } else if (newText !== task.text) {
                      updateTaskText(task.id, newText);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.target.blur();
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: task.text }}
                />
                <div className="drag-handle" onMouseDown={(e) => {
                  const taskElement = e.currentTarget.closest('.task-item');
                  taskElement.draggable = true;
                  
                  taskElement.ondragstart = (dragEvent) => {
                    handleDragStart(dragEvent, task.id, task.type);
                  };
                  
                  taskElement.ondragend = () => {
                    taskElement.draggable = false;
                    taskElement.ondragstart = null;
                    taskElement.ondragend = null;
                  };
                }}>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="empty-state">No tasks found</div>
        )}
      </div>
    );
  }

  // Update the NavItem component to support nested items
  const NavItem = ({ icon, text, isActive, onClick, children }) => (
    <div className={`nav-group ${isActive ? 'active' : ''}`}>
      <button 
        className={`nav-item ${isActive ? 'active' : ''}`}
        onClick={onClick}
      >
        {icon && <span className="nav-icon">{icon}</span>}
        <span className="nav-text">{text}</span>
      </button>
      {children && <div className="nav-children">{children}</div>}
    </div>
  )

  // Add save effect for noteFolders
  useEffect(() => {
    localStorage.setItem('noteFolders', JSON.stringify(noteFolders))
  }, [noteFolders])

  // Add function to handle new folder creation
  const handleAddFolder = () => {
    const folderName = prompt('Enter folder name:')
    if (folderName && folderName.trim()) {
      setNoteFolders([...noteFolders, folderName.trim()])
    }
  }

  // Add delete folder function
  const handleDeleteFolder = (folderToDelete) => {
    if (folderToDelete === 'All Notes') return; // Prevent deleting All Notes
    if (window.confirm(`Are you sure you want to delete the folder "${folderToDelete}"?`)) {
      setNoteFolders(noteFolders.filter(folder => folder !== folderToDelete))
    }
  }

  // Add this helper function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Add this effect to handle the timer
  useEffect(() => {
    let interval = null
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setIsTimerRunning(false)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timeLeft])

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="nav-section">
          <NavItem 
            text="Tasks"
            isActive={activeTab === 'todo'}
          >
            <NavItem 
              icon="💼"
              text="Work"
              isActive={activeTab === 'work'}
              onClick={() => setActiveTab('work')}
            />
            <NavItem 
              icon="🏠"
              text="Private"
              isActive={activeTab === 'private'}
              onClick={() => setActiveTab('private')}
            />
            <NavItem 
              icon="📦"
              text="Archive"
              isActive={activeTab === 'archive'}
              onClick={() => {/* TODO: Archive view */}}
            />
          </NavItem>
        </div>
        
        <div className="nav-section">
          <NavItem 
            text="Notes"
            isActive={activeTab.includes('notes')}
            onClick={() => setActiveTab('notes-all')}
          >
            {noteFolders.map((folder, index) => (
              <div key={index} className="folder-item">
                <NavItem 
                  icon="📚"
                  text={folder}
                  isActive={activeTab === `notes-${folder.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setActiveTab(`notes-${folder.toLowerCase().replace(/\s+/g, '-')}`)}
                />
                {folder !== 'All Notes' && (
                  <button 
                    className="delete-folder-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder);
                    }}
                    title="Delete folder"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              className="new-folder-button"
              onClick={handleAddFolder}
            >
              <span className="nav-icon">➕</span>
              <span className="nav-text">New Folder</span>
            </button>
          </NavItem>
        </div>

        {/* Update the Pomodoro section in the sidebar */}
        <div className="nav-section">
          <NavItem 
            text="Pomodoro"
            isActive={activeTab === 'pomodoro'}
          >
            <div className="digital-clock">
              {formatTime(timeLeft)}
            </div>
            <button 
              className="pomodoro-button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? 'Pause' : 'Start'}
        </button>
          </NavItem>
        </div>
      </nav>

      <main className="main-content">
        {activeTab.includes('notes') ? (
          <Notes 
            activeFolder={noteFolders.find(folder => 
              `notes-${folder.toLowerCase().replace(/\s+/g, '-')}` === activeTab
            ) || 'All Notes'}
            onAddWorkTask={(taskText) => handleAddTask('todo', taskText, null, true)}
          />
        ) : activeTab === 'pomodoro' ? (
          <Pomodoro />
        ) : (
          <div className={`tab-content ${activeTab}`}>
            <div className="sections">
              <div className="section todo-section">
                <h2>
                  <span role="img" aria-label="work">
                    {activeTab === 'work' ? '💼' : '🏠'}
                  </span>
                  {activeTab === 'work' ? 'Work Tasks' : 'Private Tasks'}
                  <span className="task-count">
                    {getTaskCount(activeTab === 'work' ? workTasks : privateTasks, 'todo')}
                  </span>
                </h2>
                <div className="quick-add">
                  <input
                    type="text"
                    value={newTodoTask}
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-gramm="false"
                    onChange={(e) => {
                      e.stopPropagation();
                      setNewTodoTask(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTodoTask.trim()) {
                        e.preventDefault();
                        handleAddTask('todo', newTodoTask);
                        setNewTodoTask('');
                      }
                    }}
                    placeholder="Add task"
                    className="quick-add-input"
                  />
                </div>
                <TaskList 
                  tasks={getTasksByType(activeTab === 'work' ? workTasks : privateTasks, 'todo')}
                  type="todo"
                />
              </div>

              <div className="section waiting-section">
                <h2>
                  <span role="img" aria-label="waiting">⏳</span>
                  {activeTab === 'work' ? 'Work Waiting' : 'Private Waiting'}
                  <span className="task-count">
                    {getTaskCount(activeTab === 'work' ? workTasks : privateTasks, 'waiting')}
                  </span>
                </h2>
                <div className="quick-add">
                  <input
                    type="text"
                    value={newWaitingTask}
                    onChange={(e) => setNewWaitingTask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newWaitingTask.trim()) {
                        handleAddTask('waiting', newWaitingTask)
                        setNewWaitingTask('')
                      }
                    }}
                    placeholder="Add waiting task"
                    className="quick-add-input"
                  />
                </div>
                <TaskList 
                  tasks={getTasksByType(activeTab === 'work' ? workTasks : privateTasks, 'waiting')}
                  type="waiting"
                />
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
  )
}

export default App;