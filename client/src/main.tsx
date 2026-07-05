import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { reloadOnceForChunkError } from "@/components/error-boundary";

// La un deploy nou, chunk-urile vechi dispar de pe server; un import dinamic
// (lazy route / preload) poate eșua cu „Failed to fetch dynamically imported
// module". Vite emite `vite:preloadError` ÎNAINTE de a arunca eroarea — o
// prindem aici și reîncărcăm pagina o singură dată (guard anti-buclă comun cu
// error boundary), ca utilizatorul să primească bundle-ul nou în loc de crash.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnceForChunkError();
});

createRoot(document.getElementById("root")!).render(<App />);
