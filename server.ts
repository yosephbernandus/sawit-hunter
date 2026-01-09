const isDev = process.env.NODE_ENV !== "production";

// Helper to get MIME type
function getMimeType(pathname: string): string {
  if (pathname.endsWith(".html")) return "text/html";
  if (pathname.endsWith(".css")) return "text/css";
  if (pathname.endsWith(".js")) return "application/javascript";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

    // Serve index.html for root
    if (pathname === "/" || pathname === "/index.html") {
      const file = Bun.file("./index.html");
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": isDev ? "no-cache" : "public, max-age=3600"
          }
        });
      }
    }

    // Serve static files
    const filePath = `.${pathname}`;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type": getMimeType(pathname),
          "Cache-Control": isDev ? "no-cache" : "public, max-age=86400"
        }
      });
    }

    console.warn(`[404] File not found: ${filePath}`);
    return new Response("Not Found", { status: 404 });
  },
  development: isDev ? {
    hmr: true,
    console: true,
  } : undefined,
});

console.log(`🌴 Sawit Hunter server running at http://localhost:3000 (${isDev ? "development" : "production"} mode)`);
