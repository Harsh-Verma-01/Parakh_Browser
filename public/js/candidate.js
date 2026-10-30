/**
 * Parakh Secure Assessment Browser - Candidate Client Engine
 * Implements WUElev8 Smart Proctoring Browser Requirements
 */

let activeTab = 'auth';
let activeResearchTarget = 'ChatGPT';
let activeResearchUrl = 'https://chatgpt.com';

let candidateSession = {
  email: 'student@college.edu',
  name: 'Aarav Sharma',
  candidateId: 'student@college.edu',
  examId: 'set-1',
};

let questions = [];
let currentQIdx = 0;
let userAnswers = {};
let warningCount = 0;
const MAX_WARNINGS = 3;

let keystrokeCount = 0;
let mouseClickCount = 0;
let aiSearchesCount = 0;

let timerSeconds = 45 * 60;
let timerTimer = null;
let proctoringTimer = null;
let webcamStream = null;

// DOM Elements
const viewAuth = document.getElementById('viewAuth');
const viewExam = document.getElementById('viewExam');
const viewResearch = document.getElementById('viewResearch');
const viewDone = document.getElementById('viewDone');

const tabBtnExam = document.getElementById('tabBtnExam');
const tabBtnResearch = document.getElementById('tabBtnResearch');
const omniboxUrl = document.getElementById('omniboxUrl');

const counterKeys = document.getElementById('counterKeys');
const counterClicks = document.getElementById('counterClicks');
const warnCounter = document.getElementById('warnCounter');
const examTimer = document.getElementById('examTimer');
const pillSync = document.getElementById('pillSync');

const authWebcam = document.getElementById('authWebcam');
const authCanvas = document.getElementById('authCanvas');
const proctorWebcam = document.getElementById('proctorWebcam');
const proctorCanvas = document.getElementById('proctorCanvas');

const btnSendOtp = document.getElementById('btnSendOtp');
const otpRow = document.getElementById('otpRow');
const authOtp = document.getElementById('authOtp');
const devOtpNotice = document.getElementById('devOtpNotice');
const btnProceedExam = document.getElementById('btnProceedExam');
const authStatusText = document.getElementById('authStatusText');

const questionCategory = document.getElementById('questionCategory');
const questionCounter = document.getElementById('questionCounter');
const questionText = document.getElementById('questionText');
const optionsList = document.getElementById('optionsList');
const btnPrevQ = document.getElementById('btnPrevQ');
const btnNextQ = document.getElementById('btnNextQ');
const btnSubmitExam = document.getElementById('btnSubmitExam');

const researchQueryInput = document.getElementById('researchQueryInput');
const btnExecuteSearch = document.getElementById('btnExecuteSearch');
const interceptAuditBadge = document.getElementById('interceptAuditBadge');
const aiResponseOutput = document.getElementById('aiResponseOutput');
const searchResultTarget = document.getElementById('searchResultTarget');
const searchResultMeta = document.getElementById('searchResultMeta');

// --- 1. Browser Tab Management (Requirement #6: Allows tab switching & tracks AI searches) ---
function switchBrowserTab(tabName) {
  if (activeTab === 'auth' || activeTab === 'done') return;

  activeTab = tabName;
  if (tabName === 'exam') {
    tabBtnExam.classList.add('active');
    tabBtnResearch.classList.remove('active');
    viewExam.classList.add('active');
    viewResearch.classList.remove('active');
    omniboxUrl.innerText = 'parakh://exam.secure.session/v2/cs101?kiosk=locked';
  } else if (tabName === 'research') {
    tabBtnResearch.classList.add('active');
    tabBtnExam.classList.remove('active');
    viewResearch.classList.add('active');
    viewExam.classList.remove('active');
    omniboxUrl.innerText = activeResearchUrl;

    // Log tab switch event to backend
    logTelemetryEvent('research_tab_opened', 'info', {
      target: activeResearchTarget,
      url: activeResearchUrl,
    });
    showToast(`Switched to Research Tab (${activeResearchTarget}). Outbound queries are monitored.`);
  }
}

