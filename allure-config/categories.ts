/**
 * Catégorisation automatique des échecs dans le rapport Allure.
 *
 * L'intérêt en mission : le client ne voit plus « 14 tests rouges » mais
 * « 2 bugs produit, 9 indisponibilités d'environnement, 3 tests à corriger ».
 * C'est ce qui permet de piloter un plan d'action plutôt que de subir un run.
 *
 * L'ordre compte : la première catégorie qui matche l'emporte.
 */
export const allureCategories = [
  {
    name: 'Environnement indisponible',
    description:
      "L'application ou l'API ne répond pas. L'échec ne dit rien de la qualité du produit.",
    messageRegex: '(?s).*(ERR_CONNECTION_REFUSED|ECONNREFUSED|ENOTFOUND|net::ERR_).*',
    matchedStatuses: ['broken', 'failed'],
  },
  {
    name: 'Authentification cassée',
    description:
      "Le setup d'authentification a échoué : tous les tests protégés qui suivent sont non concluants.",
    messageRegex: '(?s).*(storageState|auth\\.setup|401|Unauthorized).*',
    matchedStatuses: ['broken', 'failed'],
  },
  {
    name: 'Timeout — lenteur applicative',
    description:
      "Le produit répond trop lentement. À investiguer côté performance avant de blâmer le test.",
    messageRegex: '(?s).*(Timeout .* exceeded|exceeded while waiting|Navigation timeout).*',
    matchedStatuses: ['broken', 'failed'],
  },
  {
    name: 'Sélecteur obsolète — test à corriger',
    description:
      "L'élément visé n'existe plus. Le produit a changé, le test doit suivre.",
    messageRegex: '(?s).*(locator resolved to 0 elements|strict mode violation|waiting for locator).*',
    matchedStatuses: ['broken', 'failed'],
  },
  {
    name: 'Régression fonctionnelle produit',
    description:
      "Une assertion métier est fausse : le comportement attendu n'est plus respecté.",
    messageRegex: '(?s).*(expect\\(received\\)|Expected:|toHaveURL|toContainText|toBe).*',
    matchedStatuses: ['failed'],
  },
  {
    name: 'Test instable (flaky)',
    description: 'Le test est passé après un rejeu. À stabiliser avant de le laisser en CI.',
    matchedStatuses: ['passed'],
    flaky: true,
  },
  {
    name: 'Ignoré volontairement',
    description: 'Fonctionnalité absente ou test hors périmètre de ce projet.',
    matchedStatuses: ['skipped'],
  },
] as const;
