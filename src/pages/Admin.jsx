import { useEffect, useMemo, useRef, useState } from "react"
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
  const [ranking, setRanking] = useState([])
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(defaultQuiz))
  const [isConnected, setIsConnected] = useState(socket.connected)

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")

  const fileInputRef = useRef(null)

  const current = useMemo(
    () => quiz.questions[quiz.currentQuestionIndex] || quiz.questions[0],
    [quiz]
  )

  useEffect(() => {
    const saved = sessionStorage.getItem("quiz-red-admin-auth")
    if (saved === "ok") {
      setIsAuthorized(true)
    }

    const handleConnect = () => {
      setIsConnected(true)
      if (sessionStorage.getItem("quiz-red-admin-auth") === "ok") {
        socket.emit("auth:login", {
          role: "admin",
          password: sessionStorage.getItem("quiz-red-admin-password") || "",
        })
      }
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleState = ({ quiz, players, ranking }) => {
      setQuiz(quiz)
      setPlayers(players)
      setRanking(ranking || [])
      setTimeLeft(getTimeLeft(quiz))
    }

    const handleAuthSuccess = ({ role }) => {
      if (role === "admin") {
        setIsAuthorized(true)
        setAuthError("")
        sessionStorage.setItem("quiz-red-admin-auth", "ok")
        sessionStorage.setItem("quiz-red-admin-password", password)
      }
    }

    const handleAuthError = ({ message }) => {
      setIsAuthorized(false)
      setAuthError(message || "Error d'autenticació")
      sessionStorage.removeItem("quiz-red-admin-auth")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("state:update", handleState)
    socket.on("auth:success", handleAuthSuccess)
    socket.on("auth:error", handleAuthError)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("state:update", handleState)
      socket.off("auth:success", handleAuthSuccess)
      socket.off("auth:error", handleAuthError)
    }
  }, [password])

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

  function login() {
    setAuthError("")
    socket.emit("auth:login", {
      role: "admin",
      password,
    })
  }

  function logout() {
    setIsAuthorized(false)
    setPassword("")
    setAuthError("")
    sessionStorage.removeItem("quiz-red-admin-auth")
    sessionStorage.removeItem("quiz-red-admin-password")
    window.location.reload()
  }

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

  function updateRankingSettings(field, value) {
    const newQuiz = structuredClone(quiz)
    newQuiz.rankingSettings[field] = value
    pushQuiz(newQuiz)
  }

  function updateScoreSettings(field, value) {
    const newQuiz = structuredClone(quiz)
    newQuiz.scoreSettings[field] = value
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
    socket.emit("admin:reveal")
  }

  function showRanking() {
    socket.emit("admin:show-ranking")
  }

  function resetScores() {
    socket.emit("admin:reset-scores")
  }

  function newGame() {
    socket.emit("admin:new-game")
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
    socket.emit("admin:next-question")
  }

  function buildSaveData() {
    return {
      quiz: {
        questions: quiz.questions,
        rankingSettings: quiz.rankingSettings,
        scoreSettings: quiz.scoreSettings,
      },
    }
  }

  function saveGameToFile() {
    const data = buildSaveData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")

    a.href = url
    a.download = `quiz-red-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function openLoadDialog() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  function handleLoadFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const loadedQuiz = parsed?.quiz

        if (!loadedQuiz || !Array.isArray(loadedQuiz.questions)) {
          alert("Fitxer de joc no vàlid.")
          return
        }

        socket.emit("admin:load-quiz", loadedQuiz)
      } catch {
        alert("No s'ha pogut llegir el fitxer.")
      }
    }

    reader.readAsText(file)
  }

  if (!isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#1d1d1d", color: "white", borderRadius: 20, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Accés Admin</h1>
          <p>
            Estat socket:{" "}
            <strong style={{ color: isConnected ? "#6aff6a" : "#ff6a6a" }}>
              {isConnected ? "connectat" : "desconnectat"}
            </strong>
          </p>
          <input
            type="password"
            placeholder="Contrasenya admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid #555", boxSizing: "border-box", marginBottom: 12 }}
          />
          {authError && <div style={{ color: "#ff8f8f", marginBottom: 12 }}>{authError}</div>}
          <button onClick={login} style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 16 }}>
            Entrar
          </button>
        </div>
      </div>
    )
  }

  if (!current) return <div style={{ padding: 24 }}>Carregant admin...</div>

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleLoadFile}
        style={{ display: "none" }}
      />

      <div style={{ width: 320, borderRight: "1px solid #ccc", padding: 16, boxSizing: "border-box", overflowY: "auto" }}>
        <h2>Preguntes</h2>

        <div style={{ marginBottom: 12 }}>
          <strong>Socket:</strong>{" "}
          <span style={{ color: isConnected ? "green" : "red" }}>
            {isConnected ? "connectat" : "desconnectat"}
          </span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={logout}>Sortir</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Jugadors:</strong> {players.length}
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Pregunta actual:</strong> {quiz.currentQuestionIndex + 1}/{quiz.questions.length}
        </div>

        <hr style={{ margin: "16px 0" }} />

        <h3 style={{ marginTop: 0 }}>Top 10</h3>
        {ranking.slice(0, 10).map((p) => (
          <div key={p.id} style={{ marginBottom: 6 }}>
            {p.rank}. {p.name} — {p.totalScore}
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
              border: i === quiz.currentQuestionIndex ? "2px solid #000" : "1px solid #ccc",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ flex: 1 }}>
              {i + 1}. {q.question}
            </span>
            <button type="button" onClick={(e) => deleteQuestion(i, e)}>❌</button>
          </div>
        ))}

        <button type="button" onClick={addQuestion} style={{ marginTop: 12, width: "100%" }}>
          + Afegir pregunta
        </button>
      </div>

      <div style={{ flex: 1, padding: 24, boxSizing: "border-box", overflowY: "auto" }}>
        <h1>Admin Quiz</h1>

        <p><strong>Fase actual:</strong> {quiz.phase}</p>
        <p><strong>Progrés:</strong> {quiz.currentQuestionIndex + 1}/{quiz.questions.length}</p>

        {quiz.phase === "answers" && (
          <p><strong>Temps restant:</strong> {timeLeft}s</p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <button type="button" onClick={saveGameToFile}>Desar joc</button>
          <button type="button" onClick={openLoadDialog}>Carregar joc</button>
          <button type="button" onClick={newGame}>Nova partida</button>
        </div>

        <h3>Pregunta</h3>
        <textarea
          value={current.question}
          onChange={(e) => updateField("question", e.target.value)}
          style={{ width: "100%", minHeight: 100, fontSize: 18, boxSizing: "border-box", marginBottom: 20 }}
        />

        <h3>Respostes</h3>
        {current.answers.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <input type="radio" checked={current.correctAnswer === i} onChange={() => updateField("correctAnswer", i)} />
            <input value={a} onChange={(e) => updateAnswer(i, e.target.value)} style={{ flex: 1, padding: 8 }} />
          </div>
        ))}

        <h3 style={{ marginTop: 30 }}>Puntuació</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 16 }}>
          <label>Base encert<br /><input type="number" value={quiz.scoreSettings.correctBase} onChange={(e) => updateScoreSettings("correctBase", Number(e.target.value))} /></label>
          <label>Bonus més ràpid<br /><input type="number" value={quiz.scoreSettings.fastestBonus} onChange={(e) => updateScoreSettings("fastestBonus", Number(e.target.value))} /></label>
          <label>Bonus més lent<br /><input type="number" value={quiz.scoreSettings.slowestBonus} onChange={(e) => updateScoreSettings("slowestBonus", Number(e.target.value))} /></label>
        </div>

        <h3 style={{ marginTop: 30 }}>Ranking gran</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 16 }}>
          <label>Top visibles<br /><input type="number" value={quiz.rankingSettings.showTop} onChange={(e) => updateRankingSettings("showTop", Number(e.target.value))} /></label>
          <label>Color fons ranking<br /><input type="color" value={quiz.rankingSettings.background} onChange={(e) => updateRankingSettings("background", e.target.value)} /></label>
          <label>Color text ranking<br /><input type="color" value={quiz.rankingSettings.textColor} onChange={(e) => updateRankingSettings("textColor", e.target.value)} /></label>
          <label>Color accent ranking<br /><input type="color" value={quiz.rankingSettings.accentColor} onChange={(e) => updateRankingSettings("accentColor", e.target.value)} /></label>
          <label>Color targeta ranking<br /><input type="color" value={quiz.rankingSettings.itemBackground} onChange={(e) => updateRankingSettings("itemBackground", e.target.value)} /></label>
          <label>Mida text ranking<br /><input type="number" value={quiz.rankingSettings.fontSize} onChange={(e) => updateRankingSettings("fontSize", Number(e.target.value))} /></label>
          <label>Separació files ranking<br /><input type="number" value={quiz.rankingSettings.gap} onChange={(e) => updateRankingSettings("gap", Number(e.target.value))} /></label>
          <label>Offset vertical ranking<br /><input type="number" value={quiz.rankingSettings.topOffsetY} onChange={(e) => updateRankingSettings("topOffsetY", Number(e.target.value))} /></label>
          <label>Amplada bloc ranking<br /><input type="number" value={quiz.rankingSettings.blockWidth} onChange={(e) => updateRankingSettings("blockWidth", Number(e.target.value))} /></label>
        </div>

        <h3 style={{ marginTop: 30 }}>Ranking live al display</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 16 }}>
          <label>
            Mostrar ranking live<br />
            <select value={String(quiz.rankingSettings.showLiveRanking)} onChange={(e) => updateRankingSettings("showLiveRanking", e.target.value === "true")}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label>Top ranking live<br /><input type="number" value={quiz.rankingSettings.liveTop} onChange={(e) => updateRankingSettings("liveTop", Number(e.target.value))} /></label>
          <label>Amplada ranking live<br /><input type="number" value={quiz.rankingSettings.liveWidth} onChange={(e) => updateRankingSettings("liveWidth", Number(e.target.value))} /></label>
          <label>Mida text ranking live<br /><input type="number" value={quiz.rankingSettings.liveFontSize} onChange={(e) => updateRankingSettings("liveFontSize", Number(e.target.value))} /></label>
          <label>Separació files ranking live<br /><input type="number" value={quiz.rankingSettings.liveGap} onChange={(e) => updateRankingSettings("liveGap", Number(e.target.value))} /></label>
          <label>Offset X ranking live<br /><input type="number" value={quiz.rankingSettings.liveOffsetX} onChange={(e) => updateRankingSettings("liveOffsetX", Number(e.target.value))} /></label>
          <label>Offset Y ranking live<br /><input type="number" value={quiz.rankingSettings.liveOffsetY} onChange={(e) => updateRankingSettings("liveOffsetY", Number(e.target.value))} /></label>

          <label>
            Posició ranking live<br />
            <select value={quiz.rankingSettings.livePosition} onChange={(e) => updateRankingSettings("livePosition", e.target.value)}>
              <option value="left">Esquerra</option>
              <option value="right">Dreta</option>
            </select>
          </label>

          <label>Fons ranking live<br /><input type="color" value={quiz.rankingSettings.liveBackground.slice(0, 7)} onChange={(e) => updateRankingSettings("liveBackground", `${e.target.value}cc`)} /></label>
          <label>Color files ranking live<br /><input type="color" value={quiz.rankingSettings.liveItemBackground} onChange={(e) => updateRankingSettings("liveItemBackground", e.target.value)} /></label>
        </div>

        <h3 style={{ marginTop: 30 }}>Configuració visual pregunta/respostes</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 16 }}>
          <label>Color de fons<br /><input type="color" value={current.settings.background} onChange={(e) => updateSettings("background", e.target.value)} /></label>
          <label>Temps de resposta<br /><input type="number" value={current.timeLimit} onChange={(e) => updateField("timeLimit", Number(e.target.value))} /></label>
          <label>Mida pregunta<br /><input type="number" value={current.settings.questionSize} onChange={(e) => updateSettings("questionSize", Number(e.target.value))} /></label>
          <label>Mida resposta<br /><input type="number" value={current.settings.answerSize} onChange={(e) => updateSettings("answerSize", Number(e.target.value))} /></label>

          <label>
            Font pregunta<br />
            <select value={current.settings.questionFont} onChange={(e) => updateSettings("questionFont", e.target.value)}>
              {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>

          <label>
            Font resposta<br />
            <select value={current.settings.answerFont} onChange={(e) => updateSettings("answerFont", e.target.value)}>
              {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>

          <label>
            Alineació pregunta<br />
            <select value={current.settings.questionAlign} onChange={(e) => updateSettings("questionAlign", e.target.value)}>
              <option value="left">Esquerra</option>
              <option value="center">Centre</option>
              <option value="right">Dreta</option>
            </select>
          </label>

          <label>
            Alineació resposta<br />
            <select value={current.settings.answerAlign} onChange={(e) => updateSettings("answerAlign", e.target.value)}>
              <option value="left">Esquerra</option>
              <option value="center">Centre</option>
              <option value="right">Dreta</option>
            </select>
          </label>

          <label>
            Layout respostes<br />
            <select value={current.settings.layout} onChange={(e) => updateSettings("layout", e.target.value)}>
              <option value="grid">Grid</option>
              <option value="row">1 sola línia</option>
              <option value="column">1 columna</option>
            </select>
          </label>

          <label>
            Columnes grid<br />
            <select value={current.settings.columns} onChange={(e) => updateSettings("columns", Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>

          <label>Separació entre respostes<br /><input type="number" value={current.settings.gap} onChange={(e) => updateSettings("gap", Number(e.target.value))} /></label>
          <label>Separació pregunta-respostes<br /><input type="number" value={current.settings.questionAnswerSpacing} onChange={(e) => updateSettings("questionAnswerSpacing", Number(e.target.value))} /></label>
          <label>Desplaçament X pregunta<br /><input type="number" value={current.settings.questionOffsetX} onChange={(e) => updateSettings("questionOffsetX", Number(e.target.value))} /></label>
          <label>Desplaçament Y pregunta<br /><input type="number" value={current.settings.questionOffsetY} onChange={(e) => updateSettings("questionOffsetY", Number(e.target.value))} /></label>
          <label>Alçada quadrats respostes<br /><input type="number" value={current.settings.answerHeight} onChange={(e) => updateSettings("answerHeight", Number(e.target.value))} /></label>
          <label>Radius quadrats<br /><input type="number" value={current.settings.answerRadius} onChange={(e) => updateSettings("answerRadius", Number(e.target.value))} /></label>
          <label>Padding quadrats<br /><input type="number" value={current.settings.answerPadding} onChange={(e) => updateSettings("answerPadding", Number(e.target.value))} /></label>
          <label>Amplada màxima display<br /><input type="number" value={current.settings.maxWidth} onChange={(e) => updateSettings("maxWidth", Number(e.target.value))} /></label>
          <label>Amplada màxima bloc respostes<br /><input type="number" value={current.settings.answersWidth} onChange={(e) => updateSettings("answersWidth", Number(e.target.value))} /></label>
          <label>Desplaçament horitzontal respostes<br /><input type="number" value={current.settings.answersOffsetX} onChange={(e) => updateSettings("answersOffsetX", Number(e.target.value))} /></label>
          <label>Desplaçament vertical respostes<br /><input type="number" value={current.settings.answersOffsetY} onChange={(e) => updateSettings("answersOffsetY", Number(e.target.value))} /></label>

          <label>
            Mostrar lletres A/B/C/D<br />
            <select value={String(current.settings.showAnswerLetters)} onChange={(e) => updateSettings("showAnswerLetters", e.target.value === "true")}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label>
            Mostrar recompte de vots<br />
            <select value={String(current.settings.showVoteCounts)} onChange={(e) => updateSettings("showVoteCounts", e.target.value === "true")}>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label>
            Animació pregunta<br />
            <select value={current.settings.animationQuestion} onChange={(e) => updateSettings("animationQuestion", e.target.value)}>
              <option value="none">Cap</option>
              <option value="fade">Fade</option>
              <option value="zoom">Zoom</option>
              <option value="slide">Slide</option>
            </select>
          </label>

          <label>
            Animació respostes<br />
            <select value={current.settings.animationAnswers} onChange={(e) => updateSettings("animationAnswers", e.target.value)}>
              <option value="none">Cap</option>
              <option value="fade">Fade</option>
              <option value="pop">Pop</option>
              <option value="slide">Slide</option>
            </select>
          </label>

          <label>
            Animació reveal<br />
            <select value={current.settings.animationReveal} onChange={(e) => updateSettings("animationReveal", e.target.value)}>
              <option value="none">Cap</option>
              <option value="pulse">Pulse</option>
              <option value="glow">Glow</option>
            </select>
          </label>
        </div>

        <h3 style={{ marginTop: 30 }}>Control del joc</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={showQuestion}>Mostrar pregunta</button>
          <button type="button" onClick={showAnswers}>Mostrar respostes</button>
          <button type="button" onClick={reveal}>Revelar correcta</button>
          <button type="button" onClick={showRanking}>Mostrar ranking</button>
          <button type="button" onClick={resetScores}>Reset puntuacions</button>
          <button type="button" onClick={backToLobby}>Tornar a lobby</button>
          <button type="button" onClick={nextQuestion}>Següent pregunta</button>
        </div>
      </div>
    </div>
  )
}

export default Admin