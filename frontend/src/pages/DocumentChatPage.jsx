import { useEffect, useRef, useState } from "react";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  sendChatMessage,
} from "../services/ai";
import { getResources } from "../services/resources";

function DocumentChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState("");
  const [expandedSource, setExpandedSource] = useState(null);

  const messagesEndRef = useRef(null);

  async function loadInitialData() {
    setError("");
    try {
      const [sessionsData, resourcesData] = await Promise.all([
        listChatSessions(),
        getResources(),
      ]);
      setSessions(sessionsData);
      setResources(resourcesData);

      if (sessionsData.length > 0) {
        const fullSession = await getChatSession(sessionsData[0].id);
        setActiveSession(fullSession);
      }
    } catch (err) {
      setError("Failed to load chat sessions or resources.");
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, sendingMessage]);

  async function handleSelectSession(sessionId) {
    setError("");
    try {
      const fullSession = await getChatSession(sessionId);
      setActiveSession(fullSession);
      setExpandedSource(null);
    } catch (err) {
      setError("Failed to load selected session.");
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setCreatingSession(true);
    setError("");
    try {
      const payload = {
        resource_id: selectedResourceId ? parseInt(selectedResourceId, 10) : null,
        title: sessionTitle.trim() || undefined,
      };
      const newSession = await createChatSession(payload);
      setSessions([newSession, ...sessions]);
      setActiveSession({ ...newSession, messages: [] });
      setSessionTitle("");
      setSelectedResourceId("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create chat session.");
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const cleanMsg = messageInput.trim();
    if (!cleanMsg || !activeSession) return;

    // Optimistically add user turn
    const optimisticUserMsg = {
      id: `temp-${Date.now()}`,
      sender: "USER",
      message: cleanMsg,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setActiveSession((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), optimisticUserMsg],
    }));

    setMessageInput("");
    setSendingMessage(true);
    setError("");

    try {
      const aiResponse = await sendChatMessage(activeSession.id, cleanMsg);
      setActiveSession((prev) => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
      }));
    } catch (err) {
      setError("Failed to generate AI response. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Chat & Knowledge Q&A</h1>
        <p className="mt-1 text-slate-600">
          Ask questions grounded directly in your uploaded learning resources with AI-cited sources.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Left Column: Sessions List & Creator */}
        <div className="lg:col-span-1 space-y-4">
          {/* Create New Session Box */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Start New Chat</h2>
            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label htmlFor="resource-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Learning Resource
                </label>
                <select
                  id="resource-select"
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                >
                  <option value="">All Learning Materials</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="session-title-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Chat Topic / Title (Optional)
                </label>
                <input
                  id="session-title-input"
                  type="text"
                  placeholder="e.g., Algorithms Chapter 1"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingSession}
                className="w-full rounded-md bg-slate-900 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {creatingSession ? "Creating..." : "+ Create Session"}
              </button>
            </form>
          </div>

          {/* Sessions List */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Sessions</h2>
            {loadingSessions ? (
              <p className="text-xs text-slate-500">Loading chats...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-500">No chat sessions yet. Create one above!</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`w-full text-left rounded-lg p-2.5 transition-all text-xs cursor-pointer ${
                      activeSession?.id === s.id
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="truncate font-medium">{s.title}</p>
                    {s.resource_title ? (
                      <p className={`text-[10px] truncate mt-0.5 ${activeSession?.id === s.id ? "text-slate-300" : "text-slate-500"}`}>
                        Doc: {s.resource_title}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col h-[650px]">
          {/* Chat Window Header */}
          <div className="border-b border-slate-100 p-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                {activeSession ? activeSession.title : "Select or create a chat session"}
              </h2>
              {activeSession?.resource_title ? (
                <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  Focused Resource: {activeSession.resource_title}
                </span>
              ) : (
                <span className="text-xs text-slate-500">Grounded across all user documents</span>
              )}
            </div>
            {activeSession ? (
              <span className="text-xs text-slate-400">
                {activeSession.messages?.length || 0} messages
              </span>
            ) : null}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {!activeSession ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <p>Select an existing session on the left or create a new one to begin learning.</p>
              </div>
            ) : activeSession.messages?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <p>No messages yet. Ask any question about your learning material!</p>
              </div>
            ) : (
              activeSession.messages?.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${msg.sender === "USER" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      msg.sender === "USER"
                        ? "bg-slate-900 text-white rounded-tr-xs"
                        : "bg-white text-slate-900 border border-slate-200 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>

                    {/* Source Citations Badges (AI messages only) */}
                    {msg.sender === "AI" && msg.sources?.length > 0 ? (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Grounded Sources:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => {
                            const isSelected = expandedSource === `${msg.id}-${sIdx}`;
                            return (
                              <div key={sIdx} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedSource(isSelected ? null : `${msg.id}-${sIdx}`)
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800 transition-colors cursor-pointer"
                                >
                                  📄 {src.resource_title} (Chunk #{src.chunk_index})
                                </button>
                                {isSelected ? (
                                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 max-w-sm shadow-xs">
                                    <p className="font-semibold text-slate-900 mb-0.5">Excerpt:</p>
                                    <p className="italic">"{src.snippet}..."</p>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.sender === "USER" ? "You" : "Learning AI"} •{" "}
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}

            {sendingMessage ? (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 shadow-xs flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Learning AI is searching resources and grounding answer...
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              placeholder={activeSession ? "Ask a question about your study documents..." : "Select or create a chat session first..."}
              value={messageInput}
              disabled={!activeSession || sendingMessage}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!activeSession || sendingMessage || !messageInput.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default DocumentChatPage;
