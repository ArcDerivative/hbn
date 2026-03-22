// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const IMAGE_URL = "nad.png";
const SECRET_MESSAGE = "Animals are awesome 🐾";

let QUESTIONS = []; // loaded from questions.json

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const TOTAL_TILES = 25;
let revealedTiles = [];       // all currently-revealed tile indices
let stageIndex = 0;           // which stage we're drawing from
let tilePool = [];            // remaining tiles in current stage (shuffled)
let answered = false;
let correctlyAnswered = new Set(); // indices answered correctly — never shown again
let questionPool = [];             // current shuffle of remaining questions
let currentQuestionIndex = 0;
let lastAnswerCorrect = null; // null = start of game, true/false thereafter
let lastFeedbackMsg = null;
let lastCounterMsg = null;

const MSGS_CORRECT = [
  "Ex-cellent. :)",
  "This is solid work. A few small things…",
  "Exciting times!",
];
const MSGS_WRONG = [
  "D’ah!",
  "*blink, blink*",
  "🚨 糟糕了…",
];
const MSGS_COUNTER_GOOD = [
  "Can you remind me…",
  "Keep the good times rolling!",
  "I’d give it fair odds you’ll make it.",
];
const MSGS_COUNTER_BAD = [
  "I think things are o-kay. :)",
  "I’m getting a little motion sick.",
  "Can we take… a few steps back?",
];

