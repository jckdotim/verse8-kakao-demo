const { Router } = require('express');
const { ask } = require('../services/claude');
const {
  getHistory,
  addMessages,
  getGameContext,
  updateGameContext,
  getPhase,
  setPhase,
  resetSession,
  setGeneratedPrompt,
} = require('../services/conversation');
const { toSkillResponse, fallbackResponse } = require('../formatters/kakao-response');
const { withTimeout } = require('../utils/timeout');

const CLAUDE_TIMEOUT = 4300;

const RESET_KEYWORDS = ['다시 시작', '처음부터', '리셋', '새로 만들기', '초기화'];

function isResetCommand(utterance) {
  return RESET_KEYWORDS.some(kw => utterance.trim().includes(kw));
}

function buildWelcomeResponse() {
  return {
    kakaoResponse: {
      type: 'simpleText',
      text: '안녕하세요! Verse8 게임 제작 가이드입니다.\n\n어떤 게임을 만들어볼까요? 장르를 골라보세요!',
      quickReplies: [
        { label: 'RPG', action: 'message', messageText: 'RPG 게임을 만들고 싶어' },
        { label: '액션', action: 'message', messageText: '액션 게임을 만들고 싶어' },
        { label: '퍼즐', action: 'message', messageText: '퍼즐 게임을 만들고 싶어' },
        { label: '비주얼 노벨', action: 'message', messageText: '비주얼 노벨을 만들고 싶어' },
        { label: '플랫포머', action: 'message', messageText: '플랫포머 게임을 만들고 싶어' },
      ],
    },
    contextUpdate: null,
    phaseTransition: null,
    generatedPrompt: null,
  };
}

function applyClaudeResult(userId, result) {
  if (result.contextUpdate) {
    updateGameContext(userId, result.contextUpdate);
  }
  if (result.phaseTransition) {
    setPhase(userId, result.phaseTransition);
  }
  if (result.generatedPrompt) {
    setGeneratedPrompt(userId, result.generatedPrompt);
  }
}

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const utterance = req.body?.userRequest?.utterance;
    const userId = req.body?.userRequest?.user?.id;
    const callbackUrl = req.body?.userRequest?.callbackUrl;

    if (!utterance || !userId) {
      return res.json(fallbackResponse('메시지를 인식할 수 없습니다.'));
    }

    // 리셋 명령 처리
    if (isResetCommand(utterance)) {
      resetSession(userId);
      const welcome = buildWelcomeResponse();
      const response = toSkillResponse(welcome.kakaoResponse);
      return res.json(response);
    }

    const history = getHistory(userId);
    const gameContext = getGameContext(userId);
    const phase = getPhase(userId);

    // callbackUrl이 있으면 즉시 useCallback 응답 후 백그라운드 처리
    if (callbackUrl) {
      res.json({
        version: '2.0',
        useCallback: true,
        data: {
          text: '게임 컨셉을 구상하고 있습니다. 잠시만 기다려주세요.',
        },
      });

      processCallback(callbackUrl, history, utterance, userId, gameContext, phase);
      return;
    }

    // callbackUrl이 없으면 동기 처리 (타임아웃 포함)
    let claudeResult;
    try {
      claudeResult = await withTimeout(ask(history, utterance, gameContext, phase), CLAUDE_TIMEOUT);
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return res.json(fallbackResponse('응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
      }
      console.error('Claude API error:', err.message);
      return res.json(fallbackResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
    }

    applyClaudeResult(userId, claudeResult);
    const response = toSkillResponse(claudeResult.kakaoResponse);
    addMessages(userId, utterance, JSON.stringify(claudeResult.kakaoResponse));
    return res.json(response);
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.json(fallbackResponse('죄송합니다. 오류가 발생했습니다.'));
  }
});

async function processCallback(callbackUrl, history, utterance, userId, gameContext, phase) {
  try {
    const claudeResult = await ask(history, utterance, gameContext, phase);

    applyClaudeResult(userId, claudeResult);
    const response = toSkillResponse(claudeResult.kakaoResponse);
    addMessages(userId, utterance, JSON.stringify(claudeResult.kakaoResponse));

    const callbackRes = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });

    const result = await callbackRes.json();
    console.log('Callback result:', result.status, result.message || '');
  } catch (err) {
    console.error('Callback processing error:', err.message);

    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackResponse('죄송합니다. 응답 생성 중 오류가 발생했습니다.')),
      });
    } catch (_) {
      console.error('Callback fallback also failed');
    }
  }
}

module.exports = router;
