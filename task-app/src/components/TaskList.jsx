import React, { useRef, useEffect } from 'react';
import TipTapEditor from './TipTapEditor';

/**
 * TaskList component - Renders a list of tasks using the TipTapEditor
 * This is a wrapper around TipTapEditor that focuses specifically on task management
 */
const TaskList = ({
  tasks,
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  onTaskComplete,
  type = 'work',
  section = 'todo'
}) => {
  // Reference to the TipTapEditor
  const editorRef = useRef(null);
  
  // Convert tasks to TipTap content format
  const tasksToContent = () => {
    if (!tasks || tasks.length === 0) {
      return '<ul data-type="taskList"></ul>';
    }
    
    const taskItems = tasks.map(task => {
      const checked = task.completed ? 'checked="true"' : '';
      // Include noteTaskId and sourceId if available
      const noteTaskId = task.noteTaskId ? `data-note-task-id="${task.noteTaskId}"` : '';
      const sourceId = task.sourceId ? `data-source-id="${task.sourceId}"` : '';
      
      return `
        <li data-type="taskItem" 
            data-task-id="${task.id}" 
            data-type="${task.type || type}" 
            data-section="${task.section || section}" 
            data-processed="true"
            ${noteTaskId}
            ${sourceId}
            ${checked}>
          ${task.text}
        </li>
      `;
    }).join('');
    
    return `<ul data-type="taskList">${taskItems}</ul>`;
  };
  
  // Handle task updates from the editor
  const handleContentUpdate = (html) => {
    console.log('TaskList: Content updated');
    
    // Extract tasks from the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
    
    taskItems.forEach(item => {
      const taskId = item.getAttribute('data-task-id');
      const checked = item.hasAttribute('checked') || item.getAttribute('checked') === 'true' || 
                     item.getAttribute('data-checked') === 'true';
      const text = item.textContent.trim();
      
      // Find the task in our list
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        // Check if anything changed
        if (task.completed !== checked || task.text !== text) {
          console.log('TaskList: Updating task', { taskId, checked, text });
          onTaskUpdate({
            ...task,
            completed: checked,
            text: text
          });
        }
      } else if (taskId && text) {
        // This is a new task
        console.log('TaskList: Adding new task', { taskId, text });
        onTaskAdd({
          id: taskId,
          text: text,
          completed: checked,
          type: item.getAttribute('data-type') || type,
          section: item.getAttribute('data-section') || section,
          noteTaskId: item.getAttribute('data-note-task-id') || null,
          sourceId: item.getAttribute('data-source-id') || null
        });
      }
    });
  };
  
  // Update editor when tasks change
  useEffect(() => {
    if (editorRef.current?.editor) {
      const editor = editorRef.current.editor;
      
      // Update task statuses in the editor based on the tasks prop
      tasks.forEach(task => {
        if (task.id) {
          // Find the task item in the editor
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'taskItem' && node.attrs['data-task-id'] === task.id) {
              // If the checked state is different, update it
              if (node.attrs.checked !== task.completed) {
                editor.chain().setNodeSelection(pos).updateAttributes('taskItem', {
                  checked: task.completed
                }).run();
              }
              return false; // Stop traversing once found
            }
          });
        }
      });
    }
  }, [tasks]);
  
  return (
    <div className="task-list-container">
      <TipTapEditor
        ref={editorRef}
        content={tasksToContent()}
        onUpdate={({ editor }) => {
          // Get HTML content from editor
          const html = editor.getHTML();
          handleContentUpdate(html);
        }}
        showToolbar={false}
        onAddWorkTask={(text, taskType, taskSection, sourceInfo) => {
          console.log('TaskList: onAddWorkTask called', { text, taskType, taskSection, sourceInfo });
          onTaskAdd({
            text,
            type: taskType || type,
            section: taskSection || section,
            completed: false,
            noteTaskId: sourceInfo?.noteTaskId,
            sourceId: sourceInfo?.noteId
          });
        }}
        syncTaskStatus={(taskId, completed) => {
          console.log('TaskList: syncTaskStatus called', { taskId, completed });
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            onTaskComplete(task.id, completed);
          } else {
            console.warn('Task not found for sync:', { taskId });
          }
        }}
        allTasks={tasks}
      />
    </div>
  );
};

export default TaskList; 