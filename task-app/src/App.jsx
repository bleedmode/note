import { useState, useEffect, useRef } from 'react'
import './App.css'
import Notes from './components/Notes'
import Pomodoro from './components/Pomodoro'
import AuthContainer from './components/Auth/AuthContainer'
import { useAuth } from './context/AuthContext'
import { supabase } from './utils/supabaseClient'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  // Get auth state from context
  const { user, loading, signOut } = useAuth();
  
  // Add state to track active tab
  const [activeTab, setActiveTab] = useState('work') // 'work' or 'private'
  
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
  
  // Form input states
  const [newTask, setNewTask] = useState('')
  const [newWaitingTask, setNewWaitingTask] = useState('')
  const [newTodoTask, setNewTodoTask] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)

  // Enhanced task state with unique IDs and source tracking
  const [allTasks, setAllTasks] = useState(() => {
    const savedTasks = localStorage.getItem('allTasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  // Task list states derived from allTasks
  const [workTasks, setWorkTasks] = useState([]);
  const [privateTasks, setPersonalTasks] = useState([]);
  const [workWaitingTasks, setWorkWaitingTasks] = useState([]);
  const [privateWaitingTasks, setPersonalWaitingTasks] = useState([]);

  // Effect to update filtered task lists when allTasks changes
  useEffect(() => {
    // Filter work todo tasks
    const workTodoTasks = allTasks.filter(task => 
      task.type === 'work' && task.section === 'todo'
    );
    setWorkTasks(workTodoTasks);
    
    // Filter private todo tasks
    const privateTodoTasks = allTasks.filter(task => 
      task.type === 'private' && task.section === 'todo'
    );
    setPersonalTasks(privateTodoTasks);
    
    // Filter work waiting tasks
    const workWaitTasks = allTasks.filter(task => 
      task.type === 'work' && task.section === 'waiting'
    );
    setWorkWaitingTasks(workWaitTasks);
    
    // Filter private waiting tasks
    const privateWaitTasks = allTasks.filter(task => 
      task.type === 'private' && task.section === 'waiting'
    );
    setPersonalWaitingTasks(privateWaitTasks);
    
    // Save all tasks to localStorage
    localStorage.setItem('allTasks', JSON.stringify(allTasks));
  }, [allTasks]);

  // Check for tasks to archive every minute
  useEffect(() => {
    const archiveInterval = setInterval(archiveOldTasks, 60000)
    return () => clearInterval(archiveInterval)
  }, [allTasks])

  // Function to archive tasks completed more than 24 hours ago
  const archiveOldTasks = () => {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    setAllTasks(allTasks.filter(task => 
      !task.completed || !task.completedAt || task.completedAt > twentyFourHoursAgo
    ));
  }

  // Modified handleAddTask to work with unified task state
  const handleAddTask = (type, taskText) => {
    if (!taskText.trim()) return;
    
    const newTask = {
      id: `task-${Date.now()}`,
      text: taskText,
      completed: false,
      type: type,
      section: 'todo',
      sourceId: null, // If the task comes from a note, this will have the note's ID
      noteTaskId: null, // If from a note, this will have the task's ID in the note
      createdAt: Date.now()
    };
    
    setAllTasks(prev => [...prev, newTask]);
  };

  // Improve findTaskByNoteRef to handle different ID formats
  const findTaskByNoteRef = (noteId, noteTaskId) => {
    console.log('Finding task by note ref:', { noteId, noteTaskId });
    
    if (!noteId || !noteTaskId) {
      console.warn('Missing parameters for findTaskByNoteRef:', { noteId, noteTaskId });
      return null;
    }
    
    // Handle case where noteTaskId is an object
    const taskIdToFind = typeof noteTaskId === 'object' ? noteTaskId.noteTaskId : noteTaskId;
    
    if (!taskIdToFind) {
      console.warn('Invalid noteTaskId format:', noteTaskId);
      return null;
    }
    
    // Try to find an exact match first
    let task = allTasks.find(task => 
      task.sourceId === noteId && task.noteTaskId === taskIdToFind
    );
    
    // If no exact match, try a partial match (for complex IDs)
    if (!task) {
      task = allTasks.find(task => 
        task.sourceId === noteId && 
        task.noteTaskId && 
        (task.noteTaskId.includes(taskIdToFind) || taskIdToFind.includes(task.noteTaskId))
      );
    }
    
    if (task) {
      console.log('Found task by note ref:', task);
      return task;
    } else {
      console.warn('No task found for note ref:', { noteId, taskIdToFind });
      return null;
    }
  };

  // Improve updateTaskComplete to handle task updates from notes
  const updateTaskComplete = (taskId, completed) => {
    console.log('Updating task completion:', { taskId, completed });
    
    // Find the task to get its current state
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
      console.warn('Task not found for update:', taskId);
      return false;
    }
    
    // Only update if the state is different
    if (task.completed === completed) {
      console.log('Task already in desired state:', { taskId, completed });
      return true;
    }
    
    console.log('Changing task completion state:', {
      taskId,
      from: task.completed,
      to: completed
    });
    
    setAllTasks(prevTasks => {
      const updatedTasks = prevTasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            completed: completed,
            completedAt: completed ? Date.now() : null
          };
        }
        return t;
      });
      
      // Save to localStorage
      localStorage.setItem('allTasks', JSON.stringify(updatedTasks));
      
      return updatedTasks;
    });
    
    // Log the task's note references if it has any
    if (task.sourceId && task.noteTaskId) {
      console.log('Updated task has note references:', {
        sourceId: task.sourceId,
        noteTaskId: task.noteTaskId,
        newState: completed
      });
    }
    
    return true;
  };

  // Improve addWorkTask to handle task creation from notes
  const addWorkTask = (taskText, type, section, sourceInfo = null) => {
    console.log('App: Adding task to unified list:', { taskText, type, section, sourceInfo });
    
    if (!taskText) {
      console.warn('Empty task text, not adding');
      return null;
    }
    
    // Normalize sourceInfo to handle both object and string formats
    let normalizedSourceInfo = sourceInfo;
    
    // If sourceInfo is a string (direct noteTaskId), convert it to object format
    if (typeof sourceInfo === 'string') {
      normalizedSourceInfo = {
        noteId: activeNote?.id || null,
        noteTaskId: sourceInfo
      };
    }
    
    // Check if this task already exists (to prevent duplicates)
    if (normalizedSourceInfo && normalizedSourceInfo.noteId && normalizedSourceInfo.noteTaskId) {
      const existingTask = findTaskByNoteRef(
        normalizedSourceInfo.noteId, 
        normalizedSourceInfo.noteTaskId
      );
      
      if (existingTask) {
        console.log('Task already exists, updating if needed:', existingTask);
        
        // If the task exists but type/section changed, update it instead of creating new
        if (existingTask.type !== type || existingTask.section !== section) {
          const updatedTasks = allTasks.map(task => {
            if (task.id === existingTask.id) {
              return { ...task, type, section };
            }
            return task;
          });
          
          setAllTasks(updatedTasks);
          localStorage.setItem('allTasks', JSON.stringify(updatedTasks));
          return existingTask.id; // Return existing ID for reference
        }
        
        return existingTask.id; // Already exists, no changes needed
      }
    }
    
    // Create a new task with unique ID
    const newTask = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: taskText,
      completed: false,
      type,
      section,
      sourceId: normalizedSourceInfo?.noteId || null,
      noteTaskId: normalizedSourceInfo?.noteTaskId || null,
      createdAt: Date.now()
    };
    
    console.log('Creating new task:', newTask);
    
    setAllTasks(prev => {
      const newTasks = [...prev, newTask];
      localStorage.setItem('allTasks', JSON.stringify(newTasks));
      return newTasks;
    });
    
    return newTask.id; // Return the ID so it can be referenced
  };

  // Update toggleComplete to sync with notes and return the updated status
  const toggleComplete = (taskId) => {
    console.log('Toggling task completion:', taskId);
    
    let newCompletedState = false;
    let taskToUpdate = null;
    
    // Find the task first to get its current state and note references
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      newCompletedState = !task.completed;
      taskToUpdate = task;
    } else {
      console.warn('Task not found for toggle:', taskId);
      return false;
    }
    
    setAllTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            completed: newCompletedState,
            completedAt: newCompletedState ? Date.now() : null
          };
        }
        return task;
      });
      
      // Save to localStorage
      localStorage.setItem('allTasks', JSON.stringify(updatedTasks));
      
      return updatedTasks;
    });
    
    // Log the task's note references if it has any
    if (taskToUpdate && taskToUpdate.sourceId && taskToUpdate.noteTaskId) {
      console.log('Task has note references:', {
        sourceId: taskToUpdate.sourceId,
        noteTaskId: taskToUpdate.noteTaskId,
        newState: newCompletedState
      });
    }
    
    return newCompletedState;
  };

  // Update task list or section
  const updateTaskTypeAndSection = (taskId, newType, newSection) => {
    const updatedTasks = allTasks.map(task => {
      if (task.id === taskId) {
        return { ...task, type: newType, section: newSection };
      }
      return task;
    });
    
    setAllTasks(updatedTasks);
  };

  // Update task text
  const updateTaskText = (taskId, newText) => {
    const updatedTasks = allTasks.map(task => {
      if (task.id === taskId) {
        return { ...task, text: newText };
      }
      return task;
    });
    
    setAllTasks(updatedTasks);
  };

  // Delete task
  const deleteTask = (taskId) => {
    setAllTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // Helper function to sort tasks (completed at bottom)
  const sortTasks = tasks => {
    return [...tasks].sort((a, b) => {
      if (a.completed === b.completed) return 0
      return a.completed ? 1 : -1
    })
  }

  // Get tasks by type
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
    const draggedTaskId = e.dataTransfer.getData('taskId');
    const draggedType = e.dataTransfer.getData('taskType');
    
    if (draggedTaskId === targetTaskId) return;

    // Find the task we're moving
    const draggedTask = allTasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) return;

    // Update task type/section
    updateTaskTypeAndSection(draggedTaskId, targetType, draggedTask.section);
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + / to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        document.querySelector('.search-input')?.focus()
      }
      // Ctrl/Cmd + N to focus new task input
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        document.querySelector('.add-task-form input[type="text"]')?.focus()
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

  // Update getTaskCount to consider both type and section
  const getTaskCount = (tasks, type) => {
    return tasks.filter(task => 
      task.type === type && 
      !task.completed
    ).length
  }

  // Update TaskList component to handle drops better
  const TaskList = ({ tasks, type, section = 'todo' }) => {
    // Update the filtering to check both type and section
    const filteredTasks = tasks.filter(task => 
      task.type === type && task.section === section
    );
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

  // Sign up
  const signUp = async (email, password) => {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { user, error }
  }

  // Sign in
  const signIn = async (email, password) => {
    const { user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { user, error }
  }

  // If still loading auth state, show loading spinner
  if (loading) {
    return <LoadingSpinner message="Loading your account..." fullScreen={true} />;
  }

  // If no user is logged in, show auth container
  if (!user) {
    return <AuthContainer />;
  }

  // If authenticated, show the main app
  return (
    <div className="app">
      <nav className="app-sidebar">
        <div className="nav-section">
          <NavItem text="Tasks" isActive={activeTab === 'todo'}>
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
          <NavItem text="Notes" isActive={activeTab.includes('notes')}>
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

        <div className="nav-section">
          <NavItem text="Pomodoro" isActive={activeTab === 'pomodoro'}>
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

        {/* Update profile section to show actual user info */}
        <div className="app-sidebar-header">
          <div className="user-avatar">
            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h3 className="user-name">{user.email}</h3>
            <button 
              className="sign-out-button"
              onClick={signOut}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className={`main-content ${activeTab.includes('notes') ? 'notes' : ''}`}>
        {activeTab.includes('notes') ? (
          <Notes 
            activeFolder={noteFolders.find(folder => 
              `notes-${folder.toLowerCase().replace(/\s+/g, '-')}` === activeTab
            ) || 'All Notes'}
            onAddWorkTask={addWorkTask}
            findTaskByNoteRef={findTaskByNoteRef}
            updateTaskComplete={updateTaskComplete}
            allTasks={allTasks}
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
                    {activeTab === 'work' 
                      ? getTaskCount(allTasks.filter(t => t.type === 'work' && t.section === 'todo'), 'work')
                      : getTaskCount(allTasks.filter(t => t.type === 'private' && t.section === 'todo'), 'private')}
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
                        // Use addWorkTask instead of handleAddTask for consistent task creation
                        addWorkTask(newTodoTask, activeTab, 'todo');
                        setNewTodoTask('');
                      }
                    }}
                    placeholder="Add task"
                    className="quick-add-input"
                  />
                </div>
                <TaskList 
                  tasks={allTasks}
                  type={activeTab}
                  section="todo"
                />
              </div>

              <div className="section waiting-section">
                <h2>
                  <span role="img" aria-label="waiting">⏳</span>
                  {activeTab === 'work' ? 'Work Waiting' : 'Private Waiting'}
                  <span className="task-count">
                    {activeTab === 'work'
                      ? getTaskCount(allTasks.filter(t => t.type === 'work' && t.section === 'waiting'), 'work')
                      : getTaskCount(allTasks.filter(t => t.type === 'private' && t.section === 'waiting'), 'private')}
                  </span>
                </h2>
                <div className="quick-add">
                  <input
                    type="text"
                    value={newWaitingTask}
                    onChange={(e) => setNewWaitingTask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newWaitingTask.trim()) {
                        const type = activeTab; // 'work' or 'private'
                        addWorkTask(newWaitingTask, type, 'waiting');
                        setNewWaitingTask('');
                      }
                    }}
                    placeholder="Add waiting task"
                    className="quick-add-input"
                  />
                </div>
                <TaskList 
                  tasks={allTasks}
                  type={activeTab}
                  section="waiting"
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