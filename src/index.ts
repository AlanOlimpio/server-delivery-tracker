import express, { Express, Request, Response } from "express";
import { Socket, Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Delivery Tracker!");
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const io: Server = new Server(server, {
  cors: {
    origin: "*",
  },
});

interface JoinDeliveryData {
  deliveryId: string;
}

interface LocationData {
  deliveryId: string;
  latitude: number;
  longitude: number;
}

interface CustomSocket extends Socket {
  deliveryId?: string;
}

io.on("connection", (socket: CustomSocket) => {
  console.log(`User connected: ${socket.id}`);

  /**
   * Entra na room de uma entrega
   */
  socket.on("joinDelivery", (data: JoinDeliveryData) => {
    const roomId = `delivery-${data.deliveryId}`;

    socket.join(roomId);

    socket.deliveryId = data.deliveryId;

    console.log(`Socket ${socket.id} joined ${roomId}`);

    socket.emit("deliveryJoined", {
      status: "OK",
      deliveryId: data.deliveryId,
    });
  });

  /**
   * Atualiza a localização do entregador
   */
  socket.on("updateLocation", (data: LocationData) => {
    const roomId = `delivery-${data.deliveryId}`;

    console.log(
      `Location update for ${roomId}:`,
      data.latitude,
      data.longitude,
    );

    io.to(roomId).emit("updateLocationResponse", {
      latitude: data.latitude,
      longitude: data.longitude,
    });
  });

  /**
   * Desconexão
   */
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});
