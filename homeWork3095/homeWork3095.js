const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");

const webserver = express();

webserver.use(express.urlencoded({ extended: true }));

const port = 7980;
const logFN = path.join(__dirname, "_server.log");
const logVotesFN = path.join(__dirname, "_data.log");
const colors = [
  { label: "Green", id: "green" },
  { label: "Yellow", id: "yellow" },
  { label: "Blue", id: "blue" },
  { label: "Red", id: "red" },
  { label: "Pink", id: "pink" },
];

function logLineSync(logFilePath, logLine) {
  const logDT = new Date();
  let time = logDT.toLocaleDateString() + " " + logDT.toLocaleTimeString();
  let fullLogLine = time + " " + logLine;

  console.log(fullLogLine);

  const logFd = fs.openSync(logFilePath, "a+");
  fs.writeSync(logFd, fullLogLine + os.EOL);
  fs.closeSync(logFd);
}

function logVotesSync(logFilePath, color) {
  const logFd = fs.openSync(logFilePath, "a+");
  const data = fs.readFileSync(logFilePath, { encoding: "utf8", flag: "r" });

  let newData = data ? JSON.parse(data) : {};
  const savedCount = newData[color] || 0
  newData = {...newData, [color]: savedCount + 1}

  fs.closeSync(logFd);
  const logFdToWrite = fs.openSync(logFilePath, "w+");
  fs.writeFileSync(logFdToWrite, JSON.stringify(newData), { encoding: "utf8", flag: "w" });
  fs.closeSync(logFdToWrite);
}

webserver.get("/variants", (req, res) => {
  res.status(200).send(colors);
});

webserver.post("/vote", (req, res) => {
  logVotesSync(logVotesFN, req.body.color);
  res.send(`Voted, color: ${req.body.color}!`);
});

webserver.get("/voting", (req, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

webserver.post("/stat", (req, res) => {
  const logFd = fs.openSync(logVotesFN, "a+");
  const data = fs.readFileSync(logVotesFN, { encoding: "utf8", flag: "r" });
  const newData = data ? JSON.parse(data) : {};
  fs.closeSync(logFd);
  res.status(200).send(JSON.stringify(newData));
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
