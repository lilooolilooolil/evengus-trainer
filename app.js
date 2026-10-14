const state = {
  phrases: [],
  order: [],
  index: 0,
  step: 1,
};

const puzzle = {
  words: [],
  extra: '',
  bank: [],
  placed: [],
  dragFrom: null,
};

const $ = (id) => document.getElementById(id);

function showError(message) {
  const el = $('error');
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError() {
  $('error').classList.add('hidden');
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function currentPhrase() {
  return state.phrases[state.order[state.index]];
}

function updateProgress() {
  $('progress').textContent = `Фраза ${state.index + 1} из ${state.phrases.length}`;
}

const AUDIO_BASE = 'source/';

let currentAudio = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

function playAudio() {
  stopAudio();
  const phrase = currentPhrase();
  const audio = new Audio(AUDIO_BASE + phrase.audio);
  currentAudio = audio;
  audio.onerror = () => showError(`Аудиофайл не найден: ${phrase.audio}`);
  audio
    .play()
    .then(() => hideError())
    .catch((err) => {
      if (err.name === 'NotAllowedError') {
        showError('Браузер заблокировал автовоспроизведение. Нажмите «Прослушать».');
      } else {
        showError('Не удалось воспроизвести аудио.');
      }
    });
}

function showStep(step) {
  state.step = step;
  for (const s of [1, 2, '2b', 3]) {
    $(`step-${s}`).classList.add('hidden');
  }
  $(`step-${step}`).classList.remove('hidden');
}

function renderStep1() {
  const phrase = currentPhrase();
  $('phrase-russian-1').textContent = phrase.russian;
  $('phrase-evenki-1').textContent = phrase.evenki;
  showStep(1);
  playAudio();
}

function renderStep2() {
  const phrase = currentPhrase();
  $('phrase-russian-2').textContent = phrase.russian;

  const correct = phrase.evenki;
  const wrongs = shuffle(
    state.phrases.filter((p) => p.evenki !== correct).map((p) => p.evenki)
  ).slice(0, 3);
  const options = shuffle([correct, ...wrongs]);

  const container = $('options-2');
  container.innerHTML = '';
  for (const option of options) {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = option;
    btn.addEventListener('click', () => handleAnswer(btn, option, correct, $('btn-next-2')));
    container.appendChild(btn);
  }
  $('btn-next-2').disabled = true;
  showStep(2);
}

function renderStep3() {
  const phrase = currentPhrase();
  $('phrase-evenki-3').textContent = phrase.evenki;

  const correct = phrase.russian;
  const wrongs = shuffle(
    state.phrases.filter((p) => p.russian !== correct).map((p) => p.russian)
  ).slice(0, 3);
  const options = shuffle([correct, ...wrongs]);

  const container = $('options-3');
  container.innerHTML = '';
  for (const option of options) {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = option;
    btn.addEventListener('click', () => handleAnswer(btn, option, correct, $('btn-next-3')));
    container.appendChild(btn);
  }
  $('btn-next-3').disabled = true;
  showStep(3);
  playAudio();
}

function handleAnswer(btn, chosen, correct, nextBtn) {
  if (chosen === correct) {
    btn.classList.add('correct');
    nextBtn.disabled = false;
    playAudio();
  } else {
    btn.classList.add('wrong');
  }
}

function stripPunctuation(text) {
  return text.replace(/[.,!?;:()«»"“”]/g, '').trim();
}

function splitWords(evenki) {
  return stripPunctuation(evenki).split(/\s+/).filter(Boolean);
}

function setFeedback(text, cls) {
  const feedback = $('puzzle-feedback');
  feedback.textContent = text;
  feedback.className = 'hint' + (cls ? ' ' + cls : '');
}

function renderStep2b() {
  const phrase = currentPhrase();
  $('phrase-russian-2b').textContent = phrase.russian;
  setFeedback('', '');
  $('btn-next-2b').disabled = true;

  puzzle.words = splitWords(phrase.evenki);

  const otherWords = shuffle(
    state.phrases
      .filter((p) => p.evenki !== phrase.evenki)
      .flatMap((p) => splitWords(p.evenki))
      .filter((w) => !puzzle.words.includes(w))
  );
  puzzle.extra = otherWords[0] || '';

  puzzle.bank = shuffle([...puzzle.words, puzzle.extra]).map((text) => ({ text, used: false }));
  puzzle.placed = [];
  puzzle.dragFrom = null;

  setupPlaceholderDnD();
  renderWordBank();
  renderPlaceholder();
  showStep('2b');
}

function setupPlaceholderDnD() {
  const container = $('placeholder');
  container.ondragover = (e) => {
    e.preventDefault();
    container.classList.add('drag-over');
  };
  container.ondragleave = () => container.classList.remove('drag-over');
  container.ondrop = (e) => {
    e.preventDefault();
    container.classList.remove('drag-over');
    movePlacedWord(puzzle.placed.length);
  };
}

function renderWordBank() {
  const bank = $('word-bank');
  bank.innerHTML = '';
  for (const item of puzzle.bank) {
    const btn = document.createElement('button');
    btn.className = 'bank-word' + (item.used ? ' used' : '');
    btn.disabled = item.used;
    btn.textContent = item.text;
    btn.addEventListener('click', () => {
      item.used = true;
      btn.classList.add('used');
      btn.disabled = true;
      puzzle.placed.push({ text: item.text, bankIndex: puzzle.bank.indexOf(item) });
      renderPlaceholder();
      checkPuzzle();
    });
    bank.appendChild(btn);
  }
}

function renderPlaceholder() {
  const container = $('placeholder');
  container.innerHTML = '';
  puzzle.placed.forEach((item, i) => {
    const el = document.createElement('span');
    el.className = 'placed-word';
    el.textContent = item.text;
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      puzzle.dragFrom = i;
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      puzzle.dragFrom = null;
    });
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      movePlacedWord(i);
    });
    el.addEventListener('click', () => returnWordToBank(i));
    container.appendChild(el);
  });
}

