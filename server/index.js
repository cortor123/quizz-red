const express = require("express")
const http = require("http")
const cors = require("cors")
const { Server } = require("socket.io")

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234"
const DISPLAY_PASSWORD = process.env.DISPLAY_PASSWORD || "display1234"

const defaultQuestion = {
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

function createDefaultQuiz() {
  return {
    currentQuestionIndex: 0,
    phase: "lobby",
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
      livePosition: "right",
      liveBackground: "#111111cc",
      liveItemBackground: "#1f1f1f",
    },
    scoreSettings: {
      correctBase: 500,
      fastestBonus: 200,
      slowestBonus: 20,
    },
  }
}

const state = {
  quiz: createDefaultQuiz(),
  players: {},
  sessions: {},
}

function getRole(socket) {
  return state.sessions[socket.id]?.role || null
}

function isAdmin(socket) {
  return getRole(socket) === "admin"
}

function buildRanking() {
  return Object.values(state.players)
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalScore: p.totalScore || 0,
      answersByQuestion: p.answersByQuestion || {},
    }))
    .sort((a, b) => {
      if ((b.totalScore || 0) !== (a.totalScore || 0)) {
        return (b.totalScore || 0) - (a.totalScore || 0)
      }
      return a.name.localeCompare(b.name)
    })
    .map((p, index) => ({
      ...p,
      rank: index + 1,
    }))
}

function getPublicState() {
  return {
    quiz: state.quiz,
    players: Object.values(state.players).map((p) => ({
      id: p.id,
      name: p.name,
      answersByQuestion: p.answersByQuestion,
      totalScore: p.totalScore || 0,
    })),
    ranking: buildRanking(),
  }
}

function emitState() {
  io.emit("state:update", getPublicState())
}

function getCurrentQuestion() {
  return state.quiz.questions[state.quiz.currentQuestionIndex]
}

function getTimeLeft() {
  if (state.quiz.phase !== "answers" || !state.quiz.startTime) return null

  const current = getCurrentQuestion()
  const elapsed = Math.floor((Date.now() - state.quiz.startTime) / 1000)
  const left = current.timeLimit - elapsed
  return left > 0 ? left : 0
}

function recalculateScoresForQuestion(questionIndex) {
  const question = state.quiz.questions[questionIndex]
  const correctPlayers = Object.values(state.players)
    .filter((player) => {
      const answer = player.answersByQuestion?.[questionIndex]
      return answer && answer.answerIndex === question.correctAnswer
    })
    .sort((a, b) => {
      const aTime = a.answersByQuestion[questionIndex].answeredAt || Infinity
      const bTime = b.answersByQuestion[questionIndex].answeredAt || Infinity
      return aTime - bTime
    })

  const { correctBase, fastestBonus, slowestBonus } = state.quiz.scoreSettings

  correctPlayers.forEach((player, index) => {
    let bonus = fastestBonus

    if (correctPlayers.length > 1) {
      const ratio = index / (correctPlayers.length - 1)
      bonus = Math.round(
        fastestBonus - ratio * (fastestBonus - slowestBonus)
      )
    }

    const entry = player.answersByQuestion[questionIndex]
    entry.isCorrect = true
    entry.score = correctBase + bonus
  })

  Object.values(state.players).forEach((player) => {
    const entry = player.answersByQuestion?.[questionIndex]
    if (!entry) return

    if (entry.answerIndex !== question.correctAnswer) {
      entry.isCorrect = false
      entry.score = 0
    }
  })

  Object.values(state.players).forEach((player) => {
    const total = Object.values(player.answersByQuestion || {}).reduce(
      (sum, entry) => sum + (entry.score || 0),
      0
    )
    player.totalScore = total
  })
}

function resetAllScores() {
  Object.values(state.players).forEach((player) => {
    player.totalScore = 0
    Object.keys(player.answersByQuestion || {}).forEach((key) => {
      player.answersByQuestion[key].score = 0
      player.answersByQuestion[key].isCorrect = false
    })
  })
}