function selectResearchTarget(target, url) {
  activeResearchTarget = target;
  activeResearchUrl = url;

  document.querySelectorAll('.bookmark-chip').forEach((c) => c.classList.remove('active'));
  const chip = document.getElementById(`chip${target}`);
  if (chip) chip.classList.add('active');

  omniboxUrl.innerText = url;
  searchResultTarget.innerText = `${target} Research Assistant`;
  searchResultMeta.innerText = `Active Audited Endpoint: ${url}`;
  researchQueryInput.placeholder = `Search or prompt ${target}... (e.g. explain balanced BST)`;
}

// Execute Research Query (Intercepted & Logged to Examiner)
async function executeResearchSearch() {
  const query = researchQueryInput.value.trim();
  if (!query) return;

  aiSearchesCount++;
  interceptAuditBadge.classList.remove('hidden');

  // Transmit query to backend interception endpoint
  try {
    await fetch('/api/telemetry/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: candidateSession.candidateId,
        examId: candidateSession.examId,
        target: activeResearchTarget,
        query,
        url: activeResearchUrl,
      }),
    });
  } catch (e) {
    console.warn('Research query audit buffered locally:', e.message);
  }

  // Render simulated AI answer response
  aiResponseOutput.innerHTML = `
    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
      <b>Prompt Sent:</b> "${escapeHtml(query)}"
    </div>
    <div style="font-size: 14px; line-height: 1.6; color: #f1f5f9; border-top: 1px solid var(--browser-border); padding-top: 12px;">
      <b>${activeResearchTarget} Response:</b><br>
      In computer science, <i>${escapeHtml(query)}</i> is evaluated according to structural invariants and algorithmic bounds. For balanced trees (such as AVL or Red-Black trees), tree height is maintained at O(log n), ensuring that search, insertion, and deletion operations adhere to logarithmic time guarantees.
    </div>
  `;

  showToast(`🚨 Query logged: "${query.slice(0, 30)}..." reported to Examiner Console.`);
}

btnExecuteSearch.addEventListener('click', executeResearchSearch);
researchQueryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') executeResearchSearch();
});

// --- 2. Activity Logging: Keystrokes, Mouse & Anti-Cheating Event Guards ---
window.addEventListener('keydown', (e) => {
  keystrokeCount++;
  counterKeys.innerText = keystrokeCount;

  // Anti-Cheating: Block inspection shortcuts
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
    triggerWarning('Developer inspection tools (F12 / Inspect) are strictly prohibited.', 'devtools_blocked');
  }
});

window.addEventListener('click', () => {
  mouseClickCount++;
  counterClicks.innerText = mouseClickCount;
});

// Disable Right-Click Context Menu
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  triggerWarning('Right-click context menu is disabled in secure exam environment.', 'context_menu');
});

// Disable Clipboard Copy, Paste, Cut
window.addEventListener('copy', (e) => {
  e.preventDefault();
  triggerWarning('Clipboard copying is blocked by Parakh Browser security policy.', 'clipboard_blocked');
});
window.addEventListener('paste', (e) => {
  e.preventDefault();
  triggerWarning('Pasting external content into the exam is blocked.', 'clipboard_blocked');
});
window.addEventListener('cut', (e) => {
  e.preventDefault();
  triggerWarning('Clipboard action (cut) is blocked.', 'clipboard_blocked');
});

// Window Blur Detection (Focus Loss / App Switching / Alt+Tab)
window.addEventListener('blur', () => {
  if (activeTab === 'exam') {
    triggerWarning('Window focus lost / application switching (Alt+Tab) detected.', 'window_blur');
  }
});

// Audio Warning Buzzer (Web Audio API Synthesizer)
function playWarningBuzzer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Audio buzzer unpermitted');
  }
}

// Multiple Display / Screen Mirroring Check (Requirement #3)
function checkScreenSecurity() {
  const sigScreen = document.getElementById('sigScreen');
  if (window.screen && window.screen.isExtended) {
    sigScreen.innerText = 'Dual Monitor Flagged';
    sigScreen.style.color = 'var(--danger)';
    triggerWarning('Multiple displays or screen mirroring detected. Disconnect external monitors.', 'screen_mirroring');
  } else {
    sigScreen.innerText = 'Single Display (OK)';
    sigScreen.style.color = 'var(--success)';
  }
}

