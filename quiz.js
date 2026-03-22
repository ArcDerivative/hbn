// ─────────────────────────────────────────────
//  QUESTION BANK
//  Images from Unsplash (free, no key needed).
//  Add as many questions as you like!
// ─────────────────────────────────────────────
const ALL_QUESTIONS = [
  {
    category: "Landmarks",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
    question: "Which iconic city is this tower located in?",
    choices: ["Rome", "Paris", "Berlin", "Barcelona"],
    answer: "Paris",
  },
  {
    category: "Animals",
    image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&q=80",
    question: "What species is this big cat?",
    choices: ["Leopard", "Jaguar", "Cheetah", "Snow Leopard"],
    answer: "Cheetah",
  },
  {
    category: "Nature",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    question: "What type of landscape is shown?",
    choices: ["Volcano", "Sand dunes", "Mountain range", "Glacier"],
    answer: "Mountain range",
  },
  {
    category: "Landmarks",
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
    question: "In which country is the Taj Mahal?",
    choices: ["Pakistan", "Bangladesh", "India", "Nepal"],
    answer: "India",
  },
  {
    category: "Animals",
    image: "https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=800&q=80",
    question: "What animal is this?",
    choices: ["Seal", "Sea lion", "Walrus", "Otter"],
    answer: "Sea lion",
  },
  {
    category: "Nature",
    image: "https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80",
    question: "What natural phenomenon is shown?",
    choices: ["Bioluminescence", "Aurora Borealis", "Solar flare", "Lightning storm"],
    answer: "Aurora Borealis",
  },
  {
    category: "Food",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80",
    question: "What cuisine is this dish from?",
    choices: ["Korean", "Thai", "Japanese", "Chinese"],
    answer: "Japanese",
  },
  {
    category: "Landmarks",
    image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80",
    question: "Which continent is home to these pyramids?",
    choices: ["Asia", "South America", "Africa", "Australia"],
    answer: "Africa",
  },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const QUESTIONS_PER_ROUND = 5;
let questions = [];
let current = 0;
let score = 0;
let answered = false;

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function $(id) { return document.getElementById(id); }

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
function startQuiz() {
  questions = shuffle(ALL_QUESTIONS).slice(0, QUESTIONS_PER_ROUND);
  current = 0;
  score = 0;
  $("score").textContent = "0";
  $("end-screen").style.display = "none";
  $("quiz-card").style.display = "grid";
  $("btn-next").style.display = "none";

  // ensure progress bar exists
  let bar = document.querySelector(".progress-bar-wrap");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "progress-bar-wrap";
    bar.innerHTML = '<div class="progress-bar" id="progress-bar"></div>';
    document.querySelector("main").insertBefore(bar, $("quiz-card"));
  }

  loadQuestion();
}

// ─────────────────────────────────────────────
//  LOAD QUESTION
// ─────────────────────────────────────────────
function loadQuestion() {
  answered = false;
  const q = questions[current];

  // meta
  $("q-counter").textContent = `Question ${current + 1} / ${QUESTIONS_PER_ROUND}`;
  $("q-category").textContent = q.category;
  $("question-text").textContent = q.question;

  // progress
  const pct = (current / QUESTIONS_PER_ROUND) * 100;
  const pb = $("progress-bar");
  if (pb) pb.style.width = pct + "%";

  // image — reset blur
  const img = $("quiz-image");
  img.className = "";
  img.src = q.image;

  $("blur-overlay").className = "blur-overlay";
  $("blur-label").className = "blur-label";
  $("reveal-badge").className = "reveal-badge";

  // choices
  const choicesEl = $("choices");
  choicesEl.innerHTML = "";
  const keys = ["A", "B", "C", "D"];
  const shuffled = shuffle(q.choices);

  shuffled.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="choice-key">${keys[i]}</span>${choice}`;
    btn.addEventListener("click", () => handleAnswer(choice, q.answer, btn));
    choicesEl.appendChild(btn);
  });

  // feedback
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("btn-next").style.display = "none";

  // animate card in
  $("quiz-card").style.animation = "none";
  requestAnimationFrame(() => {
    $("quiz-card").style.animation = "fadeUp 0.35s ease forwards";
  });
}

// ─────────────────────────────────────────────
//  HANDLE ANSWER
// ─────────────────────────────────────────────
function handleAnswer(choice, correct, btn) {
  if (answered) return;
  answered = true;

  const allBtns = $("choices").querySelectorAll(".choice-btn");
  allBtns.forEach(b => b.disabled = true);

  if (choice === correct) {
    btn.classList.add("correct");
    score++;
    $("score").textContent = score;

    // reveal image
    $("quiz-image").classList.add("revealed");
    $("blur-overlay").classList.add("hidden");
    $("blur-label").classList.add("hidden");
    $("reveal-badge").classList.add("show");

    $("feedback").textContent = "✓ Correct! The image is revealed.";
    $("feedback").className = "feedback correct";

    // highlight correct on all buttons too
    allBtns.forEach(b => {
      if (b.textContent.includes(correct)) b.classList.add("correct");
    });
  } else {
    btn.classList.add("wrong");

    // show correct answer
    allBtns.forEach(b => {
      if (b.textContent.includes(correct)) b.classList.add("correct");
    });

    $("feedback").textContent = `✗ Wrong. The answer was "${correct}". Unlucky!`;
    $("feedback").className = "feedback wrong";
  }

  $("btn-next").style.display = "block";
}

// ─────────────────────────────────────────────
//  NEXT BUTTON
// ─────────────────────────────────────────────
$("btn-next").addEventListener("click", () => {
  current++;
  if (current < QUESTIONS_PER_ROUND) {
    loadQuestion();
  } else {
    showEndScreen();
  }
});

// ─────────────────────────────────────────────
//  END SCREEN
// ─────────────────────────────────────────────
function showEndScreen() {
  $("quiz-card").style.display = "none";
  $("btn-next").style.display = "none";

  const pct = Math.round((score / QUESTIONS_PER_ROUND) * 100);
  const pb = $("progress-bar");
  if (pb) pb.style.width = "100%";

  $("end-score").textContent = `${score} / ${QUESTIONS_PER_ROUND}`;

  const msgs = {
    100: "Perfect score! You unblurred every image. 🎉",
    80: "Really strong round — nearly flawless!",
    60: "Solid effort. A few tricky ones caught you out.",
    40: "Room to improve — give it another go!",
    0: "Rough round. The images stayed blurry! Try again.",
  };
  const threshold = [100, 80, 60, 40, 0].find(t => pct >= t);
  $("end-msg").textContent = msgs[threshold];

  $("end-screen").style.display = "block";
}

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
startQuiz();
