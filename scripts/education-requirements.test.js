const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV, validateQuestions } = require('../utils/questionImport');
const { mergePlanAccess } = require('../utils/planAccess');
const { visibleAudiences, audienceTypes } = require('../utils/notificationAudience');
const { normalizeMaterialLink } = require('../utils/materialLink');
const TestSeries = require('../models/TestSeries');
const Question = require('../models/Question');
const mongoose = require('mongoose');

const question = () => ({ question: {english: 'Capital of India?', hindi: 'भारत की राजधानी?'}, description: {english:'',hindi:''}, options: ['Delhi','Mumbai','Chennai','Kolkata'].map(english=>({english,hindi:''})), correctAnswer: 0, tags: [] });
const series = changes => new TestSeries({ kind:'mains', name:'Series', description:'Practice', startDate:'2026-09-01', endDate:'2026-09-30', testDates:[{date:'2026-09-10',time:'09:00',duration:180}], createdBy: new mongoose.Types.ObjectId(), ...changes });

test('CSV preserves Hindi, commas, escaped quotes and multiline fields', () => {
  const rows = parseCSV('\uFEFFQuestion (English),Question (Hindi),Option A (English),Option B (English),Option C (English),Option D (English),Correct Answer,Description (English)\r\n"Capital, of India?",भारत की राजधानी?,Delhi,Mumbai,Chennai,Kolkata,A,"Line 1\nA ""quoted"" explanation"');
  validateQuestions(rows);
  assert.equal(rows[0].question.hindi, 'भारत की राजधानी?');
  assert.equal(rows[0].description.english, 'Line 1\nA "quoted" explanation');
  assert.equal(rows[0].correctAnswer, 0);
});
test('malformed CSV and invalid question rows fail before persistence', () => {
  assert.throws(()=>parseCSV('Question (English)\n"unfinished'), /unclosed/);
  assert.throws(()=>parseCSV('a,b\n1,2,3'), /column count/);
  assert.throws(()=>parseCSV('a,a\n1,2'), /duplicate headers/);
  assert.throws(()=>validateQuestions([{...question(),correctAnswer:4}]), /correctAnswer/);
  assert.throws(()=>validateQuestions([{...question(),options:[]}]), /four English options/);
  assert.throws(()=>validateQuestions([]), /between 1 and 1000/);
});
test('questions may omit explanations while retaining bilingual options', async () => {
  const document = new Question({...question(),createdBy:new mongoose.Types.ObjectId()});
  await document.validate();
  assert.equal(document.question.hindi, 'भारत की राजधानी?');
});
test('series validates schedule range, unique slots and time format', async () => {
  await series({}).validate();
  await assert.rejects(series({endDate:'2026-08-01'}).validate(), /valid start and end date/);
  await assert.rejects(series({testDates:[]}).validate(), /between 1 and 1000/);
  await assert.rejects(series({testDates:[{date:'2026-10-01',time:'09:00',duration:180}]}).validate(), /within the series/);
  await assert.rejects(series({testDates:[{date:'2026-09-10',time:'25:00',duration:180}]}).validate());
  await assert.rejects(series({testDates:[{date:'2026-09-10',time:'09:00',duration:180},{date:'2026-09-10',time:'09:00',duration:180}]}).validate(), /Duplicate/);
});
test('upgrade retains previous access including combo', () => {
  assert.equal(mergePlanAccess('fresh','pre'),'pre');
  assert.equal(mergePlanAccess('pre','mains'),'combo');
  assert.equal(mergePlanAccess('mains','pre'),'combo');
  assert.equal(mergePlanAccess('combo','pre'),'combo');
});
test('notification feed and push audiences agree for combined subscriptions', () => {
  assert.deepEqual(visibleAudiences('combo'),['all','pre','mains','combo']);
  assert.deepEqual(audienceTypes('pre'),['pre','combo']);
  assert.deepEqual(audienceTypes('mains'),['mains','combo']);
  assert.ok(!visibleAudiences('fresh').includes('mains'));
});
test('Drive links keep the correct file or folder and resource key', () => {
  assert.equal(normalizeMaterialLink('https://drive.google.com/open?id=abc-123&resourcekey=secret'), 'https://drive.google.com/file/d/abc-123/view?resourcekey=secret');
  assert.equal(normalizeMaterialLink('https://drive.google.com/drive/folders/folder123'), 'https://drive.google.com/drive/folders/folder123');
  assert.equal(normalizeMaterialLink('https://docs.google.com/document/d/abc/edit'), 'https://docs.google.com/document/d/abc/edit');
  assert.throws(()=>normalizeMaterialLink('javascript:alert(1)'), /HTTP/);
});
