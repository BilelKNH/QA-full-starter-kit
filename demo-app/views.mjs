import { PLANS } from './store.mjs';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const STYLE = `
  :root { font-family: system-ui, sans-serif; color: #1a1a1a; }
  body { margin: 0; background: #f7f7f8; }
  header { background: #fff; border-bottom: 1px solid #e3e3e6; padding: .75rem 1.5rem;
           display: flex; align-items: center; gap: 1.5rem; }
  nav a { color: #444; text-decoration: none; margin-right: 1rem; font-size: .9rem; }
  nav a:hover { text-decoration: underline; }
  main { max-width: 880px; margin: 2rem auto; padding: 0 1.5rem; }
  .card { background: #fff; border: 1px solid #e3e3e6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
  label { display: block; font-size: .85rem; margin: .75rem 0 .25rem; font-weight: 500; }
  input, select { width: 100%; padding: .5rem; border: 1px solid #ccc; border-radius: 5px; font-size: .95rem; box-sizing: border-box; }
  button { margin-top: 1rem; padding: .55rem 1.1rem; border: 0; border-radius: 5px;
           background: #2f5bea; color: #fff; font-size: .95rem; cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button.secondary { background: #6b7280; }
  button.danger { background: #c0392b; }
  [role="alert"] { background: #fdecea; border: 1px solid #f5c2bd; color: #8c1d13;
                   padding: .7rem 1rem; border-radius: 6px; margin: 1rem 0; font-size: .9rem; }
  [role="status"] { background: #eaf7ee; border: 1px solid #b6e0c4; color: #14622f;
                    padding: .7rem 1rem; border-radius: 6px; margin: 1rem 0; font-size: .9rem; }
  table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
  th, td { text-align: left; padding: .55rem .4rem; border-bottom: 1px solid #eee; font-size: .9rem; }
  .muted { color: #666; font-size: .85rem; }
  .plan { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: .75rem; }
  .plan.current { border-color: #2f5bea; background: #f3f6ff; }
  .burger { display: none; }
  @media (max-width: 700px) {
    nav.desktop { display: none; }
    .burger { display: inline-block; }
  }
`;

function nav(user) {
  if (!user) return '';
  return `
  <nav class="desktop" aria-label="Navigation principale">
    <a href="/dashboard">Dashboard</a>
    <a href="/team">Équipe</a>
    <a href="/subscription">Abonnement</a>
    <a href="/billing">Facturation</a>
    <a href="/settings">Paramètres</a>
  </nav>
  <button class="burger" data-testid="mobile-menu" aria-label="Ouvrir le menu">☰</button>
  <div style="margin-left:auto">
    <button data-testid="user-menu" aria-label="Compte">${esc(user.name)}</button>
    <form method="post" action="/logout" style="display:inline">
      <button type="submit" data-testid="logout-button" class="secondary">Déconnexion</button>
    </form>
  </div>`;
}

