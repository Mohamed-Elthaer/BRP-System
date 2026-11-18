// import { useEffect } from "react";
// import { Outlet, useLocation } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { AnimatePresence, motion } from "framer-motion";
// import { toast } from "react-toastify";
// import Sidebar from "./Sidebar.jsx";
// import Topbar from "./Topbar.jsx";
// import useSocket from "../../Hooks/useSocket.js";
// import useOnlineStatus from "../../Hooks/useOnlineStatus.js";
// import { fetchSettings } from "../../Redux/Slices/settingsSlice.js";
// import { loadQueue, pushQueue } from "../../Redux/Slices/syncSlice.js";
// import { getSocket } from "../../Utils/socket.js";

// export default function MainLayout() {
//   const dispatch = useDispatch();
//   const location = useLocation();
//   const online = useOnlineStatus();
//   const { queue, loaded } = useSelector((s) => s.sync);

//   useSocket();

//     useEffect(() => {
//     const socket = getSocket();

//     socket.on("connect", () => {
//       console.log("✅ Socket Connected:", socket.id);
//     });

//     socket.on("connect_error", (error) => {
//       console.error("❌ Socket Connection Error:", error.message);
//     });

//     socket.on("disconnect", (reason) => {
//       console.log("⚠️ Socket Disconnected:", reason);
//     });

//     socket.connect();

//     return () => {
//       socket.off("connect");
//       socket.off("connect_error");
//       socket.off("disconnect");
//       socket.disconnect();
//     };
//   }, []);

//   useEffect(() => {
//     dispatch(fetchSettings());
//     dispatch(loadQueue());
//   }, [dispatch]);

//   // لما الإنترنت يرجع (أو التطبيق يفتح) والطابور فيه عمليات: بتتبعت تلقائي
//   useEffect(() => {
//     if (!online || !loaded || queue.length === 0) return;
//     dispatch(pushQueue())
//       .unwrap()
//       .then(({ results }) => {
//         if (!results.length) return;
//         const done = results.filter((r) => r.status === "done").length;
//         const issues = results.filter((r) => ["conflict", "failed"].includes(r.status)).length;
//         if (done) toast.success(`${done} offline operation${done > 1 ? "s" : ""} synced`);
//         if (issues) toast.warn(`${issues} operation${issues > 1 ? "s" : ""} need review in Sync`);
//       })
//       .catch(() => {});
//   }, [online, loaded, queue.length, dispatch]);

//   return (
//     <div className="min-h-dvh">
//       <Sidebar />
//       <div className="lg:pl-64">
//         <Topbar />
//         <main className="mx-auto max-w-7xl p-4 sm:p-6">
//           <AnimatePresence mode="wait">
//             <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
//               <Outlet />
//             </motion.div>
//           </AnimatePresence>
//         </main>
//       </div>
//     </div>
//   );
// }
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import useSocket from "../../Hooks/useSocket.js";
import useOnlineStatus from "../../Hooks/useOnlineStatus.js";
import { fetchSettings } from "../../Redux/Slices/settingsSlice.js";
import { loadQueue, pushQueue } from "../../Redux/Slices/syncSlice.js";

export default function MainLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const online = useOnlineStatus();
  const { queue, loaded } = useSelector((s) => s.sync);

  useSocket();

  useEffect(() => {
    dispatch(fetchSettings());
    dispatch(loadQueue());
  }, [dispatch]);

  // لما الإنترنت يرجع (أو التطبيق يفتح) والطابور فيه عمليات: بتتبعت تلقائي
  useEffect(() => {
    if (!online || !loaded || queue.length === 0) return;
    dispatch(pushQueue())
      .unwrap()
      .then(({ results }) => {
        if (!results.length) return;
        const done = results.filter((r) => r.status === "done").length;
        const issues = results.filter((r) => ["conflict", "failed"].includes(r.status)).length;
        if (done) toast.success(`${done} offline operation${done > 1 ? "s" : ""} synced`);
        if (issues) toast.warn(`${issues} operation${issues > 1 ? "s" : ""} need review in Sync`);
      })
      .catch(() => {});
  }, [online, loaded, queue.length, dispatch]);

  // الداتابيز ممكن تتأخر شوية بعد رجوع النت، فبنعيد المحاولة كل 20 ثانية
  useEffect(() => {
    if (!online || !loaded || queue.length === 0) return undefined;
    const t = setInterval(() => dispatch(pushQueue()), 20000);
    return () => clearInterval(t);
  }, [online, loaded, queue.length, dispatch]);

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}