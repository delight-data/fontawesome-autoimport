const beginAt = Date.now();
const path = require("path");
const fs = require("fs");

const src = path.resolve(__dirname, "../../..", "src");
const { dependencies } = require(`${src}/../package.json`);

const styles = Object.keys(dependencies).reduce((acc, dependency) => {
  if (!/^@fortawesome.*svg-icons$/.test(dependency)) return acc;
  const [, license, name] = dependency.match(
    /^@fortawesome\/([a-z]+)-([a-z]+)-svg-icons$/
  );
  return { ...acc, [`fa${name[0]}`]: { name, license, icons: new Map() } };
}, {});

const outputFolder = `${src}/plugins`;
const outputFile = `${outputFolder}/fontawesome-autoimport.js`;

const { pattern = `\[['"](fa[a-z])['"], *['"]([a-z-]+)['"]\]` } = process.env;
const faRegex = new RegExp(pattern, "g");
const fileRegex = new RegExp(/\.(vue|js)$/);

const setIcons = file =>
  [
    ...fs
      .readFileSync(file)
      .toString()
      .matchAll(faRegex)
  ].forEach(([, style, name]) =>
    styles[style]
      ? styles[style].icons.set(name)
      : console.warn(`! Unknown icon: ${style}-${name} (in ${file})`)
  );

const parse = path =>
  fs.readdirSync(path).forEach(entry => {
    const entryPath = `${path}/${entry}`;

    fs.lstatSync(entryPath).isDirectory()
      ? parse(entryPath)
      : fileRegex.test(entry) && setIcons(entryPath);
  });

const pascalCase = str =>
  str
    .split("-")
    .reduce(
      (acc, str) => `${acc}${str[0].toUpperCase() + str.substring(1)}`,
      ""
    );

const generate = () => {
  const consolidatedIcons = [];

  let output = Object.entries(styles).reduce(
    (acc, [style, { name, license, icons }]) =>
      icons.size
        ? `${acc}\n// ${style}\nimport {${[...icons.keys()]
            .sort()
            .reduce((acc, icon) => {
              const pascalIcon = pascalCase(icon);
              consolidatedIcons.push(`${style}${pascalIcon}`);
              return `${acc}\n  fa${pascalIcon} as ${style}${pascalIcon},`;
            }, "")}\n} from "@fortawesome/${license}-${name}-svg-icons";\n`
        : acc,
    "// Auto generated by fontawesome-autoimport\n"
  );

  output += `\nimport { library } from "@fortawesome/fontawesome-svg-core";\n`;
  output += `library.add(\n  ${consolidatedIcons.join(",\n  ")}\n);\n`;

  // Update the output file only if necessary
  const prevConsolidatedIcons = [
    ...new Set(
      [
        ...(fs.existsSync(outputFile) && fs.readFileSync(outputFile))
          .toString()
          .matchAll(/fa[a-z][A-Z]\w+/g)
      ].map(([icon]) => icon)
    )
  ].sort();

  if (
    JSON.stringify(prevConsolidatedIcons) === JSON.stringify(consolidatedIcons)
  )
    return console.log(
      `- Fontawesome treeshaking list already up-to-date. (took ${Date.now() -
        beginAt} ms)`
    );

  fs.mkdir(outputFolder, { recursive: true }, err => {
    if (err) throw err;

    fs.writeFile(outputFile, output, err =>
      console.log(
        err ||
          `- Fontawesome treeshaking list generated. (took ${Date.now() -
            beginAt} ms)`
      )
    );
  });
};

parse(src);
generate();
