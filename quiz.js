// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────

// The single image all questions are about.
// Swap this URL for any image you like.
const IMAGE_URL = "nad.png";

// Shown when all 9 tiles are revealed.
const SECRET_MESSAGE = "Animals are awesome 🐾";

// All 9 questions. Exactly 9 — one per tile.
// You can reorder them; they are asked in order.
const QUESTIONS = [
  {
    category: "Animals",
    question: "What do cows drink?",
    choices: ["Milk", "Water", "Juice", "Tea"],
    answer: "Water",
  },
  {
    category: "Animals",
    question: "How many legs does a spider have?",
    choices: ["6", "8", "10", "4"],
    answer: "8",
  },
  {
    category: "Animals",
    question: "What is the fastest land animal?",
    choices: ["Lion", "Horse", "Cheetah", "Greyhound"],
    answer: "Cheetah",
  },
  {
    category: "Animals",
    question: "Which animal is known as man's best friend?",
    choices: ["Cat", "Rabbit", "Dog", "Horse"],
    answer: "Dog",
  },
  {
    category: "Animals",
    question: "What sound does a duck make?",
    choices: ["Moo", "Quack", "Oink", "Baa"],
    answer: "Quack",
  },
  {
    category: "Animals",
    question: "Which animal has a very long neck?",
    choices: ["Elephant", "Hippo", "Giraffe", "Zebra"],
    answer: "Giraffe",
  },
  {
    category: "Animals",
    question: "Where do penguins live in the wild?",
    choices: ["The Arctic", "The Sahara", "The Amazon", "Antarctica"],
    answer: "Antarctica",
  },
  {
    category: "Animals",
    question: "What is a baby cat called?",
    choices: ["Pup", "Cub", "Kitten", "Foal"],
    answer: "Kitten",
  },
  {
    category: "Animals",
    question: "Which animal is the largest on Earth?",
    choices: ["Elephant", "Blue Whale", "Giraffe", "Great White Shark"],
    answer: "Blue Whale",
  },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const TOTAL_TILES = 9;
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
function buildGrid() {
  const grid = $("tile-grid");
  grid.innerHTML = "";

  // Pre-load image to get natural dimensions, then set tile heights
  const probe = new Image();
  probe.onload = () => {
    const tileH = Math.round((probe.naturalHeight / 3) * (grid.offsetWidth / probe.naturalWidth));
    grid.querySelectorAll(".tile").forEach(t => t.style.height = tileH + "px");
  };
  probe.src = IMAGE_URL;

  // 3×3 grid: each tile shows a different 1/9 slice of the image
  for (let i = 0; i < TOTAL_TILES; i++) {
    const row = Math.floor(i / 3); // 0,1,2
    const col = i % 3;             // 0,1,2

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.id = `tile-${i}`;

    tile.style.backgroundImage = `url('${IMAGE_URL}')`;
    tile.style.backgroundSize = "300% 300%";
    tile.style.backgroundPosition = `${col * 50}% ${row * 50}%`;

    grid.appendChild(tile);
  }

  // Also recompute on resize
  window.addEventListener("resize", () => {
    const tileH = Math.round((probe.naturalHeight / 3) * (grid.offsetWidth / probe.naturalWidth));
    grid.querySelectorAll(".tile").forEach(t => t.style.height = tileH + "px");
  }, { passive: true });
}

// ─────────────────────────────────────────────
//  TILE OPERATIONS
// ─────────────────────────────────────────────
function revealTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.remove("flash-wrong");
  tile.classList.add("revealed");
  setTimeout(() => tile.classList.add("flash-correct"), 50);
  setTimeout(() => tile.classList.remove("flash-correct"), 650);
  revealedTiles.push(index);
  updateScore();
}

function reblurTile(index) {
  const tile = $(`tile-${index}`);
  tile.classList.add("flash-wrong");
  setTimeout(() => {
    tile.classList.remove("revealed", "flash-wrong");
    revealedTiles = revealedTiles.filter(t => t !== index);
    tilePool.push(index);
    updateScore();
  }, 400);
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