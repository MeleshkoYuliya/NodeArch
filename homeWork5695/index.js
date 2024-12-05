const path = require("path");
const fs = require("fs");
const express = require("express");
const busboy = require("connect-busboy");
const bodyParser = require("body-parser");
const url = require("url");

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
  const totalRequestLength = +req.headers["content-length"];
  let totalDownloaded = 0;

  let reqFields = {};
  let reqFiles = {};

  req.pipe(req.busboy);

  req.busboy.on("field", function (fieldname, val) {
    reqFields[fieldname] = val;
  });

  req.busboy.on("file", (fieldname, file, filename) => {
    const storedPFN = path.join(__dirname, "uploads", filename);

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
  });

  req.busboy.on("finish", async () => {
    console.log(
      "file saved, origin filename=" +
        reqFiles.photo.originalFN +
        ", store filename=" +
        reqFiles.photo.storedPFN
    );
    logSync({ ...reqFiles.photo, comments: reqFields.comments });
    res.redirect(
      301,
      url.format({
        pathname: "/upload",
      })
    );
  });
});

webserver.listen(port, () => {
  console.log("web server running on port " + port);
});
