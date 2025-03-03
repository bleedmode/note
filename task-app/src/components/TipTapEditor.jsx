import React from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Plugin } from 'prosemirror-state'
import { useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { mergeAttributes } from '@tiptap/core'
import { v4 as uuidv4 } from 'uuid'

/**
 * Custom TaskItem extension that overrides the default checkbox rendering
 * with improved styling and data attributes for task tracking
 */
const CustomTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      checked: {
        default: false,
      },
      'data-task-id': {
        default: null,
      },
      'data-type': {
        default: 'work',
      },
      'data-section': {
        default: 'todo',
      },
      'data-note-task-id': {
        default: null,
      },
      'data-source-id': {
        default: null,
      },
      'data-processed': {
        default: false,
      },
    }
  },
  
  renderHTML({ node, HTMLAttributes }) {
    // Generate a unique ID for this task if it doesn't have one
    if (!HTMLAttributes['data-task-id']) {
      HTMLAttributes['data-task-id'] = `task-${uuidv4()}`
    }
    
    // Generate a unique note task ID if it doesn't have one
    if (!HTMLAttributes['data-note-task-id']) {
      HTMLAttributes['data-note-task-id'] = `note-task-${uuidv4()}`
    }
    
    return [
      'li',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      [
        'label',
        [
          'input',
          {
            type: 'checkbox',
            checked: HTMLAttributes.checked ? 'checked' : null,
          },
        ],
        ['span', {}, 0],
      ],
    ]
  },
  
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li')
      const checkboxWrapper = document.createElement('label')
      const checkboxInput = document.createElement('input')
      const checkboxSpan = document.createElement('span')
      const contentDOM = document.createElement('div')
      
      checkboxInput.type = 'checkbox'
      checkboxInput.checked = node.attrs.checked
      
      // Add task ID if not present
      if (!node.attrs['data-task-id']) {
        node.attrs['data-task-id'] = `task-${uuidv4()}`
      }
      
      // Add note task ID if not present
      if (!node.attrs['data-note-task-id']) {
        node.attrs['data-note-task-id'] = `note-task-${uuidv4()}`
      }
      
      // Set data attributes
      listItem.setAttribute('data-type', node.attrs['data-type'] || 'work')
      listItem.setAttribute('data-section', node.attrs['data-section'] || 'todo')
      listItem.setAttribute('data-task-id', node.attrs['data-task-id'])
      listItem.setAttribute('data-note-task-id', node.attrs['data-note-task-id'])
      
      if (node.attrs['data-source-id']) {
        listItem.setAttribute('data-source-id', node.attrs['data-source-id'])
      }
      
      if (node.attrs.checked) {
        listItem.classList.add('checked')
      }
      
      listItem.setAttribute('data-type', 'taskItem')
      
      checkboxWrapper.contentEditable = 'false'
      checkboxWrapper.appendChild(checkboxInput)
      checkboxWrapper.appendChild(checkboxSpan)
      
      listItem.appendChild(checkboxWrapper)
      listItem.appendChild(contentDOM)
      
      // Handle checkbox click
      checkboxInput.addEventListener('change', event => {
        if (typeof getPos === 'function') {
          editor.chain().focus().updateAttributes('taskItem', {
            checked: event.target.checked,
          }).setNodeSelection(getPos()).run()
          
          // Dispatch a custom event that the parent component can listen for
          const customEvent = new CustomEvent('task-status-change', {
            detail: {
              taskId: node.attrs['data-task-id'],
              noteTaskId: node.attrs['data-note-task-id'],
              checked: event.target.checked
            },
            bubbles: true
          })
          
          listItem.dispatchEvent(customEvent)
        }
      })
      
      return {
        dom: listItem,
        contentDOM,
        
        update(updatedNode) {
          if (updatedNode.type !== this.type) {
            return false
          }
          
          // Update checked status
          if (checkboxInput.checked !== updatedNode.attrs.checked) {
            checkboxInput.checked = updatedNode.attrs.checked
            
            if (updatedNode.attrs.checked) {
              listItem.classList.add('checked')
            } else {
              listItem.classList.remove('checked')
            }
          }
          
          // Update data attributes
          listItem.setAttribute('data-type', updatedNode.attrs['data-type'] || 'work')
          listItem.setAttribute('data-section', updatedNode.attrs['data-section'] || 'todo')
          listItem.setAttribute('data-task-id', updatedNode.attrs['data-task-id'])
          listItem.setAttribute('data-note-task-id', updatedNode.attrs['data-note-task-id'])
          
          if (updatedNode.attrs['data-source-id']) {
            listItem.setAttribute('data-source-id', updatedNode.attrs['data-source-id'])
          }
          
          return true
        }
      }
    }
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            // Check if we're clicking on a task item
            const node = view.state.doc.nodeAt(pos)
            if (node && node.type.name === 'taskItem') {
              // If clicking on the checkbox, let the default handler work
              if (event.target.nodeName === 'INPUT' && event.target.type === 'checkbox') {
                return false
              }
              
              // Otherwise, place cursor in the task item
              const tr = view.state.tr.setSelection(
                view.state.selection.constructor.near(
                  view.state.doc.resolve(pos + 1)
                )
              )
              view.dispatch(tr)
              return true
            }
            return false
          }
        }
      })
    ]
  },

  addOptions() {
    return {
      ...this.parent?.(),
      nested: true,
    }
  },

  addKeyboardShortcuts() {
    return {
      'Enter': ({ editor }) => {
        // If in a task list, create a new task item
        if (editor.isActive('taskItem')) {
          editor.commands.splitListItem('taskItem')
          return true
        }
        return false
      },
    }
  },

  addCommands() {
    return {
      toggleTaskList: () => ({ editor, tr }) => {
        try {
          // If the selection is in a task list, convert it to a paragraph
          if (editor.isActive('taskList')) {
            return editor
              .chain()
              .liftListItem('taskItem')
              .run()
          }
          
          // If the selection is in another type of list, convert it to a task list
          if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            return editor
              .chain()
              .toggleList('taskList', 'taskItem')
              .run()
          }
          
          // Otherwise, wrap the selection in a task list
          return editor
            .chain()
            .wrapInList('taskList')
            .run()
        } catch (error) {
          console.error('Error toggling task list:', error)
          return false
        }
      },
    }
  },
})

