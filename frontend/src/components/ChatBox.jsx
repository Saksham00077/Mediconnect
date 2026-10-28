import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ChatBox = ({ appointmentId, appointmentStatus = 'booked' }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const isClosed = ['cancelled', 'no_show'].includes(appointmentStatus);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch full conversation
  const fetchMessages = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data } = await api.get(`/messages/${appointmentId}`);
      setMessages(data.messages || []);
    } catch (err) {
      if (!silent) {
        toast.error('Failed to load chat messages');
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  // Initial load + Polling every 5 seconds (paused when tab hidden)
  useEffect(() => {
    fetchMessages(false);

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchMessages(true);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMessages(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appointmentId]);

  // Auto-scroll on initial load and when message count changes
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending || isClosed) return;

    // Optimistic Append
    const tempId = 'temp_' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      sender: {
        _id: user.id || user._id,
        name: user.name,
        role: user.role
      },
      senderRole: user.role,
      text: textToSend,
      createdAt: new Date().toISOString(),
      readAt: null,
      isPending: true
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setSending(true);

    try {
      const { data } = await api.post(`/messages/${appointmentId}`, { text: textToSend });
      // Replace optimistic message with saved DB message
      setMessages((prev) => prev.map((m) => (m._id === tempId ? data.message : m)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message');
      // Rollback optimistic message
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInputText(textToSend);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[520px]">
      {/* Chat Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-sm">Consultation Chat</h3>
          <span className="text-[11px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
            Async Thread
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchMessages(false)}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 text-xs flex items-center gap-1"
          title="Manual refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span className="text-[11px] text-slate-500">Refresh</span>
        </button>
      </div>

      {/* Messages Thread Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-50/30 to-white"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <p className="text-sm font-semibold text-slate-600">No messages yet</p>
            <p className="text-xs max-w-xs mt-1">
              Start the consultation by sending a question, symptom note, or medical update.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (msg.sender?._id || msg.sender) === (user.id || user._id);
            const timeStr = DateTime.fromISO(msg.createdAt).toFormat('hh:mm a');

            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    {isMe ? 'You' : msg.sender?.name || (msg.senderRole === 'doctor' ? 'Doctor' : 'Patient')}
                  </span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] text-slate-400">{timeStr}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-teal-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>

                {/* Message delivery/seen status indicator */}
                {isMe && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                    {msg.isPending ? (
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <Clock className="w-2.5 h-2.5" /> Sending...
                      </span>
                    ) : msg.readAt ? (
                      <span className="flex items-center gap-0.5 text-teal-600 font-medium">
                        <CheckCheck className="w-3 h-3 text-teal-600" /> Seen
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <Check className="w-3 h-3" /> Sent
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input or Closed Notice */}
      <div className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
        {isClosed ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>Messaging is closed because this appointment is {appointmentStatus}.</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message (enter to send)..."
              maxLength={1000}
              className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs sm:text-sm text-slate-800 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all hover:scale-[1.02] shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatBox;

