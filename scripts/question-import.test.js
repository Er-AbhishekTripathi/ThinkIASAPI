const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDocumentTextQuestions } = require('../utils/questionImport');
const { removeDuplicateQuestions } = require('../controllers/questionImportController');

test('DOCX parsing keeps numbered statements inside their question', () => {
  const text = Array.from({ length: 100 }, (_, index) => [
    `${index + 1}. Question ${index + 1}?`,
    '1. First statement.',
    '2. Second statement.',
    '(A) First option (B) Second option (C) Third option (D) Fourth option',
    'Answer: (A)'
  ].join('\n')).join('\n\n');

  const questions = parseDocumentTextQuestions(text);

  assert.equal(questions.length, 100);
  assert.equal(questions[0].question.english, 'Question 1? 1. First statement. 2. Second statement.');
  assert.equal(questions[49].question.english, 'Question 50? 1. First statement. 2. Second statement.');
  assert.equal(questions[99].question.english, 'Question 100? 1. First statement. 2. Second statement.');
});

test('DOCX parsing recognizes explicit and Devanagari question numbering', () => {
  const text = [
    'Question 1: First question?',
    '(A) One (B) Two (C) Three (D) Four',
    'Answer: (A)',
    'प्रश्न २. दूसरा प्रश्न?',
    '(A) एक (B) दो (C) तीन (D) चार',
    'उत्तर: (A)'
  ].join('\n');

  const questions = parseDocumentTextQuestions(text);

  assert.equal(questions.length, 2);
  assert.equal(questions[0].question.english, 'First question?');
  assert.equal(questions[1].question.english, 'दूसरा प्रश्न?');
});

test('DOCX options are not truncated by prose containing the word answer', () => {
  const text = [
    '1. Consider the following statements:',
    'I. First statement.',
    'II. Second statement.',
    'The above statements have been associated with which of the following?',
    '1. Emergence of urban life',
    '2. Transition to money economy.',
    'Select the answer using the code given below:',
    '(a) 1 only',
    '(b) 2 only',
    '(c) Both 1 and 2',
    '(d) Neither 1 nor 2',
    'Correct Answer: (c) Both 1 and 2',
    'Explanation: This is the explanation.',
    '2. Second question?',
    '(a) One',
    '(b) Two',
    '(c) Three',
    '(d) Four',
    'Correct Answer: (a) One'
  ].join('\n');

  const questions = parseDocumentTextQuestions(text);

  assert.equal(questions.length, 2);
  assert.equal(questions[0].question.english, 'Consider the following statements: I. First statement. II. Second statement. The above statements have been associated with which of the following? 1. Emergence of urban life 2. Transition to money economy. Select the answer using the code given below:');
  assert.deepEqual(questions[0].options.map(option => option.english), ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2']);
  assert.equal(questions[0].correctAnswer, 2);
});

test('DOCX parser reads Hindi correct-answer labels without truncating options', () => {
  const text = [
    '1. सही उत्तर चुनिए:',
    '(a) पहला',
    '(b) दूसरा',
    '(c) तीसरा',
    '(d) चौथा',
    'सही उत्तर: (b) दूसरा',
    'व्याख्या: कारण।'
  ].join('\n');

  const questions = parseDocumentTextQuestions(text);

  assert.equal(questions.length, 1);
  assert.deepEqual(questions[0].options.map(option => option.english), ['पहला', 'दूसरा', 'तीसरा', 'चौथा']);
  assert.equal(questions[0].correctAnswer, 1);
});

test('question imports skip existing and repeated bilingual questions', () => {
  const question = (english, hindi) => ({
    question: { english, hindi },
    description: { english: '', hindi: '' },
    options: [],
    correctAnswer: 0,
    tags: []
  });

  const result = removeDuplicateQuestions([
    question('Already saved?', 'पहले से सेव?'),
    question('New question?', 'नया प्रश्न?'),
    question('NEW   QUESTION!', 'नया प्रश्न।'),
    question('Another new question?', 'एक और नया प्रश्न?')
  ], [
    { question: { english: 'Already saved?', hindi: 'पहले से सेव?' } }
  ]);

  assert.deepEqual(result.questions.map(item => item.question.english), [
    'New question?',
    'Another new question?'
  ]);
  assert.deepEqual(result.duplicateQuestions.map(item => ({
    duplicateIndex: item.duplicateIndex,
    firstIndex: item.firstIndex,
    reason: item.reason
  })), [
    { duplicateIndex: 1, firstIndex: undefined, reason: 'already-added' },
    { duplicateIndex: 3, firstIndex: 2, reason: 'repeated-in-file' }
  ]);
});

test('question imports detect Hindi-only duplicates already stored in the database', () => {
  const result = removeDuplicateQuestions([
    { question: { english: 'किसी प्रश्न का पाठ?', hindi: 'किसी प्रश्न का पाठ?' } }
  ], [
    { question: { english: 'Question text?', hindi: 'किसी प्रश्न का पाठ?' } }
  ]);

  assert.equal(result.questions.length, 0);
  assert.equal(result.duplicateQuestions[0].reason, 'already-added');
});
