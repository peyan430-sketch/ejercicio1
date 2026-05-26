const vocabQuestionsBank = [
    { type: "matching", text: "Match who said each line:", pairs: [
        {left: "Welcome to the ship", right: "Captain"},
        {left: "I am from Cali", right: "Andres"},
        {left: "Let's start the tour", right: "Captain"},
        {left: "I studied at the academy", right: "Andres"}
    ], feedback: {correct: "Perfect! You followed the conversation well.", incorrect: "Listen again to identify who says what."} },
    { type: "mr", text: "Select the colors of the Colombian flag:", options: ["Yellow", "Blue", "Red", "Green"], correct: ["Yellow", "Blue", "Red"], feedback: {correct: "Correct!", incorrect: "Try again."} },
    { type: "mc", text: "Sample Question 1?", options: ["A", "B", "C"], correct: "A", feedback: "Matches A" }
];
const grammarQuestionsBank = [
    { type: "matching", text: "Match who said each line:", pairs: [
        {left: "Welcome to the ship", right: "Captain"},
        {left: "I am from Cali", right: "Andres"},
        {left: "Let's start the tour", right: "Captain"},
        {left: "I studied at the academy", right: "Andres"}
    ], feedback: {correct: "Perfect! You followed the conversation well.", incorrect: "Listen again to identify who says what."} },
    { type: "mr", text: "Select the colors of the Colombian flag:", options: ["Yellow", "Blue", "Red", "Green"], correct: ["Yellow", "Blue", "Red"], feedback: {correct: "Correct!", incorrect: "Try again."} },
    { type: "mc", text: "Sample Question 1?", options: ["A", "B", "C"], correct: "A", feedback: "Matches A" }
];
const readingSections = [{"text":"<h3 style=\"text-align:center;\">A New Sailor</h3>\n                                    <p>Good morning, crew. My name is Juan Pérez. I am a new sailor on this Colombian Navy ship...</p>","bank":[{"type":"matching","text":"Match who said each line:","pairs":[{"left":"Welcome to the ship","right":"Captain"},{"left":"I am from Cali","right":"Andres"},{"left":"Let's start the tour","right":"Captain"},{"left":"I studied at the academy","right":"Andres"}],"feedback":{"correct":"Perfect! You followed the conversation well.","incorrect":"Listen again to identify who says what."}},{"type":"mr","text":"Select the colors of the Colombian flag:","options":["Yellow","Blue","Red","Green"],"correct":["Yellow","Blue","Red"],"feedback":{"correct":"Correct!","incorrect":"Try again."}},{"type":"mc","text":"Sample Question 1?","options":["A","B","C"],"correct":"A","feedback":"Matches A"}]}]; // Array of { text: "", bank: [] }
const listeningSections = [{"audio":null,"bank":[{"type":"matching","text":"Match who said each line:","pairs":[{"left":"Welcome to the ship","right":"Captain"},{"left":"I am from Cali","right":"Andres"},{"left":"Let's start the tour","right":"Captain"},{"left":"I studied at the academy","right":"Andres"}],"feedback":{"correct":"Perfect! You followed the conversation well.","incorrect":"Listen again to identify who says what."}},{"type":"mr","text":"Select the colors of the Colombian flag:","options":["Yellow","Blue","Red","Green"],"correct":["Yellow","Blue","Red"],"feedback":{"correct":"Correct!","incorrect":"Try again."}},{"type":"mc","text":"Sample Question 1?","options":["A","B","C"],"correct":"A","feedback":"Matches A"}]}]; // Array of { audio: "", bank: [] }

const ENABLE_REPORT = true;
const RECIPIENT_EMAIL = "";
const REPORT_URL = "https://script.google.com/macros/s/AKfycbwsHJSGicPi0tEdCnwhhsuZNsUFY8yexEUqq5JfEr4HoQuh2dYkJmplVxuMeeWC6vBrwA/exec";
let startTime = null;
let endTime = null;
let studentName = "";
let studentID = "";

const SECTION_ORDER = ['vocab', 'grammar', 'reading', 'listening'];
const SECTION_NAMES = { vocab: 'Vocabulary', grammar: 'Grammar', reading: 'Reading', listening: 'Listening' };