function pickExcluding(arr, exclude) {
  const pool = arr.length > 1 ? arr.filter(m => m !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}
function pickFeedback(arr) {
  const msg = pickExcluding(arr, lastFeedbackMsg);
  lastFeedbackMsg = msg;
  return msg;
}
function pickCounter(arr) {
  const msg = pickExcluding(arr, lastCounterMsg);
  lastCounterMsg = msg;
  return msg;
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────
//  TILE STAGES
//  Outer ring first, then inner U, then centre, then above-centre.
// ─────────────────────────────────────────────
const TILE_STAGES = [
  shuffle([0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]), // outer ring (16)
  shuffle([6,8,11,13,16,17,18]),                         // inner U    (7)
  [12],                                                   // centre     (1)
  [7],                                                    // above-ctr  (1)
];

// ─────────────────────────────────────────────
//  BUILD TILE GRID
// ─────────────────────────────────────────────
// Column/row fractional weights for the 5×5 grid (must sum consistently)
const COL_RATIOS = [1, 2, 3, 2, 1];
const ROW_RATIOS = [1, 4, 3, 2, 1];
const COL_TOTAL = COL_RATIOS.reduce((a, b) => a + b, 0); // 9
const ROW_TOTAL = ROW_RATIOS.reduce((a, b) => a + b, 0); // 11

// Convert ratio array to cumulative percentage positions and sizes
// e.g. [1,2,3,2,1] total=9 → positions: [0, 11.11, 33.33, 66.67, 77.78]
//                           → sizes:     [11.11, 22.22, 33.33, 22.22, 11.11]
function ratioLayout(ratios, total) {
  const sizes = ratios.map(r => r / total * 100);
  const positions = [];
  let cum = 0;
  for (const s of sizes) {
    positions.push(cum);
    cum += s;
  }
  return { positions, sizes };
}

const GAP_PX = 0;

function buildGrid() {
  const grid = $("tile-grid");
  grid.innerHTML = "";

  // Layer 1: sharp image (bottom)
  const img = document.createElement("img");
  img.className = "grid-img";
  img.src = IMAGE_URL;
  img.alt = "";
  grid.appendChild(img);

  // Layer 2: blurred canvas (middle) — drawn via JS so blur is uniform to all edges
  const canvas = document.createElement("canvas");
  canvas.className = "grid-img-blur";
  grid.appendChild(canvas);

  // Set grid height and draw blurred canvas once image loads
  const setGridHeight = () => {
    if (!img.naturalWidth) return;
    const w = grid.offsetWidth;
    const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
    grid.style.height = h + "px";

    // Draw image into canvas at display size, then blur via box blur
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    try {
      ctx.drawImage(img, 0, 0, w, h);
      stackBlurCanvas(canvas, 0, 0, w, h, 32);
    } catch (e) {
      // Tainted canvas fallback: use CSS filter on the canvas element
      ctx.drawImage(img, 0, 0, w, h);
      canvas.style.filter = "blur(40px)";
      canvas.style.transform = "scale(1.12)";
    }

    setTileBackgrounds(w, h);
  };
  img.onload = setGridHeight;
  window.addEventListener("resize", setGridHeight, { passive: true });

  const { positions: colPos, sizes: colSizes } = ratioLayout(COL_RATIOS, COL_TOTAL);
  const { positions: rowPos, sizes: rowSizes } = ratioLayout(ROW_RATIOS, ROW_TOTAL);

  // Layer 3: sharp-image tiles (top) — each shows its exact slice of the sharp image
  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `tile-${i}`;
    tile.dataset.col = col;
    tile.dataset.row = row;

    tile.style.left   = `${colPos[col]}%`;
    tile.style.top    = `${rowPos[row]}%`;
    tile.style.width  = `${colSizes[col]}%`;
    tile.style.height = `${rowSizes[row]}%`;

    grid.appendChild(tile);
  }

  function setTileBackgrounds(gridW, gridH) {
    grid.querySelectorAll(".tile").forEach(tile => {
      const col = parseInt(tile.dataset.col);
      const row = parseInt(tile.dataset.row);
      // background-size = full grid dimensions (so image lines up perfectly)
      // background-position = negative offset of this tile's top-left corner
      const left = colPos[col] / 100 * gridW;
      const top  = rowPos[row] / 100 * gridH;
      tile.style.backgroundImage    = `url('${IMAGE_URL}')`;
      tile.style.backgroundSize     = `${gridW}px ${gridH}px`;
      tile.style.backgroundPosition = `-${left}px -${top}px`;
    });
  }
}

// ─────────────────────────────────────────────
//  TILE OPERATIONS
// ─────────────────────────────────────────────
function revealTile(index) {
  $(`tile-${index}`).classList.add("revealed");
  revealedTiles.push(index);
  // If current stage pool is now empty, load next stage
  if (tilePool.length === 0 && stageIndex < TILE_STAGES.length - 1) {
    stageIndex++;
    tilePool = shuffle([...TILE_STAGES[stageIndex]]);
  }
  updateScore();
}

function reblurTile(index) {
  $(`tile-${index}`).classList.remove("revealed");
  revealedTiles = revealedTiles.filter(t => t !== index);
  tilePool.push(index);
  updateScore();
  // Re-open one random correctly-answered question so the pool can't deadlock
  if (correctlyAnswered.size > 0) {
    const solved = [...correctlyAnswered];
    const reopen = solved[Math.floor(Math.random() * solved.length)];
    correctlyAnswered.delete(reopen);
  }
}

// Only re-blur tiles from the current stage (don't claw back earlier stages)
function pickReblurVictim() {
  const currentStage = TILE_STAGES[stageIndex];
  const eligible = revealedTiles.filter(t => currentStage.includes(t));
  return eligible.length > 0 ? pickRandom(eligible) : null;
}

function updateScore() {
}

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────

// Returns the index of the next question to ask.
// Priority: questions not yet answered correctly, in shuffled order.
// When a wrong answer is given, that question stays/re-enters the pending pool.
// The last question shown will always be one that hasn't been cracked yet.
function nextQuestion() {
  // Drop any items that have since been correctly answered
  questionPool = questionPool.filter(i => !correctlyAnswered.has(i));

  if (questionPool.length === 0) {
    const remaining = [...Array(QUESTIONS.length).keys()]
      .filter(i => !correctlyAnswered.has(i));
    if (remaining.length === 0) return null; // all correctly answered
    questionPool = shuffle(remaining);
  }

  return questionPool.shift();
}

function startQuiz() {
  revealedTiles = [];
  stageIndex = 0;
  tilePool = shuffle([...TILE_STAGES[0]]);
  correctlyAnswered = new Set();
  questionPool = [];
  lastAnswerCorrect = null;
  lastFeedbackMsg = null;
  lastCounterMsg = null;

  $("secret-overlay").style.display = "none";
  $("end-screen").style.display = "none";
  $("layout").style.display = "grid";

  buildGrid();
  loadQuestion();
}

// ─────────────────────────────────────────────
//  LOAD QUESTION
// ─────────────────────────────────────────────
function loadQuestion() {
  answered = false;
  currentQuestionIndex = nextQuestion();
  if (currentQuestionIndex === null) return; // all questions correctly answered
  const q = QUESTIONS[currentQuestionIndex];

  $("q-counter").textContent = (lastAnswerCorrect === false) ? pickCounter(MSGS_COUNTER_BAD) : pickCounter(MSGS_COUNTER_GOOD);
  $("q-category").textContent = q.category || "";
  $("question-text").textContent = q.question;

  // Choices
  const choicesEl = $("choices");
  choicesEl.innerHTML = "";
  const keys = ["A", "B", "C", "D"];
  const answer = q.choices[0];
  const shuffled = shuffle(q.choices);

  shuffled.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="key">${keys[i]}</span>${choice}`;
    btn.addEventListener("click", () => handleAnswer(choice, answer, btn));
    choicesEl.appendChild(btn);
  });

  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("btn-next").style.display = "none";

  // Re-animate question panel
  const card = $("quiz-card");
  card.style.animation = "none";
  requestAnimationFrame(() => { card.style.animation = "fadeUp 0.35s ease forwards"; });
}

// ─────────────────────────────────────────────
//  HANDLE ANSWER
// ─────────────────────────────────────────────
function handleAnswer(selected, correct, btn) {
  if (answered) return;
  answered = true;

  const allBtns = $("choices").querySelectorAll(".choice-btn");
  allBtns.forEach(b => b.disabled = true);

  if (selected === correct) {
    btn.classList.add("correct");
    correctlyAnswered.add(currentQuestionIndex);
    lastAnswerCorrect = true;

    const tileIndex = tilePool.pop();
    revealTile(tileIndex);

    $("feedback").textContent = pickFeedback(MSGS_CORRECT);
    $("feedback").className = "feedback correct";

    allBtns.forEach(b => {
      if (b.textContent.includes(correct)) b.classList.add("correct");
    });
  } else {
    btn.classList.add("wrong");

    lastAnswerCorrect = false;
    // Wrong question back into pool immediately
    if (!questionPool.includes(currentQuestionIndex)) {
      questionPool.push(currentQuestionIndex);
    }
    const victim = pickReblurVictim();
    if (victim !== null) reblurTile(victim);
    $("feedback").textContent = pickFeedback(MSGS_WRONG);
    $("feedback").className = "feedback wrong";
  }

  $("btn-next").style.display = "block";
}

// ─────────────────────────────────────────────
//  NEXT
// ─────────────────────────────────────────────
$("btn-next").addEventListener("click", () => {
  if (revealedTiles.length === TOTAL_TILES) {
    showSecret();
  } else {
    loadQuestion();
  }
});

// ─────────────────────────────────────────────
//  SECRET SCREEN
// ─────────────────────────────────────────────
function showSecret() {
  $("layout").style.display = "none";
  $("secret-msg").textContent = SECRET_MESSAGE;
  $("secret-overlay").style.display = "flex";

  // Download nad.png at full size as nreaking-nad.png
  const a = document.createElement("a");
  a.href = IMAGE_URL;
  a.download = "nreaking-nad.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────
//  BOOT — fetch questions then start
// ─────────────────────────────────────────────
fetch("questions.json")
  .then(r => r.json())
  .then(data => { QUESTIONS = data; startQuiz(); })
  .catch(err => { console.error("Failed to load questions:", err); });