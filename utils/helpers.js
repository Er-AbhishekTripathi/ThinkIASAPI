const jwt = require('jsonwebtoken');
const { JWT, USER_TYPES } = require('../config/constants');

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT.SECRET, { expiresIn: JWT.EXPIRES_IN });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT.SECRET, { expiresIn: JWT.REFRESH_EXPIRES_IN });
};

const getMenuItems = (user) => {
  const commonItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' }
  ];

  const role = user.role;
  const type = user.type;
  const prelimsExamMenu = {
    name: 'Prelims Examination',
    path: '',
    icon: 'quiz',
    children: [
      { name: 'Tests (GS and CSAT)', path: '/prelims-tests', icon: 'quiz' },
      { name: 'Results', path: '/prelims-results', icon: 'assignment' },
      { name: 'Resources / Study Notes', path: '/pre-materials', icon: 'library_books' },
      { name: 'Mentorship Sessions', path: '/pre-session', icon: 'groups' }
    ]
  };
  const mainsExamMenu = {
    name: 'Mains Examination',
    path: '',
    icon: 'edit_note',
    children: [
      { name: 'Daily Answer Writing', path: '/student-answer-writing', icon: 'description' },
      { name: 'Daily Answer Evaluation', path: '/mains-results', icon: 'assignment' },
      { name: 'Study Materials', path: '/mains-materials', icon: 'library_books' },
      { name: 'Mentorship Sessions', path: '/mains-session', icon: 'groups' },
      { name: 'Live Test', path: '/live-test', icon: 'description' }
    ]
  };
  const mainsTrackChildren = mainsExamMenu.children;
  const prelimsSeriesGroup = {
    name: 'Prelims Test Series',
    path: '',
    icon: 'quiz',
    children: [
      { name: 'Tests (GS and CSAT)', path: '/prelims-test-series', icon: 'event_note' },
      { name: 'Results', path: '/prelims-results', icon: 'assignment' },
      { name: 'Resources / Study Notes', path: '/pre-materials', icon: 'library_books' },
      { name: 'Mentorship Sessions', path: '/pre-session', icon: 'groups' }
    ]
  };
  const mainsSeriesGroup = {
    name: 'Mains Test Series',
    path: '',
    icon: 'edit_note',
    children: [
      { name: 'Tests', path: '/mains-test-series', icon: 'event_note' },
      { name: 'Answer Writing', path: '/student-answer-writing', icon: 'description' },
      { name: 'Answer Evaluation', path: '/mains-results', icon: 'assignment' },
      { name: 'Study Materials', path: '/mains-materials', icon: 'library_books' },
      { name: 'Mentorship Sessions', path: '/mains-session', icon: 'groups' },
      { name: 'Live Test', path: '/live-test', icon: 'description' }
    ]
  };
  const optionalSubjects = ['History', 'Geography', 'PSIR', 'Hindi', 'Mathematics'];
  const qualifyingPapers = ['Paper A (Indian Language)', 'Paper B (English)'];
  const subjectGroup = (name, subjects, children) => ({
    name,
    path: '',
    icon: 'menu_book',
    children: subjects.map((subject) => ({ name: subject, path: '', icon: 'menu_book', children }))
  });
  const optionalMentorshipGroup = subjectGroup('Optional Mentorship Course', optionalSubjects, mainsTrackChildren);
  const optionalSeriesGroup = subjectGroup('Optional Test Series', optionalSubjects, mainsSeriesGroup.children);
  const essayGroup = { name: 'Essay', path: '', icon: 'edit_note', children: mainsTrackChildren };
  const qualifyingGroup = subjectGroup('Qualifying Papers', qualifyingPapers, mainsTrackChildren);
  const liveClassesMenu = {
    name: 'Live classes',
    path: '',
    icon: 'live_tv',
    children: [
      { name: 'Daily Current Affairs', path: '/view/current', icon: 'article' },
      { name: 'G.S.', path: '/pre-materials', icon: 'menu_book' },
      { name: 'CSAT', path: '/prelims-tests', icon: 'quiz' }
    ]
  };
  const supportMenu = { name: 'Support Tickets', path: '/support-tickets', icon: 'support' };

  // Admin menu (no type needed)
  if (role === 'admin') {
    return [
      ...commonItems,
      { name: 'Manage Tests', path: '/manage-tests', icon: 'settings' },
      { name: 'Results & Analytics', path: '/admin-results', icon: 'analytics' },
      
      {
        name: 'Quiz Management',
        path: '',
        icon: 'quiz',
        children: [
          { name: 'Tag Management', path: '/tag-master', icon: 'local_offer' },
          { name: 'Question Bank', path: '/questions-master', icon: 'quiz' }     
        ]
      },
      { name: 'Pre Resources Directory', path: '/directory-master', icon: 'library_books' },
     
     
      
      { name: 'Mentorship Master', path: '', icon: 'school', children: [{ name: 'Programs', path: '/manage-program', icon: 'school' }, { name: 'Mentorship Plans', path: '/admin-mentorship', icon: 'groups' }, { name: 'Program FAQs', path: '/program-faqs', icon: 'help' }] },
      { name: 'Announcement Master', path: '/announcement-master', icon: 'campaign' },
      { name: 'Push Notifications', path: '/notifications', icon: 'notifications' },
      { name: 'Live Exam Monitoring', path: '/exam-monitoring', icon: 'videocam' },
      
      
      {
        name: 'Website Page Manage',
        path: '',
        icon: 'language',
        children: [
          { name: 'Testimonials', path: '/testimonials', icon: 'format_quote' },
          { name: 'Plan Benefits', path: '/support-features', icon: 'support_agent' },
          { name: 'Manage Exams', path: '/manage-exams', icon: 'school' },
          { name: 'App Settings', path: '/app-settings', icon: 'phone_android' },
          { name: 'Manage Plans', path: '/manage-plans', icon: 'payments' },
          { name: 'Careers', path: '/careers', icon: 'work' },
          { name: 'Website Quiz', path: '/quizzes', icon: 'fact_check' },
          { name: 'Simple News', path: '/simple-news-admin', icon: 'newspaper' },
          { name: 'Manage Program', path: '/manage-program', icon: 'fact_check' },
          { name: 'Manage Batches', path: '/manage-batches', icon: 'layers' },
          { name: 'Manage FAQs', path: '/program-faqs', icon: 'help' },
          { name: 'Syllabus Master', path: '/syllabus-master', icon: 'menu_book' },
           { name: 'Free Resource', path: '/free-resource-admin', icon: 'inventory_2' }    
        ] 
      },
       {
        name: 'Prelims Section',
        path: '',
        icon: 'quiz',
        children: [
          { name: 'Prelims Test Series', path: '/prelims-test-series', icon: 'description' },
           { name: 'Prelims Meeting', path: '/meeting-admin', icon: 'groups' }
        ]
      },
      {
        name: 'Mains Section',
        path: '',
        icon: 'edit_note',
        children: [
           { name: 'Mains Test Series', path: '/mains-test-series', icon: 'description' },
           { name: 'Manage Answer Writing', path: '/answer-writing', icon: 'fact_check' },
           { name: 'Mains Meeting', path: '/mains-meeting-admin', icon: 'groups' },
           { name: 'Mains Resources Directory', path: '/directory-master', icon: 'library_books' },
          ]
      },
     
      
      { name: 'Live Content', path: '/live-content-admin', icon: 'live_tv' },
      { name: 'Demo Test', path: '/demo-test-admin', icon: 'quiz' },
      
      { name: 'Manage Coupon', path: '/manage-coupon', icon: 'fact_check' },
      { name: 'Study Module', path: '/study-module', icon: 'fact_check' },

      { name: 'Manage Program', path: '/manage-program', icon: 'fact_check' },
      { name: 'Manage Answer Writing', path: '/answer-writing', icon: 'fact_check' },
      { name: 'Mains Resources Directory', path: '/mains-directory-master', icon: 'library_books' },

      
      
      { name: 'Live Tests', path: '/live-test', icon: 'description' },
     

     
       { name: 'Support Tickets', path: '/support-tickets', icon: 'support' },
    ];
  }

  // Student menus based on type
  if (role === 'student') {
    const mentorshipChildren = [];
    const testSeriesChildren = [];
    if (type === USER_TYPES.PRE || type === USER_TYPES.COMBO) {
      mentorshipChildren.push(prelimsExamMenu);
      testSeriesChildren.push(prelimsSeriesGroup);
    }
    if (type === USER_TYPES.MAINS || type === USER_TYPES.COMBO) {
      mentorshipChildren.push(mainsExamMenu);
      testSeriesChildren.push(mainsSeriesGroup);
    }

    switch (type) {
      case USER_TYPES.FRESH:
        return [
          ...commonItems,
          { name: 'Demo Test', path: '/demo-tests', icon: 'assignment' },
          supportMenu
        ];

      case USER_TYPES.PRE:
        return [
          ...commonItems,
          { name: 'Mentorship Course', path: '', icon: 'school', children: mentorshipChildren },
          { name: 'Test Series', path: '', icon: 'event_note', children: testSeriesChildren },
          liveClassesMenu,
          supportMenu
        ];

      case USER_TYPES.MAINS:
        return [
          ...commonItems,
          { name: 'Mentorship Course', path: '', icon: 'school', children: mentorshipChildren },
          optionalMentorshipGroup,
          { name: 'Test Series', path: '', icon: 'event_note', children: testSeriesChildren },
          optionalSeriesGroup,
          essayGroup,
          qualifyingGroup,
          liveClassesMenu,
          supportMenu
        ];

      case USER_TYPES.COMBO:
        return [
          ...commonItems,
          { name: 'Mentorship Course', path: '', icon: 'school', children: mentorshipChildren },
          optionalMentorshipGroup,
          { name: 'Test Series', path: '', icon: 'event_note', children: testSeriesChildren },
          optionalSeriesGroup,
          essayGroup,
          qualifyingGroup,
          liveClassesMenu,
          supportMenu
        ];

      default:
        return commonItems;
    }
  }

  return commonItems;
};

