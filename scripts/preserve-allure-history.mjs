#!/usr/bin/env node
/**
 * Historisation Allure.
 *
 * Allure ne conserve les tendances (taux de succès, durée, flakiness dans le
 * temps) que si le dossier `history` du rapport PRÉCÉDENT est réinjecté dans
 * `allure-results` AVANT de générer le nouveau rapport. Sans cette étape,
 * chaque rapport repart de zéro et les graphiques de tendance restent vides.
 *
 * Ce script gère les deux contextes :
 *  - en local  : recopie `allure-report/history` -> `allure-results/history`
 *  - en CI     : recopie le dossier publié (par défaut `gh-pages/last-history`)
 *
 * Usage :
 *   node scripts/preserve-allure-history.mjs [dossier-source]
 */

import { cp, mkdir, readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const RESULTS_DIR = 'allure-results';
const DEFAULT_SOURCES = [
  process.argv[2],
  path.join('allure-report', 'history'),
  path.join('gh-pages', 'last-history'),
].filter(Boolean);

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findHistorySource() {
  for (const candidate of DEFAULT_SOURCES) {
    if (await exists(candidate)) {
      const entries = await readdir(candidate);
      if (entries.length > 0) return candidate;
    }
  }
  return null;
}

async function main() {
  const source = await findHistorySource();

  if (!source) {
    console.log(
      'ℹ️  Aucun historique Allure trouvé — premier run, les tendances apparaîtront au prochain.',
    );
    return;
  }

  await mkdir(RESULTS_DIR, { recursive: true });
  const destination = path.join(RESULTS_DIR, 'history');

  await cp(source, destination, { recursive: true });

  const files = await readdir(destination);
  console.log(`✅ Historique Allure restauré depuis "${source}" (${files.length} fichier(s)).`);
  console.log('   Les graphiques de tendance seront alimentés dans le prochain rapport.');
}

main().catch((error) => {
  // Ne jamais faire échouer un run à cause de l'historique : c'est un confort,
  // pas une dépendance du pipeline de test.
  console.warn(`⚠️  Historisation Allure ignorée : ${error.message}`);
  process.exitCode = 0;
});