function returnWordToBank(i) {
  const [removed] = puzzle.placed.splice(i, 1);
  puzzle.bank[removed.bankIndex].used = false;
  renderWordBank();
  renderPlaceholder();
  checkPuzzle();
}

function movePlacedWord(targetIndex) {
  if (puzzle.dragFrom === null) return;
  const from = puzzle.dragFrom;
  const [moved] = puzzle.placed.splice(from, 1);
  let to = targetIndex;
  if (from < targetIndex) to = targetIndex - 1;
  puzzle.placed.splice(to, 0, moved);
  puzzle.dragFrom = null;
  renderPlaceholder();
  checkPuzzle();
}

function checkPuzzle() {
  if (puzzle.placed.length !== puzzle.words.length) {
    setFeedback('', '');
    $('btn-next-2b').disabled = true;
    return;
  }
  const correct = puzzle.placed.every((w, i) => w.text === puzzle.words[i]);
  if (correct) {
    setFeedback('Верно!', 'success');
    $('btn-next-2b').disabled = false;
    playAudio();
  } else {
    setFeedback('Попробуйте ещё раз', 'error');
    $('btn-next-2b').disabled = true;
  }
}


function nextStep() {
  stopAudio();
  hideError();
  if (state.step === 1) {
    renderStep2();
  } else if (state.step === 2) {
    renderStep2b();
  } else if (state.step === '2b') {
    renderStep3();
  } else if (state.step === 3) {
    advancePhrase();
  }
}

function advancePhrase() {
  if (state.index + 1 < state.phrases.length) {
    state.index += 1;
    updateProgress();
    renderStep1();
  } else {
    for (const s of [1, 2, '2b', 3]) {
      $(`step-${s}`).classList.add('hidden');
    }
    $('step-finish').classList.remove('hidden');
  }
}

function startTraining() {
  stopAudio();
  hideError();
  state.index = 0;
  state.order = shuffle(state.phrases.map((_, i) => i));
  $('progress').classList.remove('hidden');
  $('step-start').classList.add('hidden');
  updateProgress();
  renderStep1();
}

async function init() {
  try {
    const res = await fetch('source/phrases.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.phrases = await res.json();
    if (!Array.isArray(state.phrases) || state.phrases.length === 0) {
      throw new Error('phrases.json пуст или имеет неверный формат');
    }
    state.step = 'start';
    state.order = shuffle(state.phrases.map((_, i) => i));
  } catch (err) {
    $('step-start').classList.add('hidden');
    showError(
      'Не удалось загрузить source/phrases.json. ' +
      'Откройте приложение через локальный сервер, например: python3 -m http.server'
    );
  }
}

$('btn-play-1').addEventListener('click', playAudio);
$('btn-next-1').addEventListener('click', nextStep);
$('btn-next-2').addEventListener('click', nextStep);
$('btn-next-2b').addEventListener('click', nextStep);
$('btn-next-3').addEventListener('click', nextStep);
$('btn-play-3').addEventListener('click', playAudio);
$('btn-start').addEventListener('click', startTraining);
$('btn-restart').addEventListener('click', () => {
  $('step-finish').classList.add('hidden');
  startTraining();
});

init();
