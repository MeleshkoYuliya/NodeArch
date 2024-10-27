const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const url = require("url");

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

const getForm = (data) => {
  data = data || {
    name: "",
    age: "",
    errors: {
      name: "",
      age: "",
    },
  };
  return `
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
  `;
};

webserver.post("/form", (req, res) => {
  const errors = handleValidate({ age: req.body.age, name: req.body.name });

  if (errors.age || errors.name) {
    res.redirect(
      301,
      url.format({
        pathname: "/form",
        query: {
          name: req.body.name,
          age: req.body.age,
          nameError: errors.name,
          ageError: errors.age,
        },
      })
    );
  } else {
    res.redirect(
      301,
      url.format({
        pathname: "/form",
        query: {
          name: req.body.name,
          age: req.body.age,
        },
      })
    );
  }
});

webserver.get("/form", (req, res) => {
  console.log(req.query);
  const query = req.query;

  if (query.name && query.age && !query.ageError && !query.nameError) {
    res.send(`
      <html>
        <body>
          <h1>Thank you for your submission! Received data: Name - ${req.query.name}, Age - ${req.query.age}</h1>
        </body>
      </html>
  `);
  }

  if (query.ageError || query.nameError) {
    res.send(
      getForm({
        name: query.name,
        age: query.age,
        errors: {
          name: query.nameError || "",
          age: query.ageError || "",
        },
      })
    );
  }

  res.send(getForm());
});

webserver.listen(port, () => {
  logLineSync(logFN, "web server running on port " + port);
});
