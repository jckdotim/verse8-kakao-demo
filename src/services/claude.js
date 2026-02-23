const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('../prompts/system-prompt');

const client = new Anthropic();

function parseClaudeResponse(text) {
  // 1차: 직접 JSON 파싱
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2차: 코드펜스 내부 추출
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  // 3차: 첫 번째 { ... } 블록 추출
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch (_) {}
  }

  // 파싱 실패 → raw text fallback
  return { type: 'simpleText', text };
}

async function ask(history, utterance) {
  const messages = [
    ...history,
    { role: 'user', content: utterance },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const raw = response.content[0].text;
  return parseClaudeResponse(raw);
}

module.exports = { ask };
