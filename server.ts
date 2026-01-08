import index from "./index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    // Serve bundled game.js (for production compatibility)
    "/dist/*": async (req) => {
      const url = new URL(req.url);
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/javascript" }
        });
      }
      return new Response("Not Found", { status: 404 });
    },
    // Serve static assets
    "/assets/*": async (req) => {
      const url = new URL(req.url);
      const filePath = `.${url.pathname}`;
      const file = Bun.file(filePath);

      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("Not Found", { status: 404 });
    },
    "/style.css": async () => {
      const file = Bun.file("./style.css");
      return new Response(file, {
        headers: { "Content-Type": "text/css" }
      });
    }
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("🌴 Sawit Hunter server running at http://localhost:3000");
