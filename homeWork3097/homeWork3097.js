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

  if (isNaN(Number(age)) || Number(age) < 18) {
    errors.age = "Please enter valid age!";
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
      action="/send"
      method="POST"
    >
      <h1>Pesonal Info</h1>
      <input name="name" placeholder="Enter name" style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box">
      <input name="age" placeholder="Enter age" style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box">
      <input type="submit" value="Send" style="height: 44px; width: 400px; font-size:20px; background-color: #fff" />
    </form>`;

webserver.post("/send", (req, res) => {
  const errors = handleValidate({ age: req.body.age, name: req.body.name });

  if (errors.age || errors.name) {
    res.send(`
      <html>
          <body>
              <form id="redirectForm" method="post" action="/form">
                <input type="hidden" name="data" value='${JSON.stringify({
                  errors,
                  age: req.body.age,
                  name: req.body.name,
                })}' />
              </form>
              <script>
                  document.getElementById('redirectForm').submit();
              </script>
          </body>
      </html>
  `);
  } else {
    res.send(`
      <html>
          <body>
              <form id="redirectForm" method="post" action="/thank-you">
                <input type="hidden" name="data" value='${JSON.stringify(
                  req.body
                )}' />
              </form>
              <script>
                  document.getElementById('redirectForm').submit();
              </script>
          </body>
      </html>
  `);
  }
});

webserver.post("/thank-you", (req, res) => {
  const data = JSON.parse(req.body.data);
  res.send(
    `Thank you for your submission! Received data: Name - ${data.name}, Age - ${data.age}`
  );
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

webserver.post("/form", (req, res) => {
  const data = JSON.parse(req.body.data);

  res.send(`
        <html>
            <body>
                <form
                  style="display:flex; flex-direction:column; width: 400px; gap: 24px"
                  name='anketa'
                  novalidate
                  action="/send"
                  method="POST"
                >
                  <h1>Pesonal Info</h1>
                  <div>
                    <input
                      name="name"
                      placeholder="Enter name"
                      value="${data.name}"
                      style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box"
                    >
                    <div style="color:red; font-size:14px">${data.errors.name}</div>
                  </div>
                  <div>
                    <input
                      name="age"
                      placeholder="Enter age"
                      value="${data.age}"
                      style="width: 400px; padding: 12px; font-size:20px; box-sizing: border-box"
                    >
                    <div style="color:red; font-size:14px">${data.errors.age}</div>
                  </div>
                  <input type="submit" value="Send" style="height: 44px; width: 400px; font-size:20px; background-color: #fff" />
                </form>
            </body>
        </html>
    `);
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
