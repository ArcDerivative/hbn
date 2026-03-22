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

const GAP_PX = 3; // matches CSS gap visually via inset

function buildGrid() {
  const grid = $("tile-grid");
  grid.innerHTML = "";

  // Single image fills the container
  const img = document.createElement("img");
  img.className = "grid-img";
  img.src = IMAGE_URL;
  img.alt = "";
  grid.appendChild(img);

  // Set grid height to match image natural aspect ratio
  const setGridHeight = () => {
    if (!img.naturalWidth) return;
    const h = Math.round(img.naturalHeight * (grid.offsetWidth / img.naturalWidth));
    grid.style.height = h + "px";
  };
  img.onload = setGridHeight;
  window.addEventListener("resize", setGridHeight, { passive: true });

  // Build 25 absolutely-positioned blur overlay tiles
  const { positions: colPos, sizes: colSizes } = ratioLayout(RATIOS, RATIO_TOTAL);
  const { positions: rowPos, sizes: rowSizes } = ratioLayout(RATIOS, RATIO_TOTAL);

  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `tile-${i}`;

    // Position using percentages; inset by half a gap on each edge
    // so tiles sit flush with gaps between them
    const halfGap = GAP_PX / 2;
    tile.style.left   = `calc(${colPos[col]}% + ${col === 0 ? 0 : halfGap}px)`;
    tile.style.top    = `calc(${rowPos[row]}% + ${row === 0 ? 0 : halfGap}px)`;
    tile.style.width  = `calc(${colSizes[col]}% - ${col === 0 || col === 4 ? halfGap : GAP_PX}px)`;
    tile.style.height = `calc(${rowSizes[row]}% - ${row === 0 || row === 4 ? halfGap : GAP_PX}px)`;

    grid.appendChild(tile);
  }
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
  $("image-hint").textContent = "Reveal all 25 tiles to unlock the secret";

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