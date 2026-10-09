import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const csp: Plugin = {
  name: "investa-csp",
  apply: "build",
  transformIndexHtml(html) {
    const policy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // No celular o motor do app roda no WebView e fala direto com a IA (https).
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'none'",
    ].join("; ");
    return html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
    );
  },
};

export default defineConfig({
  plugins: [react(), csp],
  base: "./",
  // Endereço da nuvem (Supabase) usado pelo app do celular; vem dos segredos do build.
  define: {
    __INVESTA_CLOUD_URL__: JSON.stringify(process.env.INVESTA_CLOUD_URL ?? ""),
    __INVESTA_CLOUD_KEY__: JSON.stringify(process.env.INVESTA_CLOUD_KEY ?? ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: { port: 5173, strictPort: true },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
  },
});
