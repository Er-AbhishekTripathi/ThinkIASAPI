const { parseCSV } = require('./questionImport');

const sheetParts = url => {
  const value = String(url || '').trim();
  const match = value.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('Paste a valid Google Sheet link.');
  const gid = (value.match(/[?#&]gid=(\d+)/) || [])[1] || '0';
  return { id: match[1], gid };
};

const sheetCsvUrl = url => {
  const { id, gid } = sheetParts(url);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
};

const fetchSheetQuestions = async url => {
  const response = await fetch(sheetCsvUrl(url), { redirect: 'follow' });
  if (!response.ok) throw new Error('Unable to read the Google Sheet. Share it as Anyone with the link can view.');
  const text = await response.text();
  if (/<html/i.test(text.slice(0, 80))) throw new Error('Unable to read the Google Sheet. Share it as Anyone with the link can view.');
  return parseCSV(text);
};

module.exports = { sheetParts, sheetCsvUrl, fetchSheetQuestions };
