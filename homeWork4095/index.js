const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const webserver = express();
const { v4: uuidv4 } = require("uuid");

webserver.use(express.json());

webserver.use(express.urlencoded({ extended: true }));

const port = 7980;
const logDataFN = path.join(__dirname, "_data.log");

webserver.use("/", express.static(path.resolve(__dirname)));

function saveDataSync(logFilePath, config) {
  const logFd = fs.openSync(logFilePath, "a+");
  const data = fs.readFileSync(logFilePath, { encoding: "utf8", flag: "r" });

  let newData = data ? JSON.parse(data) : [];
  newData = [...newData, { ...config, id: uuidv4() }];

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

// webserver.post("/stat", (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");

//   const clientAccept = req.headers.accept;
//   if (clientAccept === "application/json") {
//     res.setHeader("Content-Type", "application/json");
//     res.send(newData);
//     return;
//   }

//   if (clientAccept === "application/xml") {
//     res.setHeader("Content-Type", "application/xml");
//     const colorsArr = Object.entries(newData);

//     const dataXML = `
//       <div>
//         ${colorsArr.map(
//           ([color, count]) => `
//             <div>
//               <span>${color}</span>:
//               <span>${count}</span>
//             </div>
//           `
//         )}
//       </div>
//     `;
//     res.send(dataXML);
//     return;
//   }

//   if (clientAccept === "text/html") {
//     res.setHeader("Content-Type", "text/html");
//     const colorsArr = Object.entries(newData);

//     const counts = colorsArr.map(
//       ([color, count]) => `<span>${color}</span>:<span>${count}</span>`
//     );

//     const dataHTML = `
//       <div>
//         ${counts}
//       </div>
//     `;
//     res.send(dataHTML);
//     return;
//   }

//   res.setHeader("Content-Type", "text/plain");
//   res.send(newData);
// });

webserver.listen(port, () => {
  console.log("web server running on port " + port);
});
