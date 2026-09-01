import express, { Express, Request, Response } from "express";
import { Socket, Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

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

type DeliveryStatus =
  | "pending"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface Delivery {
  deliveryId: string;
  status: DeliveryStatus;
  createdAt: Date;
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
}

const deliveries = new Map<string, Delivery>();

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Delivery Tracker!");
});

app.post("/deliveries", (req: Request, res: Response) => {
  const deliveryId = Math.random().toString(36).substring(2, 8);

  const delivery: Delivery = {
    deliveryId,
    status: "pending",
    createdAt: new Date(),
  };

  deliveries.set(deliveryId, delivery);

  console.log("Delivery created:", delivery);

  res.status(201).json({
    deliveryId,
  });
});

app.get("/deliveries/:deliveryId", (req: Request, res: Response) => {
  const { deliveryId } = req.params;
  console.log("Fetching delivery:", deliveryId);

  const delivery = deliveries.get(deliveryId);

  if (!delivery) {
    return res.status(404).json({
      message: "Entrega não encontrada",
    });
  }

  return res.status(200).json(delivery);
});

app.patch("/deliveries/:deliveryId/status", (req: Request, res: Response) => {
  const { deliveryId } = req.params;
  const { status } = req.body;

  const delivery = deliveries.get(deliveryId);

  if (!delivery) {
    return res.status(404).json({
      message: "Entrega não encontrada",
    });
  }

  const validStatuses: DeliveryStatus[] = [
    "pending",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Status inválido",
    });
  }

  delivery.status = status;

  deliveries.set(deliveryId, delivery);

  console.log("Delivery status updated:", delivery);

  return res.status(200).json(delivery);
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
