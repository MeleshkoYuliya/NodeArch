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
  { label: "green" },
  { label: "yellow" },
  { label: "blue" },
  { label: "red" },
  { label: "pink" },
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
  const colorsArr = data.split("|");

  let newData = "";

  const isExitedColor = data.includes(color);

  if (isExitedColor) {
    const newArr = colorsArr.map((item) => {
      if (item.includes(color)) {
        const [colorName, count] = item.split("=");
        const newItem = `${colorName}=${Number(count) + 1}`;
        return newItem;
      }
      return item;
    });
    newData = newArr.join("|");
  } else {
    newData = data ? `${data}|${color}=1` : `${color}=1`;
  }
  fs.closeSync(logFd);
  const logFdToWrite = fs.openSync(logFilePath, "w+");
  fs.writeFileSync(logFdToWrite, newData, { encoding: "utf8", flag: "w" });
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

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
