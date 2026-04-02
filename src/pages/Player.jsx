import { useEffect, useMemo, useState } from "react"
import { socket } from "../socket"
import {
  defaultQuiz,
  getPlayerName,
  savePlayerName,
  getTimeLeft,
} from "../store/quizStore"
import "../styles/quizAnimations.css"

function Player() {
  const [quiz, setQuiz] = useState(defaultQuiz)
  const [players, setPlayers] = useState([])
  const [playerName, setPlayerName] = useState(getPlayerName())
  const [tempName, setTempName] = useState(getPlayerName())
  const [mySocketId, setMySocketId] = useState(null)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(defaultQuiz))
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const current = useMemo(
    () => quiz.questions[quiz.currentQuestionIndex] || quiz.questions[0],
    [quiz]
  )

  const me = players.find((p) => p.id === mySocketId)
  const myAnswer = me?.answersByQuestion?.[quiz.currentQuestionIndex] ?? null

  const isMobile = windowWidth <= 768

  useEffect(() => {
    const handleConnect = () => {
      setMySocketId(socket.id)

      const savedName = getPlayerName()
      if (savedName) {
        socket.emit("player:join", { name: savedName })
      }
    }

    const handleJoined = ({ id, name }) => {
      setMySocketId(id)
      setPlayerName(name)
      savePlayerName(name)
    }

    const handleState = ({ quiz, players }) => {
      setQuiz(quiz)
      setPlayers(players)
      setTimeLeft(getTimeLeft(quiz))
    }

    const handleResize = () => setWindowWidth(window.innerWidth)

    socket.on("connect", handleConnect)
    socket.on("player:joined", handleJoined)
    socket.on("state:update", handleState)
    window.addEventListener("resize", handleResize)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("player:joined", handleJoined)
      socket.off("state:update", handleState)
      window.removeEventListener("resize", handleResize)
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

  function confirmName() {
    const clean = tempName.trim()
    if (!clean) return
    savePlayerName(clean)
    setPlayerName(clean)
    socket.emit("player:join", { name: clean })
  }

  function answer(i) {
    if (quiz.phase !== "answers") return
    if (timeLeft === 0) return
    socket.emit("player:answer", { answerIndex: i })
  }

  function getPlayerGridStyle() {
    if (isMobile) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "clamp(10px, 2vw, 18px)",
      }
    }

    if (current.settings.layout === "row") {
      return {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: `${current.settings.gap}px`,
      }
    }

    if (current.settings.layout === "column") {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: `${current.settings.gap}px`,
      }
    }

    return {
      display: "grid",
      gridTemplateColumns:
        current.settings.columns === 2 ? "1fr 1fr" : "1fr",
      gap: `${current.settings.gap}px`,
    }
  }

  function getQuestionAnimationClass() {
    switch (current.settings.animationQuestion) {
      case "fade":
        return "qa-fade-in"
      case "zoom":
        return "qa-zoom-in"
      case "slide":
        return "qa-slide-up"
      default:
        return ""
    }
  }

  function getAnswerAnimationClass(i) {
    const base =
      current.settings.animationAnswers === "fade"
        ? "qa-fade-in"
        : current.settings.animationAnswers === "slide"
        ? "qa-slide-up"
        : current.settings.animationAnswers === "pop"
        ? "qa-pop-in"
        : ""

    return base ? `${base} qa-delay-${(i % 4) + 1}` : ""
  }

  if (!playerName) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#111111",
          color: "white",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#1d1d1d",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
              marginBottom: 12,
              color: "white",
              lineHeight: 1.15,
            }}
          >
            Entrar al concurs
          </h1>

          <p style={{ opacity: 0.85, marginBottom: 18, color: "white" }}>
            Escriu el teu nom o nickname
          </p>

          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="El teu nom"
            style={{
              width: "100%",
              padding: 14,
              fontSize: 18,
              borderRadius: 12,
              border: "1px solid #444",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={confirmName}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 18,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  if (quiz.phase === "lobby") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#111111",
          textAlign: "center",
        }}
      >
        <div style={{ color: "white" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 6vw, 4rem)",
              color: "white",
              marginBottom: 12,
              lineHeight: 1.15,
            }}
          >
            Hola, {playerName}
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
              color: "white",
              opacity: 0.85,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Esperant que l’admin mostri la pregunta...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "clamp(12px, 3vw, 32px)",
        background: current.settings.background,
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : `${current.settings.maxWidth}px`,
          margin: "0 auto",
        }}
      >
        <div className={getQuestionAnimationClass()}>
          <h1
            style={{
              fontSize: isMobile
                ? "clamp(1.6rem, 6vw, 2.6rem)"
                : `${current.settings.questionSize}px`,
              lineHeight: 1.1,
              marginBottom: `${current.settings.questionAnswerSpacing}px`,
              textAlign: current.settings.questionAlign,
              fontFamily: current.settings.questionFont,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              color: "white",
            }}
          >
            {current.question}
          </h1>
        </div>

        {quiz.phase === "question" && (
          <p
            style={{
              fontSize: "clamp(1rem, 3vw, 1.5rem)",
              textAlign: "center",
              opacity: 0.9,
              color: "white",
            }}
          >
            Espera que l’admin mostri les respostes...
          </p>
        )}

        {(quiz.phase === "answers" || quiz.phase === "revealed") && (
          <>
            <div
              style={{
                fontSize: "clamp(1rem, 3vw, 1.8rem)",
                marginBottom: 20,
                textAlign: "center",
                fontWeight: "bold",
                color: "white",
              }}
            >
              {quiz.phase === "answers"
                ? `Temps restant: ${timeLeft}s`
                : "Respostes revelades"}
            </div>

            <div style={getPlayerGridStyle()}>
              {current.answers.map((a, i) => {
                let background = "#222"
                let border = "3px solid transparent"
                let extraClass = getAnswerAnimationClass(i)

                if (myAnswer === i) {
                  border = "3px solid white"
                }

                if (quiz.phase === "revealed") {
                  if (i === current.correctAnswer) {
                    background = "green"
                    if (current.settings.animationReveal === "pulse") {
                      extraClass += " qa-correct-pulse"
                    }
                    if (current.settings.animationReveal === "glow") {
                      extraClass += " qa-correct-glow"
                    }
                  } else if (i === myAnswer && i !== current.correctAnswer) {
                    background = "red"
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={quiz.phase !== "answers" || timeLeft === 0}
                    className={extraClass.trim()}
                    style={{
                      minHeight: isMobile
                        ? "clamp(72px, 14vw, 110px)"
                        : `${current.settings.answerHeight}px`,
                      padding: `${current.settings.answerPadding}px`,
                      fontSize: isMobile
                        ? "clamp(1rem, 4vw, 1.4rem)"
                        : `${current.settings.answerSize}px`,
                      background,
                      color: "white",
                      border,
                      borderRadius: `${current.settings.answerRadius}px`,
                      cursor: "pointer",
                      textAlign: current.settings.answerAlign,
                      fontFamily: current.settings.answerFont,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {current.settings.showAnswerLetters
                      ? `${String.fromCharCode(65 + i)}. `
                      : ""}
                    {a}
                  </button>
                )
              })}
            </div>

            {quiz.phase === "revealed" && (
              <div
                style={{
                  marginTop: 24,
                  fontSize: "clamp(1.2rem, 3vw, 2rem)",
                  fontWeight: "bold",
                  textAlign: "center",
                  color: "white",
                }}
              >
                {myAnswer === null
                  ? "No has respost."
                  : myAnswer === current.correctAnswer
                  ? "Correcte!"
                  : "Incorrecte!"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Player