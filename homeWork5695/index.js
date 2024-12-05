const path = require("path");
const fs = require("fs");
const express = require("express");
const busboy = require("connect-busboy");
const url = require("url");
const crypto = require("crypto");
const WebSocket = require("ws");

const webserver = express();

const port = 7980;

const wss = new WebSocket.Server({ port: 8080 });

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

webserver.post("/upload", busboy(), (req, res) => {
  const id = crypto.randomBytes(16).toString("hex");
  const totalRequestLength = +req.headers["content-length"];
  let totalDownloaded = 0;

  let reqFields = {};
  let reqFiles = {};

  req.pipe(req.busboy);

  req.busboy.on("field", function (fieldname, val) {
    reqFields[fieldname] = val;
  });

  req.busboy.on("file", (fieldname, file, filename) => {
    if (filename.filename || filename) {
      const storedPFN = path.join(__dirname, "uploads", `${id}-${filename.filename || filename}`);

      reqFiles[fieldname] = { originalFN: filename.filename || filename, storedPFN: storedPFN };

      const fstream = fs.createWriteStream(storedPFN);

      file.pipe(fstream);

      file.on("data", function (data) {
        wss.on("connection", (ws) => {
          totalDownloaded += data.length;
          clients.push({ connection: ws, lastkeepalive: Date.now() });
          console.log("loaded " + (totalDownloaded / totalRequestLength) * 100);
          const value = (totalDownloaded / totalRequestLength) * 100;

          ws.send(value);

          ws.on("close", () => {
            console.log("the client has disconnected");
          });

          ws.onerror = function () {
            console.log("Some Error occurred");
          };

          ws.on("message", (message) => {
            if (message === "FINISH") {
              clients.forEach((client) => {
                if (client.connection === ws) {
                  client.lastkeepalive = undefined;
                  client.connection.terminate();
                }
              });
              clients = clients.filter((client) => client.connection);
              return;
            }
            if (message === "KEEP_ME_ALIVE") {
              clients.forEach((client) => {
                if (client.connection === ws) client.lastkeepalive = Date.now();
              });
            } else
              console.log("сервером получено сообщение от клиента: " + message);
          });
        });
      });

      file.on("end", () => {
        console.log("file " + fieldname + " received");
        wss.on("connection", (ws) => {
          ws.send(100);
        });
      });
    } else {
      res.redirect(
        301,
        url.format({
          pathname: "/upload",
        })
      );
      return;
    }
  });

  req.busboy.on("finish", async () => {
    console.log(
      "file saved, origin filename=" +
        reqFiles.photo.originalFN +
        ", store filename=" +
        reqFiles.photo.storedPFN
    );
    logSync({ ...reqFiles.photo, comments: reqFields.comments, id });

    res.redirect(
      301,
      url.format({
        pathname: "/upload",
      })
    );
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
