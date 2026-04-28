(function () {
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const state = {
    selectedWeek: null,
    selectedLabel: 'All Weeks',
    pool: [],
    mode: null,
    questions: [],
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    answered: false,
    timerId: null,
    remainingSeconds: 0,
    currentQuestion: null,
    lastQuizConfig: null,
  };

  const els = {};

  function init() {
    cacheElements();
    bindEvents();
    renderWeekButtons();
    renderLastScore();
  }

  function cacheElements() {
    els.screens = {
      home: document.getElementById('screen-home'),
      week: document.getElementById('screen-week-select'),
      mode: document.getElementById('screen-mode-select'),
      quiz: document.getElementById('screen-quiz'),
      result: document.getElementById('screen-result'),
    };

    els.weekGrid = document.getElementById('week-grid');
    els.modeLabel = document.getElementById('mode-label');
    els.modeBackBtn = document.getElementById('mode-back-btn');

    els.quizModeBadge = document.getElementById('quiz-mode-badge');
    els.quizWeekLabel = document.getElementById('quiz-week-label');
    els.timerDisplay = document.getElementById('timer-display');
    els.timerText = document.getElementById('timer-text');
    els.endBtn = document.getElementById('end-btn');

    els.progressBar = document.getElementById('progress-bar');
    els.qCounter = document.getElementById('q-counter');
    els.questionText = document.getElementById('question-text');
    els.optionsList = document.getElementById('options-list');
    els.btnNext = document.getElementById('btn-next');

    els.statTotal = document.getElementById('stat-total');
    els.statCorrect = document.getElementById('stat-correct');
    els.statWrong = document.getElementById('stat-wrong');
    els.statScore = document.getElementById('stat-score');
    els.scoreBar = document.getElementById('score-bar');
    els.scoreMessage = document.getElementById('score-message');
    els.resultIcon = document.getElementById('result-icon');
    els.resultTitle = document.getElementById('result-title');

    els.lastScoreDisplay = document.getElementById('last-score-display');
  }

  function bindEvents() {
    els.modeBackBtn.addEventListener('click', function () {
      if (state.selectedWeek === null) {
        goHome();
      } else {
        showScreen('week');
      }
    });
  }

  function showScreen(key) {
    Object.values(els.screens).forEach((screen) => screen.classList.remove('active'));
    els.screens[key].classList.add('active');
  }

  function renderWeekButtons() {
    const weekNumbers = Object.keys(quizData.weeks)
      .map(Number)
      .sort((a, b) => a - b);

    els.weekGrid.innerHTML = '';

    weekNumbers.forEach((week) => {
      const btn = document.createElement('button');
      btn.className = 'week-btn';
      btn.type = 'button';
      btn.innerHTML = `<span class="wk-num">${week}</span>Week ${week}`;
      btn.addEventListener('click', function () {
        selectWeek(week);
      });
      els.weekGrid.appendChild(btn);
    });
  }

  function selectWeek(weekNumber) {
    state.selectedWeek = weekNumber;
    state.selectedLabel = `Week ${weekNumber}`;
    state.pool = (quizData.weeks[weekNumber] || []).slice();
    els.modeLabel.textContent = state.selectedLabel;
    showScreen('mode');
  }

  function setAllWeeks() {
    state.selectedWeek = null;
    state.selectedLabel = 'All Weeks';
    state.pool = (quizData.all || []).slice();
    els.modeLabel.textContent = state.selectedLabel;
  }

  function startQuiz(mode) {
    clearTimer();

    state.mode = mode;
    if (window.App) {
      window.App.mode = mode;
    }
    state.questions = [];
    state.currentIndex = 0;
    state.correct = 0;
    state.wrong = 0;
    state.answered = false;
    state.currentQuestion = null;

    if (!state.pool.length) {
      state.pool = (state.selectedWeek === null ? quizData.all : quizData.weeks[state.selectedWeek] || []).slice();
    }

    if (!state.pool.length) {
      return;
    }

    if (mode === 'exam') {
      const examQuestionCount = state.selectedWeek === null ? 50 : state.pool.length;
      state.questions = buildExamQuestionSet(state.pool, examQuestionCount);
      state.remainingSeconds = 3 * 60 * 60;
      startTimer();
      els.timerDisplay.style.display = 'flex';
      els.endBtn.style.display = 'none';
      els.quizModeBadge.textContent = 'EXAM';
      els.btnNext.textContent = 'Next →';
      els.btnNext.style.display = 'none';
    } else {
      state.questions = [];
      state.remainingSeconds = 0;
      els.timerDisplay.style.display = 'none';
      els.endBtn.style.display = 'inline-flex';
      els.quizModeBadge.textContent = 'ENDLESS';
      els.btnNext.textContent = 'Next →';
      els.btnNext.style.display = 'none';
    }

    state.lastQuizConfig = {
      selectedWeek: state.selectedWeek,
      mode,
    };

    els.quizWeekLabel.textContent = state.selectedLabel;
    showScreen('quiz');
    renderCurrentQuestion();
  }

  function buildExamQuestionSet(pool, count) {
    const shuffled = shuffle(pool.slice());

    if (shuffled.length >= count) {
      return shuffled.slice(0, count).map(cloneQuestionWithShuffledOptions);
    }

    const chosen = [];
    for (let i = 0; i < count; i += 1) {
      const randomQ = pool[Math.floor(Math.random() * pool.length)];
      chosen.push(randomQ);
    }

    return shuffle(chosen).map(cloneQuestionWithShuffledOptions);
  }

  function cloneQuestionWithShuffledOptions(question) {
    const originalCorrectIndex = letterToIndex(question.answer);
    const optionObjects = question.options.map((text, idx) => ({
      text,
      isCorrect: idx === originalCorrectIndex,
    }));

    const shuffledOptions = shuffle(optionObjects);
    const correctIndex = shuffledOptions.findIndex((opt) => opt.isCorrect);

    return {
      question: question.question,
      options: shuffledOptions.map((opt) => opt.text),
      answer: LETTERS[correctIndex],
    };
  }

  function renderCurrentQuestion() {
    state.answered = false;
    els.btnNext.style.display = 'none';

    let q;

    if (state.mode === 'exam') {
      q = state.questions[state.currentIndex];
      if (!q) {
        endQuiz();
        return;
      }
      updateProgressExam();
      els.qCounter.textContent = `Question ${state.currentIndex + 1} / ${state.questions.length}`;
    } else {
      q = getRandomEndlessQuestion();
      updateProgressEndless();
      els.qCounter.textContent = `Question ${state.currentIndex + 1} · Endless`;
    }

    state.currentQuestion = q;
    els.questionText.textContent = q.question;
    els.optionsList.innerHTML = '';

    q.options.forEach((optionText, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-btn';
      button.dataset.letter = LETTERS[idx];
      button.innerHTML = `<span class="opt-letter">${LETTERS[idx]}</span><span>${optionText}</span>`;
      button.addEventListener('click', function () {
        handleAnswer(button, LETTERS[idx]);
      });
      els.optionsList.appendChild(button);
    });
  }

  function getRandomEndlessQuestion() {
    const idx = Math.floor(Math.random() * state.pool.length);
    return cloneQuestionWithShuffledOptions(state.pool[idx]);
  }

  function handleAnswer(selectedButton, selectedLetter) {
    if (state.answered) {
      return;
    }

    state.answered = true;
    selectedButton.classList.add('selected');

    const isCorrect = selectedLetter === state.currentQuestion.answer;
    if (isCorrect) {
      state.correct += 1;
      selectedButton.classList.add('correct');
    } else {
      state.wrong += 1;
      selectedButton.classList.add('wrong');
    }

    const optionButtons = els.optionsList.querySelectorAll('.option-btn');
    optionButtons.forEach((btn) => {
      btn.classList.add('disabled');
      if (btn.dataset.letter === state.currentQuestion.answer && btn !== selectedButton) {
        btn.classList.add('reveal-correct');
      }
    });

    if (window.App.mode === 'exam') {
      els.btnNext.style.display = 'inline-flex';
      if (state.currentIndex === state.questions.length - 1) {
        els.btnNext.textContent = 'Finish →';
      } else {
        els.btnNext.textContent = 'Next →';
      }
    } else if (window.App.mode === 'endless') {
      const answeredQuestion = state.currentQuestion;
      window.setTimeout(function () {
        if (
          window.App.mode === 'endless'
          && state.answered
          && state.currentQuestion === answeredQuestion
        ) {
          nextQuestion();
        }
      }, 1500);
    }
  }

  function nextQuestion() {
    if (!state.answered) {
      return;
    }

    state.currentIndex += 1;

    if (state.mode === 'exam' && state.currentIndex >= state.questions.length) {
      endQuiz();
      return;
    }

    renderCurrentQuestion();
  }

  function startTimer() {
    updateTimerUI();
    state.timerId = window.setInterval(function () {
      state.remainingSeconds -= 1;
      if (state.remainingSeconds <= 0) {
        state.remainingSeconds = 0;
        updateTimerUI();
        clearTimer();
        endQuiz();
        return;
      }
      updateTimerUI();
    }, 1000);
  }

  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerUI() {
    const h = Math.floor(state.remainingSeconds / 3600);
    const m = Math.floor((state.remainingSeconds % 3600) / 60);
    const s = state.remainingSeconds % 60;
    els.timerText.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

    if (state.remainingSeconds <= 300) {
      els.timerDisplay.classList.add('warn');
    } else {
      els.timerDisplay.classList.remove('warn');
    }
  }

  function endQuiz() {
    clearTimer();

    const total = state.correct + state.wrong;
    const safeTotal = total || 0;
    const score = safeTotal > 0 ? Math.round((state.correct / safeTotal) * 100) : 0;

    els.statTotal.textContent = String(safeTotal);
    els.statCorrect.textContent = String(state.correct);
    els.statWrong.textContent = String(state.wrong);
    els.statScore.textContent = `${score}%`;

    els.scoreBar.style.width = `${score}%`;

    if (score >= 80) {
      els.resultIcon.textContent = '🏆';
      els.resultTitle.textContent = 'Excellent!';
      els.scoreMessage.textContent = 'Outstanding performance. You have strong command of the material.';
    } else if (score >= 60) {
      els.resultIcon.textContent = '🎉';
      els.resultTitle.textContent = 'Good Job!';
      els.scoreMessage.textContent = 'Nice work. Review a little and you can push this even higher.';
    } else {
      els.resultIcon.textContent = '📘';
      els.resultTitle.textContent = 'Keep Practicing';
      els.scoreMessage.textContent = 'You are improving. Revisit concepts and try another round.';
    }

    saveLastScore({
      total: safeTotal,
      correct: state.correct,
      wrong: state.wrong,
      score,
      mode: state.mode,
      label: state.selectedLabel,
      date: new Date().toISOString(),
    });

    renderLastScore();
    showScreen('result');
  }

  function restart() {
    if (!state.lastQuizConfig) {
      goHome();
      return;
    }

    if (state.lastQuizConfig.selectedWeek === null) {
      setAllWeeks();
    } else {
      selectWeek(state.lastQuizConfig.selectedWeek);
    }

    if (state.lastQuizConfig.mode === 'exam') {
      startExam();
    } else {
      startEndless();
    }
  }

  function goHome() {
    clearTimer();
    showScreen('home');
  }

  function goAllWeeks() {
    setAllWeeks();
    showScreen('mode');
  }

  function goWeekByWeek() {
    showScreen('week');
  }

  function startExam() {
    if (!state.pool.length) {
      if (state.selectedWeek === null) {
        setAllWeeks();
      } else {
        state.pool = (quizData.weeks[state.selectedWeek] || []).slice();
      }
    }
    startQuiz('exam');
  }

  function startEndless() {
    if (!state.pool.length) {
      if (state.selectedWeek === null) {
        setAllWeeks();
      } else {
        state.pool = (quizData.weeks[state.selectedWeek] || []).slice();
      }
    }
    startQuiz('endless');
  }

  function updateProgressExam() {
    const pct = state.questions.length
      ? ((state.currentIndex + 1) / state.questions.length) * 100
      : 0;
    els.progressBar.style.width = `${pct}%`;
  }

  function updateProgressEndless() {
    const step = (state.currentIndex % 20) + 1;
    const pct = (step / 20) * 100;
    els.progressBar.style.width = `${pct}%`;
  }

  function renderLastScore() {
    const raw = localStorage.getItem('nptel_hci_last_score');
    if (!raw) {
      els.lastScoreDisplay.textContent = '';
      return;
    }

    try {
      const last = JSON.parse(raw);
      const when = new Date(last.date);
      const dateText = Number.isNaN(when.getTime()) ? '' : ` · ${when.toLocaleDateString()}`;
      els.lastScoreDisplay.textContent = `Last: ${last.score}% (${last.correct}/${last.total}) · ${toTitle(last.mode)} · ${last.label}${dateText}`;
    } catch (_err) {
      els.lastScoreDisplay.textContent = '';
    }
  }

  function saveLastScore(payload) {
    localStorage.setItem('nptel_hci_last_score', JSON.stringify(payload));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function letterToIndex(letter) {
    return LETTERS.indexOf(letter);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toTitle(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  window.App = {
    mode: null,
    goAllWeeks,
    goWeekByWeek,
    goHome,
    startExam,
    startEndless,
    nextQuestion,
    endQuiz,
    restart,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
