import React, { useState, useEffect, useCallback, useMemo } from 'react'

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

    // Use requestAnimationFrame for faster focus
    requestAnimationFrame(() => {
      const textarea = document.querySelector('.note-content-input')
      if (textarea) {
        textarea.focus()
      }
    })
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

  // Update the sorting logic to remove nesting
  const sortedNotes = [...currentNotes].sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      return b.createdAt - a.createdAt
    }
    return a.isPinned ? -1 : 1
  })

  // Add search state near the top with other state declarations
  const [searchTerm, setSearchTerm] = useState('');

  // Add a function to filter notes based on search term
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return sortedNotes;
    
    const searchLower = searchTerm.toLowerCase();
    
    const filterNote = (note) => {
      const firstLine = note.content.split('\n')[0] || '';
      const matchesTitle = firstLine.toLowerCase().includes(searchLower);
      const matchesContent = note.content.toLowerCase().includes(searchLower);
      
      // Also search through children if any
      const matchingChildren = note.children?.some(filterNote) || false;
      
      return matchesTitle || matchesContent || matchingChildren;
    };
    
    return sortedNotes.filter(filterNote);
  }, [sortedNotes, searchTerm]);

  // Add helper function to get the first non-empty content
  const getFirstContent = (content) => {
    // Split by newlines and find first non-empty line
    const lines = content.split('\n');
    const firstNonEmptyLine = lines.find(line => line.trim()) || '';
    
    // Get first sentence, word, or character
    const firstSentence = firstNonEmptyLine.split('.')[0].trim();
    if (firstSentence) return firstSentence;
    
    const firstWord = firstNonEmptyLine.split(' ')[0].trim();
    if (firstWord) return firstWord;
    
    return firstNonEmptyLine.trim() || 'Untitled Note';
  };

  // Add helper function to get note preview content
  const getNotePreview = (content) => {
    const lines = content.split('\n');
    const firstNonEmptyLine = lines.find(line => line.trim()) || '';
    
    // Get first sentence as title
    const firstSentence = firstNonEmptyLine.split('.')[0].trim();
    
    // Get remaining content after the first sentence
    const remainingContent = content
      .slice(firstSentence.length)
      .trim()
      .replace(/^\./,'') // Remove leading period if exists
      .trim();
    
    return remainingContent || 'No additional text';
  };

  // Update NoteItem component
  const NoteItem = ({ note }) => (
    <div 
      key={note.id}
      className={`note-item ${note.id === activeNote?.id ? 'active' : ''} ${note.isPinned ? 'pinned' : ''}`}
      onClick={() => setActiveNoteId(note.id)}
    >
      <div className="note-header">
        <div className="note-title">
          {getFirstContent(note.content)}
        </div>
        <button 
          className="pin-button"
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id);
          }}
          title={note.isPinned ? "Unpin note" : "Pin note"}
        >
          {note.isPinned ? "📌" : "📍"}
        </button>
      </div>
      <div className="note-preview">{getNotePreview(note.content)}</div>
      <div className="note-date">
        {new Date(note.createdAt).toLocaleDateString()}
      </div>
    </div>
  )

  // Update the empty check function to only look at content
  const isNoteEmpty = (note) => {
    return !note.content.trim();
  };

  // Add delete note function
  const deleteNote = (noteId) => {
    const updatedNotes = activeFolder === 'All Notes'
      ? {
          ...allNotes,
          'All Notes': allNotes['All Notes'].filter(note => note.id !== noteId)
        }
      : {
          ...allNotes,
          folders: {
            ...allNotes.folders,
            [activeFolder]: allNotes.folders[activeFolder].filter(note => note.id !== noteId)
          }
        }
    setAllNotes(updatedNotes)
    setActiveNoteId(null)
  }

  // Add this function to handle the entire note blur
  const handleNoteBlur = (e) => {
    // Check if the new target is still within the note-content
    const noteContent = e.currentTarget.closest('.note-content');
    const newTarget = e.relatedTarget;
    
    // Only delete if clicking outside the note content area AND note is empty
    if (!noteContent?.contains(newTarget) && isNoteEmpty(activeNote)) {
      deleteNote(activeNote.id);
    }
  };

  return (
    <div className="notes-layout">
      <div className="notes-sidebar">
        <div className="notes-header">
          <h2>{activeFolder}</h2>
          <button 
            className="delete-note-button" 
            onClick={() => activeNote && deleteNote(activeNote.id)}
            title="Delete note"
          >
            🗑️
          </button>
        </div>
        <div className="notes-list">
          {filteredNotes.map(note => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      </div>
      
      <div className="note-content" onBlur={handleNoteBlur}>
        <div className="note-content-header">
          <button className="add-note-button" onClick={handleAddNote}>
            <span className="nav-icon"></span>
          </button>
          <input
            type="text"
            className="notes-search"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeNote && (
          <textarea
            className="note-content-input"
            value={activeNote.content}
            onChange={(e) => {
              const content = e.target.value;
              const title = content.split('\n')[0] || 'Untitled Note';
              
              const updatedNotes = activeFolder === 'All Notes'
                ? {
                    ...allNotes,
                    'All Notes': allNotes['All Notes'].map(note => 
                      note.id === activeNote.id 
                        ? { ...note, content, title } 
                        : note
                    )
                  }
                : {
                    ...allNotes,
                    folders: {
                      ...allNotes.folders,
                      [activeFolder]: allNotes.folders[activeFolder].map(note =>
                        note.id === activeNote.id 
                          ? { ...note, content, title }
                          : note
                      )
                    }
                  }
              setAllNotes(updatedNotes);
            }}
            onKeyDown={handleNoteKeyDown}
            placeholder="Start typing your note here..."
            data-empty={!activeNote.content}
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

export default Notes 