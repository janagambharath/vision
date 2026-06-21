// NAV
  function toggleMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('open');
  }
  function closeMenu() {
    document.getElementById('mobileMenu').classList.remove('open');
  }

  // FAQ
  function toggleFAQ(btn) {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }

  // OPTICAL TABS
  function switchTab(btn, tab) {
    document.querySelectorAll('.opt-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const contents = { lenses: 'opt-lenses', materials: 'opt-materials', coatings: 'opt-coatings' };
    document.querySelectorAll('.opt-content').forEach(c => {
      c.style.display = 'none';
      c.classList.remove('active');
    });
    const target = document.getElementById('tab-' + tab);
    if (target) {
      target.style.display = 'grid';
      target.classList.add('active');
    }
  }

  // FORM
  function submitForm() {
    const name = document.getElementById('fname').value.trim();
    const phone = document.getElementById('fphone').value.trim();
    const service = document.getElementById('fservice').value;
    if (!name || !phone) {
      alert('Please enter your name and phone number to proceed.');
      return;
    }
    document.getElementById('apptForm').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
  }

  // SCROLL REVEAL
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // INIT OPTICALS
  document.addEventListener('DOMContentLoaded', () => {
    const lensTab = document.getElementById('tab-lenses');
    if (lensTab) { lensTab.style.display = 'grid'; }
  });

  // NAV SCROLL HIGHLIGHT
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 60) {
      nav.style.background = 'rgba(5,14,42,0.98)';
    } else {
      nav.style.background = 'rgba(10,30,74,0.97)';
    }
  });
