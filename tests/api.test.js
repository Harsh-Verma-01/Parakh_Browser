/**
 * Parakh_Browser - Automated Integration Test Suite
 */

const assert = require('assert');
const biometricHandler = require('../src/handlers/biometricHandler');
const telemetryHandler = require('../src/handlers/telemetryHandler');
const sessionHandler = require('../src/handlers/sessionHandler');
const assessmentHandler = require('../src/handlers/assessmentHandler');

async function runTests() {
  console.log('\n🧪 Starting Parakh_Browser Test Suite...\n');

  // Test 1: Session Start
  console.log('1. Testing Session Initialization...');
  const startEvent = {
    body: JSON.stringify({
      username: 'student_007',
      questionSetID: 'cs101_midterm',
    }),
  };
  const startRes = await sessionHandler.startSession(startEvent);
  assert.strictEqual(startRes.statusCode, 200, 'Session start should return 200');
  const startData = JSON.parse(startRes.body);
  assert(startData.startedAt > 0, 'Session must have startedAt timestamp');
  console.log('   ✓ Session initialization passed.');

  // Test 2: Biometric Enrollment
  console.log('2. Testing Biometric Enrollment...');
  const enrollEvent = {
    body: JSON.stringify({
      fullName: 'Aarav Sharma',
      candidateId: 'student_007',
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }),
  };
  const enrollRes = await biometricHandler.enrollCandidate(enrollEvent);
  assert.strictEqual(enrollRes.statusCode, 200, 'Biometric enrollment should return 200');
  const enrollData = JSON.parse(enrollRes.body);
  assert(enrollData.ExternalImageId, 'Must return ExternalImageId');
  console.log('   ✓ Biometric enrollment passed.');

  // Test 3: Real-Time Telemetry & Frame Auditing
  console.log('3. Testing Telemetry & Frame Analysis...');
  const frameEvent = {
    body: JSON.stringify({
      username: 'student_007',
      questionSetID: 'cs101_midterm',
      image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }),
  };
  const frameRes = await telemetryHandler.processProctoringFrame(frameEvent);
  assert.strictEqual(frameRes.statusCode, 200, 'Telemetry frame analysis should return 200');
  const telemetryData = JSON.parse(frameRes.body);
  assert(Array.isArray(telemetryData), 'Telemetry response must be an array');
  assert.strictEqual(telemetryData.length, 4, 'Must evaluate 4 security checks');
  console.log('   ✓ Telemetry frame analysis passed.');

  // Test 4: Assessment Questions Retrieval
  console.log('4. Testing Assessment Questions Delivery...');
  const questionsEvent = {
    queryStringParameters: { qSetID: 'set-1' },
  };
  const questionsRes = await assessmentHandler.getQuestions(questionsEvent);
  assert.strictEqual(questionsRes.statusCode, 200, 'Questions fetch should return 200');
  const questionsData = JSON.parse(questionsRes.body);
  assert(Array.isArray(questionsData.questions), 'Questions must be an array');
  console.log('   ✓ Assessment questions retrieval passed.');

  // Test 5: Candidate Response Submission
  console.log('5. Testing Candidate Answer Submission...');
  const answerEvent = {
    body: JSON.stringify({
      username: 'student_007',
      qSetID: 'cs101_midterm',
      qID: 'q1',
      selectedAnswer: 'O(log n)',
    }),
  };
  const answerRes = await assessmentHandler.updateAnswer(answerEvent);
  assert.strictEqual(answerRes.statusCode, 200, 'Answer submission should return 200');
  console.log('   ✓ Candidate answer submission passed.');

  // Test 6: Saved Answers Retrieval
  console.log('6. Testing Saved Answers Sync...');
  const savedAnswersEvent = {
    body: JSON.stringify({
      username: 'student_007',
      qSetID: 'cs101_midterm',
    }),
  };
  const savedRes = await assessmentHandler.getSavedAnswers(savedAnswersEvent);
  assert.strictEqual(savedRes.statusCode, 200, 'Saved answers should return 200');
  const savedData = JSON.parse(savedRes.body);
  assert.strictEqual(savedData.savedAnswers.q1, 'O(log n)', 'Must match saved response');
  console.log('   ✓ Saved answers retrieval passed.');

  // Test 7: Session Termination
  console.log('7. Testing Session Termination...');
  const endEvent = {
    body: JSON.stringify({
      username: 'student_007',
      questionSetID: 'cs101_midterm',
    }),
  };
  const endRes = await sessionHandler.endSession(endEvent);
  assert.strictEqual(endRes.statusCode, 200, 'Session end should return 200');
  console.log('   ✓ Session termination passed.');

  // Test 8: OTP Authentication Engine (WUElev8 Requirement #4)
  console.log('8. Testing OTP Authentication...');
  const dbService = require('../src/services/database.service');
  const otpCode = dbService.generateOtp('student@college.edu');
  assert(otpCode && otpCode.length === 6, 'Must generate 6-digit OTP code');
  const isOtpValid = dbService.verifyOtp('student@college.edu', otpCode);
  assert.strictEqual(isOtpValid, true, 'Generated OTP must verify successfully');
  console.log('   ✓ OTP Authentication engine passed.');

  // Test 9: AI/LLM Outbound Query Interception (WUElev8 Requirement #6)
  console.log('9. Testing ChatGPT / Claude Outbound Query Interception...');
  const logItem = dbService.recordResearchActivity('student@college.edu', 'cs101_midterm', {
    target: 'ChatGPT',
    query: 'What is the average time complexity of searching in a Balanced BST?',
    url: 'https://chatgpt.com',
  });
  assert(logItem.id, 'Must generate unique audit log ID');
  assert.strictEqual(logItem.target, 'ChatGPT', 'Must capture target as ChatGPT');
  const feed = dbService.getSurveillanceFeed();
  assert(feed.researchLogs.length > 0, 'Examiner feed must contain intercepted AI query');
  console.log('   ✓ AI / LLM search interception passed.');

  console.log('\n🎉 ALL 9 WUELEV8 SPECIFICATION TESTS PASSED FOR PARAKH_BROWSER!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
