// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────

// The single image all questions are about.
// Swap this URL for any image you like.
const IMAGE_URL = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80";

// Shown when all 9 tiles are revealed.
const SECRET_MESSAGE = "The Eiffel Tower was built in 1889";

// All 9 questions. Exactly 9 — one per tile.
// You can reorder them; they are asked in order.
const QUESTIONS = [
  {
    category: "History",
    question: "In what year was the Eiffel Tower completed?",
    choices: ["1889", "1901", "1876", "1912"],
    answer: "1889",
  },
  {
    category: "Geography",
    question: "The Eiffel Tower is located in which city?",
    choices: ["Lyon", "Marseille", "Paris", "Bordeaux"],
    answer: "Paris",
  },
  {
    category: "Engineering",
    question: "What material is the Eiffel Tower primarily made of?",
    choices: ["Steel", "Concrete", "Iron", "Aluminium"],
    answer: "Iron",
  },
  {
    category: "Facts",
    question: "How tall is the Eiffel Tower (to the top)?",
    choices: ["210 m", "300 m", "330 m", "276 m"],
    answer: "330 m",
  },
  {
    category: "History",
    question: "Who designed the Eiffel Tower?",
    choices: ["Auguste Perret", "Gustave Eiffel", "Le Corbusier", "Hector Guimard"],
    answer: "Gustave Eiffel",
  },
  {
    category: "Facts",
    question: "How many times is the Eiffel Tower repainted?",
    choices: ["Every 2 years", "Every 5 years", "Every 7 years", "Every 10 years"],
    answer: "Every 7 years",
  },
  {
    category: "History",
    question: "For what event was the Eiffel Tower originally built?",
    choices: ["The 1900 Paris Expo", "The 1889 World's Fair", "Napoleon's coronation", "The French Revolution"],
    answer: "The 1889 World's Fair",
  },
  {
    category: "Facts",
    question: "How many steps are there to the top of the Eiffel Tower?",
    choices: ["1,165", "704", "1,665", "1,000"],
    answer: "1,665",
  },
  {
    category: "Geography",
    question: "On which river does the Eiffel Tower sit?",
    choices: ["Loire", "Rhône", "Seine", "Garonne"],
    answer: "Seine",
  },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const TOTAL_TILES = 9;
let current = 0;
let revealedTiles = [];   // indices of currently-revealed tiles
let tilePool = [];        // unrevealedtile indices available to assign
let answered = false;

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
function buildGrid() {
  const grid = $("tile-grid");
  grid.innerHTML = "";

  // 3×3 grid: each tile shows a different 1/9 slice of the image
  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / 3); // 0,1,2
    const col = i % 3;             // 0,1,2

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `tile-${i}`;

    // Position the background so this tile shows its slice.
    // background-size: 300% 300% means the full image spans 3 tiles wide & tall.
    // background-position shifts by col/row thirds.
    tile.style.backgroundImage = `url('${IMAGE_URL}')`;
    tile.style.backgroundSize = "300% 300%";
    tile.style.backgroundPosition = `${col * 50}% ${row * 50}%`;

    grid.appendChild(tile);
  }
}

// ─────────────────────────────────────────────
//  TILE OPERATIONS
// ─────────────────────────────────────────────
function revealTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.remove("flash-wrong");
  void tile.offsetWidth; // reflow to restart animation
  tile.classList.add("revealed", "flash-correct");
  revealedTiles.push(index);
  updateScore();
}

function reblurTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.remove("revealed", "flash-correct");
  void tile.offsetWidth;
  tile.classList.add("flash-wrong");
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
function startQuiz() {
  current = 0;
  revealedTiles = [];
  tilePool = shuffle([...Array(TOTAL_TILES).keys()]); // [0..8] shuffled

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
  const q = QUESTIONS[current];

  $("q-counter").textContent = `Question ${current + 1} / ${TOTAL_TILES}`;
  $("q-category").textContent = q.category;
  $("question-text").textContent = q.question;
  $("progress-bar").style.width = `${(current / TOTAL_TILES) * 100}%`;

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
  current++;

  // Win condition: all 9 tiles revealed
  if (revealedTiles.length === TOTAL_TILES) {
    showSecret();
    return;
  }

  // Out of questions
  if (current >= TOTAL_TILES) {
    showEndScreen();
    return;
  }

  loadQuestion();
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
//  END SCREEN
// ─────────────────────────────────────────────
function showEndScreen() {
  $("layout").style.display = "none";
  $("progress-bar").style.width = "100%";
  $("end-score").textContent = `${revealedTiles.length} / ${TOTAL_TILES} tiles`;

  const remaining = TOTAL_TILES - revealedTiles.length;
  $("end-msg").textContent = remaining === 0
    ? "You cleared every tile but ran out of questions — something went wrong!"
    : `You needed ${remaining} more tile${remaining > 1 ? "s" : ""} to unlock the secret. So close!`;

  $("end-screen").style.display = "block";
}

// ─────────────────────────────────────────────
//  GO
// ─────────────────────────────────────────────
startQuiz();