io.on("connection", (socket) => {
  console.log("Client connectat:", socket.id)

  state.sessions[socket.id] = { role: null }

  socket.emit("state:update", getPublicState())
  socket.emit("auth:status", { role: null })

  socket.on("auth:login", ({ role, password }) => {
    const cleanRole = String(role || "").trim()
    const cleanPassword = String(password || "")

    if (cleanRole === "admin" && cleanPassword === ADMIN_PASSWORD) {
      state.sessions[socket.id] = { role: "admin" }
      socket.emit("auth:success", { role: "admin" })
      socket.emit("auth:status", { role: "admin" })
      return
    }

    if (cleanRole === "display" && cleanPassword === DISPLAY_PASSWORD) {
      state.sessions[socket.id] = { role: "display" }
      socket.emit("auth:success", { role: "display" })
      socket.emit("auth:status", { role: "display" })
      return
    }

    socket.emit("auth:error", {
      message: "Contrasenya incorrecta",
    })
  })

  socket.on("player:join", ({ name }) => {
    const cleanName = String(name || "").trim()
    if (!cleanName) return

    const existing = state.players[socket.id]
    const answersByQuestion = existing?.answersByQuestion || {}
    const totalScore = existing?.totalScore || 0

    state.players[socket.id] = {
      id: socket.id,
      name: cleanName,
      answersByQuestion,
      totalScore,
    }

    socket.emit("player:joined", {
      id: socket.id,
      name: cleanName,
    })

    emitState()
  })

  socket.on("player:answer", ({ answerIndex }) => {
    const player = state.players[socket.id]
    if (!player) return
    if (state.quiz.phase !== "answers") return
    if (getTimeLeft() === 0) return

    const qIndex = state.quiz.currentQuestionIndex
    if (player.answersByQuestion[qIndex]) return

    player.answersByQuestion[qIndex] = {
      answerIndex,
      answeredAt: Date.now(),
      isCorrect: false,
      score: 0,
    }

    emitState()
  })

  socket.on("admin:update-quiz", (newQuiz) => {
    if (!isAdmin(socket)) return
    if (!newQuiz || !Array.isArray(newQuiz.questions)) return

    state.quiz = {
      ...state.quiz,
      ...newQuiz,
    }

    emitState()
  })

  socket.on("admin:show-question", () => {
    if (!isAdmin(socket)) return
    state.quiz.phase = "question"
    state.quiz.startTime = null
    emitState()
  })

  socket.on("admin:show-answers", () => {
    if (!isAdmin(socket)) return
    state.quiz.phase = "answers"
    state.quiz.startTime = Date.now()
    emitState()
  })

  socket.on("admin:reveal", () => {
    if (!isAdmin(socket)) return

    const qIndex = state.quiz.currentQuestionIndex
    recalculateScoresForQuestion(qIndex)

    state.quiz.phase = "revealed"
    emitState()
  })

  socket.on("admin:show-ranking", () => {
    if (!isAdmin(socket)) return
    state.quiz.phase = "ranking"
    emitState()
  })

  socket.on("admin:reset-scores", () => {
    if (!isAdmin(socket)) return
    resetAllScores()
    emitState()
  })

  socket.on("admin:back-to-lobby", () => {
    if (!isAdmin(socket)) return
    state.quiz.phase = "lobby"
    state.quiz.startTime = null
    emitState()
  })

  socket.on("admin:next-question", () => {
    if (!isAdmin(socket)) return

    if (state.quiz.currentQuestionIndex < state.quiz.questions.length - 1) {
      state.quiz.currentQuestionIndex += 1
      state.quiz.phase = "lobby"
      state.quiz.startTime = null
      emitState()
    }
  })

  socket.on("disconnect", () => {
    console.log("Client desconnectat:", socket.id)
    delete state.players[socket.id]
    delete state.sessions[socket.id]
    emitState()
  })
})

app.get("/", (_, res) => {
  res.send("Quiz server running")
})

const PORT = process.env.PORT || 3001

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`)
})