// offer/answer/candidate를 교환하는 역할만 수행하는 서버(시그널링)

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const port = 4000;

io.on("connection", async (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on("offer", (data: RTCSessionDescriptionInit) => {
    console.log(`Received offer from: ${socket.id}`);
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data: RTCSessionDescriptionInit) => {
    console.log(`Received answer from: ${socket.id}`);
    socket.broadcast.emit("answer", data);
  });

  socket.on("candidate", (data: RTCIceCandidate) => {
    console.log(`Received candidate from: ${socket.id}`);
    socket.broadcast.emit("candidate", data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("Express with TypeScript");
});

app.listen(port, () => {
  console.log();
  console.log(`  [Local] http://localhost:${port}`);
  console.log();
});
