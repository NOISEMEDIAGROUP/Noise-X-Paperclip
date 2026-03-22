import Prism from "prismjs";

const prismGlobal = globalThis as typeof globalThis & {
  Prism?: unknown;
};

if (!prismGlobal.Prism) {
  prismGlobal.Prism = Prism;
}

export {};
