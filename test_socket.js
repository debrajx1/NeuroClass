const io = require("socket.io-client");
const socket = io("http://localhost:5000");

// Mocking the Teacher ID that starts the session
const teacherId = "mock_teacher_id";

socket.on("connect", () => {
    console.log("Connected as Client!");
    socket.emit("joinRoom", teacherId);
    console.log(`Joined Room: ${teacherId}`);
});

socket.on("live-events", (data) => {
    console.log("--- RECEIVED LIVE EVENTS ---");
    console.dir(data, { depth: null });
});

socket.on("disconnect", () => {
    console.log("Disconnected.");
});
