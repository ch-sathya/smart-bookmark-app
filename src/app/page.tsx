'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

type Bookmark = {
  id: string
  title: string
  url: string
  user_id: string
  created_at?: string
}

function getHostname(url: string) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
  } catch {
    return ''
  }
}

export default function HomePage() {
  const router = useRouter()
  const isMounted = useRef(true)

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 🔹 AUTH + REALTIME
  useEffect(() => {
    let channel: any

    const init = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/login')
          return
        }

        if (isMounted.current) {
          setUserId(user.id)
          await fetchBookmarks(user.id)
        }

        channel = supabase
          .channel('bookmarks-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookmarks',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (!isMounted.current) return
              
              if (payload.eventType === 'INSERT') {
                setBookmarks((prev) => {
                  const exists = prev.some(b => b.id === payload.new.id);
                  if (exists) return prev;
                  return [payload.new as Bookmark, ...prev];
                });
              }
              if (payload.eventType === 'DELETE') {
                setBookmarks((prev) =>
                  prev.filter((b) => b.id !== payload.old.id)
                );
              }
              if (payload.eventType === 'UPDATE') {
                setBookmarks((prev) =>
                  prev.map((b) => b.id === payload.new.id ? payload.new as Bookmark : b)
                );
              }
            }
          )
          .subscribe()

      } catch (error) {
        console.error('Init error:', error)
        router.push('/login')
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  const fetchBookmarks = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (isMounted.current) {
        setBookmarks(data || [])
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
    }
  }, [])

  // 🔹 ADD
  const addBookmark = async () => {
    if (!title.trim() || !url.trim() || !userId || adding) return;

    setAdding(true)
    const tempId = crypto.randomUUID();
    const tempBookmark = {
      id: tempId,
      title: title.trim(),
      url: url.trim(),
      user_id: userId,
    };

    // Optimistically add to UI
    if (isMounted.current) {
      setBookmarks((prev) => [tempBookmark, ...prev]);
      setTitle('');
      setUrl('');
    }

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          title: title.trim(),
          url: url.trim(),
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data && isMounted.current) {
        setBookmarks((prev) => 
          prev.map((b) => b.id === tempId ? data : b)
        );
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
      if (isMounted.current) {
        setBookmarks((prev) => prev.filter((b) => b.id !== tempId));
      }
    } finally {
      if (isMounted.current) {
        setAdding(false);
      }
    }
  };

  // 🔹 DELETE
  const deleteBookmark = async (id: string) => {
    if (deletingIds.has(id) || !userId) return;
    
    setDeletingIds((prev) => new Set(prev).add(id));
    
    // Store the bookmark being deleted for potential rollback
    const deletedBookmark = bookmarks.find(b => b.id === id);
    
    // Optimistically update UI
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      
      // Rollback on error
      if (deletedBookmark && isMounted.current) {
        setBookmarks((prev) => [deletedBookmark, ...prev]);
      }
    } finally {
      if (isMounted.current) {
        setDeletingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  // 🔹 LOGOUT
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="border border-gray-600/30 px-6 py-4 animate-pulse">
          <span className="text-gray-300">loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black font-sans">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* HEADER */}
        <div className="border-b border-gray-700/50 pb-6 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-medium tracking-wide text-white">
              Bookmarks
            </h1>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white 
                       transition-colors px-4 py-2 rounded-lg
                       hover:bg-gray-800/50"
            >
              logout
            </button>
          </div>
        </div>

        {/* ADD BOOKMARK */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 border border-gray-700/50 bg-black px-4 py-3
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-gray-400
                       hover:border-gray-500
                       transition-all duration-200 rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
              disabled={adding}
            />
            <input
              className="flex-1 border border-gray-700/50 bg-black px-4 py-3
                       text-white placeholder-gray-500
                       focus:outline-none focus:border-gray-400
                       hover:border-gray-500
                       transition-all duration-200 rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
              disabled={adding}
            />
            <button
              onClick={addBookmark}
              disabled={!title.trim() || !url.trim() || adding}
              className="px-6 py-3 border border-gray-700/50
                       hover:border-gray-400 disabled:opacity-30
                       disabled:hover:border-gray-700/50
                       text-gray-300 hover:text-white
                       bg-black transition-all duration-200
                       rounded-lg hover:bg-gray-900
                       active:scale-[0.98] min-w-[100px]"
            >
              {adding ? 'adding...' : 'add'}
            </button>
          </div>
        </div>

        {/* LIST */}
        {bookmarks.length === 0 ? (
          <div className="text-center py-12 border border-gray-700/50 rounded-lg hover:border-gray-500 transition-colors">
            <p className="text-gray-400 text-lg">
              no bookmarks yet
            </p>
            <p className="text-gray-600 text-sm mt-2">
              add your first bookmark above
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((b) => (
              <li
                key={b.id}
                className="border border-gray-700/50 hover:border-gray-400 
                         p-5 transition-all duration-200 bg-black
                         rounded-lg hover:bg-gray-900/30"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <a
                      href={b.url.startsWith('http') ? b.url : `https://${b.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-200 hover:text-white 
                               transition-colors font-medium text-lg
                               break-words"
                    >
                      {b.title}
                    </a>
                    <div className="text-sm text-gray-500 mt-1 hover:text-gray-400 transition-colors">
                      {getHostname(b.url)}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteBookmark(b.id)}
                    disabled={deletingIds.has(b.id)}
                    className={`px-4 py-2 text-sm
                             border border-gray-700/50 hover:border-gray-400
                             disabled:opacity-30 disabled:hover:border-gray-700/50
                             text-gray-400 hover:text-white
                             bg-black hover:bg-gray-900
                             transition-all duration-200
                             rounded-lg active:scale-[0.98]
                             min-w-[80px]
                             ${deletingIds.has(b.id) ? 'cursor-not-allowed' : ''}`}
                  >
                    {deletingIds.has(b.id) ? '...' : 'delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
            {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
          </p>
        </div>
      </div>
    </div>
  )
}