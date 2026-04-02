import { io } from "socket.io-client"

export const socket = io("http://localhost:3001")

socket.on("connect", () => {
  console.log("Socket connectat:", socket.id)
})

socket.on("connect_error", (err) => {
  console.error("Error de connexió socket:", err.message)
})

socket.on("disconnect", (reason) => {
  console.log("Socket desconnectat:", reason)
})