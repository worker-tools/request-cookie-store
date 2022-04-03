// ex. scripts/build_npm.ts
import { basename, extname } from "https://deno.land/std@0.133.0/path/mod.ts";
import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./npm");

async function latestVersion() {
  return new TextDecoder().decode(
    await Deno.run({ cmd: ['git', 'tag', '--sort=committerdate'], stdout: 'piped' }).output()
  ).trim().split('\n').at(-1)?.replace(/^v/, '') ?? '0.0.1'
}

const name = basename(Deno.cwd())

await build({
  entryPoints: ["./index.ts"],
  outDir: "./npm",
  shims: {},
  test: false,
  mappings: {
    "https://esm.sh/cookie-store-interface@0.1.1/index.js": {
      name: "cookie-store-interface",
      version: "^0.1.1",
    },
  },
  package: {
    // package.json properties
    name: `@worker-tools/${name}`,
    version: await latestVersion(),
    description: "",
    license: "MIT",
    repository: {
      type: "git",
      url: `git+https://github.com/worker-tools/${name}.git`,
    },
    bugs: {
      url: `https://github.com/worker-tools/${name}/issues`,
    },
  },
});

// post build steps
for await (const { isFile, name } of Deno.readDir('.')) {
  if (isFile && extname(name) === '.md') {
    console.log(`Copying ${name}...`)
    await Deno.copyFile(name, `npm/${name}`);
  }
}