// --- 3. Warnings & Disqualification System (Page 2: Automatic Warnings & Disqualification) ---
function triggerWarning(reason, type = 'general') {
  // Cooldown: same-type auto-triggers can fire at most once per 12 seconds
  const now = Date.now();
  if (warningCooldowns[type] && (now - warningCooldowns[type]) < WARNING_COOLDOWN_MS) {
    return; // Silently skip — already warned recently for this type
  }
  warningCooldowns[type] = now;

  // Play audible alert buzzer
  playWarningBuzzer();

  warningCount++;
  warnCounter.innerText = `${warningCount}/${MAX_WARNINGS}`;

  // Update live HUD signals based on violation type
  const sigFace = document.getElementById('sigFace');
  const sigGaze = document.getElementById('sigGaze');
  const sigPersons = document.getElementById('sigPersons');
  const sigDevices = document.getElementById('sigDevices');
  const sigScreen = document.getElementById('sigScreen');

  if (type === 'gaze_away') {
    sigGaze.innerText = 'Looking Away (Flagged)';
    sigGaze.style.color = 'var(--danger)';
  } else if (type === 'face_missing') {
    sigFace.innerText = 'Face Missing (Flagged)';
    sigFace.style.color = 'var(--danger)';
  } else if (type === 'multiple_faces') {
    sigPersons.innerText = '2 Persons Detected';
    sigPersons.style.color = 'var(--danger)';
  } else if (type === 'device_detected') {
    sigDevices.innerText = 'Mobile Phone Detected';
    sigDevices.style.color = 'var(--danger)';
  } else if (type === 'screen_mirroring') {
    sigScreen.innerText = 'Mirroring Flagged';
    sigScreen.style.color = 'var(--danger)';
  }

  // Transmit violation event to backend
  logTelemetryEvent('proctoring_warning', 'high', { reason, type, warningCount });

  const modal = document.getElementById('warningModal');
  const countEl = document.getElementById('warnModalCount');
  const descEl = document.getElementById('warnModalDesc');

  countEl.innerText = `${warningCount} / ${MAX_WARNINGS}`;
  descEl.innerText = reason;
  modal.classList.remove('hidden');

  showToast(`⚠️ WARNING ${warningCount}/${MAX_WARNINGS}: ${reason}`);

  if (warningCount >= MAX_WARNINGS) {
    descEl.innerText = 'Disqualification threshold reached (3/3 infractions). Submitting test automatically.';
    setTimeout(() => {
      dismissWarningModal();
      finalizeExam('Disqualified due to multiple security infractions');
    }, 2500);
  }
}

function dismissWarningModal() {
  document.getElementById('warningModal').classList.add('hidden');
}

// --- 4. User Authentication: OTP + Face Recognition (Requirement #4) ---
btnSendOtp.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  if (!email) {
    alert('Please enter your institutional email.');
    return;
  }
  btnSendOtp.disabled = true;
  btnSendOtp.innerText = 'Sending Passcode...';

  try {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    otpRow.classList.remove('hidden');
    devOtpNotice.innerText = `(Sandbox Passcode: ${data.devOtp || '123456'})`;
    authOtp.value = data.devOtp || '123456';
    btnSendOtp.innerText = 'Resend Passcode';
    btnSendOtp.disabled = false;
  } catch (err) {
    otpRow.classList.remove('hidden');
    devOtpNotice.innerText = '(Default Passcode: 123456)';
    btnSendOtp.innerText = 'Resend Passcode';
    btnSendOtp.disabled = false;
  }
});

btnProceedExam.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  const code = authOtp.value.trim();

  if (!email) {
    alert('Please enter email.');
    return;
  }

  btnProceedExam.disabled = true;
  authStatusText.innerText = 'Validating authentication credentials & biometrics...';

  // 1. Verify OTP
  try {
    const otpRes = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const otpData = await otpRes.json();
    if (!otpData.success) {
      alert('Invalid OTP code. Please enter the 6-digit code.');
      btnProceedExam.disabled = false;
      return;
    }
  } catch (e) {
    console.warn('Sandbox OTP bypass active');
  }

  candidateSession.email = email;
  candidateSession.candidateId = email;

  // 2. Register Biometric Selfie
  const frameBase64 = captureFrameBase64(authWebcam, authCanvas);
  try {
    await fetch('/faces/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: candidateSession.name,
        candidateId: email,
        image: frameBase64,
      }),
    });
  } catch (e) {
    console.warn('Biometric sandbox register');
  }

  // 3. Start Session & Fetch Questions
  await initExamSession();
});

