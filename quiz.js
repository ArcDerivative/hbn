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
let revealedTiles = [];   // all currently-revealed tile indices
let stageIndex = 0;       // which stage we're drawing from
let tilePool = [];        // remaining tiles in current stage (shuffled)
let answered = false;
let questionQueue = [];

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

  // Layer 2: blurred image (middle) — same src, blurred via CSS filter
  const imgBlur = document.createElement("img");
  imgBlur.className = "grid-img-blur";
  imgBlur.src = IMAGE_URL;
  imgBlur.alt = "";
  grid.appendChild(imgBlur);

  // Set grid height to match image natural aspect ratio
  const setGridHeight = () => {
    if (!img.naturalWidth) return;
    const h = Math.round(img.naturalHeight * (grid.offsetWidth / img.naturalWidth));
    grid.style.height = h + "px";
    // Re-set tile background-sizes now we know the rendered dimensions
    setTileBackgrounds(grid.offsetWidth, h);
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
}

// Only re-blur tiles from the current stage (don't claw back earlier stages)
function pickReblurVictim() {
  const currentStage = TILE_STAGES[stageIndex];
  const eligible = revealedTiles.filter(t => currentStage.includes(t));
  return eligible.length > 0 ? pickRandom(eligible) : null;
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
  stageIndex = 0;
  tilePool = shuffle([...TILE_STAGES[0]]);
  questionQueue = [];

  $("secret-overlay").style.display = "none";
  $("end-screen").style.display = "none";
  $("layout").style.display = "grid";
  $("score").textContent = `0 / ${TOTAL_TILES}`;

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

  $("q-counter").textContent = "TODO";
  $("q-category").textContent = q.category;
  $("question-text").textContent = q.question;

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

    $("feedback").textContent = "Yes";
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
      $("feedback").textContent = "No";
    } else {
      $("feedback").textContent = "No";
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
  $("secret-msg").textContent = SECRET_MESSAGE;
  $("secret-overlay").style.display = "flex";
}

// ─────────────────────────────────────────────
//  GO
// ─────────────────────────────────────────────
startQuiz();