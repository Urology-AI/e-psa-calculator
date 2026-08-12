#!/usr/bin/env node
/**
 * Prepares lib/ (the directory `firebase deploy` uploads) for install in Cloud Build.
 *
 * @urology-ai/epsa-engine is a private package — it isn't on the public npm registry
 * and Cloud Build has no SSH key for the GitHub source, so a deploy that just copies
 * package.json across fails with `404 Not Found - @urology-ai/epsa-engine`. The engine
 * is therefore vendored into lib/vendor/epsa-engine and the deployed package.json
 * points at it with a `file:` dependency. This used to be done by hand, which meant a
 * plain `npm run build` silently overwrote it and broke the next deploy.
 *
 * package-lock.json is deliberately NOT copied: it still pins the old `@epsa/engine`
 * git dependency and doesn't describe the `file:` layout at all, so shipping it makes
 * the Cloud Build install fail on a lock/manifest mismatch.
 */
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const libDir = path.join(backendDir, 'lib');
const ENGINE = '@urology-ai/epsa-engine';
const source = path.join(backendDir, 'node_modules', ENGINE);
const target = path.join(libDir, 'vendor', 'epsa-engine');

if (!fs.existsSync(source)) {
  console.error(`prepare-deploy: ${ENGINE} is not installed — run npm install first.`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'));
pkg.dependencies[ENGINE] = 'file:./vendor/epsa-engine';
delete pkg.devDependencies; // Nothing in lib/ is compiled at deploy time.
fs.writeFileSync(path.join(libDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
fs.rmSync(path.join(libDir, 'package-lock.json'), { force: true });

const npmrc = path.join(backendDir, '.npmrc');
if (fs.existsSync(npmrc)) fs.copyFileSync(npmrc, path.join(libDir, '.npmrc'));

const version = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).version;
console.log(`prepare-deploy: vendored ${ENGINE}@${version} into lib/vendor/epsa-engine`);
