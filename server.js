const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
require("dotenv").config();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const explicitProd = ["true", "1", "yes"].includes(
    String(process.env.PROD || "")
        .trim()
        .toLowerCase()
);
const isProd =
    explicitProd ||
    process.env.NODE_ENV === "production" ||
    ["1", "true"].includes(String(process.env.VERCEL || "").toLowerCase());
const DEV_API_BASE_URL = (process.env.API_BASE_URL || "").trim();
const PROD_API_BASE_URL = (process.env.PROD_API_BASE_URL || "").trim();
const DEV_PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").trim();
const PROD_PUBLIC_BASE_URL = (process.env.PROD_PUBLIC_BASE_URL || "").trim();
const API_BASE_URL = isProd
    ? PROD_API_BASE_URL || DEV_API_BASE_URL || "http://localhost:5000"
    : DEV_API_BASE_URL || PROD_API_BASE_URL || "http://localhost:5000";
const PUBLIC_BASE_URL = isProd
    ? PROD_PUBLIC_BASE_URL || DEV_PUBLIC_BASE_URL || `http://localhost:${PORT}`
    : DEV_PUBLIC_BASE_URL || `http://localhost:${PORT}`;

const rootDir = __dirname;

const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml"
};

const routeFiles = {
    "/": "index.html",
    "/dashboard": "dashboard.html",
    "/feedback": "feedback.html",
    "/login": "login.html",
    "/reports": "reports.html"
};

function send(response, statusCode, body, contentType) {
    response.writeHead(statusCode, { "Content-Type": contentType });
    response.end(body);
}

function serveFile(response, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (error, data) => {
        if (error) {
            if (error.code === "ENOENT") {
                send(response, 404, "File not found", "text/plain; charset=utf-8");
                return;
            }

            send(response, 500, "Internal server error", "text/plain; charset=utf-8");
            return;
        }

        send(response, 200, data, contentType);
    });
}

function getFilePath(requestPath) {
    const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
    const mappedPath = routeFiles[cleanPath] || cleanPath.replace(/^\/+/, "");
    const resolvedPath = path.resolve(rootDir, mappedPath);

    if (!resolvedPath.startsWith(rootDir)) {
        return null;
    }

    return resolvedPath;
}

function proxyApiRequest(clientRequest, clientResponse) {
    const targetUrl = new URL(clientRequest.url, API_BASE_URL);
    const transport = targetUrl.protocol === "https:" ? https : http;
    const headers = { ...clientRequest.headers };

    delete headers.host;

    const proxyRequest = transport.request(
        {
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port || undefined,
            path: `${targetUrl.pathname}${targetUrl.search}`,
            method: clientRequest.method,
            headers
        },
        (proxyResponse) => {
            clientResponse.writeHead(
                proxyResponse.statusCode || 502,
                proxyResponse.statusMessage || "",
                proxyResponse.headers
            );
            proxyResponse.pipe(clientResponse);
        }
    );

    proxyRequest.on("error", (error) => {
        const body = JSON.stringify({
            success: false,
            message: "Unable to reach backend API.",
            error: error.message
        });

        send(clientResponse, 502, body, "application/json; charset=utf-8");
    });

    clientRequest.pipe(proxyRequest);
}

function requestHandler(request, response) {
    const requestPath = request.url || "/";

    if (requestPath.startsWith("/api/")) {
        proxyApiRequest(request, response);
        return;
    }

    if (requestPath === "/config.js") {
        const body = `window.APP_CONFIG = ${JSON.stringify(
            {
                API_BASE_URL,
                APP_BASE_URL: PUBLIC_BASE_URL
            },
            null,
            2
        )};`;

        send(response, 200, body, "application/javascript; charset=utf-8");
        return;
    }

    const filePath = getFilePath(requestPath);

    if (!filePath) {
        send(response, 403, "Forbidden", "text/plain; charset=utf-8");
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error) {
            send(response, 404, "File not found", "text/plain; charset=utf-8");
            return;
        }

        if (stats.isDirectory()) {
            serveFile(response, path.join(filePath, "index.html"));
            return;
        }

        serveFile(response, filePath);
    });
}

const server = http.createServer(requestHandler);

if (require.main === module) {
    server.listen(PORT, HOST, () => {
        console.log(`Frontend running on ${PUBLIC_BASE_URL}`);
        console.log(`Backend API configured as ${API_BASE_URL}`);
        console.log(`Production mode: ${isProd}`);
    });
}

module.exports = requestHandler;