const calculateRanking = (results, studentId) => {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { rank: 1, totalStudents: 0 };
  }

  // Create a copy to avoid mutating the original array
  const resultsCopy = [...results];
  
  // Sort by score (descending) and then by submission time (ascending - earlier submissions get better rank)
  const sortedResults = resultsCopy.sort((a, b) => {
    // First sort by score (descending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // If scores are equal, sort by submission time (earlier first)
    return new Date(a.submittedAt) - new Date(b.submittedAt);
  });

  console.log('📊 Ranking Calculation:', {
    totalResults: sortedResults.length,
    studentId: studentId.toString(),
    sortedScores: sortedResults.map(r => ({ score: r.score, student: r.student._id.toString() }))
  });

  // Find the student's rank (1-based index)
  const rankIndex = sortedResults.findIndex(result => {
    const student = result.student;
    // Handle both populated student object and student ID string
    if (student && typeof student === 'object' && student._id) {
      return student._id.toString() === studentId.toString();
    } else {
      return student.toString() === studentId.toString();
    }
  });

  const rank = rankIndex >= 0 ? rankIndex + 1 : sortedResults.length + 1;

  console.log('🎯 Final Rank:', { rank, totalStudents: sortedResults.length });

  return {
    rank: rank,
    totalStudents: sortedResults.length
  };
};

const formatTestForStudent = (test) => ({
  _id: test._id,
  title: test.title,
  description: test.description,
  startTime: test.startTime,
  endTime: test.endTime,
  duration: test.duration,
  marksPerQuestion: test.marksPerQuestion,
  negativeMarks: test.negativeMarks,
  totalQuestions: test.questions.length,
  totalMarks: test.totalMarks, // Use the virtual property
  status: test.status,
  introPage: test.introPage
});

module.exports = {
  generateToken,
  generateRefreshToken,
  getMenuItems,
  calculateRanking,
  formatTestForStudent
};
