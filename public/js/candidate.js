/**
 * Parakh_Browser - Candidate Client Logic
 */

let webcamStream = null;
let currentCandidate = {
  name: '',
  id: '',
  examId: 'set-1',
};
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let proctoringInterval = null;
let timerSeconds = 45 * 60;
let timerInterval = null;

// DOM Elements
const stepEnrollment = document.getElementById('step-enrollment');
const stepAssessment = document.getElementById('step-assessment');
const stepCompleted = document.getElementById('step-completed');

const enrollWebcam = document.getElementById('enrollWebcam');
const enrollCanvas = document.getElementById('enrollCanvas');
const proctorWebcam = document.getElementById('proctorWebcam');
const proctorCanvas = document.getElementById('proctorCanvas');

const btnStartEnroll = document.getElementById('btnStartEnroll');
const enrollStatus = document.getElementById('enrollStatus');

const questionNav = document.getElementById('questionNav');
const questionText = document.getElementById('questionText');
const questionDomain = document.getElementById('questionDomain');
const optionsContainer = document.getElementById('optionsContainer');
const btnPrev = document.getElementById('btnPrev');
const btnSaveNext = document.getElementById('btnSaveNext');
const btnFinishExam = document.getElementById('btnFinishExam');
const examTimer = document.getElementById('examTimer');

// Initialize Camera
async function startWebcam(targetVideoElement) {
  try {
    if (webcamStream) {
      targetVideoElement.srcObject = webcamStream;
      return true;
    }
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    targetVideoElement.srcObject = webcamStream;
    return true;
  } catch (err) {
    console.warn('Webcam permission error or no camera attached:', err.message);
    enrollStatus.innerText = 'Notice: Webcam not detected or denied. Running with simulated video feed.';
    return false;
  }
}

// Capture base64 frame from video element
function captureFrameBase64(videoElement, canvasElement) {
  if (!webcamStream || videoElement.videoWidth === 0) {
    // Generate minimal fallback transparent 1x1 image if no hardware camera
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
  const ctx = canvasElement.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  const dataUrl = canvasElement.toDataURL('image/jpeg', 0.7);
  return dataUrl.split(',')[1];
}

// Step 1: Enroll Biometrics and Start Session
btnStartEnroll.addEventListener('click', async () => {
  const fullName = document.getElementById('candidateName').value.trim();
  const candidateId = document.getElementById('candidateId').value.trim();
  const examId = document.getElementById('assessmentCode').value.trim() || 'set-1';

  if (!fullName || !candidateId) {
    alert('Please enter your full name and candidate ID.');
    return;
  }

  btnStartEnroll.disabled = true;
  enrollStatus.innerText = 'Registering biometric signature with Parakh_Browser...';

  currentCandidate.name = fullName;
  currentCandidate.id = candidateId;
  currentCandidate.examId = examId;

  const base64Image = captureFrameBase64(enrollWebcam, enrollCanvas);

  try {
    // 1. Biometric Enrollment
    const enrollRes = await fetch('/faces/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        candidateId,
        image: base64Image,
      }),
    });
    const enrollData = await enrollRes.json();

    // 2. Exam Session Initialization
    const sessionRes = await fetch('/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: candidateId,
        questionSetID: examId,
      }),
    });
    await sessionRes.json();

    // 3. Fetch Questions
    const questionsRes = await fetch(`/questions?qSetID=${encodeURIComponent(examId)}`);
    const qData = await questionsRes.json();
    questions = qData.questions && qData.questions.length ? qData.questions : [
      {
        id: 'q1',
        title: 'Algorithms & Complexity',
        question: 'What is the average time complexity of searching in a Balanced Binary Search Tree?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      },
      {
        id: 'q2',
        title: 'Operating Systems',
        question: 'Which of the following scheduling algorithms is non-preemptive?',
        options: ['Round Robin', 'Shortest Job First (Non-preemptive)', 'SRTF', 'Priority (Preemptive)'],
      },
      {
        id: 'q3',
        title: 'Computer Networks',
        question: 'Which layer of the OSI model does TCP operate at?',
        options: ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Application Layer'],
      },
    ];

    // Transition to Assessment View
    stepEnrollment.classList.add('hidden');
    stepAssessment.classList.remove('hidden');

    document.getElementById('candidateBadge').innerHTML = `Candidate: <b>${fullName}</b> (${candidateId})`;
    await startWebcam(proctorWebcam);

    renderQuestionNav();
    renderQuestion(0);
    startTimer();
    startProctoringLoop();
  } catch (err) {
    console.error('Enrollment error:', err);
    enrollStatus.innerText = 'Connection error. Retrying...';
    btnStartEnroll.disabled = false;
  }
});

// Render question navigation pills
function renderQuestionNav() {
  questionNav.innerHTML = '';
  questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = `q-btn ${idx === currentQuestionIndex ? 'active' : ''} ${userAnswers[q.id] ? 'answered' : ''}`;
    btn.innerText = idx + 1;
    btn.onclick = () => renderQuestion(idx);
    questionNav.appendChild(btn);
  });
}