const App = {
    currentMode: 'vocab',
    allAnswers: { vocab: {}, grammar: {}, reading: {}, listening: {} },
    allQuestions: { vocab: [], grammar: [], reading: [], listening: [] },
    isSubmitted: false, isReviewMode: false, resultsModal: null,
    timeRemaining: 3600, timerInterval: null, warningsCount: 0, lastViolationTime: 0, examStarted: false
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Quiz Initializing...");
    try {
        initModes();
        initVocabMode();
        initGrammarMode();
        initReadingMode();
        initListeningMode();
        updateProgressUI();
        initSupervision();
        initGlobalEvents();
        ScormHelper.init();
        
        if (ENABLE_REPORT) {
            const infoForm = document.getElementById('studentInfoForm');
            if (infoForm) infoForm.style.display = 'block';
        }
        
        const logo = document.getElementById('mainLogo');
        const logoData = "";
        if (logo) {
            if (logoData && logoData !== "" && logoData !== "") {
                logo.src = logoData;
                logo.style.display = 'block';
            } else {
                logo.remove(); // Remove to avoid console errors or layout issues
            }
        }

        console.log("Quiz Initialized Successfully.");
    } catch (err) {
        console.error("Initialization Error:", err);
        alert("Critical Error during initialization: " + err.message);
    }
    window.addEventListener('unload', () => ScormHelper.finish());
});

function initGlobalEvents() {
    const submitBtn = document.getElementById('submitAllBtn');
    if (submitBtn) {
        submitBtn.onclick = submitAllAnswers;
    }
}

function initSupervision() {
    const startBtn = document.getElementById('startExamBtn');
    if (!startBtn) return;
    startBtn.onclick = () => {
        if (ENABLE_REPORT) {
            studentName = document.getElementById('studentName').value.trim();
            studentID = document.getElementById('studentID').value.trim();
            if (!studentName || !studentID) {
                alert("Please enter your Full Name and ID Number to proceed.");
                return;
            }
        }
        
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().then(() => startExam()).catch(() => startExam());
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen().then(() => startExam()).catch(() => startExam());
        } else { startExam(); }
    };

    const closeViolationBtn = document.getElementById('closeViolationBtn');
    if (closeViolationBtn) {
        closeViolationBtn.onclick = () => {
            const overlay = document.getElementById('violationOverlay');
            if (overlay) overlay.style.display = 'none';
            // Re-request fullscreen after the user acknowledges the warning
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.warn(e));
                else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen().catch(e => console.warn(e));
            }
        };
    }

    document.addEventListener('fullscreenchange', () => { 
        if (App.examStarted && !App.isSubmitted && !document.fullscreenElement) {
            checkViolation(null, true); 
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) checkViolation();
    });

    // Use a slight delay for blur to avoid race conditions with native dialogs or internal UI changes
    window.addEventListener('blur', () => {
        setTimeout(() => {
            if (!document.hasFocus()) checkViolation();
        }, 300);
    });
}

