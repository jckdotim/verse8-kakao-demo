const MAX_MESSAGES = 20; // 10회 대화 (user + assistant)
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2시간
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30분

const sessions = new Map();

function createDefaultGameContext() {
  return {
    genre: null,
    dimension: null,
    theme: null,
    artStyle: null,
    characters: [],
    mechanics: [],
    story: null,
    title: null,
    additionalDetails: null,
  };
}

function ensureSession(userId) {
  let session = sessions.get(userId);
  if (!session) {
    session = {
      messages: [],
      lastAccess: Date.now(),
      phase: 'exploring',
      gameContext: createDefaultGameContext(),
      generatedPrompt: null,
    };
    sessions.set(userId, session);
  }
  session.lastAccess = Date.now();
  return session;
}

function getHistory(userId) {
  const session = sessions.get(userId);
  if (!session) return [];
  session.lastAccess = Date.now();
  return session.messages;
}

function addMessages(userId, userMsg, assistantMsg) {
  const session = ensureSession(userId);
  session.messages.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: assistantMsg }
  );
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
}

function getGameContext(userId) {
  const session = ensureSession(userId);
  return session.gameContext;
}

function updateGameContext(userId, partial) {
  const session = ensureSession(userId);
  for (const [key, value] of Object.entries(partial)) {
    if (key in session.gameContext && value !== undefined && value !== null) {
      session.gameContext[key] = value;
    }
  }
  return session.gameContext;
}

function getPhase(userId) {
  const session = ensureSession(userId);
  return session.phase;
}

function setPhase(userId, phase) {
  const validPhases = ['exploring', 'refining', 'generating'];
  if (!validPhases.includes(phase)) return;
  const session = ensureSession(userId);
  session.phase = phase;
}

function resetSession(userId) {
  sessions.delete(userId);
}

function setGeneratedPrompt(userId, prompt) {
  const session = ensureSession(userId);
  session.generatedPrompt = prompt;
}

function getGeneratedPrompt(userId) {
  const session = sessions.get(userId);
  return session?.generatedPrompt || null;
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL) {
      sessions.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

module.exports = {
  getHistory,
  addMessages,
  getGameContext,
  updateGameContext,
  getPhase,
  setPhase,
  resetSession,
  setGeneratedPrompt,
  getGeneratedPrompt,
};
