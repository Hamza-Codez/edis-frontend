/* eslint-disable @typescript-eslint/no-require-imports */
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // The app imports through the "@/" alias declared in tsconfig. Without the
  // same mapping here, a component using it cannot be tested at all — the
  // failure is a module-not-found on a path that resolves fine in the build.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