function startExam() {
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    const timerBadge = document.getElementById('timerBadge');
    if (timerBadge) timerBadge.style.display = 'inline-block';
    App.examStarted = true;
    startTime = new Date();
    App.timerInterval = setInterval(() => {
        App.timeRemaining--;
        updateTimerDisplay();
        if (App.timeRemaining <= 0) { clearInterval(App.timerInterval); terminateExam("Time is up!"); }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(App.timeRemaining / 60);
    const secs = App.timeRemaining % 60;
    const timeRemainingEl = document.getElementById('timeRemaining');
    if (timeRemainingEl) {
        timeRemainingEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function checkViolation(e, fromFS = false) {
    if (!App.examStarted || App.isSubmitted || App.isReviewMode) return;
    
    // Check if truly hidden or out of focus
    if (document.hidden || fromFS || !document.hasFocus()) {

        App.lastViolationTime = now;
        App.warningsCount++;
        
        if (App.warningsCount === 1) {
            showViolationWarning();
        } else if (App.warningsCount >= 2) { 
            terminateExam("Exam terminated due to repeated rule violations (switching windows or exiting full-screen)."); 
        }
    }
}

function showViolationWarning() {
    const overlay = document.getElementById('violationOverlay');
    if (overlay) overlay.style.display = 'flex';
    // Ensure the toast also appears for visibility
    showToast("Final Warning: Rule Violation Detected!");
}

function terminateExam(reason) {
    clearInterval(App.timerInterval); App.isSubmitted = true;
    forceSubmitAnswers();
    const termMsg = document.getElementById('terminatedMessage');
    if (termMsg) termMsg.textContent = reason;
    const termOverlay = document.getElementById('terminatedOverlay');
    if (termOverlay) termOverlay.style.display = 'flex';
}

function forceSubmitAnswers() {
    App.isSubmitted = true;
    clearInterval(App.timerInterval);
    let totalCorrect = 0; const results = {}; const totalQ = getTotalQuestions();
    ['vocab', 'grammar', 'reading', 'listening'].forEach(mode => {
        let correct = 0;
        App.allQuestions[mode].forEach(q => { 
            const isCorrect = checkAnswer(q, App.allAnswers[mode][q.id]);
            if (isCorrect) { totalCorrect++; correct++; }
            showFeedback(mode, q.id, isCorrect, q.feedback);
        });
        results[mode] = { correct, total: App.allQuestions[mode].length || 1 };
    });
    updateProgressUI();
    const score = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
    endTime = new Date();
    if (App.warningsCount >= 2) ScormHelper.reportInterruption(score);
    else { ScormHelper.setScore(score); ScormHelper.finish(); }
    showFinalResults(totalCorrect, totalQ, results, score);
    disableAllInputs();
}

function initModes() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => {
            if (App.isSubmitted && !App.isReviewMode) return;
            document.querySelectorAll('.mode-btn').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            const targetSection = document.getElementById(`view-${mode}`);
            if (targetSection) targetSection.classList.add('active');
            App.currentMode = mode;
            updateProgressUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    });
}

function initVocabMode() {
    const selected = shuffleArray(vocabQuestionsBank).slice(0, 10);
    generateQuestions('vocabQuestionsContainer', selected, 'vocab');
}

function initGrammarMode() {
    const selected = shuffleArray(grammarQuestionsBank).slice(0, 10);
    generateQuestions('grammarQuestionsContainer', selected, 'grammar');
}

function initReadingMode() {
    const container = document.getElementById('readingContainer');
    if (!container) return;
    container.innerHTML = '';
    App.allQuestions.reading = [];
    readingSections.forEach((sec, idx) => {
        const layout = document.createElement('div');
        layout.className = 'quiz-layout';
        layout.style.marginBottom = '3rem';
        layout.innerHTML = `
            <div class="quiz-reference">
                <div class="quiz-panel-header"><i class="fas fa-file-alt"></i> Part ${idx + 1}</div>
                <div class="reference-content" style="color: ${sec.color || 'inherit'}">${sec.text}</div>
            </div>
            <div class="quiz-questions-panel">
                <div id="readingQuestions_${idx}" class="questions-container"></div>
            </div>
        `;
        container.appendChild(layout);
        generateQuestions(`readingQuestions_${idx}`, sec.bank, 'reading');
    });
}

function initListeningMode() {
    const container = document.getElementById('listeningContainer');
    if (!container) return;
    container.innerHTML = '';
    App.allQuestions.listening = [];
    listeningSections.forEach((sec, idx) => {
        const layout = document.createElement('div');
        layout.className = 'quiz-layout';
        layout.style.marginBottom = '3rem';
        const audioId = `audio_${idx}`;
        
        let audioHtml = '';
        if (sec.audio && sec.audio !== "null") {
            audioHtml = `
                <div class="audio-player-wrapper">
                    <button class="audio-control-btn" onclick="toggleAudio('${audioId}', this)"><i class="fas fa-play"></i></button>
                    <div class="audio-track-info" style="flex:1;">
                        <input type="range" class="audio-seek" style="width:100%" oninput="seekTo('${audioId}', this.value)" value="0">
                    </div>
                    <audio id="${audioId}" src="${sec.audio}" ontimeupdate="updateAudioUI('${audioId}', this)"></audio>
                </div>`;
        } else {
            audioHtml = '<div style="background:var(--gray-light); padding:2rem; border-radius:15px; text-align:center; color:var(--text-secondary); font-style:italic;"><i class="fas fa-volume-mute"></i> No audio uploaded for this section.</div>';
        }

        layout.innerHTML = `
            <div class="quiz-reference">
                <div class="quiz-panel-header"><i class="fas fa-headphones"></i> Listening ${idx + 1}</div>
                <div class="reference-content">
                    ${audioHtml}
                </div>
            </div>
            <div class="quiz-questions-panel">
                <div id="listeningQuestions_${idx}" class="questions-container"></div>
            </div>
        `;
        container.appendChild(layout);
        generateQuestions(`listeningQuestions_${idx}`, sec.bank, 'listening');
    });
}

function addSectionNavigation(containerId, mode) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const currentIndex = SECTION_ORDER.indexOf(mode);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < SECTION_ORDER.length - 1;
    
    const navDiv = document.createElement('div');
    navDiv.className = 'section-navigation';
    
    if (hasPrevious) {
        const prevMode = SECTION_ORDER[currentIndex - 1];
        navDiv.innerHTML += `
            <button class="nav-btn-prev" onclick="navigateToSection('${prevMode}')">
                <i class="fas fa-arrow-left"></i>
                <span>Previous: ${SECTION_NAMES[prevMode]}</span>
            </button>
        `;
    } else { navDiv.innerHTML += '<div></div>'; }
    
    if (hasNext) {
        const nextMode = SECTION_ORDER[currentIndex + 1];
        navDiv.innerHTML += `
            <button class="nav-btn-next" onclick="navigateToSection('${nextMode}')">
                <span>Next Section: ${SECTION_NAMES[nextMode]}</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        `;
    } else {
        navDiv.innerHTML += `
            <button class="btn-primary" id="submitAllBtnInside" onclick="submitAllAnswers()">
                <i class="fas fa-paper-plane"></i>
                <span>Submit All Answers</span>
            </button>
        `;
    }
    
    container.appendChild(navDiv);
}

function generateQuestions(cid, questions, mode) {
    const container = document.getElementById(cid);
    if (!container) return;
    const startIdx = App.allQuestions[mode].length;
    const mapped = questions.map((q, idx) => ({ ...q, id: startIdx + idx + 1 }));
    App.allQuestions[mode] = App.allQuestions[mode].concat(mapped);

    mapped.forEach(q => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.questionId = q.id;
        card.dataset.mode = mode;
        card.innerHTML = `<div class="question-text">${q.id}. ${q.text}</div>`;
        if (q.type === 'mc' || q.type === 'tf') {
            const opts = q.type === 'tf' ? ['true', 'false'] : (q.options || []);
            opts.forEach(o => {
                card.innerHTML += `<label class="option-label"><input type="radio" name="q${mode}-${q.id}" value="${o}"> ${o}</label>`;
            });
        } else if (q.type === 'matching') {
            const rightOptions = q.pairs.map(p => p.right);
            const shuffledRightOptions = shuffleArray(rightOptions);
            let matchingHtml = '<div class="matching-container">';
            q.pairs.forEach((pair, i) => {
                matchingHtml += `<div class="matching-row">
                    <div class="matching-left">${pair.left}</div>
                    <select class="matching-select" data-pair-left="${pair.left}" onchange="saveAnswer('${mode}', ${q.id}, null)">
                        <option value="">-- Select --</option>
                        ${shuffledRightOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>`;
            });
            matchingHtml += '</div>';
            card.innerHTML += matchingHtml;
        } else if (q.type === 'mr') {
            const opts = q.options || [];
            opts.forEach(o => {
                card.innerHTML += `<label class="option-label"><input type="checkbox" name="q${mode}-${q.id}" value="${o}"> ${o}</label>`;
            });
        } else if (q.type === 'fb') {
            card.innerHTML += `<input type="text" class="fb-input" onchange="saveAnswer('${mode}', ${q.id}, this.value)">`;
        }
        card.innerHTML += `<div id="feedback-${mode}-${q.id}" class="feedback"></div>`;
        container.appendChild(card);
        card.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { 
            if (i.type === 'radio' || i.type === 'checkbox') saveAnswer(mode, q.id, i.value);
            updateProgressUI();
        }));
    });
    
    if (cid.includes(mode) && !cid.includes('_')) {
        addSectionNavigation(cid, mode);
    } else if (mode === 'reading' && cid.includes('_' + (readingSections.length - 1))) {
        addSectionNavigation('readingContainer', mode);
    } else if (mode === 'listening' && cid.includes('_' + (listeningSections.length - 1))) {
        addSectionNavigation('listeningContainer', mode);
    }
}

