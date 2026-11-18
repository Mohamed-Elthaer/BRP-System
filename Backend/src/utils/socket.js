// import { Server } from "socket.io";
// import jwt from "jsonwebtoken";
// import { TokenBlacklist } from "../models/modelBlackList.js";
// import { PERMISSIONS, hasPermission } from "./userRoles.js";

// let io;

// const parseCookies = (header = "") =>
//   Object.fromEntries(
//     header
//       .split(";")
//       .map((c) => c.trim().split("="))
//       .filter(([k]) => k)
//       .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
//   );


// export const initSocket = (httpServer) => {
//   io = new Server(httpServer, {
//     cors: { origin: process.env.CLIENT_URL, credentials: true },
//   });

 
//   io.use(async (socket, next) => {
//     try {
//       const token = parseCookies(socket.handshake.headers.cookie).token;
//       if (!token) return next(new Error("unauthorized"));
//       if (await TokenBlacklist.exists({ token })) {
//         return next(new Error("unauthorized"));
//       }
     
//       socket.user = jwt.verify(token, process.env.SECRET_KEY);
//       next();
//     } catch {
//       next(new Error("unauthorized"));
//     }
//   });

//   io.on("connection", (socket) => {
//     const { role } = socket.user;
//     if (hasPermission(role, PERMISSIONS.KITCHEN_VIEW)) socket.join("kitchen");
//     if (hasPermission(role, PERMISSIONS.ORDERS_VIEW)) socket.join("orders");
//     if (hasPermission(role, PERMISSIONS.INVENTORY_VIEW)) socket.join("inventory");
//     if (hasPermission(role, PERMISSIONS.DASHBOARD_VIEW)) socket.join("dashboard");
//   });

//   return io;
// };

// export const emit = (rooms, event, payload) => {
//   if (!io) return;
//   [].concat(rooms).forEach((room) => io.to(room).emit(event, payload));
// };

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { TokenBlacklist } from "../models/modelBlackList.js";
import { PERMISSIONS, hasPermission } from "./userRoles.js";

let io;

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  
  io.use(async (socket, next) => {
    try {
      const token = parseCookies(socket.handshake.headers.cookie).token;
      if (!token) return next(new Error("unauthorized"));
      if (await TokenBlacklist.exists({ token })) {
        return next(new Error("unauthorized"));
      }
      
      socket.user = jwt.verify(token, process.env.SECRET_KEY);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { role } = socket.user;
    if (hasPermission(role, PERMISSIONS.KITCHEN_VIEW)) socket.join("kitchen");
    if (hasPermission(role, PERMISSIONS.ORDERS_VIEW)) socket.join("orders");
    if (hasPermission(role, PERMISSIONS.INVENTORY_VIEW)) socket.join("inventory");
    if (hasPermission(role, PERMISSIONS.DASHBOARD_VIEW)) socket.join("dashboard");
  });

  return io;
};

export const emit = (rooms, event, payload) => {
  if (!io) return;
  io.to([].concat(rooms)).emit(event, payload); // مرة واحدة لكل socket حتى لو في أكتر من room
};
