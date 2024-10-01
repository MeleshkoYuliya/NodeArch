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

const handleValidate = ({ age, name }) => {
  let errors = {};

  const ageValue = Number(age);

  if (isNaN(ageValue) || ageValue < 18 || ageValue > 100) {
    errors.age =
      ageValue > 100
        ? "Age should be less than 100!"
        : "Please enter valid age!";
  } else {
    errors.age = "";
  }

  if (name.length < 4) {
    errors.name = "Name should be at least 4 symbols";
  } else {
    errors.name = "";
  }
  return errors;
};

const form = `<form
      style="display:flex; flex-direction:column; width: 400px; gap: 24px"
      name='anketa'
      novalidate
      action="/form"
      method="POST"
    >
      <h1>Pesonal Info</h1>
      <input name="name" placeholder="Enter name" style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box">
      <input name="age" placeholder="Enter age" style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box">
      <input type="submit" value="Send" style="height: 44px; width: 400px; font-size:20px; background-color: #fff" />
    </form>`;

webserver.post("/form", (req, res) => {
  const errors = handleValidate({ age: req.body.age, name: req.body.name });

  if (errors.age || errors.name) {
    res.send(`
      <html>
        <body>
          <form
            style="display:flex; flex-direction:column; width: 400px; gap: 24px"
            name='anketa'
            novalidate
            action="/form"
            method="POST"
          >
            <h1>Pesonal Info</h1>
            <div>
              <input
                name="name"
                placeholder="Enter name"
                value="${req.body.name}"
                style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box"
              >
              <div style="color:red; font-size:14px">${errors.name}</div>
            </div>
            <div>
              <input
                name="age"
                placeholder="Enter age"
                value="${req.body.age}"
                style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box"
              >
              <div style="color:red; font-size:14px">${errors.age}</div>
            </div>
            <input type="submit" value="Send" style="height: 44px; width: 400px; font-size:20px; background-color: #fff" />
          </form>
        </body>
      </html>
  `);
  } else {
    res.send(`
      <html>
        <body>
          <h1>Thank you for your submission! Received data: Name - ${req.body.name}, Age - ${req.body.age}</h1>
        </body>
      </html>
  `);
  }
});

webserver.get("/form", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Anketa</title>
      </head>
      <body>
        <div id="app">${form}</div>
      </body>
    </html>
    `);
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
