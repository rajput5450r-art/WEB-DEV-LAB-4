// Run this in a browser page that has the Socket.IO client library loaded.
// Replace the token with the JWT returned by /api/auth/login.
const socket = io("http://localhost:3000", {
  auth: { token: "PASTE_JWT_TOKEN_HERE" }
});

socket.on("connect", () => {
  console.log("Connected to secure chat:", socket.id);
  socket.emit("chat:message", { message: "Hello from the client!" });
});

socket.on("chat:system", data => console.log("System:", data.message));
socket.on("chat:message", data => console.log(`${data.sender}: ${data.message}`));
socket.on("connect_error", error => console.error("Connection failed:", error.message));