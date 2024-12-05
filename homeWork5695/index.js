const path = require("path");
const fs = require("fs");
const express = require("express");
const busboy = require("connect-busboy");
const bodyParser = require("body-parser");
const url = require("url");
const crypto = require("crypto");

const webserver = express();

webserver.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

webserver.use(bodyParser.json());

webserver.use(express.urlencoded({ extended: false }));

const port = 3550;

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
    if (filename) {
      const fileNameArr = filename.split(".");
      const extension = fileNameArr[fileNameArr.length - 1];
      const storedPFN = path.join(__dirname, "uploads", `${id}.${extension}`);

      reqFiles[fieldname] = { originalFN: filename, storedPFN: storedPFN };

      console.log(`Uploading of '${filename}' started`);

      const fstream = fs.createWriteStream(storedPFN);

      file.pipe(fstream);

      file.on("data", function (data) {
        totalDownloaded += data.length;
        console.log("loaded " + (totalDownloaded / totalRequestLength) * 100);
      });

      file.on("end", () => {
        console.log("file " + fieldname + " received");
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

webserver.listen(port, () => {
  console.log("web server running on port " + port);
});
