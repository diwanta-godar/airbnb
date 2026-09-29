#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function log(msg) {
  console.log(`[build] ${msg}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  if (result.error) {
    console.error(`[build] failed to start ${command}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const swcBin = path.join(root, "node_modules", "@swc", "cli", "bin", "swc.js");
const tscBin = path.join(root, "node_modules", "typescript", "bin", "tsc");

if (!fs.existsSync(swcBin)) {
  console.error(
    "[build] @swc/cli is missing. Run: npm install"
  );
  process.exit(1);
}

log("cleaning dist/");
fs.rmSync(dist, { recursive: true, force: true });

log("compiling with SWC (fast)...");
run(process.execPath, [
  swcBin,
  "src",
  "-d",
  "dist",
  "--config-file",
  ".swcrc",
  "--strip-leading-paths",
]);

if (process.argv.includes("--check") && fs.existsSync(tscBin)) {
  log("typechecking with tsc --noEmit...");
  run(process.execPath, [tscBin, "--noEmit"]);
}

log("done → dist/");