/**
 * Custom TaskList extension that adds data attributes for task tracking
 */
const CustomTaskList = TaskList.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick(view, pos, event) {
            // Check if we're clicking on the task list (not a task item)
            const node = view.state.doc.nodeAt(pos)
            if (node && node.type.name === 'taskList') {
              // Place cursor at the beginning of the first task item
              const tr = view.state.tr.setSelection(
                view.state.selection.constructor.near(
                  view.state.doc.resolve(pos + 1)
                )
              )
              view.dispatch(tr)
              return true
            }
            return false
          }
        },
        
        appendTransaction(transactions, oldState, newState) {
          // This runs after every transaction
          // We can use it to update task IDs or other attributes
          
          // Skip if no transactions
          if (!transactions.length) return null
          
          // Check if any transaction changes the document
          const docChanged = transactions.some(tr => tr.docChanged)
          if (!docChanged) return null
          
          // Create a new transaction
          const tr = newState.tr
          let modified = false
          
          // Find all task items
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'taskItem') {
              // Check if this node needs a task ID
              if (!node.attrs['data-task-id']) {
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  'data-task-id': `task-${uuidv4()}`,
                })
                modified = true
              }
              
              // Check if this node needs a note task ID
              if (!node.attrs['data-note-task-id']) {
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  'data-note-task-id': `note-task-${uuidv4()}`,
                })
                modified = true
              }
            }
          })
          
          return modified ? tr : null
        }
      })
    ]
  }
})

/**
 * TipTapEditor component - A rich text editor with task list support
 */
