import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import TipTapEditor from './TipTapEditor'
import { useAuth } from '../context/AuthContext'
import { 
  getNotes, 
  createNote, 
  updateNote, 
  deleteNote as deleteNoteFromSupabase,
  getTasksByNote,
  createTask,
  updateTask,
  supabase
} from '../utils/supabaseClient'
import LoadingSpinner from './LoadingSpinner'

const Notes = ({ activeFolder = 'All Notes', onAddWorkTask, findTaskByNoteRef, updateTaskComplete, allTasks }) => {
  const { user } = useAuth();
  
  // State for notes
  const [allNotes, setAllNotes] = useState([]);
  
  // Initialize activeNoteId
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  // Add search state near the top with other state declarations
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Add error state
  const [error, setError] = useState(null);
  
  // Set showToolbar to true by default to ensure the toolbar is visible
  const [showToolbar, setShowToolbar] = useState(true);
  
  // Add state for task dropdown
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  
  // Add a key to force re-render of the editor when switching notes
  const [editorKey, setEditorKey] = useState(Date.now());
  
  // Refs
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const taskDropdownRef = useRef(null);
  
  // Get notes for current folder with safety check
  const currentNotes = allNotes ? (
    activeFolder === 'All Notes' 
      ? allNotes
      : allNotes.filter(note => note.folder_id === activeFolder)
  ) : [];
  
  // Get the active note based on activeNoteId
  const activeNote = useMemo(() => {
    return allNotes.find(note => note.id === activeNoteId) || currentNotes[0] || null;
  }, [allNotes, activeNoteId, currentNotes]);
  
  // Filter and sort notes
  const sortedNotes = useMemo(() => {
    // First separate pinned and unpinned notes
    const pinned = [];
    const unpinned = [];

    allNotes.forEach(note => {
      if (note.is_pinned) {
        pinned.push(note);
      } else {
        unpinned.push(note);
      }
    });

    // Sort each group by updated_at (most recent first)
    const sortByDate = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);
    
    return [
      ...pinned.sort(sortByDate),
      ...unpinned.sort(sortByDate)
    ];
  }, [allNotes]);
  
  // Fetch notes from Supabase when component mounts or folder changes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Determine if we need to filter by folder
        const folderId = activeFolder !== 'All Notes' ? activeFolder : null;
        
        // Fetch notes from Supabase
        const { notes, error } = await getNotes(user.id, folderId);
        
        if (error) {
          console.error('Error fetching notes:', error);
          setError('Failed to load notes. Please try again.');
          return;
        }
        
        // Update local state with fetched notes
        setAllNotes(notes);
        
        // If we have notes and no active note, select the most recent one
        if (notes.length > 0 && !activeNoteId) {
          // Sort by updated_at to get the most recent note
          const sortedByDate = [...notes].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
          );
          setActiveNoteId(sortedByDate[0].id);
        }
      } catch (err) {
        console.error('Unexpected error fetching notes:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotes();
  }, [user, activeFolder]);
  
  // Add new note function
  const handleAddNote = async () => {
    if (!user) return;
    
    try {
      // Create a new note object
      const newNote = {
        user_id: user.id,
        folder_id: activeFolder !== 'All Notes' ? activeFolder : null,
        title: 'Untitled Note',
        content: '<p></p>',  // Start with an empty paragraph
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Save to Supabase
      const { note, error } = await createNote(newNote);
      
      if (error) {
        console.error('Error creating note:', error);
        setError('Failed to create note. Please try again.');
        return;
      }
      
      if (!note) {
        console.error('Note creation returned no data');
        setError('Failed to create note. Please try again.');
        return;
      }
      
      // Add to local state
      setAllNotes(prev => [note, ...prev]);
      
      // Save the current note before switching
      if (activeNote && activeNote.content) {
        await saveCurrentNote(activeNote.content);
      }
      
      // Set as active note
      setActiveNoteId(note.id);
      
      // Generate a new key to force editor re-render
      setEditorKey(Date.now());
      
      // Focus the editor
      setTimeout(() => {
        if (editorRef.current && typeof editorRef.current.focus === 'function') {
          editorRef.current.focus();
        }
      }, 100);
    } catch (err) {
      console.error('Unexpected error creating note:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };
  
  // Add a function to save the current note
  const saveCurrentNote = async (content) => {
    if (!activeNoteId || !content) return;
    
    try {
      console.log('Saving note:', activeNoteId);
      
      // Update in Supabase
      const { error } = await updateNote(activeNoteId, { 
        content, 
        updated_at: new Date().toISOString() 
      });
      
      if (error) {
        console.error('Error saving note:', error);
      }
    } catch (err) {
      console.error('Unexpected error saving note:', err);
    }
  };
  
  // Handle note selection
  const handleNoteSelect = async (noteId) => {
    // If clicking on the already active note, do nothing
    if (noteId === activeNoteId) return;
    
    // Save the current note before switching
    if (activeNote && activeNote.content) {
      await saveCurrentNote(activeNote.content);
    }
    
    // Check if current note is empty and should be deleted
    if (activeNote && isNoteEmpty(activeNote)) {
      await deleteNoteHandler(activeNote.id);
    }
    
    // Set the new active note
    setActiveNoteId(noteId);
    
    // Generate a new key to force editor re-render
    setEditorKey(Date.now());
    
    // Focus the editor after a short delay
    setTimeout(() => {
      if (editorRef.current && typeof editorRef.current.focus === 'function') {
        editorRef.current.focus();
      }
    }, 100);
  };
  
  // Handle note content change
  const handleNoteChange = useCallback((editorData) => {
    if (!activeNoteId) return;
    
    // Check if editor exists in the data
    const content = editorData?.editor?.getHTML();
    if (!content) return;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Update local state immediately for responsive UI
    setAllNotes(prev => 
      prev.map(note => 
        note.id === activeNoteId 
          ? { ...note, content, updated_at: new Date().toISOString() } 
          : note
      )
    );
    
    // Debounce the save to Supabase
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote(content);
    }, 500); // 500ms debounce
  }, [activeNoteId]);
  
  // Toggle pin status
  const togglePin = async (noteId) => {
    try {
      // Find the note
      const note = allNotes.find(n => n.id === noteId);
      if (!note) return;
      
      // Update local state first (optimistic update)
      setAllNotes(prev => 
        prev.map(n => 
          n.id === noteId 
            ? { ...n, is_pinned: !n.is_pinned } 
            : n
        )
      );
      
      // Then update in Supabase
      const { error } = await updateNote(noteId, { 
        is_pinned: !note.is_pinned 
      });
      
      if (error) {
        console.error('Error toggling pin:', error);
        // Revert the optimistic update
        setAllNotes(prev => 
          prev.map(n => 
            n.id === noteId 
              ? { ...n, is_pinned: note.is_pinned } 
              : n
          )
        );
      }
    } catch (err) {
      console.error('Unexpected error toggling pin:', err);
    }
  };
  
  // Delete a note
  const deleteNoteHandler = async (noteId) => {
    try {
      // Delete from Supabase
      const { error } = await deleteNoteFromSupabase(noteId);
      
      if (error) {
        console.error('Error deleting note:', error);
        return;
      }
      
      // Update local state
      const updatedNotes = allNotes.filter(note => note.id !== noteId);
      setAllNotes(updatedNotes);
      
      // If the deleted note was the active note, select another one
      if (noteId === activeNoteId) {
        if (updatedNotes.length > 0) {
          // Select the most recently updated note
          const sortedByDate = [...updatedNotes].sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
          );
          setActiveNoteId(sortedByDate[0].id);
          
          // Generate a new key to force editor re-render
          setEditorKey(Date.now());
        } else {
          setActiveNoteId(null);
        }
      }
    } catch (err) {
      console.error('Unexpected error deleting note:', err);
    }
  };
  
  // Filter notes based on search term
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return sortedNotes;
    
    const searchLower = searchTerm.toLowerCase();
    
    const filterNote = (note) => {
      const title = getFirstContent(note.content) || '';
      const matchesTitle = title.toLowerCase().includes(searchLower);
      const matchesContent = note.content.toLowerCase().includes(searchLower);
      
      return matchesTitle || matchesContent;
    };
    
    return sortedNotes.filter(filterNote);
  }, [sortedNotes, searchTerm]);
  
  // Extract title from note content
  const getFirstContent = (content) => {
    if (!content) return 'Untitled Note';
    
    const div = document.createElement('div');
    div.innerHTML = content;
    
    // Convert HTML paragraphs and breaks to newlines
    const html = div.innerHTML
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n');
    
    div.innerHTML = html;
    const textContent = div.textContent || '';
    const lines = textContent.split('\n').filter(line => line.trim());
    
    return lines[0]?.trim() || 'Untitled Note';
  };
  
  // Extract preview from note content
  const getNotePreview = (content) => {
    if (!content) return 'No additional text';
    
    const div = document.createElement('div');
    div.innerHTML = content;
    
    // Convert HTML paragraphs and breaks to newlines
    const html = div.innerHTML
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n');
    
    div.innerHTML = html;
    const textContent = div.textContent || '';
    const lines = textContent.split('\n').filter(line => line.trim());
    
    // Return the second line if it exists
    if (lines.length > 1) {
      return lines[1].trim();
    }
    
    return 'No additional text';
  };
  
  // Component for rendering a note item in the sidebar
  const NoteItem = ({ note }) => (
    <div
      className={`note-item ${note.id === activeNoteId ? 'active' : ''} ${note.is_pinned ? 'pinned' : ''}`}
      onClick={() => handleNoteSelect(note.id)}
    >
      <div className="note-header">
        <div className="note-title">{getFirstContent(note.content)}</div>
        <button
          className="pin-button"
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id);
          }}
          aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
        >
          {note.is_pinned ? '📌' : '📍'}
        </button>
      </div>
      <div className="note-preview">{getNotePreview(note.content)}</div>
      <div className="note-date">
        {new Date(note.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
  
  // Check if a note is empty
  const isNoteEmpty = (note) => {
    if (!note || !note.content) return true;
    return !note.content.replace(/<[^>]*>/g, '').trim();
  };
  
  // Handle blur event on the note editor
  const handleNoteBlur = (e) => {
    // Save the current note when clicking away
    if (activeNote && activeNote.content) {
      saveCurrentNote(activeNote.content);
    }
    
    // If the active note is empty and the user is clicking outside the note,
    // delete the note
    if (activeNote && isNoteEmpty(activeNote)) {
      // Check if the click is outside the note content area
      const noteContent = e.currentTarget.closest('.note-content');
      const newTarget = e.relatedTarget;
      
      if (!noteContent?.contains(newTarget)) {
        deleteNoteHandler(activeNote.id);
      }
    }
  };
  
  // Handle adding a task from a note
  const handleAddTaskFromNote = async (taskText, type, section, noteTaskId) => {
    if (!taskText || !onAddWorkTask) return;
    
    try {
      // Call the parent component's onAddWorkTask function
      const newTask = await onAddWorkTask(taskText, type, section, {
        noteId: activeNoteId,
        noteTaskId
      });
      
      return newTask;
    } catch (err) {
      console.error('Error adding task from note:', err);
      return null;
    }
  };
  
  // Sync task status between note and main task list
  const syncTaskStatus = async (noteTaskId, completed) => {
    if (!noteTaskId || !updateTaskComplete) return;
    
    try {
      // Find the corresponding task in the main task list
      const mainTask = findTaskByNoteRef(activeNoteId, noteTaskId);
      
      if (mainTask) {
        // Update the task completion status
        updateTaskComplete(mainTask.id, completed);
      }
    } catch (err) {
      console.error('Error syncing task status:', err);
    }
  };
  
  // Add a useEffect to save the note when component unmounts
  useEffect(() => {
    return () => {
      // Save the current note when component unmounts
      if (activeNote && activeNote.content) {
        saveCurrentNote(activeNote.content);
      }
    };
  }, [activeNote]);
  
  // Show loading state while fetching notes
  if (isLoading) {
    return <LoadingSpinner message="Loading notes..." />;
  }
  
  // Show error state if there was an error
  if (error) {
    return <div className="notes-error">{error}</div>;
  }
  
  return (
    <div className="notes-layout">
      <div className="notes-sidebar">
        <div className="notes-header">
          <h2>{activeFolder}</h2>
          <button
            className="add-note-button"
            onClick={handleAddNote}
            aria-label="Add new note"
          >
            <span className="nav-icon">+</span>
          </button>
        </div>
        <div className="notes-list">
          {filteredNotes.length > 0 ? (
            <>
              {filteredNotes.some(note => note.is_pinned) && (
                <div className="notes-section-header">PINNED</div>
              )}
              
              {filteredNotes
                .filter(note => note.is_pinned)
                .map(note => (
                  <NoteItem key={note.id} note={note} />
                ))}
              
              {filteredNotes.some(note => !note.is_pinned) && (
                <div className="notes-section-header unpinned">NOTES</div>
              )}
              
              {filteredNotes
                .filter(note => !note.is_pinned)
                .map(note => (
                  <NoteItem key={note.id} note={note} />
                ))}
            </>
          ) : (
            <div className="empty-state">
              <p>No notes found</p>
              <button onClick={handleAddNote}>Create a new note</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="note-content">
        <div className="note-content-header">
          <input
            type="text"
            className="notes-search"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {activeNote && (
            <button
              className="delete-note-button"
              onClick={() => deleteNoteHandler(activeNote.id)}
              aria-label="Delete note"
            >
              🗑️
            </button>
          )}
        </div>
        
        <div className="note-editor-container" onBlur={handleNoteBlur}>
          {activeNote ? (
            <TipTapEditor
              key={editorKey} // Add a key to force re-render when switching notes
              ref={editorRef}
              content={activeNote.content}
              onUpdate={handleNoteChange}
              showToolbar={true}
              onAddWorkTask={handleAddTaskFromNote}
              syncTaskStatus={syncTaskStatus}
              noteId={activeNote.id}
              allTasks={allTasks}
            />
          ) : (
            <div className="empty-note">
              <p>Select a note or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;