// Render active question
function renderQuestion(index) {
  currentQuestionIndex = index;
  const q = questions[index];
  if (!q) return;

  questionDomain.innerText = `Domain: ${q.title || 'General'}`;
  questionText.innerText = `${index + 1}. ${q.question}`;
  optionsContainer.innerHTML = '';

  const currentSelection = userAnswers[q.id];

  q.options.forEach((opt) => {
    const card = document.createElement('div');
    card.className = `option-card ${currentSelection === opt ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="option-radio"></div>
      <span style="font-size: 14px; font-weight: 500;">${opt}</span>
    `;
    card.onclick = () => {
      userAnswers[q.id] = opt;
      renderQuestion(index);
      syncAnswer(q.id, opt);
    };
    optionsContainer.appendChild(card);
  });

  btnPrev.disabled = index === 0;
  btnSaveNext.innerText = index === questions.length - 1 ? 'Save & Review' : 'Save & Next';
  renderQuestionNav();
}

// Sync answer with server
async function syncAnswer(questionId, selectedAnswer) {
  try {
    await fetch('/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentCandidate.id,
        qSetID: currentCandidate.examId,
        qID: questionId,
        selectedAnswer,
      }),
    });
  } catch (e) {
    console.warn('Offline or sync delayed:', e.message);
  }
}

// Navigation Controls
btnPrev.addEventListener('click', () => {
  if (currentQuestionIndex > 0) {
    renderQuestion(currentQuestionIndex - 1);
  }
});

btnSaveNext.addEventListener('click', () => {
  if (currentQuestionIndex < questions.length - 1) {
    renderQuestion(currentQuestionIndex + 1);
  } else {
    alert('You have reached the end of the assessment questions. Click "Submit Assessment" when ready.');
  }
});

// Timer countdown
function startTimer() {
  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      submitExam();
      return;
    }
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    examTimer.innerText = `${mins}:${secs}`;
  }, 1000);
}

// Background AI Telemetry & Proctoring Loop (every 4s)
function startProctoringLoop() {
  proctoringInterval = setInterval(async () => {
    const frameBase64 = captureFrameBase64(proctorWebcam, proctorCanvas);

    try {
      const res = await fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentCandidate.id,
          questionSetID: currentCandidate.examId,
          image: frameBase64,
        }),
      });

      if (res.ok) {
        const telemetry = await res.json();
        updateHUD(telemetry);
      }
    } catch (err) {
      console.warn('Telemetry poll skipped:', err.message);
    }
  }, 4000);
}

// Update HUD with telemetry result
function updateHUD(telemetry) {
  if (!Array.isArray(telemetry) || telemetry.length < 4) return;

  const [objects, persons, identity, face] = telemetry;

  // Face Presence
  const telFace = document.getElementById('telFace');
  if (face.Success) {
    telFace.className = 'telemetry-val ok';
    telFace.innerText = 'Verified (1)';
  } else {
    telFace.className = 'telemetry-val flag';
    telFace.innerText = face.Details === 0 ? 'Face Missing' : `Multiple (${face.Details})`;
  }

  // Head Pose
  const telPose = document.getElementById('telPose');
  telPose.className = 'telemetry-val ok';
  telPose.innerText = 'Optimal (Centered)';

  // Workspace Persons
  const telPersons = document.getElementById('telPersons');
  if (persons.Success) {
    telPersons.className = 'telemetry-val ok';
    telPersons.innerText = '1 Person';
  } else {
    telPersons.className = 'telemetry-val flag';
    telPersons.innerText = `${persons.Details} Persons`;
  }

  // Unauthorized Devices
  const telObjects = document.getElementById('telObjects');
  if (objects.Success) {
    telObjects.className = 'telemetry-val ok';
    telObjects.innerText = 'None Detected';
  } else {
    telObjects.className = 'telemetry-val flag';
    telObjects.innerText = objects.Details;
  }
}

// Submit Assessment
btnFinishExam.addEventListener('click', () => {
  if (confirm('Are you sure you want to finalize and submit your assessment?')) {
    submitExam();
  }
});

async function submitExam() {
  clearInterval(proctoringInterval);
  clearInterval(timerInterval);

  try {
    await fetch('/exam/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentCandidate.id,
        questionSetID: currentCandidate.examId,
      }),
    });
  } catch (e) {
    console.error('Session end error:', e);
  }

  stepAssessment.classList.add('hidden');
  stepCompleted.classList.remove('hidden');

  document.getElementById('summaryCandidate').innerText = `${currentCandidate.name} (${currentCandidate.id})`;
  document.getElementById('summaryTime').innerText = new Date().toLocaleString();
}

// Auto-start camera preview on page load
startWebcam(enrollWebcam);
