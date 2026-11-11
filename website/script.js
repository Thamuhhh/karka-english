const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

const revealElements = document.querySelectorAll('.reveal');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        activeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('is-visible'));
}

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

function setMenuOpen(isOpen) {
  if (!menuToggle || !navigation) return;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  navigation.classList.toggle('is-open', isOpen);
}

menuToggle?.addEventListener('click', () => {
  const currentlyOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  setMenuOpen(!currentlyOpen);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});
