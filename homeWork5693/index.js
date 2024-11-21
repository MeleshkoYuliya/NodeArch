const fs = require("fs");
const path = require("path");
const { createGzip } = require("node:zlib");
const { pipeline } = require("node:stream");
const { createReadStream, createWriteStream } = require("node:fs");

const { promisify } = require("node:util");
const pipe = promisify(pipeline);

const arg = process.argv[2];

async function do_gzip(input, output) {
  const gzip = createGzip();
  const source = createReadStream(input);
  const destination = createWriteStream(output);
  await pipe(source, gzip, destination);
}

async function print(value) {
  try {
    const files = await fs.promises.readdir(value, { withFileTypes: true });

    console.log(
      "--------------------------------------------------------------"
    );
    console.log(`СКАНИРУЕТСЯ ПАПКА: ${value}`);
    console.log(
      "--------------------------------------------------------------"
    );

    for (const file of files) {
      let createMessage = `Создается архив: ${file.name}.gz по пути ${path.join(file.parentPath, file.name)}.gz`;

      let gzFile = files.find((gz) => gz.name === `${file.name}.gz`);

      if (gzFile) {
        const statFile = await fs.promises.stat(path.join(file.parentPath, file.name));
        const fileModDTstatFile = new Date(statFile.mtime);

        const statGzFile = await fs.promises.stat(path.join(file.parentPath, gzFile.name));
        const fileModDTstatGzFile = new Date(statGzFile.birthtimeMs);

        if (fileModDTstatFile > fileModDTstatGzFile) {
          createMessage = `Обновляется архив: ${
            file.name
          }.gz по пути ${path.join(file.parentPath, gzFile.name)}`;

          fs.unlinkSync(path.join(file.parentPath, gzFile.name));
          gzFile = null;
        }
      }

      if (
        !file.isDirectory() &&
        !file.name.startsWith(".") &&
        !gzFile &&
        !file.name.includes(".gz")
      ) {
        console.log(createMessage);
        await do_gzip(
          path.join(file.parentPath, file.name),
          path.join(file.parentPath, `${file.name}.gz`)
        );
        console.log(
          `Архив: ${file.name}.gz по пути ${path.join(file.parentPath, file.name)}.gz Готов!`
        );
        console.log("              ");
      }

      if (file.isDirectory()) {
        await print(path.join(file.parentPath, file.name));
      }
    }
  } catch (err) {
    console.log(err);
  }
}

print(arg);
