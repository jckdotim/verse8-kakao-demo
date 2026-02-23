const express = require('express');
const skillRouter = require('./routes/skill');
const { fallbackResponse } = require('./formatters/kakao-response');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', skillRouter);

// 글로벌 에러 핸들러 — 항상 유효한 SkillResponse 반환
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(200).json(fallbackResponse('서버 오류가 발생했습니다.'));
});

module.exports = app;