function navigateToSection(mode) {
    if (App.isSubmitted && !App.isReviewMode) {
        showToast("Test submitted. Use 'Review Answers' from the results modal.");
        return;
    }
    const btn = document.querySelector(`[data-mode="${mode}"]`);
    if (btn) btn.click();
}

function toggleAudio(id, btn) {
    const a = document.getElementById(id);
    if (!a) return;
    if (a.paused) { a.play(); btn.innerHTML = '<i class="fas fa-pause"></i>'; }
    else { a.pause(); btn.innerHTML = '<i class="fas fa-play"></i>'; }
}
function updateAudioUI(id, audio) {
    const bar = audio.parentElement.querySelector('.audio-seek');
    if (bar) bar.value = (audio.currentTime / audio.duration) * 100 || 0;
}
function seekTo(id, val) {
    const a = document.getElementById(id);
    if (a) a.currentTime = (val / 100) * a.duration;
}

function saveAnswer(mode, qid, val) { 
    const q = App.allQuestions[mode].find(x => x.id === qid);
    if (q && q.type === 'matching') {
        const card = document.querySelector(`[data-question-id="${qid}"][data-mode="${mode}"]`);
        const selects = card.querySelectorAll('.matching-select');
        const answer = {};
        selects.forEach(sel => { answer[sel.dataset.pairLeft] = sel.value; });
        App.allAnswers[mode][qid] = answer;
    } else if (q && q.type === 'mr') {
        if (!App.allAnswers[mode][qid]) App.allAnswers[mode][qid] = [];
        const idx = App.allAnswers[mode][qid].indexOf(val);
        if (idx > -1) App.allAnswers[mode][qid].splice(idx, 1);
        else App.allAnswers[mode][qid].push(val);
    } else {
        App.allAnswers[mode][qid] = val; 
    }
}

