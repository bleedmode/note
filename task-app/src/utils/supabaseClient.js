import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth functions
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};

// Profile functions
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { profile: data, error };
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { data, error };
};

// Folder functions
export const getFolders = async (userId) => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  return { folders: data || [], error };
};

export const createFolder = async (userId, name) => {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ user_id: userId, name }])
    .select();
  return { folder: data?.[0], error };
};

export const deleteFolder = async (folderId) => {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);
  return { error };
};

// Note functions
export const getNotes = async (userId, folderId = null) => {
  let query = supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId);
  
  if (folderId) {
    query = query.eq('folder_id', folderId);
  }
  
  const { data, error } = await query.order('updated_at', { ascending: false });
  return { notes: data || [], error };
};

export const createNote = async (noteData) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([noteData])
      .select();
    
    if (error) {
      console.error('Error creating note:', error);
      return { error };
    }
    
    // Return the first note from the data array
    return { note: data[0], error: null };
  } catch (err) {
    console.error('Unexpected error creating note:', err);
    return { error: err };
  }
};

export const updateNote = async (noteId, updates) => {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .select();
  return { note: data?.[0], error };
};

export const deleteNote = async (noteId) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);
  return { error };
};

// Task functions
export const getTasks = async (userId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { tasks: data || [], error };
};

export const getTasksByNote = async (userId, noteId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('note_id', noteId);
  return { tasks: data || [], error };
};

export const createTask = async (userId, task) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      user_id: userId,
      text: task.text,
      type: task.type,
      section: task.section,
      note_id: task.note_id || null,
      note_task_id: task.note_task_id || null,
      order_index: task.order_index || 0
    }])
    .select();
  return { task: data?.[0], error };
};

export const updateTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select();
  return { task: data?.[0], error };
};

export const deleteTask = async (taskId) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  return { error };
};

// Offline support
export const setupOfflineSync = () => {
  // Queue for storing operations when offline
  let syncQueue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
  
  // Function to add operation to queue
  const queueOperation = (table, operation, data) => {
    syncQueue.push({
      table,
      operation,
      data,
      timestamp: Date.now()
    });
    localStorage.setItem('sync_queue', JSON.stringify(syncQueue));
  };
  
  // Function to process queue when online
  const processQueue = async () => {
    if (!navigator.onLine) return;
    
    const queue = [...syncQueue];
    syncQueue = [];
    
    for (const item of queue) {
      try {
        if (item.operation === 'insert') {
          await supabase.from(item.table).insert(item.data);
        } else if (item.operation === 'update') {
          await supabase.from(item.table).update(item.data).eq('id', item.data.id);
        } else if (item.operation === 'delete') {
          await supabase.from(item.table).delete().eq('id', item.data.id);
        }
      } catch (error) {
        console.error('Error processing offline operation:', error);
        // Put failed operation back in queue
        queueOperation(item.table, item.operation, item.data);
      }
    }
    
    localStorage.setItem('sync_queue', JSON.stringify(syncQueue));
  };
  
  // Listen for online status
  window.addEventListener('online', processQueue);
  
  return {
    queueOperation,
    processQueue
  };
};

export default supabase; 