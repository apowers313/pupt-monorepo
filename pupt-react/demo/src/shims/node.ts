// Browser shims for Node.js built-in modules used by pupt-lib.
// These are never called at runtime in the browser — the demo only uses
// the transform/render APIs which don't require filesystem or OS access.
export const hostname = () => "browser";
export const homedir = () => "/home/browser";
export const userInfo = () => ({ username: "browser" });
export const readFileSync = () => "";
export const existsSync = () => false;
export const readdirSync = () => [];
export const statSync = () => ({ isDirectory: () => false, isFile: () => false });
export const readFile = async () => "";
export const readdir = async () => [];
export const stat = async () => ({ isDirectory: () => false, isFile: () => false });
export const access = async () => {};
export const resolve = (...args: string[]) => args.join("/");
export const join = (...args: string[]) => args.join("/");
export const dirname = (p: string) => p;
export const basename = (p: string) => p;
export const extname = (p: string) => p;
export const relative = (from: string, to: string) => to;
export const isAbsolute = () => false;
export const normalize = (p: string) => p;
export const sep = "/";
export default {
  hostname, homedir, userInfo, readFileSync, existsSync, readdirSync, statSync,
  readFile, readdir, stat, access,
  resolve, join, dirname, basename, extname, relative, isAbsolute, normalize, sep,
};