function checkAnswer(q, userAnswer) {
    if (!userAnswer) return false;
    if (q.type === 'matching') {
        if (typeof userAnswer !== 'object') return false;
        return q.pairs.every(pair => userAnswer[pair.left] === pair.right);
    }
    if (q.type === 'mr') {
        if (!userAnswer || !Array.isArray(userAnswer)) return false;
        if (userAnswer.length !== q.correct.length) return false;
        return q.correct.every(c => userAnswer.includes(c));
    }
    if (q.type === 'fb') {
        const correctOnes = Array.isArray(q.correct) ? q.correct : [q.correct];
        return correctOnes.some(c => c && String(c).toLowerCase().trim() === String(userAnswer).toLowerCase().trim());
    }
    return String(userAnswer).toLowerCase() === String(q.correct).toLowerCase();
}

function showFeedback(mode, questionId, isCorrect, feedbackText) {
    const fbEl = document.getElementById(`feedback-${mode}-${questionId}`);
    if (!fbEl) return;
    fbEl.style.display = 'block';
    if (isCorrect) {
        fbEl.className = 'feedback correct';
        fbEl.innerHTML = `<i class="fas fa-check-circle"></i> ${feedbackText || 'Correct!'}`;
    } else {
        fbEl.className = 'feedback incorrect';
        fbEl.innerHTML = `<i class="fas fa-times-circle"></i> ${feedbackText || 'Incorrect'}`;
    }
}

function getTotalQuestions() {
    return App.allQuestions.vocab.length + App.allQuestions.grammar.length + App.allQuestions.reading.length + App.allQuestions.listening.length;
}

function getAnsweredCount(mode) {
    const answers = App.allAnswers[mode];
    let count = 0;
    for (let qId in answers) { if (answers[qId]) count++; }
    return count;
}

function updateScoreBadge(mode) {
    const scoreElement = document.getElementById(`${mode}Score`);
    if (scoreElement) {
        const answered = getAnsweredCount(mode);
        const total = App.allQuestions[mode].length;
        scoreElement.textContent = `${answered}/${total} answered`;
    }
}

function updateProgressUI() {
    const mode = App.currentMode;
    const answered = getAnsweredCount(mode);
    const total = App.allQuestions[mode].length || 1;
    let percentage = 0; let labelText = '';

    if (App.isSubmitted) {
        let correct = 0;
        App.allQuestions[mode].forEach(q => { if (checkAnswer(q, App.allAnswers[mode][q.id])) correct++; });
        percentage = Math.round((correct / total) * 100);
        labelText = `${correct}/${total}`;
    } else {
        percentage = Math.round((answered / total) * 100);
        labelText = `${answered}/${total}`;
    }

    updateScoreBadge(mode);
    const ring = document.getElementById('progressRing');
    const destText = document.getElementById('desktopProgressText');
    const mobText = document.getElementById('mobileProgressText');
    const bar = document.getElementById('progressBarFill');
    const label = document.getElementById('progressLabel');

    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (percentage / 100) * circumference;
    if (ring) { ring.style.strokeDasharray = `${circumference} ${circumference}`; ring.style.strokeDashoffset = offset; }
    if (destText) destText.textContent = percentage + '%';
    if (mobText) mobText.textContent = percentage + '%';
    if (bar) bar.style.width = percentage + '%';
    if (label) label.textContent = labelText;
}

