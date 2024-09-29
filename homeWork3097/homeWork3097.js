const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");

const webserver = express();

webserver.use(express.urlencoded({ extended: true }));

const port = 7981;
const logFN = path.join(__dirname, "_server.log");

function logLineSync(logFilePath, logLine) {
  const logDT = new Date();
  let time = logDT.toLocaleDateString() + " " + logDT.toLocaleTimeString();
  let fullLogLine = time + " " + logLine;

  console.log(fullLogLine);

  const logFd = fs.openSync(logFilePath, "a+");
  fs.writeSync(logFd, fullLogLine + os.EOL);
  fs.closeSync(logFd);
}

function handleValidate(values) {
  const { age, name } = values;

  let errors;
  console.log(age, name, "!!!!!");
  if (!age || Number(age) < 18) {
    errors.age = "Please enter valid age!";
  } else {
    errors.age = "";
  }

  if (!name || name?.length < 3) {
    errors.name = "Name should be at least 4 symbols";
  } else {
    errors.name = "";
  }

  return errors;
}

webserver.post("/send", (req, res) => {
  const validationErrors = handleValidate(req.body);
  res.send(`Data: ${JSON.stringify(req.body)}`);
});

webserver.get("/form", (req, res) => {
  res.status(200).send(
    `<form
      style="display:flex; flex-direction:column; width: 400px; gap: 24px"
      name='anketa'
      method=post
      action='/send'
      novalidate
      target="example"
    >
      <h1>Pesonal Info</h1>
      <input name="name" placeholder="Enter name">
      <input name="age" placeholder="Enter age">
      <input type="submit" value="Send" />
    </form>`
  );
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
