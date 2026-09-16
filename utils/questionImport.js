function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(value => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(cell); if (row.some(value => value.trim())) rows.push(row);
  const headers = rows.shift();
  if (!headers) throw new Error('The file is empty.');
  const keys = headers.map(header => header.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (new Set(keys).size !== keys.length) throw new Error('CSV contains duplicate headers.');
  return rows.map((values, index) => {
    if (values.length !== keys.length) throw new Error(`Row ${index + 2}: column count does not match the header.`);
    const item = Object.fromEntries(keys.map((key, i) => [key, values[i].trim()]));
    const answer = item.correctanswer?.trim().toUpperCase();
    return {
      question: { english: item.questionenglish || '', hindi: item.questionhindi || '' },
      description: { english: item.descriptionenglish || '', hindi: item.descriptionhindi || '' },
      options: [0, 1, 2, 3].map(i => ({
        english: item[`option${'abcd'[i]}english`] ?? item.optionsenglish?.split(' | ')[i] ?? '',
        hindi: item[`option${'abcd'[i]}hindi`] ?? item.optionshindi?.split(' | ')[i] ?? ''
      })),
      correctAnswer: /^[A-D]$/.test(answer) ? answer.charCodeAt(0) - 65 : answer && /^[0-3]$/.test(answer) ? Number(answer) : -1,
      tags: (item.tags || '').split(/[,;]/).map(value => value.trim()).filter(Boolean)
    };
  });
}

function validateQuestions(input) {
  if (!Array.isArray(input) || !input.length || input.length > 1000) throw new Error('Provide between 1 and 1000 questions.');
  const errors = [];
  input.forEach((item, index) => {
    const invalid = !item || typeof item.question?.english !== 'string' || !item.question.english.trim()
      || !Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option => typeof option?.english !== 'string' || !option.english.trim())
      || !Number.isInteger(item.correctAnswer) || item.correctAnswer < 0 || item.correctAnswer > 3
      || (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some(tag => typeof tag !== 'string')));
    if (invalid) errors.push(`Question ${index + 1}: English question, four English options and correctAnswer 0–3 are required.`);
    for (const value of [item?.question, item?.description, ...(Array.isArray(item?.options) ? item.options : [])]) {
      if (value?.hindi !== undefined && typeof value.hindi !== 'string') errors.push(`Question ${index + 1}: Hindi values must be text.`);
    }
  });
  if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
  return input;
}
module.exports = { parseCSV, validateQuestions };