export function layout({ title, user, body, error, notice }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — Nimbus</title>
  <style>${STYLE}</style>
</head>
<body>
  <header>
    <strong>Nimbus</strong>
    ${nav(user)}
  </header>
  <nav data-testid="mobile-nav" hidden aria-label="Navigation mobile">
    <a href="/dashboard">Dashboard</a>
    <a href="/team">Équipe</a>
    <a href="/settings">Paramètres</a>
  </nav>
  <main>
    ${error ? `<div role="alert">${esc(error)}</div>` : ''}
    ${notice ? `<div role="status">${esc(notice)}</div>` : ''}
    ${body}
  </main>
  <script>
    const burger = document.querySelector('.burger');
    const mobileNav = document.querySelector('[data-testid="mobile-nav"]');
    if (burger) burger.addEventListener('click', () => { mobileNav.hidden = !mobileNav.hidden; });
    document.querySelectorAll('form[data-guard]').forEach((form) => {
      form.addEventListener('submit', () => {
        const btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
      });
    });
  </script>
</body>
</html>`;
}

export function loginPage({ error, email }) {
  return layout({
    title: 'Connexion',
    body: `
    <div class="card">
      <h1>Connexion</h1>
      <form method="post" action="/login" data-guard>
        <label for="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" required value="${esc(email ?? '')}">
        <label for="password">Mot de passe</label>
        <input id="password" name="password" type="password" required>
        <label style="display:flex;align-items:center;gap:.5rem;font-weight:400">
          <input type="checkbox" name="remember" style="width:auto"> Se souvenir de moi
        </label>
        <button type="submit">Se connecter</button>
      </form>
      <p class="muted">Pas encore de compte ? <a href="/signup">Créer une organisation</a></p>
    </div>`,
    error,
  });
}

export function signupPage({ error, values = {} }) {
  return layout({
    title: 'Créer un compte',
    body: `
    <div class="card">
      <h1>Créer votre organisation</h1>
      <form method="post" action="/signup" data-guard>
        <label for="company">Nom de l'organisation</label>
        <input id="company" name="company" required value="${esc(values.company ?? '')}">
        <label for="name">Votre nom</label>
        <input id="name" name="name" required value="${esc(values.name ?? '')}">
        <label for="email">Adresse e-mail professionnelle</label>
        <input id="email" name="email" type="email" required value="${esc(values.email ?? '')}">
        <label for="password">Mot de passe</label>
        <input id="password" name="password" type="password" required minlength="8">
        <button type="submit">Créer l'organisation</button>
      </form>
    </div>`,
    error,
  });
}

export function onboardingPage({ user, stepIndex, error }) {
  const steps = [
    {
      title: 'Taille de votre équipe',
      field: `<label for="teamSize">Combien de personnes utiliseront Nimbus ?</label>
              <select id="teamSize" name="teamSize" required>
                <option value="">Sélectionner…</option>
                <option value="1-5">1 à 5</option>
                <option value="6-20">6 à 20</option>
                <option value="20+">Plus de 20</option>
              </select>`,
    },
    {
      title: 'Votre usage principal',
      field: `<label for="useCase">Quel est votre cas d'usage principal ?</label>
              <select id="useCase" name="useCase" required>
                <option value="">Sélectionner…</option>
                <option value="analytics">Analytique produit</option>
                <option value="reporting">Reporting client</option>
                <option value="monitoring">Supervision</option>
              </select>`,
    },
    {
      title: 'Inviter votre équipe',
      field: `<label for="invite">Adresse e-mail d'un collègue (optionnel)</label>
              <input id="invite" name="invite" type="email">`,
    },
  ];
  const step = steps[stepIndex];
  return layout({
    title: 'Onboarding',
    user,
    body: `
    <div class="card">
      <p class="muted" data-testid="onboarding-progress">Étape ${stepIndex + 1} sur ${steps.length}</p>
      <h1>${esc(step.title)}</h1>
      <form method="post" action="/onboarding/${stepIndex}" data-guard>
        ${step.field}
        <button type="submit">${stepIndex === steps.length - 1 ? 'Terminer' : 'Continuer'}</button>
      </form>
    </div>`,
    error,
  });
}

export function dashboardPage({ user, org, seats, notice }) {
  return layout({
    title: 'Dashboard',
    user,
    notice,
    body: `
    <h1>Bonjour ${esc(user.name.split(' ')[0])}</h1>
    <div class="card">
      <h2>${esc(org.name)}</h2>
      <p class="muted" data-testid="current-plan">Plan ${esc(PLANS[org.plan].label)}</p>
      <p data-testid="seat-usage">${seats.used} / ${seats.limit} sièges utilisés</p>
    </div>`,
  });
}

export function teamPage({ user, org, members, invitations, seats, error, notice }) {
  const canInvite = user.role === 'owner' || user.role === 'admin';
  const seatsFull = seats.used >= seats.limit;

  const rows = members
    .map(
      (m) => `<tr data-testid="member-row">
        <td>${esc(m.name)}</td>
        <td>${esc(m.email)}</td>
        <td>${esc(m.role)}</td>
        <td>${
          user.role === 'owner' && m.role !== 'owner'
            ? `<form method="post" action="/team/remove" style="display:inline">
                 <input type="hidden" name="userId" value="${esc(m.id)}">
                 <button class="danger" type="submit" aria-label="Retirer ${esc(m.name)}">Retirer</button>
               </form>`
            : '<span class="muted">—</span>'
        }</td>
      </tr>`,
    )
    .join('');

  const pending = invitations
    .map(
      (i) => `<tr data-testid="invitation-row">
        <td>${esc(i.email)}</td><td>${esc(i.role)}</td><td class="muted">en attente</td>
      </tr>`,
    )
    .join('');

  return layout({
    title: 'Équipe',
    user,
    error,
    notice,
    body: `
    <h1>Équipe</h1>
    <div class="card">
      <p data-testid="seat-usage">${seats.used} / ${seats.limit} sièges utilisés (plan ${esc(seats.plan.label)})</p>
      <table>
        <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${pending ? `<h3>Invitations en attente</h3><table><tbody>${pending}</tbody></table>` : ''}
    </div>
    ${
      canInvite
        ? `<div class="card">
             <h2>Inviter un membre</h2>
             ${
               seatsFull
                 ? `<div role="alert" data-testid="seats-exhausted">Tous les sièges du plan ${esc(
                     seats.plan.label,
                   )} sont utilisés. Passez à un plan supérieur pour inviter davantage de personnes.</div>`
                 : ''
             }
             <form method="post" action="/team/invite" data-guard>
               <label for="inviteEmail">Adresse e-mail</label>
               <input id="inviteEmail" name="email" type="email" required ${seatsFull ? 'disabled' : ''}>
               <label for="inviteRole">Rôle</label>
               <select id="inviteRole" name="role" ${seatsFull ? 'disabled' : ''}>
                 <option value="member">member</option>
                 <option value="admin">admin</option>
               </select>
               <button type="submit" ${seatsFull ? 'disabled' : ''}>Envoyer l'invitation</button>
             </form>
           </div>`
        : `<div class="card"><p class="muted" data-testid="invite-forbidden">Votre rôle ne permet pas d'inviter des membres.</p></div>`
    }`,
  });
}

export function subscriptionPage({ user, org, seats, error, notice }) {
  const cards = Object.values(PLANS)
    .map(
      (p) => `<div class="plan ${p.id === org.plan ? 'current' : ''}" data-testid="plan-${p.id}">
        <strong>${esc(p.label)}</strong> — ${p.priceMonthly} €/mois — ${p.seats} sièges
        ${
          p.id === org.plan
            ? '<p class="muted" data-testid="plan-current-badge">Plan actuel</p>'
            : `<form method="post" action="/subscription" data-guard>
                 <input type="hidden" name="plan" value="${esc(p.id)}">
                 <button type="submit">Passer au plan ${esc(p.label)}</button>
               </form>`
        }
      </div>`,
    )
    .join('');

  return layout({
    title: 'Abonnement',
    user,
    error,
    notice,
    body: `
    <h1>Abonnement</h1>
    <p data-testid="seat-usage">${seats.used} / ${seats.limit} sièges utilisés</p>
    ${user.role === 'owner' ? cards : '<div class="card"><p data-testid="billing-forbidden">Seul le propriétaire peut modifier l\'abonnement.</p></div>'}`,
  });
}

export function billingPage({ user, invoices }) {
  const rows = invoices
    .map(
      (i) => `<tr data-testid="invoice-row">
        <td>${esc(i.number)}</td><td>${i.amount} €</td>
        <td>${esc(i.status)}</td><td>${esc(i.issuedAt)}</td>
      </tr>`,
    )
    .join('');
  return layout({
    title: 'Facturation',
    user,
    body: `
    <h1>Facturation</h1>
    <div class="card">
      <table>
        <thead><tr><th>Facture</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`,
  });
}

export function settingsPage({ user, error, notice }) {
  return layout({
    title: 'Paramètres',
    user,
    error,
    notice,
    body: `
    <h1>Paramètres du compte</h1>
    <div class="card">
      <h2>Profil</h2>
      <form method="post" action="/settings/profile" data-guard>
        <label for="name">Nom complet</label>
        <input id="name" name="name" required value="${esc(user.name)}">
        <button type="submit">Enregistrer</button>
      </form>
    </div>
    <div class="card">
      <h2>Mot de passe</h2>
      <form method="post" action="/settings/password" data-guard>
        <label for="current">Mot de passe actuel</label>
        <input id="current" name="current" type="password" required>
        <label for="next">Nouveau mot de passe</label>
        <input id="next" name="next" type="password" required minlength="8">
        <button type="submit">Mettre à jour</button>
      </form>
    </div>`,
  });
}

export function notFoundPage() {
  return layout({
    title: 'Introuvable',
    body: '<div class="card"><h1>404 — Page introuvable</h1><p class="muted">Cette page n\'existe pas.</p></div>',
  });
}
