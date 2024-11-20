const fs = require("fs");
const { createGzip } = require("node:zlib");
const { pipeline } = require("node:stream");
const { createReadStream, createWriteStream } = require("node:fs");

const { promisify } = require("node:util");
const pipe = promisify(pipeline);

const [, , arg] = process.argv;

async function do_gzip(input, output) {
  const gzip = createGzip();
  const source = createReadStream(input);
  const destination = createWriteStream(output);
  await pipe(source, gzip, destination);
}

async function print(path) {
  const files = await fs.promises.readdir(path, { withFileTypes: true });

  console.log("--------------------------------------------------------------");
  console.log(`СКАНИРУЕТСЯ ПАПКА: ${path}`);
  console.log("--------------------------------------------------------------");

  for (const file of files) {
    let createMessage = `Создается архив: ${file.name}.gz по пути ${file.path}/${file.name}.gz`;

    let gzFile = files.find((gz) => gz.name === `${file.name}.gz`);
    if (gzFile) {
      const statFile = fs.statSync(`${file.path}/${file.name}`);
      const fileModDTstatFile = new Date(statFile.mtime);

      const statGzFile = fs.statSync(`${file.path}/${gzFile.name}`);
      const fileModDTstatGzFile = new Date(statGzFile.birthtimeMs);

      if (fileModDTstatFile > fileModDTstatGzFile) {
        createMessage = `Обновляется архив: ${file.name}.gz по пути ${file.path}/${file.name}.gz`;

        fs.unlinkSync(`${file.path}/${gzFile.name}`);
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
        `${file.path}/${file.name}`,
        `${file.path}/${file.name}.gz`
      );
      console.log(
        `Архив: ${file.name}.gz по пути ${file.path}/${file.name}.gz Готов!`
      );
      console.log("              ");
    }

    if (file.isDirectory()) {
      await print(`${file.path}/${file.name}`, false);
    }
  }
}

print(arg);