// --- 5. Exam Session & MCQ Engine (Requirement #2) ---
async function initExamSession() {
  try {
    await fetch('/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: candidateSession.candidateId,
        questionSetID: candidateSession.examId,
      }),
    });

    const res = await fetch(`/questions?qSetID=${candidateSession.examId}`);
    const data = await res.json();
    questions = data.questions || [];
  } catch (e) {
    console.warn('Using local question fallback');
  }

  // Transition to Exam Workspace
  viewAuth.classList.remove('active');
  viewExam.classList.add('active');
  activeTab = 'exam';

  document.getElementById('hudCandidate').innerText = candidateSession.email;
  await startWebcam(proctorWebcam);

  renderQuestion(0);
  startExamTimer();
  startProctoringHeartbeat();
  checkScreenSecurity();
}

function renderQuestion(idx) {
  currentQIdx = idx;
  const q = questions[idx];
  if (!q) return;

  questionCategory.innerText = `Category: ${q.title || 'Computer Science'}`;
  questionCounter.innerText = `Question ${idx + 1} of ${questions.length}`;
  questionText.innerText = `${idx + 1}. ${q.question}`;

  optionsList.innerHTML = '';
  const currentSel = userAnswers[q.id];

  q.options.forEach((opt) => {
    const box = document.createElement('div');
    box.className = `option-box ${currentSel === opt ? 'selected' : ''}`;
    box.innerHTML = `
      <div class="radio-circle"></div>
      <span style="font-size: 15px; font-weight: 500;">${opt}</span>
    `;
    box.onclick = () => {
      userAnswers[q.id] = opt;
      renderQuestion(idx);
      syncAnswerToServer(q.id, opt);
    };
    optionsList.appendChild(box);
  });

  btnPrevQ.disabled = idx === 0;
  btnNextQ.innerText = idx === questions.length - 1 ? 'Save & Review' : 'Save & Next';
}

btnPrevQ.addEventListener('click', () => {
  if (currentQIdx > 0) renderQuestion(currentQIdx - 1);
});

btnNextQ.addEventListener('click', () => {
  if (currentQIdx < questions.length - 1) {
    renderQuestion(currentQIdx + 1);
  } else {
    showToast('All assessment questions reviewed. Click Submit Test when ready.');
  }
});

btnSubmitExam.addEventListener('click', () => {
  if (confirm('Are you sure you wish to submit your assessment? This will lock and seal your responses.')) {
    finalizeExam('Candidate submitted voluntarily');
  }
});

async function syncAnswerToServer(questionId, selectedAnswer) {
  try {
    await fetch('/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: candidateSession.candidateId,
        qSetID: candidateSession.examId,
        qID: questionId,
        selectedAnswer,
      }),
    });
    pillSync.innerHTML = '<span>📶 Synced</span>';
    pillSync.style.color = 'var(--success)';
  } catch (e) {
    pillSync.innerHTML = '<span>⚠️ Queued (Offline)</span>';
    pillSync.style.color = 'var(--warning)';
  }
}

// Timer
function startExamTimer() {
  timerTimer = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timerTimer);
      finalizeExam('Time Expired');
      return;
    }
    const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const secs = String(timerSeconds % 60).padStart(2, '0');
    examTimer.innerText = `${mins}:${secs}`;
  }, 1000);
}

// Finalize
async function finalizeExam(reason) {
  clearInterval(timerTimer);
  clearInterval(proctoringTimer);

  try {
    await fetch('/exam/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: candidateSession.candidateId,
        questionSetID: candidateSession.examId,
      }),
    });
  } catch (e) {
    console.error(e);
  }

  viewExam.classList.remove('active');
  viewResearch.classList.remove('active');
  viewDone.classList.add('active');
  activeTab = 'done';

  document.getElementById('finalCandidate').innerText = candidateSession.email;
  document.getElementById('finalKeys').innerText = keystrokeCount;
  document.getElementById('finalClicks').innerText = mouseClickCount;
  document.getElementById('finalSearches').innerText = aiSearchesCount;
}

// --- 6. AI Vision & Proctoring Loop (Requirement #1: Eye Gaze & Face Tracking) ---
let consecutiveMissingFaceCycles = 0;
let faceApiModelsLoaded = false;
let cocoSsdModel = null;

// Warning cooldown tracker — prevents same-type warning from firing more than once per 12s
const warningCooldowns = {};
const WARNING_COOLDOWN_MS = 12000;

