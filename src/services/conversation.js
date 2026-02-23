const MAX_MESSAGES = 20; // 10회 대화 (user + assistant)
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2시간
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30분

const sessions = new Map();

function getHistory(userId) {
  const session = sessions.get(userId);
  if (!session) return [];
  session.lastAccess = Date.now();
  return session.messages;
}

function addMessages(userId, userMsg, assistantMsg) {
  let session = sessions.get(userId);
  if (!session) {
    session = { messages: [], lastAccess: Date.now() };
    sessions.set(userId, session);
  }
  session.lastAccess = Date.now();
  session.messages.push(
    { role: 'user', content: userMsg },
    { role: 'assistant', content: assistantMsg }
  );
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL) {
      sessions.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

module.exports = { getHistory, addMessages };
