import { readFile, mkdir, writeFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = (await readFile(path.join(root, 'pocketbase/version'), 'utf8')).trim();
const platform = { linux: 'linux', darwin: 'darwin', win32: 'windows' }[process.platform];
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
if (!platform || !arch) throw new Error('Unsupported platform or architecture');
const directory = path.join(root, 'pocketbase/.bin', version);
const binary = path.join(directory, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const args = process.argv.slice(2);

if (args[0] === 'install') {
  const archive = `pocketbase_${version}_${platform}_${arch}.zip`;
  const checksums = await readFile(path.join(root, 'pocketbase/checksums.txt'), 'utf8');
  const expected = checksums.split('\n').find((line) => line.endsWith(`  ${archive}`))?.split(' ')[0];
  if (!expected) throw new Error(`Missing pinned checksum for ${archive}`);
  const response = await fetch(`https://github.com/pocketbase/pocketbase/releases/download/v${version}/${archive}`);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('PocketBase checksum mismatch');
  await mkdir(directory, { recursive: true });
  const archivePath = path.join(directory, archive);
  await writeFile(archivePath, bytes);
  const extraction = process.platform === 'win32'
    ? spawnSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${directory.replaceAll("'", "''")}' -Force`], { stdio: 'inherit' })
    : spawnSync('unzip', ['-o', archivePath, '-d', directory], { stdio: 'inherit' });
  if (extraction.error) throw extraction.error;
  if (extraction.status !== 0) throw new Error('Archive extraction failed');
  await chmod(binary, 0o755);
  console.log(`Installed PocketBase ${version}. Run pnpm run pb:dev.`);
} else {
  const pocketbaseRoot = path.join(root, 'pocketbase');
  const child = spawn(binary, [
    `--dir=${path.join(pocketbaseRoot, 'pb_data')}`,
    `--migrationsDir=${path.join(pocketbaseRoot, 'pb_migrations')}`,
    `--hooksDir=${path.join(pocketbaseRoot, 'pb_hooks')}`,
    `--publicDir=${path.join(pocketbaseRoot, 'pb_public')}`,
    ...args,
  ], { cwd: pocketbaseRoot, stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(error.code === 'ENOENT' ? 'Run pnpm run pb:install first.' : error.message);
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code, signal) => {
    process.exitCode = signal ? (signal === 'SIGINT' ? 130 : 143) : code ?? 1;
  });
}
