# QA Starter Kit — SaaS B2B

Socle de test automatisé pour produits SaaS B2B : **Playwright + TypeScript**, Page Object Model, tests API, reporting **Allure** avec historisation, CI **GitHub Actions** parallélisée.

Le kit couvre les parcours qui touchent au revenu : inscription, activation, contrôle d'accès par rôle, limites de sièges et changement d'abonnement.

[![Tests](https://github.com/OWNER/REPO/actions/workflows/tests.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/tests.yml)

---

## Démarrage — 30 secondes, sans rien configurer

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

Aucune application à fournir : le dépôt embarque **Nimbus**, une application SaaS B2B de démonstration que Playwright démarre automatiquement. La suite tourne hors ligne, sans dépendance réseau.

Rapport Allure avec tendances :

```bash
npm run allure:full
```

---

## Résultat d'exécution vérifié

| | |
|---|---|
| Tests collectés | 140 sur 6 projets |
| Suite complète (api + e2e-chromium) | **52 passés, 1 ignoré, 0 échec** |
| Exécution en parallèle | 4 workers, aucune collision d'état |
| Typecheck TypeScript strict | 0 erreur |
| Historisation Allure | validée sur runs successifs |

---

## Ce que le kit démontre

| | |
|---|---|
| **Page Object Model** | Aucun sélecteur en dur dans les tests. |
| **TypeScript strict** | `noUncheckedIndexedAccess`, fixtures et client API typés. |
| **Sessions par rôle** | `owner`, `admin`, `member` authentifiés une fois via `storageState`. |
| **Isolation multi-tenant** | Chaque test mutant crée sa propre organisation : parallélisable sans collision. |
| **Contrôle d'accès vérifié en profondeur** | Un bouton désactivé n'est pas une sécurité : les mêmes règles sont rejouées contre l'API. |
| **Allure + historique** | Tendances de succès, durée et instabilité conservées entre runs. |
| **Échecs catégorisés** | Bug produit / test à corriger / environnement indisponible. |
| **Exécution sélective** | `@smoke`, `@critical`, `@revenue`, `@security`, `@api`, `@mobile`. |
| **CI shardée** | 4 shards, cache navigateurs, rapport consolidé sur GitHub Pages. |

---

## Parcours couverts

**Acquisition et activation**
- Création d'organisation, validation des champs, e-mail déjà utilisé
- Onboarding en 3 étapes, blocage d'une étape non renseignée
- Accès au produit conditionné à l'onboarding terminé

**Authentification et sécurité**
- Connexion, mot de passe erroné, champs vides, « se souvenir de moi »
- Message d'erreur identique pour compte connu et inconnu (pas d'énumération)
- Déconnexion : révocation de session et pages protégées inaccessibles

**Revenu — sièges et abonnement**
- Décompte des sièges à l'invitation
- Limite du plan Free bloquant une invitation, côté UI **et** côté serveur
- Upgrade vers Pro levant la limite
- Downgrade refusé quand les sièges dépassent le plan cible
- Doublon d'invitation refusé

**Contrôle d'accès par rôle**
- `member` ne peut ni inviter ni modifier l'abonnement
- `admin` peut inviter mais pas facturer
- `owner` a accès complet
- Isolation stricte entre tenants (404 sur une ressource d'un autre tenant)

**API**
- Authentification par jeton, 401 sans jeton, 403 selon le rôle
- Validation d'inscription pilotée par table de cas
- Pagination, contrat d'erreur, corps JSON malformé
- Absence du mot de passe dans les réponses

---

## Structure

```
├── demo-app/                   # Application SaaS de démonstration (Nimbus)
│   ├── server.mjs              # Routes UI + API REST
│   ├── store.mjs               # Modèle : orgs, users, rôles, plans, sièges
│   └── views.mjs               # Pages HTML (rôles ARIA, data-testid)
├── src/
│   ├── pages/                  # Page Objects
│   ├── api/api-client.ts       # Client typé, traçant, auto-nettoyant
│   ├── fixtures/               # Fixtures Playwright + données faker
│   └── utils/env.ts            # Configuration validée au démarrage
├── tests/
│   ├── setup/auth.setup.ts     # Une session par rôle
│   ├── e2e/                    # auth, team-and-seats, account
│   └── api/                    # auth, tenancy
├── allure-config/categories.ts
├── scripts/preserve-allure-history.mjs
└── .github/workflows/tests.yml
```

---

## Commandes

| Commande | Effet |
|---|---|
| `npm test` | Toute la suite |
| `npm run test:smoke` | Validation rapide |
| `npm run test:revenue` | Parcours sièges et abonnement |
| `npm run test:security` | Contrôle d'accès et isolation |
| `npm run test:api` | API seule, sans navigateur |
| `npm run test:ui` | Mode interactif |
| `npm run app` | Lancer Nimbus seul sur `localhost:3000` |
| `npm run typecheck` | TypeScript sans exécution |
| `npm run allure:full` | Historique + génération + ouverture |

> **Attention :** passer `--reporter=...` en ligne de commande **remplace** les reporters de la configuration, y compris Allure. Pour obtenir un rapport Allure, lancez les tests sans ce flag.

---

## Comptes de démonstration

| Rôle | E-mail | Mot de passe | Droits |
|---|---|---|---|
| owner | `owner@acme.test` | `Passw0rd!` | Tout, y compris facturation |
| admin | `admin@acme.test` | `Passw0rd!` | Invitations, pas de facturation |
| member | `member@acme.test` | `Passw0rd!` | Lecture seule |

Organisation Acme Analytics, plan Pro, 10 sièges. Plans disponibles : Free (2 sièges), Pro (10), Business (50).

---

## Brancher le kit sur une vraie application

```bash
USE_DEMO_APP=false
BASE_URL=https://staging.votre-produit.com
API_URL=https://staging.votre-produit.com/api
```

Puis ajuster les locators dans `src/pages/` et les endpoints dans `src/api/api-client.ts`. C'est le seul travail d'adaptation : le socle, la CI et le reporting restent inchangés.

---

## Historisation Allure

Allure ne conserve les tendances que si le dossier `history` du rapport précédent est réinjecté dans `allure-results` **avant** de générer le suivant.

```
run N-1 ──► allure-report/history ──► allure-results/history ──► run N ──► tendances
```

`scripts/preserve-allure-history.mjs` s'en charge en local comme en CI. En CI l'historique transite par la branche `gh-pages`, récupérée au début du job `report` et republiée à la fin.

**Prérequis GitHub :** activer Pages sur la branche `gh-pages` (Settings → Pages).

---

## À propos de l'application de démonstration

Nimbus est une **cible de test**, pas un produit. Elle existe pour que la suite s'exécute réellement, de façon déterministe et hors ligne, plutôt que de dépendre d'un site public dont l'indisponibilité ferait rougir la CI.

Elle implémente volontairement les comportements qu'un vrai SaaS doit avoir : contrôle d'accès côté serveur, isolation entre tenants, limites de plan appliquées à l'API, messages d'erreur non divulgants. Ce sont ces comportements que la suite vérifie.

---

## Licence

MIT.