function submitAllAnswers() {
    const totalQ = getTotalQuestions(); let answered = 0;
    ['vocab', 'grammar', 'reading', 'listening'].forEach(m => { answered += getAnsweredCount(m); });
    if (answered < totalQ) { if (!confirm(`You have only answered ${answered} out of ${totalQ} questions. Submit anyway?`)) return; }
    forceSubmitAnswers();
}

function showFinalResults(totalCorrect, totalQuestions, results, score) {
    const percentage = Math.round((totalCorrect / totalQuestions) * 100);
    const modal = document.createElement('div');
    modal.id = 'resultsModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background:white; border-radius:20px; padding:40px; max-width:600px; width:100%; max-height:90vh; overflow-y:auto; text-align:center; box-shadow:var(--shadow-xl);';
    
    const emoji = percentage >= 90 ? '🎖️' : percentage >= 70 ? '⭐' : '⚓';
    const message = percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Practicing!';
    
    content.innerHTML = `
        <h2 style="font-size: 2.5em; margin-bottom: 20px; color: var(--theme-dark);">${emoji} ${message}</h2>
        <div style="font-size: 4em; font-weight: bold; margin: 30px 0; background: var(--gradient-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${percentage}%</div>
        <p style="font-size: 1.3em; color: var(--text-secondary); margin-bottom: 30px;">You got ${totalCorrect} out of ${totalQuestions} questions correct</p>
        
        <div style="background: var(--gray-light); border-radius: 15px; padding: 20px; margin: 30px 0; text-align: left;">
            <h3 style="text-align: center; margin-bottom: 20px; color: var(--theme-medium);">Section Breakdown</h3>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px;">
                    <span>Vocabulary</span> <span style="font-weight: bold;">${results.vocab.correct}/${results.vocab.total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px;">
                    <span>Grammar</span> <span style="font-weight: bold;">${results.grammar.correct}/${results.grammar.total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px;">
                    <span>Reading</span> <span style="font-weight: bold;">${results.reading.correct}/${results.reading.total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: white; border-radius: 8px;">
                    <span>Listening</span> <span style="font-weight: bold;">${results.listening.correct}/${results.listening.total}</span>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
            <button id="reviewBtn" class="btn-primary" style="padding:12px 25px; display: ${ENABLE_REPORT ? 'none' : 'inline-block'};"><i class="fas fa-search"></i> Review Answers</button>
            ${ENABLE_REPORT ? `<button id="reportBtn" class="btn-primary" style="padding:12px 25px; background: #27ae60;"><i class="fas fa-envelope"></i> Send Report</button>` : ''}
            <button onclick="if(window.opener){window.close();}else{alert('Exam finished. Please close this tab.');window.location.href='about:blank';}" class="btn-control" style="padding:12px 25px; background: #e74c3c; color: white;"><i class="fas fa-times-circle"></i> Close Exam</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    App.resultsModal = modal;
    
    const reviewBtn = document.getElementById('reviewBtn');
    if (reviewBtn) {
        reviewBtn.onclick = (e) => { 
            e.preventDefault();
            enterReviewMode(); 
            if (App.resultsModal) App.resultsModal.style.display = 'none'; 
            showToast("Review Mode active."); 
        };
    }
    
    if (ENABLE_REPORT) {
        const reportBtn = document.getElementById('reportBtn');
        if (reportBtn) {
            reportBtn.onclick = (e) => {
                e.preventDefault();
                sendDetailedReport(totalCorrect, totalQuestions, results, score);
            };
        }
    }
}

function sendDetailedReport(correct, total, results, overallScore) {
    const reportBtn = document.getElementById('reportBtn');
    const reviewBtn = document.getElementById('reviewBtn');
    
    // Unlock Review button immediately
    if (reviewBtn) reviewBtn.style.display = 'inline-block';

    if (reportBtn) {
        reportBtn.disabled = true;
        reportBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`;
    }

    const timeSpent = Math.floor((endTime - startTime) / 1000);
    const mins = Math.floor(timeSpent / 60);
    const secs = timeSpent % 60;
    const timeStr = `${mins}m ${secs}s`;
    
    const testName = "Introductions & Greetings";
    const subject = `${testName} detailed report`;
    
    // Prepare data
    const formData = {
        _recipient: RECIPIENT_EMAIL,
        _subject: subject,
        Student_Name: studentName,
        Student_ID: studentID,
        Test: testName,
        Overall_Score: `${overallScore}% (${correct}/${total})`,
        Time_Spent: timeStr,
        Vocabulary: `${results.vocab.correct}/${results.vocab.total}`,
        Grammar: `${results.grammar.correct}/${results.grammar.total}`,
        Reading: `${results.reading.correct}/${results.reading.total}`,
        Listening: `${results.listening.correct}/${results.listening.total}`
    };

    // Format data for the user's Google Script (expects JSON in a 'report' parameter)
    const reportData = {
        Name: studentName,
        ID: studentID,
        Test: testName,
        Score: `${overallScore}% (${correct}/${total})`,
        Time: timeStr,
        Vocabulary: `${results.vocab.correct}/${results.vocab.total}`,
        Grammar: `${results.grammar.correct}/${results.grammar.total}`,
        Reading: `${results.reading.correct}/${results.reading.total}`,
        Listening: `${results.listening.correct}/${results.listening.total}`,
        _recipient: RECIPIENT_EMAIL,
        _subject: subject
    };

    if (REPORT_URL && REPORT_URL.includes("script.google.com") && REPORT_URL !== "{{" + "REPORT_URL}}") {
        // --- NEW: Silent Iframe Submission ---
        // Create a unique hidden iframe
        const iframeName = "silent_reporter_" + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = "POST";
        form.action = REPORT_URL;
        form.target = iframeName; // Target the hidden iframe
        form.style.display = "none";

        const input = document.createElement('input');
        input.type = "hidden";
        input.name = "report";
        input.value = JSON.stringify(reportData);
        form.appendChild(input);

        document.body.appendChild(form);
        
        try {
            form.submit();
            showToast("Report Sent Successfully!");
            
            if (reportBtn) {
                reportBtn.style.background = "#95a5a6";
                reportBtn.innerHTML = `<i class="fas fa-check"></i> Sent`;
                reportBtn.disabled = true;
            }
            
            // Cleanup after a delay
            setTimeout(() => {
                if (document.body.contains(form)) document.body.removeChild(form);
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 10000);
        } catch (e) {
            console.error("Submit error:", e);
            fallbackToMailto(subject, timeStr, correct, total, overallScore);
        }
    } else {
        fallbackToMailto(subject, timeStr, correct, total, overallScore);
    }
}

