import { useEffect, useMemo, useState } from "react"
import { socket } from "../socket"
import { defaultQuiz, getTimeLeft } from "../store/quizStore"
import "../styles/quizAnimations.css"

function Display() {
  const [quiz, setQuiz] = useState(defaultQuiz)
  const [players, setPlayers] = useState([])
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(defaultQuiz))

  const current = useMemo(
    () => quiz.questions[quiz.currentQuestionIndex] || quiz.questions[0],
    [quiz]
  )

  const firstPlayerAnswer =
    players[0]?.answersByQuestion?.[quiz.currentQuestionIndex] ?? null

  useEffect(() => {
    const handleState = ({ quiz, players }) => {
      setQuiz(quiz)
      setPlayers(players)
      setTimeLeft(getTimeLeft(quiz))
    }

    socket.on("state:update", handleState)

    return () => {
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

  function getAnswerLayout() {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: current.settings.background,
        color: "white",
        padding: 40,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: `${current.settings.maxWidth}px`,
          margin: "0 auto",
        }}
      >
        {quiz.phase === "lobby" && (
          <div
            style={{
              minHeight: "calc(100vh - 80px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
                lineHeight: 1.25,
                maxWidth: "1000px",
                margin: 0,
                wordBreak: "break-word",
                color: "white",
              }}
            >
              Esperant que comenci el joc...
            </h1>
          </div>
        )}

        {quiz.phase !== "lobby" && (
          <>
            <div
              className={getQuestionAnimationClass()}
              style={{
                transform: `translate(${current.settings.questionOffsetX}px, ${current.settings.questionOffsetY}px)`,
              }}
            >
              <h1
                style={{
                  fontSize: `${current.settings.questionSize}px`,
                  marginBottom: `${current.settings.questionAnswerSpacing}px`,
                  textAlign: current.settings.questionAlign,
                  fontFamily: current.settings.questionFont,
                  lineHeight: 1.15,
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
                  fontSize: "2rem",
                  textAlign: "center",
                  opacity: 0.9,
                  lineHeight: 1.3,
                  color: "white",
                }}
              >
                Llegeix la pregunta...
              </p>
            )}

            {(quiz.phase === "answers" || quiz.phase === "revealed") && (
              <>
                <div
                  style={{
                    fontSize: "2rem",
                    marginBottom: 24,
                    textAlign: "center",
                    fontWeight: "bold",
                    lineHeight: 1.2,
                    color: "white",
                  }}
                >
                  {quiz.phase === "answers"
                    ? `Temps restant: ${timeLeft}s`
                    : "Solució revelada"}
                </div>

                <div
                  style={{
                    ...getAnswerLayout(),
                    width: "100%",
                    maxWidth: `${current.settings.answersWidth}px`,
                    margin: "0 auto",
                    transform: `translate(${current.settings.answersOffsetX}px, ${current.settings.answersOffsetY}px)`,
                  }}
                >
                  {current.answers.map((a, i) => {
                    let color = "#222"
                    let extraClass = getAnswerAnimationClass(i)

                    if (quiz.phase === "revealed") {
                      if (i === current.correctAnswer) {
                        color = "green"

                        if (current.settings.animationReveal === "pulse") {
                          extraClass += " qa-correct-pulse"
                        }
                        if (current.settings.animationReveal === "glow") {
                          extraClass += " qa-correct-glow"
                        }
                      } else if (i === firstPlayerAnswer) {
                        color = "red"
                      }
                    }

                    return (
                      <div
                        key={i}
                        className={extraClass.trim()}
                        style={{
                          background: color,
                          minHeight: `${current.settings.answerHeight}px`,
                          padding: `${current.settings.answerPadding}px`,
                          borderRadius: `${current.settings.answerRadius}px`,
                          fontSize: `${current.settings.answerSize}px`,
                          textAlign: current.settings.answerAlign,
                          fontFamily: current.settings.answerFont,
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            current.settings.answerAlign === "left"
                              ? "flex-start"
                              : current.settings.answerAlign === "right"
                              ? "flex-end"
                              : "center",
                          wordBreak: "break-word",
                          lineHeight: 1.2,
                          boxSizing: "border-box",
                          whiteSpace: "pre-wrap",
                          color: "white",
                        }}
                      >
                        {current.settings.showAnswerLetters
                          ? `${String.fromCharCode(65 + i)}. `
                          : ""}
                        {a}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Display