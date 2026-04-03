const PLAYER_KEY = "quiz-player-name"

export const defaultQuestion = {
  question: "Nova pregunta",
  answers: ["A", "B", "C", "D"],
  correctAnswer: 0,
  timeLimit: 20,
  settings: {
    background: "#111111",

    questionSize: 48,
    answerSize: 28,

    questionFont: "Arial, sans-serif",
    answerFont: "Arial, sans-serif",

    questionAlign: "center",
    answerAlign: "center",

    columns: 2,
    layout: "grid",

    gap: 20,
    questionAnswerSpacing: 32,

    answerHeight: 110,
    answerRadius: 16,
    answerPadding: 20,

    maxWidth: 1600,

    answersWidth: 1400,
    answersOffsetX: 0,
    answersOffsetY: 0,

    questionOffsetX: 0,
    questionOffsetY: 0,

    showAnswerLetters: true,

    animationQuestion: "fade",
    animationAnswers: "pop",
    animationReveal: "pulse",
  },
}

export const defaultQuiz = {
  currentQuestionIndex: 0,
  phase: "lobby", // lobby | question | answers | revealed | ranking
  startTime: null,
  questions: [{ ...defaultQuestion }],
  rankingSettings: {
    showTop: 10,
    background: "#111111",
    textColor: "#ffffff",
    accentColor: "#ffd700",
    itemBackground: "#1f1f1f",
    fontSize: 28,
    gap: 14,

    topOffsetY: 0,
    blockWidth: 1100,

    showLiveRanking: true,
    liveTop: 10,
    liveWidth: 420,
    liveFontSize: 20,
    liveGap: 10,
    liveOffsetX: 0,
    liveOffsetY: 0,
    livePosition: "right", // left | right
    liveBackground: "#111111cc",
    liveItemBackground: "#1f1f1f",
  },
  scoreSettings: {
    correctBase: 500,
    fastestBonus: 200,
    slowestBonus: 20,
  },
}

export const FONT_OPTIONS = [
  "Arial, sans-serif",
  "Verdana, sans-serif",
  "'Trebuchet MS', sans-serif",
  "'Georgia', serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "'Impact', sans-serif",
]

export function getPlayerName() {
  return localStorage.getItem(PLAYER_KEY) || ""
}

export function savePlayerName(name) {
  localStorage.setItem(PLAYER_KEY, name)
}

export function getTimeLeft(quiz) {
  if (quiz.phase !== "answers" || !quiz.startTime) return null

  const current = quiz.questions[quiz.currentQuestionIndex]
  const elapsed = Math.floor((Date.now() - quiz.startTime) / 1000)
  const left = current.timeLimit - elapsed

  return left > 0 ? left : 0
}