function fallbackToMailto(subject, timeStr, correct, total, overallScore) {
    // Unlock Review button for mailto fallback as well
    const reviewBtn = document.getElementById('reviewBtn');
    if (reviewBtn) reviewBtn.style.display = 'inline-block';

    if (!RECIPIENT_EMAIL || RECIPIENT_EMAIL === "") {
        showToast("No recipient email provided.");
        const reportBtn = document.getElementById('reportBtn');
        if (reportBtn) {
            reportBtn.disabled = false;
            reportBtn.innerHTML = `<i class="fas fa-envelope"></i> Send Report`;;
        }
        return;
    }
    
    showToast("Opening email client...");
    
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
        reportBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> Email Client Opened`;;
        setTimeout(() => {
            reportBtn.disabled = false;
            reportBtn.innerHTML = `<i class="fas fa-envelope"></i> Send Report`;;
        }, 3000);
    }

    let body = `DETAILED EXAM REPORT\n`;
    body += `==============================\n`;
    body += `Student Name: ${studentName}\n`;
    body += `Student ID: ${studentID}\n`;
    body += `Test: Introductions & Greetings\n`;
    body += `Overall Score: ${overallScore}% (${correct}/${total})\n`;
    body += `Time Spent: ${timeStr}\n\n`;
    
    body += `SECTION BREAKDOWN:\n`;
    body += `Vocabulary: ${App.allQuestions.vocab.filter(q => checkAnswer(q, App.allAnswers.vocab[q.id])).length}/${App.allQuestions.vocab.length}\n`;
    body += `Grammar: ${App.allQuestions.grammar.filter(q => checkAnswer(q, App.allAnswers.grammar[q.id])).length}/${App.allQuestions.grammar.length}\n`;
    body += `Reading: ${App.allQuestions.reading.filter(q => checkAnswer(q, App.allAnswers.reading[q.id])).length}/${App.allQuestions.reading.length}\n`;
    body += `Listening: ${App.allQuestions.listening.filter(q => checkAnswer(q, App.allAnswers.listening[q.id])).length}/${App.allQuestions.listening.length}\n`;
    
    const mailtoUrl = `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

function enterReviewMode() {
    App.isReviewMode = true;
    ['vocab', 'grammar', 'reading', 'listening'].forEach(mode => {
        App.allQuestions[mode].forEach(q => {
            const card = document.querySelector(`[data-question-id="${q.id}"][data-mode="${mode}"]`);
            if (!card) return;
            const isCorrect = checkAnswer(q, App.allAnswers[mode][q.id]);
            if (!isCorrect) {
                card.style.border = '3px solid var(--danger)'; card.style.background = 'var(--danger-light)';
                let div = card.querySelector('.correct-answer-display');
                if (!div) {
                    div = document.createElement('div'); div.className = 'correct-answer-display';
                    div.style.cssText = 'margin-top:15px; padding:15px; background:var(--success-light); border-left:4px solid var(--success); border-radius:8px; font-weight:600; color:#155724;';
                    if (q.type === 'matching') {
                        let correctText = '<strong>Correct matches:</strong><br>';
                        q.pairs.forEach(pair => { correctText += `${pair.left} !92 ${pair.right}<br>`; });
                        div.innerHTML = `<i class="fas fa-lightbulb"></i> ${correctText}`;
                    } else if (q.type === 'mr') {
                        div.innerHTML = `<i class="fas fa-lightbulb"></i> <strong>Correct answers:</strong> ${Array.isArray(q.correct) ? q.correct.join(', ') : q.correct}`;
                    } else {
                        div.innerHTML = `<i class="fas fa-lightbulb"></i> <strong>Correct answer:</strong> ${q.correct}`;
                    }
                    card.appendChild(div);
                }
            } else { card.style.border = '3px solid var(--success)'; card.style.background = 'var(--success-light)'; }
        });
    });
    addReturnToResultsButtons();
}

function addReturnToResultsButtons() {
    document.querySelectorAll('.section-navigation').forEach(nav => {
        if (!nav.querySelector('.return-results-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn-control return-results-btn';
            btn.innerHTML = '<i class="fas fa-chart-bar"></i> <span>Back to Results</span>';
            btn.onclick = () => { if (App.resultsModal) App.resultsModal.style.display = 'flex'; };
            nav.appendChild(btn);
        }
    });
}

function disableAllInputs() {
    document.querySelectorAll('input, select').forEach(i => { i.disabled = true; i.style.opacity = '0.7'; });
    document.querySelectorAll('.nav-btn-prev, .nav-btn-next, #submitAllBtn, #submitAllBtnInside').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; b.style.cursor = 'not-allowed'; });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

const ScormHelper = {
    api: null,
    getAPI: function() {
        let win = window;
        while (win.API == null && win.parent != null && win.parent != win) win = win.parent;
        this.api = win.API; return this.api;
    },
    init: function() {
        const api = this.getAPI();
        if (api) { api.LMSInitialize(""); api.LMSSetValue("cmi.core.lesson_status", "incomplete"); api.LMSCommit(""); }
    },
    setScore: function(s) {
        const api = this.getAPI();
        if (api) { 
            api.LMSSetValue("cmi.core.score.raw", s); 
            api.LMSSetValue("cmi.core.lesson_status", s >= 70 ? "passed" : "failed");
            api.LMSCommit("");
        }
    },
    reportInterruption: function(s) {
        const api = this.getAPI();
        if (api) { api.LMSSetValue("cmi.core.score.raw", s); api.LMSSetValue("cmi.core.lesson_status", "failed"); api.LMSCommit(""); api.LMSFinish(""); }
    },
    finish: function() { const api = this.getAPI(); if (api) { api.LMSCommit(""); api.LMSFinish(""); } }
};

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
