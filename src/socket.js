import { io } from "socket.io-client"

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

export const socket = io(SOCKET_URL)

socket.on("connect", () => {
  console.log("Socket connectat:", socket.id)
})

socket.on("connect_error", (err) => {
  console.error("Error de connexió socket:", err.message)
})

socket.on("disconnect", (reason) => {
  console.log("Socket desconnectat:", reason)
})