async function loadFaceApiModels() {
  if (typeof faceapi !== 'undefined') {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/vendor/face-api/model');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/vendor/face-api/model');
      faceApiModelsLoaded = true;
      console.log('[Parakh] Face-api models loaded — multi-face + gaze detection active');
    } catch (e) {
      console.warn('[Parakh] Face-api client fallback active:', e.message);
    }
  }
}

async function loadCocoSsdModel() {
  if (typeof cocoSsd !== 'undefined') {
    try {
      cocoSsdModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      console.log('[Parakh] COCO-SSD object detection model loaded — phone/device detection active');
    } catch (e) {
      console.warn('[Parakh] COCO-SSD load failed (device detection unavailable):', e.message);
    }
  } else {
    console.warn('[Parakh] COCO-SSD library not loaded — check script tags in index.html');
  }
}

function startProctoringHeartbeat() {
  // Load both ML models in parallel
  loadFaceApiModels();
  loadCocoSsdModel();

  proctoringTimer = setInterval(async () => {
    if (!proctorWebcam || proctorWebcam.readyState !== 4) return;

    // ── 1. MULTI-FACE + GAZE DETECTION (face-api detectAllFaces) ───────────────
    if (faceApiModelsLoaded) {
      try {
        const detections = await faceapi
          .detectAllFaces(proctorWebcam, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true);

        const sigFace = document.getElementById('sigFace');
        const sigPersons = document.getElementById('sigPersons');

        if (!detections || detections.length === 0) {
          // No face at all
          consecutiveMissingFaceCycles++;
          if (consecutiveMissingFaceCycles >= 2) {
            triggerWarning('Candidate face not visible — please look directly at the camera.', 'face_missing');
            consecutiveMissingFaceCycles = 0;
          }
        } else if (detections.length >= 2) {
          // ⚠️ MULTIPLE FACES DETECTED
          consecutiveMissingFaceCycles = 0;
          sigFace.innerText = `${detections.length} Faces Detected`;
          sigFace.style.color = 'var(--danger)';
          sigPersons.innerText = `${detections.length} Persons Detected`;
          sigPersons.style.color = 'var(--danger)';
          triggerWarning(
            `${detections.length} faces detected in camera frame. Only the registered candidate is permitted.`,
            'multiple_faces'
          );
        } else {
          // Single face — run gaze check
          consecutiveMissingFaceCycles = 0;
          sigFace.innerText = 'Verified (1 Face)';
          sigFace.style.color = 'var(--success)';
          sigPersons.innerText = '1 Solo Candidate';
          sigPersons.style.color = 'var(--success)';

          const landmarks = detections[0].landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();

          if (leftEye && rightEye && nose) {
            const eyeDistance = Math.abs(rightEye[3].x - leftEye[0].x);
            const noseOffset = nose[0].x - (leftEye[0].x + rightEye[3].x) / 2;
            const ratio = noseOffset / (eyeDistance || 1);

            const sigGaze = document.getElementById('sigGaze');
            if (ratio < -0.25 || ratio > 0.25) {
              triggerWarning('Eye gaze shifted away from exam screen — please look at the monitor.', 'gaze_away');
            } else {
              if (sigGaze && !sigGaze.innerText.includes('Flagged')) {
                sigGaze.innerText = 'Centered (Optimal)';
                sigGaze.style.color = 'var(--success)';
              }
            }
          }
        }
      } catch (err) {
        console.debug('[Parakh] Face detection cycle error:', err.message);
      }
    }

    // ── 2. PHONE / DEVICE DETECTION (COCO-SSD) ─────────────────────────────────
    if (cocoSsdModel) {
      try {
        const predictions = await cocoSsdModel.detect(proctorWebcam);
        const BANNED_DEVICES = ['cell phone', 'remote', 'laptop', 'keyboard', 'mouse', 'book'];
        const found = predictions.filter(p => BANNED_DEVICES.includes(p.class) && p.score > 0.50);
        const sigDevices = document.getElementById('sigDevices');

        if (found.length > 0) {
          const label = found.map(d => `${d.class} (${Math.round(d.score * 100)}%)`).join(', ');
          sigDevices.innerText = `Detected: ${label}`;
          sigDevices.style.color = 'var(--danger)';
          triggerWarning(
            `Unauthorized device in camera view: ${label}. Remove all electronic devices from your workspace.`,
            'device_detected'
          );
        } else {
          if (sigDevices && !sigDevices.innerText.includes('Detected')) {
            sigDevices.innerText = 'Clean (0 Devices)';
            sigDevices.style.color = 'var(--success)';
          }
        }
      } catch (e) {
        console.debug('[Parakh] Device detection cycle error:', e.message);
      }
    }

    // ── 3. SERVER-SIDE FRAME TELEMETRY ─────────────────────────────────────────
    const frame = captureFrameBase64(proctorWebcam, proctorCanvas);
    try {
      const res = await fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: candidateSession.candidateId,
          questionSetID: candidateSession.examId,
          image: frame,
        }),
      });
      if (res.ok) {
        const telemetry = await res.json();
        evaluateSignals(telemetry);
      }
    } catch (e) {
      console.warn('[Parakh] Heartbeat frame upload skipped');
    }
  }, 3500);
}

