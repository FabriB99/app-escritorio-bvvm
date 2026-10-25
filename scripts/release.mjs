#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Rutas de archivos a sincronizar
const tauriConfPath = path.join(rootDir, 'apps/escritorio/src-tauri/tauri.conf.json');
const escritorioPkgPath = path.join(rootDir, 'apps/escritorio/package.json');
const cargoTomlPath = path.join(rootDir, 'apps/escritorio/src-tauri/Cargo.toml');
const rootPkgPath = path.join(rootDir, 'package.json');

// Utilidad para ejecutar comandos Git de forma segura
function runGit(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { cwd: rootDir, stdio: 'pipe' }).toString().trim();
  } catch (err) {
    if (ignoreError) return '';
    throw err;
  }
}

function parseSemVer(v) {
  const match = v.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

async function main() {
  console.log('\n======================================================');
  console.log('   Control BVVM - Automatización de Releases');
  console.log('======================================================\n');

  // 1. Validaciones previas de Git
  try {
    runGit('git rev-parse --is-inside-work-tree');
  } catch {
    console.error('❌ Error: Este script debe ejecutarse dentro del repositorio Git de Control BVVM.');
    process.exit(1);
  }

  const currentBranch = runGit('git branch --show-current');
  const rl = readline.createInterface({ input, output });

  if (currentBranch !== 'main') {
    console.warn(`⚠️  Advertencia: Estás en la rama '${currentBranch}', pero los releases oficiales se publican desde 'main'.`);
    const proceedOtherBranch = await rl.question('¿Deseas continuar de todas formas? (s/N): ');
    if (proceedOtherBranch.trim().toLowerCase() !== 's') {
      console.log('Operación cancelada. Cambiá a la rama main con "git checkout main" y volvé a intentar.');
      rl.close();
      process.exit(0);
    }
  }

  // 2. Leer versión actual desde tauri.conf.json
  if (!fs.existsSync(tauriConfPath)) {
    console.error(`❌ Error: No se encontró el archivo ${tauriConfPath}`);
    rl.close();
    process.exit(1);
  }

  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  const currentVersion = tauriConf.version;
  const parsed = parseSemVer(currentVersion);

  if (!parsed) {
    console.error(`❌ Error: La versión actual '${currentVersion}' en tauri.conf.json no sigue el formato SemVer (X.Y.Z).`);
    rl.close();
    process.exit(1);
  }

  console.log(`📌 Versión actual: v${currentVersion}`);

  // Opciones de incremento
  const patchVersion = `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  const minorVersion = `${parsed.major}.${parsed.minor + 1}.0`;
  const majorVersion = `${parsed.major + 1}.0.0`;

  // Parseo de argumentos de línea de comandos
  const args = process.argv.slice(2);
  let targetVersion = null;
  let customNotes = null;
  let autoConfirm = false;
  let noPush = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === 'patch') targetVersion = patchVersion;
    else if (arg === 'minor') targetVersion = minorVersion;
    else if (arg === 'major') targetVersion = majorVersion;
    else if (/^\d+\.\d+\.\d+$/.test(arg)) targetVersion = arg;
    else if (arg === '-m' || arg === '--notes') {
      customNotes = args[++i];
    } else if (arg === '-y' || arg === '--yes') {
      autoConfirm = true;
    } else if (arg === '--no-push') {
      noPush = true;
    }
  }

  // Si no se pasó versión por argumentos, preguntar interactivamente
  if (!targetVersion) {
    console.log('\nSeleccioná el tipo de incremento de versión:');
    console.log(`  1) Patch  -> v${patchVersion}  (correcciones de errores, ajustes menores)`);
    console.log(`  2) Minor  -> v${minorVersion}  (nuevas funcionalidades o módulos)`);
    console.log(`  3) Major  -> v${majorVersion}  (cambios grandes / breaking changes)`);
    console.log(`  4) Personalizada`);

    const opcion = await rl.question('\nOpción [1-4] (default: 1): ');
    const choice = opcion.trim();

    if (choice === '2') {
      targetVersion = minorVersion;
    } else if (choice === '3') {
      targetVersion = majorVersion;
    } else if (choice === '4') {
      const customVer = await rl.question('Ingresá la versión exacta (ej: 0.4.0): ');
      if (!/^\d+\.\d+\.\d+$/.test(customVer.trim())) {
        console.error('❌ Formato de versión inválido. Debe ser X.Y.Z.');
        rl.close();
        process.exit(1);
      }
      targetVersion = customVer.trim();
    } else {
      // Default: 1 (patch)
      targetVersion = patchVersion;
    }
  }

  // Verificar si el tag ya existe en git
  const existingTag = runGit(`git tag -l v${targetVersion}`, true);
  if (existingTag) {
    console.error(`❌ Error: El tag 'v${targetVersion}' ya existe en el repositorio.`);
    rl.close();
    process.exit(1);
  }

  // Solicitar notas de la versión si no fueron pasadas
  let notes = customNotes;
  if (!notes) {
    const notesInput = await rl.question(`\nNotas de la versión v${targetVersion} (descripción de cambios): `);
    notes = notesInput.trim() || `Actualización del sistema Control BVVM v${targetVersion}`;
  }

  // Estado del árbol de trabajo
  const status = runGit('git status --porcelain');
  let includeAllChanges = false;
  if (status) {
    console.log('\n⚠️  Hay cambios sin commitear en el repositorio:');
    console.log(status.split('\n').map(l => '   ' + l).join('\n'));
    if (!autoConfirm) {
      const answer = await rl.question('\n¿Deseas incluir todos estos cambios en el commit del release? (s/N): ');
      if (answer.trim().toLowerCase() === 's') {
        includeAllChanges = true;
      } else {
        console.log('Operación cancelada. Hacé commit o stash de tus cambios antes de lanzar una versión.');
        rl.close();
        process.exit(0);
      }
    } else {
      includeAllChanges = true;
    }
  }

  // Resumen previo a la confirmación
  console.log('\n------------------------------------------------------');
  console.log(`  Lanzamiento preparado:`);
  console.log(`  - Versión anterior: v${currentVersion}`);
  console.log(`  - Nueva versión:    v${targetVersion}`);
  console.log(`  - Tag Git:          v${targetVersion}`);
  console.log(`  - Notas / Mensaje:  "${notes}"`);
  console.log(`  - Push a GitHub:    ${noPush ? 'NO (--no-push activado)' : 'SÍ (origin main y tag)'}`);
  console.log('------------------------------------------------------\n');

  if (!autoConfirm) {
    const confirm = await rl.question('¿Proceder con el lanzamiento de la versión? (s/N): ');
    if (confirm.trim().toLowerCase() !== 's') {
      console.log('Lanzamiento cancelado.');
      rl.close();
      process.exit(0);
    }
  }
  rl.close();

  // 3. Sincronizar archivos de configuración
  console.log('\n📝 Actualizando archivos de versión...');

  // 3.1 tauri.conf.json
  tauriConf.version = targetVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`  ✔ apps/escritorio/src-tauri/tauri.conf.json -> v${targetVersion}`);

  // 3.2 apps/escritorio/package.json
  if (fs.existsSync(escritorioPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(escritorioPkgPath, 'utf8'));
    pkg.version = targetVersion;
    fs.writeFileSync(escritorioPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  ✔ apps/escritorio/package.json -> v${targetVersion}`);
  }

  // 3.3 apps/escritorio/src-tauri/Cargo.toml
  if (fs.existsSync(cargoTomlPath)) {
    let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    cargoToml = cargoToml.replace(
      /(\[package\][\s\S]*?version\s*=\s*")[^"]+(")/,
      `$1${targetVersion}$2`
    );
    fs.writeFileSync(cargoTomlPath, cargoToml);
    console.log(`  ✔ apps/escritorio/src-tauri/Cargo.toml -> v${targetVersion}`);
  }

  // 3.4 Root package.json (si existe)
  if (fs.existsSync(rootPkgPath)) {
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    rootPkg.version = targetVersion;
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
    console.log(`  ✔ package.json (raíz) -> v${targetVersion}`);
  }

  // 4. Git add, commit y tag
  console.log('\n📦 Creando commit y tag en Git...');
  if (includeAllChanges) {
    runGit('git add -A');
  } else {
    runGit(`git add "${tauriConfPath}" "${escritorioPkgPath}" "${cargoTomlPath}" "${rootPkgPath}"`);
  }

  const commitMsg = `chore: release v${targetVersion} - ${notes}`;
  runGit(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  console.log(`  ✔ Commit creado: "${commitMsg}"`);

  const tagMsg = `Release v${targetVersion}: ${notes}`;
  runGit(`git tag -a v${targetVersion} -m "${tagMsg.replace(/"/g, '\\"')}"`);
  console.log(`  ✔ Tag 'v${targetVersion}' creado.`);

  // 5. Git push
  if (!noPush) {
    console.log('\n🚀 Pusheando a GitHub (rama main y tag)...');
    try {
      execSync(`git push origin ${currentBranch}`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`git push origin v${targetVersion}`, { cwd: rootDir, stdio: 'inherit' });
      console.log('  ✔ Push completado con éxito.');
    } catch (pushErr) {
      console.error('\n❌ Error al pushear a GitHub. Podés pushear manualmente con:');
      console.error(`   git push origin ${currentBranch} && git push origin v${targetVersion}`);
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log(`🎉 ¡Versión v${targetVersion} publicada con éxito!`);
    console.log('======================================================');
    console.log('\nPróximos pasos automáticos:');
    console.log('1. GitHub Actions detectó el tag v' + targetVersion + ' y comenzó el build.');
    console.log('2. Compilará el instalador MSI para Windows y lo firmará con la clave privada.');
    console.log('3. Creará la Release en GitHub con los instaladores adjuntos.');
    console.log('4. Actualizará docs/latest.json automáticamente en la rama main [skip ci].');
    console.log('5. GitHub Pages publicará el nuevo archivo del updater.');
    console.log('6. Las computadoras de los bomberos recibirán el aviso de actualización al abrir la app.\n');
  } else {
    console.log('\nℹ️  Modo --no-push: Los cambios y el tag se crearon localmente.');
    console.log('Para iniciar el release automático en GitHub Actions, ejecutá:');
    console.log(`   git push origin ${currentBranch} && git push origin v${targetVersion}\n`);
  }
}

main().catch(err => {
  console.error('\n❌ Error inesperado durante el release:', err);
  process.exit(1);
});
