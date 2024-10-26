const express = require("express");
const fs = require("fs");
const path = require("path");
const webserver = express();
const fetch = require("isomorphic-fetch");
const crypto = require("crypto");

webserver.use(express.json());

webserver.use(express.urlencoded({ extended: true }));

const port = 7980;
const logDataFN = path.join(__dirname, "_data.log");

webserver.use("/", express.static(path.resolve(__dirname)));

function saveDataSync(logFilePath, config) {
  const logFd = fs.openSync(logFilePath, "a+");
  const data = fs.readFileSync(logFilePath, { encoding: "utf8", flag: "r" });

  let newData = data ? JSON.parse(data) : [];
  newData = [
    ...newData,
    { ...config, id: crypto.randomBytes(16).toString("hex") },
  ];

  fs.closeSync(logFd);

  const logFdToWrite = fs.openSync(logFilePath, "w+");

  fs.writeFileSync(logFdToWrite, JSON.stringify(newData), {
    encoding: "utf8",
    flag: "w",
  });
  fs.closeSync(logFdToWrite);
}

webserver.post("/save-config", (req, res) => {
  saveDataSync(logDataFN, req.body);
  res.send("Request config saved!");
});

webserver.get("/requests", (req, res) => {
  const logFd = fs.openSync(logDataFN, "a+");
  const data = fs.readFileSync(logDataFN, { encoding: "utf8", flag: "r" });
  fs.closeSync(logFd);
  const newData = data ? JSON.parse(data) : [];
  res.status(200).send(newData);
});

webserver.post("/send-request", async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const options = {
      method: req.body.method,
      headers: {
        ...req.body.headers,
        redirect: "error",
      },
    };

    if (req.body.method !== "GET") {
      options.body = req.body.body;
    }

    const params = req.body.params
      ? new URLSearchParams(req.body.params).toString()
      : "";

    const url = params ? `${req.body.url}?${params}` : req.body.url;

    const response = await fetch(url, { ...options });
    const headers = [...response.headers];
    const json = await response.text();
    res.send({ json, headers, status: response.status });

  } catch (err) {
    res.send({ status: 400 });
    console.error(`Fetch problem: ${err.message}`);
  }
});

webserver.listen(port, () => {
  console.log("web server running on port " + port);
});