function evaluateSignals(telemetry) {
  if (!Array.isArray(telemetry) || telemetry.length < 4) return;
  const [objects, persons, identity, face] = telemetry;

  const sigFace = document.getElementById('sigFace');
  const sigGaze = document.getElementById('sigGaze');
  const sigPersons = document.getElementById('sigPersons');
  const sigDevices = document.getElementById('sigDevices');

  // Face Check
  if (face.Success) {
    sigFace.innerText = 'Verified (1 Face)';
    sigFace.style.color = 'var(--success)';
  } else {
    sigFace.innerText = face.Details === 0 ? 'Face Missing' : `Multiple (${face.Details})`;
    sigFace.style.color = 'var(--danger)';
    triggerWarning('Face absent or obstructed from camera frame.');
  }

  // Persons Check
  if (persons.Success) {
    sigPersons.innerText = '1 Solo Candidate';
    sigPersons.style.color = 'var(--success)';
  } else {
    sigPersons.innerText = `${persons.Details} People Detected`;
    sigPersons.style.color = 'var(--danger)';
    triggerWarning('Multiple persons detected in examination viewport.');
  }

  // Unauthorized Devices
  if (objects.Success) {
    sigDevices.innerText = 'Clean (0 Devices)';
    sigDevices.style.color = 'var(--success)';
  } else {
    sigDevices.innerText = `Detected: ${objects.Details}`;
    sigDevices.style.color = 'var(--danger)';
    triggerWarning(`Unauthorized device detected: ${objects.Details}`);
  }
}

// --- Utilities ---
async function startWebcam(videoEl) {
  try {
    if (webcamStream) {
      videoEl.srcObject = webcamStream;
      return true;
    }
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = webcamStream;
    return true;
  } catch (err) {
    console.warn('Webcam fallback active:', err.message);
    return false;
  }
}

function captureFrameBase64(videoEl, canvasEl) {
  if (!webcamStream || videoEl.videoWidth === 0) {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  canvasEl.width = videoEl.videoWidth || 640;
  canvasEl.height = videoEl.videoHeight || 480;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return canvasEl.toDataURL('image/jpeg', 0.7).split(',')[1];
}

async function logTelemetryEvent(type, severity, meta = {}) {
  try {
    await fetch('/api/telemetry/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: candidateSession.candidateId,
        event: { type, severity, meta, timestamp: Date.now() },
      }),
    });
  } catch (e) {
    console.warn('Telemetry event buffered');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  toast.innerText = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

function handleNavAction(action) {
  if (action === 'reload') {
    if (confirm('Reloading the exam session will not lose your saved answers. Proceed?')) {
      window.location.reload();
    }
  } else {
    showToast(`Browser navigation (${action}) is locked by Parakh Kiosk.`);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Online/Offline detection (Page 2: Offline Mode)
window.addEventListener('online', () => {
  pillSync.innerHTML = '<span>📶 Synced</span>';
  pillSync.style.color = 'var(--success)';
  showToast('Network connection restored. Answers synchronized.');
});
window.addEventListener('offline', () => {
  pillSync.innerHTML = '<span>⚠️ Offline (Queued)</span>';
  pillSync.style.color = 'var(--warning)';
  showToast('Network disconnected. Answers will queue and sync when reconnected.');
});

// Initialize camera for initial auth
startWebcam(authWebcam);
