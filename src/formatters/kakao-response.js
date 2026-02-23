const L = require('../constants/kakao-limits');

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatButtons(buttons, labelMax, countMax) {
  if (!Array.isArray(buttons)) return undefined;
  return buttons.slice(0, countMax).map((b) => {
    const btn = { label: truncate(b.label, labelMax), action: b.action || 'message' };
    if (b.webLinkUrl) btn.webLinkUrl = b.webLinkUrl;
    if (b.messageText) btn.messageText = b.messageText;
    if (btn.action === 'message' && !btn.messageText) btn.messageText = btn.label;
    return btn;
  });
}

function formatQuickReplies(qr) {
  if (!Array.isArray(qr) || qr.length === 0) return undefined;
  return qr.slice(0, L.QUICK_REPLIES_MAX).map((q) => ({
    label: truncate(q.label, L.QUICK_REPLY_LABEL_MAX),
    action: q.action || 'message',
    messageText: q.messageText || q.label,
  }));
}

function buildSimpleText(data) {
  return { simpleText: { text: truncate(data.text, L.SIMPLE_TEXT_MAX) } };
}

function buildTextCard(data) {
  const card = { text: truncate(data.text, L.TEXT_CARD_TEXT_MAX) };
  if (data.title) card.title = truncate(data.title, 40);
  const buttons = formatButtons(data.buttons, L.TEXT_CARD_BUTTON_LABEL_MAX, L.TEXT_CARD_BUTTONS_MAX);
  if (buttons) card.buttons = buttons;
  return { textCard: card };
}

function buildBasicCard(data) {
  const card = {};
  if (data.title) card.title = truncate(data.title, L.BASIC_CARD_TITLE_MAX);
  if (data.description) card.description = truncate(data.description, L.BASIC_CARD_DESCRIPTION_MAX);
  if (data.thumbnail && data.thumbnail.imageUrl) card.thumbnail = { imageUrl: data.thumbnail.imageUrl };
  const buttons = formatButtons(data.buttons, L.BASIC_CARD_BUTTON_LABEL_MAX, L.BASIC_CARD_BUTTONS_MAX);
  if (buttons) card.buttons = buttons;
  return { basicCard: card };
}

function buildListCard(data) {
  const header = { title: truncate(data.header?.title || '목록', L.LIST_CARD_HEADER_MAX) };
  const items = (data.items || []).slice(0, L.LIST_CARD_ITEMS_MAX).map((item) => {
    const formatted = { title: truncate(item.title, L.LIST_CARD_ITEM_TITLE_MAX) };
    if (item.description) formatted.description = truncate(item.description, L.LIST_CARD_ITEM_DESC_MAX);
    if (item.imageUrl) formatted.imageUrl = item.imageUrl;
    if (item.link) formatted.link = item.link;
    return formatted;
  });
  if (items.length === 0) {
    return buildSimpleText({ text: data.header?.title || '목록' });
  }
  const card = { header, items };
  const buttons = formatButtons(data.buttons, L.TEXT_CARD_BUTTON_LABEL_MAX, L.LIST_CARD_BUTTONS_MAX);
  if (buttons) card.buttons = buttons;
  return { listCard: card };
}

function buildItemCard(data) {
  const items = (data.items || []).slice(0, L.ITEM_CARD_ITEMS_MAX).map((item) => ({
    title: truncate(item.title, L.ITEM_CARD_TITLE_MAX),
    description: truncate(item.description, L.ITEM_CARD_DESCRIPTION_MAX),
  }));
  if (items.length === 0) {
    return buildSimpleText({ text: data.title || '정보' });
  }
  const card = { items };
  if (data.title) card.title = truncate(data.title, L.ITEM_CARD_TITLE_MAX);
  return { itemCard: card };
}

function buildCarousel(data) {
  const cards = (data.cards || []).slice(0, L.CAROUSEL_CARDS_MAX).map((c) => {
    const card = {};
    if (c.title) card.title = truncate(c.title, L.BASIC_CARD_TITLE_MAX);
    if (c.description) card.description = truncate(c.description, L.BASIC_CARD_DESCRIPTION_MAX);
    if (c.thumbnail && c.thumbnail.imageUrl) card.thumbnail = { imageUrl: c.thumbnail.imageUrl };
    const buttons = formatButtons(c.buttons, L.BASIC_CARD_BUTTON_LABEL_MAX, L.BASIC_CARD_BUTTONS_MAX);
    if (buttons) card.buttons = buttons;
    return card;
  });
  if (cards.length === 0) {
    return buildSimpleText({ text: '정보를 표시할 수 없습니다.' });
  }
  return { carousel: { type: 'basicCard', items: cards } };
}

const builders = {
  simpleText: buildSimpleText,
  textCard: buildTextCard,
  basicCard: buildBasicCard,
  listCard: buildListCard,
  itemCard: buildItemCard,
  carousel: buildCarousel,
};

function toSkillResponse(claudeOutput) {
  const builder = builders[claudeOutput.type];
  const output = builder ? builder(claudeOutput) : buildSimpleText({ text: claudeOutput.text || '응답을 처리할 수 없습니다.' });

  const response = {
    version: '2.0',
    template: {
      outputs: [output],
    },
  };

  const qr = formatQuickReplies(claudeOutput.quickReplies);
  if (qr) response.template.quickReplies = qr;

  return response;
}

function fallbackResponse(text) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text: truncate(text, L.SIMPLE_TEXT_MAX) } }],
    },
  };
}

module.exports = { toSkillResponse, fallbackResponse };
