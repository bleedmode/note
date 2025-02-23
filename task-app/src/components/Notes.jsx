import React, { useState, useEffect, useCallback } from 'react'

const Notes = ({ activeFolder = 'All Notes', onAddWorkTask }) => {
  // Initialize with some default notes
  const [allNotes, setAllNotes] = useState(() => {
    const saved = localStorage.getItem('notes')
    const defaultNotes = {
      'All Notes': [
        {
          id: 1,
          title: 'Welcome to Notes',
          content: 'Start writing your notes here. Create new folders to organize your thoughts.',
          createdAt: Date.now(),
          isPinned: false,
          parentId: null
        },
        {
          id: 2,
          title: 'Quick Tips',
          content: '• Click the + button to create a new folder\n• Write and edit notes in any folder\n• All notes are automatically saved\n• Pin important notes to keep them at the top\n• Create nested notes for better organization',
          createdAt: Date.now() - 1000,
          isPinned: false,
          parentId: null
        }
      ],
      folders: {}
    }
    return saved ? JSON.parse(saved) : defaultNotes
  })

  // Get notes for current folder with safety check
  const currentNotes = allNotes ? (
    activeFolder === 'All Notes' 
      ? allNotes['All Notes'] || []
      : allNotes.folders[activeFolder] || []
  ) : []

  // Initialize activeNoteId with safety check
  const [activeNoteId, setActiveNoteId] = useState(null)

  // Update activeNoteId when folder changes
  useEffect(() => {
    if (currentNotes.length > 0) {
      setActiveNoteId(currentNotes[0].id)
    } else {
      setActiveNoteId(null)
    }
  }, [activeFolder])

  // Get active note with safety check
  const activeNote = currentNotes.find(note => note.id === activeNoteId) || currentNotes[0]

  // Add new note function
  const handleAddNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      isPinned: false
    }

    const updatedNotes = activeFolder === 'All Notes'
      ? {
          ...allNotes,
          'All Notes': [...(allNotes['All Notes'] || []), newNote]
        }
      : {
          ...allNotes,
          folders: {
            ...allNotes.folders,
            [activeFolder]: [...(allNotes.folders[activeFolder] || []), newNote]
          }
        }
    
    setAllNotes(updatedNotes)
    setActiveNoteId(newNote.id)
  }

  // Handle note selection
  const handleNoteSelect = (noteId) => {
    setActiveNoteId(noteId)
  }

  // Memoize handleNoteChange
  const handleNoteChange = useCallback((content) => {
    const updatedNotes = activeFolder === 'All Notes'
      ? {
          ...allNotes,
          'All Notes': allNotes['All Notes'].map(note => 
            note.id === activeNote.id ? { ...note, content } : note
          )
        }
      : {
          ...allNotes,
          folders: {
            ...allNotes.folders,
            [activeFolder]: allNotes.folders[activeFolder].map(note =>
              note.id === activeNote.id ? { ...note, content } : note
            )
          }
        }
    
    setAllNotes(updatedNotes)
  }, [activeFolder, activeNote, allNotes])

  // Save notes to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(allNotes))
  }, [allNotes])

  // Update the handleNoteKeyDown function
  const handleNoteKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      const cursorPosition = e.target.selectionStart
      const content = e.target.value
      const lines = content.split('\n')
      
      // Find the current line by counting newlines up to cursor position
      const currentLineIndex = content.slice(0, cursorPosition).split('\n').length - 1
      const currentLine = lines[currentLineIndex]
      
      if (currentLine?.trim().startsWith('TW:')) {
        e.preventDefault() // Prevent the new line
        const taskText = currentLine.substring(3).trim()
        if (taskText) {
          onAddWorkTask(taskText)
          
          // Replace the current line with a checkmark
          lines[currentLineIndex] = `✓ ${taskText}`
          const newContent = lines.join('\n') + '\n' // Add a new line after
          handleNoteChange(newContent)
          
          // Move cursor to the new line
          setTimeout(() => {
            e.target.selectionStart = e.target.selectionEnd = newContent.length
          }, 0)
        }
      }
    }
  }, [onAddWorkTask, handleNoteChange])

  // Add function to toggle pin status
  const togglePin = (noteId) => {
    const updatedNotes = activeFolder === 'All Notes'
      ? {
          ...allNotes,
          'All Notes': allNotes['All Notes'].map(note => 
            note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
          )
        }
      : {
          ...allNotes,
          folders: {
            ...allNotes.folders,
            [activeFolder]: allNotes.folders[activeFolder].map(note =>
              note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
            )
          }
        }
    setAllNotes(updatedNotes)
  }

  // Add function to organize notes in a hierarchical structure
  const organizeNotes = (notes) => {
    const noteMap = new Map()
    const rootNotes = []

    // First pass: create a map of all notes
    notes.forEach(note => {
      noteMap.set(note.id, { ...note, children: [] })
    })

    // Second pass: organize into hierarchy
    noteMap.forEach(note => {
      if (note.parentId && noteMap.has(note.parentId)) {
        noteMap.get(note.parentId).children.push(note)
      } else {
        rootNotes.push(note)
      }
    })

    return rootNotes
  }

  // Add function to create a nested note
  const handleAddNestedNote = (parentId) => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      isPinned: false,
      parentId
    }

    const updatedNotes = activeFolder === 'All Notes'
      ? {
          ...allNotes,
          'All Notes': [...(allNotes['All Notes'] || []), newNote]
        }
      : {
          ...allNotes,
          folders: {
            ...allNotes.folders,
            [activeFolder]: [...(allNotes.folders[activeFolder] || []), newNote]
          }
        }
    
    setAllNotes(updatedNotes)
    setActiveNoteId(newNote.id)
  }

  // Update the sorting logic to handle nested notes
  const sortedNotes = organizeNotes([...currentNotes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return b.createdAt - a.createdAt
    }
    return a.isPinned ? -1 : 1
  }))

  // Recursive component for rendering notes
  const NoteItem = ({ note, level = 0 }) => (
    <>
      <div 
        key={note.id}
        className={`note-item ${note.id === activeNote?.id ? 'active' : ''} ${note.isPinned ? 'pinned' : ''}`}
        onClick={() => setActiveNoteId(note.id)}
        style={{ paddingLeft: `${level * 20 + 16}px` }}
      >
        <div className="note-header">
          <div className="note-title">
            {note.title}
            <button 
              className="add-nested-note"
              onClick={(e) => {
                e.stopPropagation()
                handleAddNestedNote(note.id)
              }}
              title="Add nested note"
            >
              +
            </button>
          </div>
          <button 
            className="pin-button"
            onClick={(e) => {
              e.stopPropagation()
              togglePin(note.id)
            }}
            title={note.isPinned ? "Unpin note" : "Pin note"}
          >
            {note.isPinned ? "📌" : "📍"}
          </button>
        </div>
        <div className="note-preview">{note.content.slice(0, 50)}...</div>
        <div className="note-date">
          {new Date(note.createdAt).toLocaleDateString()}
        </div>
      </div>
      {note.children?.map(child => (
        <NoteItem key={child.id} note={child} level={level + 1} />
      ))}
    </>
  )

  return (
    <div className="notes-layout">
      <div className="notes-sidebar">
        <div className="notes-header">
          <h2>{activeFolder}</h2>
          <button className="add-note-button" onClick={handleAddNote}>
            <span className="nav-icon">➕</span>
          </button>
        </div>
        <div className="notes-list">
          {sortedNotes.map(note => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      </div>
      
      <div className="note-content">
        {activeNote && (
          <>
            <input
              type="text"
              className="note-title-input"
              value={activeNote.title}
              onChange={(e) => {
                const updatedNotes = activeFolder === 'All Notes'
                  ? {
                      ...allNotes,
                      'All Notes': allNotes['All Notes'].map(note => 
                        note.id === activeNote.id ? { ...note, title: e.target.value } : note
                      )
                    }
                  : {
                      ...allNotes,
                      folders: {
                        ...allNotes.folders,
                        [activeFolder]: allNotes.folders[activeFolder].map(note =>
                          note.id === activeNote.id ? { ...note, title: e.target.value } : note
                        )
                      }
                    }
                setAllNotes(updatedNotes)
              }}
            />
            <textarea
              className="note-content-input"
              value={activeNote.content}
              onChange={(e) => handleNoteChange(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="Start typing your note here... (Type 'TW:' to create a work task)"
              autoFocus
            />
          </>
        )}
      </div>
    </div>
  )
}

export default Notes 