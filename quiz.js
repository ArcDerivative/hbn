// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────

// The single image all questions are about.
// Swap this URL for any image you like.
const IMAGE_URL = "nad.png";

// Shown when all 25 tiles are revealed.
const SECRET_MESSAGE = "Animals are awesome 🐾";

const QUESTIONS = [
  {
    category: "",
    question: "Is this question just a test?",
    choices: ["Yes", "No", "No", "No"],
    answer: "Yes",
  },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const TOTAL_TILES = 25;
let revealedTiles = [];   // indices of currently-revealed tiles
let tilePool = [];        // unrevealed tile indices available to assign
let answered = false;
let questionQueue = [];   // infinite shuffled queue of question indices

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
//  BUILD TILE GRID
// ─────────────────────────────────────────────
// Column/row fractional weights for the 5×5 grid (must sum consistently)
const RATIOS = [1, 2, 3, 2, 1]; // ratio 1:2:3:2:1
const RATIO_TOTAL = RATIOS.reduce((a, b) => a + b, 0); // 9

// Cumulative offsets as percentages of total, for background-position
function ratioOffsets(ratios, total) {
  const offsets = [0];
  let cum = 0;
  for (let i = 0; i < ratios.length - 1; i++) {
    cum += ratios[i];
    offsets.push(cum / total * 100);
  }
  return offsets; // [0, 11.11, 33.33, 66.67, 77.78] roughly
}

function buildGrid() {
  const grid = $("tile-grid");
  grid.innerHTML = "";

  const colOffsets = ratioOffsets(RATIOS, RATIO_TOTAL);
  const rowOffsets = ratioOffsets(RATIOS, RATIO_TOTAL);

  const probe = new Image();
  const setHeights = () => {
    if (!probe.naturalHeight) return;
    const totalH = Math.round(probe.naturalHeight * (grid.offsetWidth / probe.naturalWidth));
    // Each row's pixel height proportional to its ratio
    const rowHeights = RATIOS.map(r => Math.round(totalH * r / RATIO_TOTAL));
    grid.querySelectorAll(".tile").forEach(t => {
      const row = parseInt(t.dataset.row);
      t.style.height = rowHeights[row] + "px";
    });
  };
  probe.onload = setHeights;
  probe.src = IMAGE_URL;

  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `tile-${i}`;
    tile.dataset.row = row;

    // background-size covers the full image across all tiles;
    // background-position places this tile's slice correctly.
    // We use the cumulative offset of each col/row.
    tile.style.backgroundImage = `url('${IMAGE_URL}')`;
    tile.style.backgroundSize = "100% 100%";
    tile.style.backgroundPosition = `${colOffsets[col]}% ${rowOffsets[row]}%`;

    grid.appendChild(tile);
  }

  window.addEventListener("resize", setHeights, { passive: true });
}

// ─────────────────────────────────────────────
//  TILE OPERATIONS
// ─────────────────────────────────────────────
function revealTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.add("revealed");
  revealedTiles.push(index);
  updateScore();
}

function reblurTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.remove("revealed");
  revealedTiles = revealedTiles.filter(t => t !== index);
  tilePool.push(index);
  updateScore();
}

function updateScore() {
  $("score").textContent = `${revealedTiles.length} / ${TOTAL_TILES}`;
}

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
function nextQuestion() {
  // Refill queue when empty (infinite shuffle loop)
  if (questionQueue.length === 0) {
    questionQueue = shuffle([...Array(QUESTIONS.length).keys()]);
  }
  return questionQueue.shift();
}

function startQuiz() {
  revealedTiles = [];
  tilePool = shuffle([...Array(TOTAL_TILES).keys()]);
  questionQueue = [];

  $("secret-overlay").style.display = "none";
  $("end-screen").style.display = "none";
  $("layout").style.display = "grid";
  $("progress-bar").style.width = "0%";
  $("score").textContent = `0 / ${TOTAL_TILES}`;
  $("image-hint").textContent = "Reveal all 9 tiles to unlock the secret";

  buildGrid();
  loadQuestion();
}

// ─────────────────────────────────────────────
//  LOAD QUESTION
// ─────────────────────────────────────────────
function loadQuestion() {
  answered = false;
  const qi = nextQuestion();
  const q = QUESTIONS[qi];
  const tilesLeft = TOTAL_TILES - revealedTiles.length;

  $("q-counter").textContent = `${tilesLeft} tile${tilesLeft !== 1 ? "s" : ""} to go`;
  $("q-category").textContent = q.category;
  $("question-text").textContent = q.question;
  $("progress-bar").style.width = `${(revealedTiles.length / TOTAL_TILES) * 100}%`;

  // Choices
  const choicesEl = $("choices");
  choicesEl.innerHTML = "";
  const keys = ["A", "B", "C", "D"];
  const shuffled = shuffle(q.choices);

  shuffled.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="key">${keys[i]}</span>${choice}`;
    btn.addEventListener("click", () => handleAnswer(choice, q.answer, btn));
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

    // Reveal a random unrevealed tile
    const tileIndex = tilePool.pop(); // tilePool is pre-shuffled
    revealTile(tileIndex);

    $("feedback").textContent = `✓ Correct! Tile ${revealedTiles.length} of 9 revealed.`;
    $("feedback").className = "feedback correct";

    allBtns.forEach(b => {
      if (b.textContent.includes(correct)) b.classList.add("correct");
    });
  } else {
    btn.classList.add("wrong");
    allBtns.forEach(b => {
      if (b.textContent.includes(correct)) b.classList.add("correct");
    });

    // Re-blur a random already-revealed tile (if any)
    if (revealedTiles.length > 0) {
      const victim = pickRandom(revealedTiles);
      reblurTile(victim);
      $("feedback").textContent = `✗ Wrong — answer was "${correct}". A tile was re-blurred!`;
    } else {
      $("feedback").textContent = `✗ Wrong — answer was "${correct}". No tiles to re-blur.`;
    }
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
  $("progress-bar").style.width = "100%";
  $("secret-msg").textContent = SECRET_MESSAGE;
  $("secret-overlay").style.display = "flex";
}

// ─────────────────────────────────────────────
//  GO
// ─────────────────────────────────────────────
startQuiz();