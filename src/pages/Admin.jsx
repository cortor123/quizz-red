import { useEffect, useMemo, useState } from "react"
import { socket } from "../socket"
import {
  FONT_OPTIONS,
  defaultQuiz,
  defaultQuestion,
  getTimeLeft,
} from "../store/quizStore"

function Admin() {
  const [quiz, setQuiz] = useState(defaultQuiz)
  const [players, setPlayers] = useState([])
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(defaultQuiz))
  const [isConnected, setIsConnected] = useState(socket.connected)

  const current = useMemo(
    () => quiz.questions[quiz.currentQuestionIndex] || quiz.questions[0],
    [quiz]
  )

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleState = ({ quiz, players }) => {
      setQuiz(quiz)
      setPlayers(players)
      setTimeLeft(getTimeLeft(quiz))
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("state:update", handleState)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("state:update", handleState)
    }
  }, [])

  useEffect(() => {
    if (quiz.phase !== "answers") {
      setTimeLeft(getTimeLeft(quiz))
      return
    }

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(quiz))
    }, 250)

    return () => clearInterval(interval)
  }, [quiz])

  function pushQuiz(newQuiz) {
    setQuiz(newQuiz)
    socket.emit("admin:update-quiz", newQuiz)
  }

  function updateField(field, value) {
    const newQuiz = structuredClone(quiz)
    newQuiz.questions[quiz.currentQuestionIndex][field] = value
    pushQuiz(newQuiz)
  }

  function updateAnswer(i, value) {
    const newQuiz = structuredClone(quiz)
    newQuiz.questions[quiz.currentQuestionIndex].answers[i] = value
    pushQuiz(newQuiz)
  }

  function updateSettings(field, value) {
    const newQuiz = structuredClone(quiz)
    newQuiz.questions[quiz.currentQuestionIndex].settings[field] = value
    pushQuiz(newQuiz)
  }

  function addQuestion() {
    const newQuiz = structuredClone(quiz)
    const copy = structuredClone(current || defaultQuestion)
    newQuiz.questions.push(copy)
    newQuiz.currentQuestionIndex = newQuiz.questions.length - 1
    newQuiz.phase = "lobby"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
  }

  function deleteQuestion(i, e) {
    e.stopPropagation()

    if (quiz.questions.length === 1) return

    const newQuiz = structuredClone(quiz)
    newQuiz.questions.splice(i, 1)

    if (newQuiz.currentQuestionIndex >= newQuiz.questions.length) {
      newQuiz.currentQuestionIndex = newQuiz.questions.length - 1
    }

    newQuiz.phase = "lobby"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
  }

  function selectQuestion(i) {
    const newQuiz = structuredClone(quiz)
    newQuiz.currentQuestionIndex = i
    newQuiz.phase = "lobby"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
  }

  function showQuestion() {
    const newQuiz = structuredClone(quiz)
    newQuiz.phase = "question"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
    socket.emit("admin:show-question")
  }

  function showAnswers() {
    const newQuiz = structuredClone(quiz)
    newQuiz.phase = "answers"
    newQuiz.startTime = Date.now()
    setQuiz(newQuiz)
    socket.emit("admin:show-answers")
  }

  function reveal() {
    const newQuiz = structuredClone(quiz)
    newQuiz.phase = "revealed"
    pushQuiz(newQuiz)
    socket.emit("admin:reveal")
  }

  function backToLobby() {
    const newQuiz = structuredClone(quiz)
    newQuiz.phase = "lobby"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
    socket.emit("admin:back-to-lobby")
  }

  function nextQuestion() {
    if (quiz.currentQuestionIndex >= quiz.questions.length - 1) return

    const newQuiz = structuredClone(quiz)
    newQuiz.currentQuestionIndex += 1
    newQuiz.phase = "lobby"
    newQuiz.startTime = null
    pushQuiz(newQuiz)
    socket.emit("admin:next-question")
  }

  if (!current) {
    return <div style={{ padding: 24 }}>Carregant admin...</div>
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div
        style={{
          width: 300,
          borderRight: "1px solid #ccc",
          padding: 16,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <h2>Preguntes</h2>

        <div style={{ marginBottom: 12 }}>
          <strong>Socket:</strong>{" "}
          <span style={{ color: isConnected ? "green" : "red" }}>
            {isConnected ? "connectat" : "desconnectat"}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Jugadors connectats:</strong> {players.length}
        </div>

        {players.map((p) => (
          <div key={p.id} style={{ marginBottom: 6 }}>
            {p.name}
          </div>
        ))}

        <hr style={{ margin: "16px 0" }} />

        {quiz.questions.map((q, i) => (
          <div
            key={i}
            onClick={() => selectQuestion(i)}
            style={{
              padding: 10,
              marginBottom: 8,
              cursor: "pointer",
              border:
                i === quiz.currentQuestionIndex
                  ? "2px solid #000"
                  : "1px solid #ccc",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ flex: 1 }}>
              {i + 1}. {q.question}
            </span>

            <button type="button" onClick={(e) => deleteQuestion(i, e)}>
              ❌
            </button>
          </div>
        ))}

        <button type="button" onClick={addQuestion} style={{ marginTop: 12, width: "100%" }}>
          + Afegir pregunta
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: 24,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <h1>Admin Quiz</h1>

        <p>
          <strong>Fase actual:</strong> {quiz.phase}
        </p>

        {quiz.phase === "answers" && (
          <p>
            <strong>Temps restant:</strong> {timeLeft}s
          </p>
        )}

        <h3>Pregunta</h3>
        <textarea
          value={current.question}
          onChange={(e) => updateField("question", e.target.value)}
          style={{
            width: "100%",
            minHeight: 100,
            fontSize: 18,
            boxSizing: "border-box",
            marginBottom: 20,
          }}
        />

        <h3>Respostes</h3>
        {current.answers.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <input
              type="radio"
              checked={current.correctAnswer === i}
              onChange={() => updateField("correctAnswer", i)}
            />
            <input
              value={a}
              onChange={(e) => updateAnswer(i, e.target.value)}
              style={{ flex: 1, padding: 8 }}
            />
          </div>
        ))}

        <h3 style={{ marginTop: 30 }}>Configuració visual</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <label>
            Color de fons
            <br />
            <input
              type="color"
              value={current.settings.background}
              onChange={(e) => updateSettings("background", e.target.value)}
            />
          </label>

          <label>
            Temps de resposta
            <br />
            <input
              type="number"
              value={current.timeLimit}
              onChange={(e) => updateField("timeLimit", Number(e.target.value))}
            />
          </label>

          <label>
            Mida pregunta
            <br />
            <input
              type="number"
              value={current.settings.questionSize}
              onChange={(e) =>
                updateSettings("questionSize", Number(e.target.value))
              }
            />
          </label>

          <label>
            Mida resposta
            <br />
            <input
              type="number"
              value={current.settings.answerSize}
              onChange={(e) =>
                updateSettings("answerSize", Number(e.target.value))
              }
            />
          </label>

          <label>
            Font pregunta
            <br />
            <select
              value={current.settings.questionFont}
              onChange={(e) => updateSettings("questionFont", e.target.value)}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>

          <label>
            Font resposta
            <br />
            <select
              value={current.settings.answerFont}
              onChange={(e) => updateSettings("answerFont", e.target.value)}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>

          <label>
            Alineació pregunta
            <br />
            <select
              value={current.settings.questionAlign}
              onChange={(e) => updateSettings("questionAlign", e.target.value)}
            >
              <option value="left">Esquerra</option>
              <option value="center">Centre</option>
              <option value="right">Dreta</option>
            </select>
          </label>

          <label>
            Alineació resposta
            <br />
            <select
              value={current.settings.answerAlign}
              onChange={(e) => updateSettings("answerAlign", e.target.value)}
            >
              <option value="left">Esquerra</option>
              <option value="center">Centre</option>
              <option value="right">Dreta</option>
            </select>
          </label>

          <label>
            Layout respostes
            <br />
            <select
              value={current.settings.layout}
              onChange={(e) => updateSettings("layout", e.target.value)}
            >
              <option value="grid">Grid</option>
              <option value="row">1 sola línia</option>
              <option value="column">1 columna</option>
            </select>
          </label>

          <label>
            Columnes grid
            <br />
            <select
              value={current.settings.columns}
              onChange={(e) =>
                updateSettings("columns", Number(e.target.value))
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>

          <label>
            Separació entre respostes
            <br />
            <input
              type="number"
              value={current.settings.gap}
              onChange={(e) => updateSettings("gap", Number(e.target.value))}
            />
          </label>

          <label>
            Separació pregunta-respostes
            <br />
            <input
              type="number"
              value={current.settings.questionAnswerSpacing}
              onChange={(e) =>
                updateSettings("questionAnswerSpacing", Number(e.target.value))
              }
            />
          </label>

          <label>
            Alçada quadrats respostes
            <br />
            <input
              type="number"
              value={current.settings.answerHeight}
              onChange={(e) =>
                updateSettings("answerHeight", Number(e.target.value))
              }
            />
          </label>

          <label>
            Radius quadrats
            <br />
            <input
              type="number"
              value={current.settings.answerRadius}
              onChange={(e) =>
                updateSettings("answerRadius", Number(e.target.value))
              }
            />
          </label>

          <label>
            Padding quadrats
            <br />
            <input
              type="number"
              value={current.settings.answerPadding}
              onChange={(e) =>
                updateSettings("answerPadding", Number(e.target.value))
              }
            />
          </label>

          <label>
            Amplada màxima display
            <br />
            <input
              type="number"
              value={current.settings.maxWidth}
              onChange={(e) =>
                updateSettings("maxWidth", Number(e.target.value))
              }
            />
          </label>

          <label>
            Amplada màxima bloc respostes
            <br />
            <input
              type="number"
              value={current.settings.answersWidth}
              onChange={(e) =>
                updateSettings("answersWidth", Number(e.target.value))
              }
            />
          </label>

          <label>
            Desplaçament horitzontal respostes
            <br />
            <input
              type="number"
              value={current.settings.answersOffsetX}
              onChange={(e) =>
                updateSettings("answersOffsetX", Number(e.target.value))
              }
            />
          </label>

          <label>
            Desplaçament vertical respostes
            <br />
            <input
              type="number"
              value={current.settings.answersOffsetY}
              onChange={(e) =>
                updateSettings("answersOffsetY", Number(e.target.value))
              }
            />
          </label>

          <label>
            Desplaçament horitzontal pregunta
            <br />
            <input
              type="number"
              value={current.settings.questionOffsetX}
              onChange={(e) =>
                updateSettings("questionOffsetX", Number(e.target.value))
              }
            />
          </label>

          <label>
            Desplaçament vertical pregunta
            <br />
            <input
              type="number"
              value={current.settings.questionOffsetY}
              onChange={(e) =>
                updateSettings("questionOffsetY", Number(e.target.value))
              }
            />
          </label>

          <label>
            Mostrar lletres A/B/C/D
            <br />
            <select
              value={String(current.settings.showAnswerLetters)}
              onChange={(e) =>
                updateSettings("showAnswerLetters", e.target.value === "true")
              }
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label>
            Animació pregunta
            <br />
            <select
              value={current.settings.animationQuestion}
              onChange={(e) =>
                updateSettings("animationQuestion", e.target.value)
              }
            >
              <option value="none">Cap</option>
              <option value="fade">Fade</option>
              <option value="zoom">Zoom</option>
              <option value="slide">Slide</option>
            </select>
          </label>

          <label>
            Animació respostes
            <br />
            <select
              value={current.settings.animationAnswers}
              onChange={(e) =>
                updateSettings("animationAnswers", e.target.value)
              }
            >
              <option value="none">Cap</option>
              <option value="fade">Fade</option>
              <option value="pop">Pop</option>
              <option value="slide">Slide</option>
            </select>
          </label>

          <label>
            Animació reveal
            <br />
            <select
              value={current.settings.animationReveal}
              onChange={(e) =>
                updateSettings("animationReveal", e.target.value)
              }
            >
              <option value="none">Cap</option>
              <option value="pulse">Pulse</option>
              <option value="glow">Glow</option>
            </select>
          </label>
        </div>

        <h3 style={{ marginTop: 30 }}>Control del joc</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={showQuestion}>
            Mostrar pregunta
          </button>
          <button type="button" onClick={showAnswers}>
            Mostrar respostes
          </button>
          <button type="button" onClick={reveal}>
            Revelar correcta
          </button>
          <button type="button" onClick={backToLobby}>
            Tornar a lobby
          </button>
          <button type="button" onClick={nextQuestion}>
            Següent pregunta
          </button>
        </div>
      </div>
    </div>
  )
}

export default Admin