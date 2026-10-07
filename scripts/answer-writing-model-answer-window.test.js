const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('student evaluations expose model answers only inside the configured active window', async () => {
  let submissions = [];
  const module = { exports: {} };
  const studentSubmissionModel = {
    find: () => ({
      populate() {
        return this;
      },
      sort: async () => submissions
    })
  };
  const stubs = {
    '../models/AnswerWriting': {},
    '../models/StudentAnswerSubmission': studentSubmissionModel,
    '../middleware/errorHandler': { handleError: () => {} },
    '../config/r2': { deleteFromR2: async () => {} }
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../controllers/answerWritingController.js'), 'utf8'),
    { module, require: name => stubs[name], console, Date }
  );

  const now = Date.now();
  const exerciseFor = (startOffset, endOffset, isActive = true) => ({
    _id: 'exercise',
    name: 'Exercise',
    description: 'Test',
    startDateTime: new Date(now),
    endDateTime: new Date(now),
    questions: [{ _id: 'question' }],
    modelAnswer: {
      isActive,
      releaseStartAt: new Date(now + startOffset),
      releaseEndAt: new Date(now + endOffset),
      answerEnglish: 'Model answer'
    }
  });

  const getVisibleModelAnswer = async exercise => {
    submissions = [{
      answerWritingId: exercise,
      answers: [{
        questionId: 'question',
        evaluation: { evaluatedPDF: 'https://example.test/evaluated.pdf' }
      }]
    }];
    let response;
    await module.exports.getMyEvaluations(
      { user: { _id: 'student' }, query: {} },
      { json: value => { response = value; } }
    );
    return response.data[0].modelAnswer;
  };

  assert.ok(await getVisibleModelAnswer(exerciseFor(-1000, 1000)));
  assert.equal(await getVisibleModelAnswer(exerciseFor(1000, 2000)), null);
  assert.equal(await getVisibleModelAnswer(exerciseFor(-2000, -1000)), null);
  assert.equal(await getVisibleModelAnswer(exerciseFor(-1000, 1000, false)), null);
});