const TipTapEditor = forwardRef((props, ref) => {
  const { 
    content = '', 
    onUpdate, 
    showToolbar = true,
    onAddWorkTask,
    syncTaskStatus,
    noteId,
    allTasks = []
  } = props;
  
  // State for notification
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Create editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomTaskList,
      CustomTaskItem,
      Underline,
      Link.configure({
        openOnClick: true,
        linkOnPaste: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate({ editor });
      }
    },
  });
  
  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content) {
      // Only update if the content is different to avoid cursor jumping
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content, noteId]);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor) {
        editor.commands.focus();
      }
    },
    getContent: () => {
      if (editor) {
        return editor.getHTML();
      }
      return '';
    },
    createTaskList: () => {
      if (editor) {
        editor.chain().focus().toggleTaskList().run();
      }
    },
    updateTaskStatus: (taskId, completed) => {
      if (!editor) return;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'taskItem' && 
            (node.attrs['data-task-id'] === taskId || 
             node.attrs['data-note-task-id'] === taskId)) {
          editor.chain()
            .setNodeSelection(pos)
            .updateAttributes('taskItem', { checked: completed })
            .run();
          return false; // Stop traversing once found
        }
      });
    }
  }));
  
  // Function to display notification
  const displayTaskAddedNotification = (type, section) => {
    const message = `Task added to ${type} ${section}`;
    setNotificationMessage(message);
    setShowNotification(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };
  
  // Listen for task status changes
  useEffect(() => {
    if (!editor || !syncTaskStatus) return;
    
    const handleTaskStatusChange = (event) => {
      const { noteTaskId, checked } = event.detail;
      if (noteTaskId) {
        syncTaskStatus(noteTaskId, checked);
      }
    };
    
    // Get the editor element
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('task-status-change', handleTaskStatusChange);
      
      return () => {
        editorElement.removeEventListener('task-status-change', handleTaskStatusChange);
      };
    }
  }, [editor, syncTaskStatus]);
  
  // Sync task statuses from main task list to note
  useEffect(() => {
    if (!editor || !allTasks || !noteId) return;
    
    // Find tasks that belong to this note
    const noteTasks = allTasks.filter(task => task.sourceId === noteId);
    
    if (noteTasks.length === 0) return;
    
    // Update task statuses in the editor
    noteTasks.forEach(task => {
      if (task.noteTaskId) {
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'taskItem' && 
              node.attrs['data-note-task-id'] === task.noteTaskId) {
            // Only update if the status is different
            if (node.attrs.checked !== task.completed) {
              editor.chain()
                .setNodeSelection(pos)
                .updateAttributes('taskItem', { checked: task.completed })
                .run();
            }
            return false; // Stop traversing once found
          }
        });
      }
    });
  }, [editor, allTasks, noteId]);
  
  // Function to add a task to the main task list
  const addTaskToMainList = (taskText, taskType = 'work', taskSection = 'todo', noteTaskId) => {
    if (!onAddWorkTask || !taskText) return null;
    
    try {
      // Call the parent component's onAddWorkTask function
      const taskId = onAddWorkTask(taskText, taskType, taskSection, noteTaskId);
      
      // Show notification
      displayTaskAddedNotification(taskType, taskSection);
      
      return taskId;
    } catch (err) {
      console.error('Error adding task to main list:', err);
      return null;
    }
  };
  
  // Render toolbar buttons
  const renderToolbarButtons = () => {
    if (!editor) return null;
    
    return (
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet List"
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Numbered List"
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={editor.isActive('taskList') ? 'is-active' : ''}
          title="Task List"
        >
          ☑
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Add Link"
        >
          🔗
        </button>
        <button
          onClick={() => {
            // Get the selected text
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, ' ');
            
            if (text) {
              // Add the task to the main task list
              addTaskToMainList(text);
            } else {
              alert('Please select some text to add as a task');
            }
          }}
          title="Add Selected Text as Task"
        >
          ➕
        </button>
      </div>
    );
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editor) return;
    
    const handleKeyUp = (e) => {
      // Check for Cmd/Ctrl+Enter to create a task from the current line
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        
        // Get the current line text
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');
        
        if (text) {
          // Add the task to the main task list
          addTaskToMainList(text);
        } else {
          // If no text is selected, get the current paragraph text
          const { $from } = editor.state.selection;
          const node = $from.node();
          
          if (node.isTextblock) {
            const nodeText = node.textContent;
            if (nodeText.trim()) {
              addTaskToMainList(nodeText.trim());
            }
          }
        }
      }
    };
    
    // Add event listener to the editor element
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('keyup', handleKeyUp);
      
      return () => {
        editorElement.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [editor, onAddWorkTask]);
  
  if (!editor) {
    return <div>Loading editor...</div>;
  }
  
  return (
    <div className="tiptap-editor">
      {showToolbar && renderToolbarButtons()}
      
      <EditorContent editor={editor} className="editor-content" />
      
      {showNotification && (
        <div className="task-notification">
          {notificationMessage}
        </div>
      )}
    </div>
  );
});

export default TipTapEditor; 