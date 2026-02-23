const { Router } = require('express');
const { ask } = require('../services/claude');
const { getHistory, addMessages } = require('../services/conversation');
const { toSkillResponse, fallbackResponse } = require('../formatters/kakao-response');
const { withTimeout } = require('../utils/timeout');

const CLAUDE_TIMEOUT = 4300;

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const utterance = req.body?.userRequest?.utterance;
    const userId = req.body?.userRequest?.user?.id;
    const callbackUrl = req.body?.userRequest?.callbackUrl;

    if (!utterance || !userId) {
      return res.json(fallbackResponse('메시지를 인식할 수 없습니다.'));
    }

    const history = getHistory(userId);

    // callbackUrl이 있으면 즉시 useCallback 응답 후 백그라운드 처리
    if (callbackUrl) {
      res.json({
        version: '2.0',
        useCallback: true,
        data: {
          text: '답변을 생성하고 있습니다. 잠시만 기다려주세요.',
        },
      });

      // 백그라운드에서 Claude 호출 후 callbackUrl로 전송
      processCallback(callbackUrl, history, utterance, userId);
      return;
    }

    // callbackUrl이 없으면 기존 동기 처리 (타임아웃 포함)
    let claudeResult;
    try {
      claudeResult = await withTimeout(ask(history, utterance), CLAUDE_TIMEOUT);
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        return res.json(fallbackResponse('응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'));
      }
      console.error('Claude API error:', err.message);
      return res.json(fallbackResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
    }

    const response = toSkillResponse(claudeResult);
    addMessages(userId, utterance, JSON.stringify(claudeResult));
    return res.json(response);
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.json(fallbackResponse('죄송합니다. 오류가 발생했습니다.'));
  }
});

async function processCallback(callbackUrl, history, utterance, userId) {
  try {
    const claudeResult = await ask(history, utterance);
    const response = toSkillResponse(claudeResult);

    addMessages(userId, utterance, JSON.stringify(claudeResult));

    const callbackRes = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });

    const result = await callbackRes.json();
    console.log('Callback result:', result.status, result.message || '');
  } catch (err) {
    console.error('Callback processing error:', err.message);

    // 에러 시에도 callbackUrl로 에러 메시지 전송 시도
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
