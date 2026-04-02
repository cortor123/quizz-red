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

const state = {
  quiz: {
    currentQuestionIndex: 0,
    phase: "lobby",
    startTime: null,
    questions: [{ ...defaultQuestion }],
  },
  players: {},
  sessions: {}, // socket.id -> { role: "admin" | "display" | null }
}

function getPublicState() {
  return {
    quiz: state.quiz,
    players: Object.values(state.players).map((p) => ({
      id: p.id,
      name: p.name,
      answersByQuestion: p.answersByQuestion,
    })),
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

function getRole(socket) {
  return state.sessions[socket.id]?.role || null
}

function isAdmin(socket) {
  return getRole(socket) === "admin"
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

    state.players[socket.id] = {
      id: socket.id,
      name: cleanName,
      answersByQuestion: {},
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
    player.answersByQuestion[qIndex] = answerIndex

    emitState()
  })

  socket.on("admin:update-quiz", (newQuiz) => {
    if (!isAdmin(socket)) return
    if (!newQuiz || !Array.isArray(newQuiz.questions)) return

    const oldQuestionCount = state.quiz.questions.length
    state.quiz = {
      ...state.quiz,
      ...newQuiz,
    }

    if (state.quiz.questions.length < oldQuestionCount) {
      Object.values(state.players).forEach((player) => {
        const filtered = {}
        Object.keys(player.answersByQuestion).forEach((key) => {
          const idx = Number(key)
          if (idx < state.quiz.questions.length) {
            filtered[idx] = player.answersByQuestion[idx]
          }
        })
        player.answersByQuestion = filtered
      })
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
    state.quiz.phase = "revealed"
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