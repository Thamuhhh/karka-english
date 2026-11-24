/**
 * Elvate — Minimalist Script
 * Handles year stamp, mobile navigation, and lightweight scroll reveals.
 */

// 1. Current Year
const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

// 2. Mobile Navigation Toggle
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

// Close menu when clicking outside
document.addEventListener('click', (event) => {
  if (!navigation || !menuToggle) return;
  if (
    navigation.classList.contains('is-open') &&
    !navigation.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    setMenuOpen(false);
  }
});

// 3. Scroll Reveal Observer
const revealElements = document.querySelectorAll('.reveal');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          activeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('is-visible'));
}
