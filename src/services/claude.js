const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt } = require('../prompts/system-prompt');

const client = new Anthropic();

function parseClaudeResponse(text) {
  let parsed;

  // 1차: 직접 JSON 파싱
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    // 2차: 코드펜스 내부 추출
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        parsed = JSON.parse(fenceMatch[1].trim());
      } catch (_) {}
    }

    // 3차: 첫 번째 { ... } 블록 추출
    if (!parsed) {
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0]);
        } catch (_) {}
      }
    }
  }

  // 래퍼 구조 ({response, contextUpdate, ...}) 처리
  if (parsed && parsed.response && parsed.response.type) {
    return {
      kakaoResponse: parsed.response,
      contextUpdate: parsed.contextUpdate || null,
      phaseTransition: parsed.phaseTransition || null,
      generatedPrompt: parsed.generatedPrompt || null,
    };
  }

  // 래퍼 없이 직접 카카오 포맷인 경우 (폴백)
  if (parsed && parsed.type) {
    return {
      kakaoResponse: parsed,
      contextUpdate: null,
      phaseTransition: null,
      generatedPrompt: null,
    };
  }

  // 파싱 완전 실패 → raw text fallback
  return {
    kakaoResponse: { type: 'simpleText', text: text },
    contextUpdate: null,
    phaseTransition: null,
    generatedPrompt: null,
  };
}

async function ask(history, utterance, gameContext, phase) {
  const systemPrompt = buildSystemPrompt(gameContext, phase);

  const messages = [
    ...history,
    { role: 'user', content: utterance },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const raw = response.content[0].text;
  return parseClaudeResponse(raw);
}

module.exports = { ask };
