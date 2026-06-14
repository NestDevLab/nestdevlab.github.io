const stage = document.querySelector('[data-monolith]');
let loading = false;

function loadMonolith() {
  if (loading || !stage) return;
  loading = true;
  import('./monolith-webgl.js').catch(() => {
    loading = false;
  });
}

if (stage) {
  loadMonolith();

  stage.addEventListener('pointerdown', loadMonolith, { once: true });

  document.querySelectorAll('.button-primary, .button-secondary, .nav-pill').forEach((node) => {
    node.addEventListener('pointerdown', loadMonolith, { once: true });
  });
}
