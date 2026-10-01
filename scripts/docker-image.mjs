#!/usr/bin/env node
// Reconstruye la imagen de una aplicación del monorepo con docker/app.Dockerfile.
//
//   npm run docker:app -- compras
//   npm run docker:app -- externo-consulta --no-up
//
// El objetivo es que "reconstruí el contenedor" siempre signifique "compiló el
// código que está en el working tree". Con el viejo Dockerfile de runtime, que
// sólo hacía `COPY dist/apps/<app>/browser`, reconstruir la imagen sin volver a
// correr `nx build` dejaba servido el bundle anterior sin ningún aviso.
//
// Si encuentra el compose del stack usa `docker compose build` (conserva el
// nombre de imagen y la red que espera infraestructura); si no, cae a
// `docker build` con ese mismo nombre de imagen.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// El compose declara el contexto como `${LOCAL_RESOURCE}/workspaces/angular/um/...`,
// así que LOCAL_RESOURCE es la raíz que contiene `workspaces/`.
const localResource = process.env.LOCAL_RESOURCE ?? path.resolve(repoRoot, '../../../..');

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith('--'));
const app = args.find((arg) => !arg.startsWith('--'));

function fail(message) {
  console.error(`docker:app: ${message}`);
  process.exit(1);
}

if (!app) fail('falta el nombre de la app. Uso: npm run docker:app -- <app> [--no-up]');

const apps = readdirSync(path.join(repoRoot, 'apps'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.endsWith('-e2e'))
  .map((entry) => entry.name);
if (!apps.includes(app))
  fail(`"${app}" no es una app del workspace. Disponibles: ${apps.join(', ')}`);

const flagValue = (name) => {
  const hit = flags.find((flag) => flag.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
};

const service = `tesoreria-${app}-client`;
const image = `um-${service}`;

const composeCandidates = [
  flagValue('--compose'),
  process.env.TESORERIA_COMPOSE,
  path.join(localResource, 'dropbox/infraestructura/um/docker-compose.yml'),
  path.join(localResource, 'infraestructura/um/docker-compose.yml'),
].filter(Boolean);
const composeFile = composeCandidates.find((candidate) => existsSync(candidate));

function run(command, commandArgs, options = {}) {
  console.log(`$ ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, LOCAL_RESOURCE: localResource },
    ...options,
  });
  if (result.status !== 0) fail(`el build de ${app} falló (exit ${result.status})`);
}

if (composeFile) {
  console.log(`Usando ${composeFile}`);
  run('docker', ['compose', '-f', composeFile, 'build', service]);
  if (flags.includes('--no-up')) {
    console.log(`Imagen ${image} lista (--no-up, no se recreó el contenedor).`);
  } else {
    run('docker', ['compose', '-f', composeFile, 'up', '-d', '--no-deps', service]);
    console.log(`Contenedor ${service} actualizado con la app "${app}".`);
  }
} else {
  console.log('No se encontró el compose del stack: construyendo la imagen suelta.');
  run('docker', [
    'build',
    '-f',
    'docker/app.Dockerfile',
    '--build-arg',
    `APP=${app}`,
    '-t',
    image,
    '.',
  ]);
  console.log(
    `Imagen ${image} construida. Para levantarla con el stack: docker compose up -d --no-build ${service}`,
  );
}
