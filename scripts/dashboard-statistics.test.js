const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('dashboard counts exclude results linked to deleted tests',async()=>{
 const module={exports:{}};
 const query={populate(){return this;},sort(){return this;},limit:async()=>[{student:null,test:null,score:5,totalMarks:10}]};
 const models={
    '../models/Test':{collection:{name:'tests'},countDocuments:async filter=>{if(filter.isDeleted)assert.equal(filter.isDeleted.$ne,true);return filter.seriesKind==='pre'?4:filter.seriesKind==='mains'?5:12;}},
  '../models/User':{collection:{name:'users'},countDocuments:async filter=>{assert.deepEqual(filter.role,'student');return 34;}},
  '../models/Question':{countDocuments:async()=>56},
  '../models/SupportTicket':{countDocuments:async filter=>filter.status?9:2},
  '../models/QuizSubmission':{countDocuments:async filter=>filter.submittedAt?2:8},
  '../models/DemoResult':{countDocuments:async filter=>filter.submittedAt?3:7},
    '../models/Result':{aggregate:async pipeline=>{
     assert.ok(pipeline.some(stage=>stage.$lookup?.from==='tests'));
     assert.ok(pipeline.some(stage=>stage.$unwind==='$linkedTest'));
     assert.ok(pipeline.some(stage=>stage.$match?.['linkedTest.isDeleted']?.$ne===true));
     if(pipeline.some(stage=>stage.$count))return[{count:9}];
    if(pipeline.some(stage=>stage.$group))return[];
    if(pipeline.some(stage=>stage.$bucket))return[{_id:0.5,count:9}];
     return[{studentName:'Student',testTitle:'Existing test',score:5,totalMarks:10,submittedAt:new Date()}];
    },find:()=>query},
 };
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../services/analyticsService.js'),'utf8'),{module,require:name=>models[name]});
 const stats=await module.exports.getPlatformStatistics();
 assert.equal(stats.totalTests,12);assert.equal(stats.totalStudents,34);assert.equal(stats.totalResults,9);
 assert.equal(stats.prelimsTests,4);assert.equal(stats.mainsTests,5);assert.equal(stats.totalQuestions,56);
 assert.equal(stats.newSupportRequests,2);assert.equal(stats.openSupportRequests,9);
 assert.equal(stats.quizAttempts,8);assert.equal(stats.recentQuizAttempts,2);
 assert.equal(stats.demoAttempts,7);assert.equal(stats.recentDemoAttempts,3);
 assert.equal(stats.recentResults[0].studentName,'Student');assert.equal(stats.recentResults[0].testTitle,'Existing test');
 const charts=await module.exports.getDashboardCharts();
 assert.equal(charts.overview.totalTests,12);assert.equal(charts.overview.totalResults,9);
 assert.equal(charts.activity.totalTests,12);assert.equal(charts.activity.totalResults,9);
});
