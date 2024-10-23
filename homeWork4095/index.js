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
  const time = logDT.toLocaleDateString() + " " + logDT.toLocaleTimeString();
  const fullLogLine = time + " " + logLine;
  const logFd = fs.openSync(logFilePath, "a+");
  fs.writeSync(logFd, fullLogLine + os.EOL);
  fs.closeSync(logFd);
}

function logVotesSync(logFilePath, color) {
  const logFd = fs.openSync(logFilePath, "a+");
  const data = fs.readFileSync(logFilePath, { encoding: "utf8", flag: "r" });

  let newData = data ? JSON.parse(data) : {};
  const savedCount = newData[color] || 0;
  newData = { ...newData, [color]: savedCount + 1 };

  fs.closeSync(logFd);

  const logFdToWrite = fs.openSync(logFilePath, "w+");

  fs.writeFileSync(logFdToWrite, JSON.stringify(newData), {
    encoding: "utf8",
    flag: "w",
  });
  fs.closeSync(logFdToWrite);
}

webserver.get("/variants", (req, res) => {
  res.status(200).send(colors);
});

webserver.post("/vote", (req, res) => {
  logVotesSync(logVotesFN, req.body.color);
  res.send(`Voted, color: ${req.body.color}!`);
});

webserver.use(
  "/voting",
  express.static(path.resolve(__dirname))
);


webserver.post("/stat", (req, res) => {
  const logFd = fs.openSync(logVotesFN, "a+");
  const data = fs.readFileSync(logVotesFN, { encoding: "utf8", flag: "r" });
  fs.closeSync(logFd);
  const newData = data ? JSON.parse(data) : {};

  res.setHeader("Access-Control-Allow-Origin", "*");

  const clientAccept = req.headers.accept;
  if (clientAccept === "application/json") {
    res.setHeader("Content-Type", "application/json");
    res.send(newData);
    return;
  }

  if (clientAccept === "application/xml") {
    res.setHeader("Content-Type", "application/xml");
    const colorsArr = Object.entries(newData);

    const dataXML = `
      <div>
        ${colorsArr.map(
          ([color, count]) => `
            <div>
              <span>${color}</span>:
              <span>${count}</span>
            </div>
          `
        )}
      </div>
    `;
    res.send(dataXML);
    return;
  }

  if (clientAccept === "text/html") {
    res.setHeader("Content-Type", "text/html");
    const colorsArr = Object.entries(newData);

    const counts = colorsArr.map(
      ([color, count]) => `<span>${color}</span>:<span>${count}</span>`
    );

    const dataHTML = `
      <div>
        ${counts}
      </div>
    `;
    res.send(dataHTML);
    return;
  }

  res.setHeader("Content-Type", "text/plain");
  res.send(newData);
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
