const path = require("path");
const fs = require("fs");
const express = require("express");
const busboy = require("connect-busboy");
const url = require("url");
const crypto = require("crypto");
const WebSocket = require("ws");

const webserver = express();

const port = 7980;

const wss = new WebSocket.Server({ port: 7981 });

const logFN = path.join(__dirname, "_data.log");

webserver.get("/upload", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

function logSync(item) {
  const logFd = fs.openSync(logFN, "a+");
  const data = fs.readFileSync(logFN, { encoding: "utf8", flag: "r" });

  let newData = data ? JSON.parse(data) : [];
  newData = [...newData, item];

  fs.closeSync(logFd);
  const logFdToWrite = fs.openSync(logFN, "w+");
  fs.writeFileSync(logFdToWrite, JSON.stringify(newData), {
    encoding: "utf8",
    flag: "w",
  });
  fs.closeSync(logFdToWrite);
}

let clients = [];
let timer = 0;
let totalDownloaded = 0;

webserver.post("/upload", busboy(), (req, res) => {
  let connection;
  wss.on("connection", (ws) => {
    connection = ws;
    clients.push({ connection: ws, lastkeepalive: Date.now() });
    console.log("establish websocket connection");

    ws.on("message", (message) => {
      if (message === "KEEP_ME_ALIVE") {
        clients.forEach((client) => {
          if (client.connection === ws) client.lastkeepalive = Date.now();
        });
      } else console.log("сервером получено сообщение от клиента: " + message);
    });

    ws.on("close", () => {
      console.log("the client has disconnected");
    });

    ws.onerror = function () {
      console.log("Some Error occurred");
    };
  });

  const id = crypto.randomBytes(16).toString("hex");
  const totalRequestLength = +req.headers["content-length"];

  let reqFields = {};
  let reqFiles = {};

  req.pipe(req.busboy);

  req.busboy.on("field", function (fieldname, val) {
    reqFields[fieldname] = val;
  });

  req.busboy.on("file", (fieldname, file, filename) => {
    const storedPFN = path.join(
      __dirname,
      "uploads",
      `${id}-${filename.filename || filename}`
    );

    reqFiles[fieldname] = {
      originalFN: filename.filename || filename,
      storedPFN: storedPFN,
    };

    const fstream = fs.createWriteStream(storedPFN);

    file.pipe(fstream);

    file.on("data", function (data) {
      totalDownloaded += data.length;
      console.log("loaded " + (totalDownloaded / totalRequestLength) * 100);
      const value = (totalDownloaded / totalRequestLength) * 100;

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(value);
        }
      });
    });

    file.on("end", () => {
      console.log("file " + fieldname + " received", connection);
      totalDownloaded = 0;
    });
  });

  req.busboy.on("finish", async () => {
    console.log(
      "file saved, origin filename=" +
        reqFiles.photo.originalFN +
        ", store filename=" +
        reqFiles.photo.storedPFN
    );
    logSync({ ...reqFiles.photo, comments: reqFields.comments, id });
    res.send("ok");
  });
});

webserver.get("/info", (req, res) => {
  const logFd = fs.openSync(logFN, "a+");
  const data = fs.readFileSync(logFN, { encoding: "utf8", flag: "r" });
  fs.closeSync(logFd);
  const newData = data ? JSON.parse(data) : [];

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  res.send(newData);
});

webserver.get("/file/:id", async (req, res) => {
  const filedId = req.params.id;

  const files = await fs.promises.readdir(path.join(__dirname, "uploads"));
  const currFile = files.find((item) => item.includes(filedId));
  const currFilePath = path.join(__dirname, "uploads", currFile);

  res.setHeader("Content-Disposition", "attachment");

  res.sendFile(currFilePath);
});

setInterval(() => {
  timer++;
  clients.forEach((client) => {
    if (Date.now() - client.lastkeepalive > 12000) {
      client.connection.terminate(); // если клиент уже давно не отчитывался что жив - закрываем соединение
      client.connection = null;
      console.log(
        `[${port}] ` + "один из клиентов отключился, закрываем соединение с ним"
      );
    } else client.connection.send("timer=" + timer);
  });
  clients = clients.filter((client) => client.connection); // оставляем в clients только живые соединения
}, 3000);

webserver.listen(port, () => {
  console.log("web server running on port " + port);
});
