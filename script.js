const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const appointmentForm = document.querySelector("[data-appointment-form]");

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setMenu(open) {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("menu-open", open);
}

function updateHeader() {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 10);
}

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenu(!isOpen);
  });
}

if (mobileMenu) {
  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMenu(false);
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
  }
});

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const wasOpen = item.classList.contains("open");

    document.querySelectorAll(".faq-item").forEach((faq) => {
      faq.classList.remove("open");
      const faqButton = faq.querySelector("button");
      if (faqButton) faqButton.setAttribute("aria-expanded", "false");
    });

    if (!wasOpen) {
      item.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

if (appointmentForm) {
  const dateInput = appointmentForm.querySelector('input[name="date"]');
  const note = appointmentForm.querySelector("[data-form-note]");

  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  appointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!appointmentForm.checkValidity()) {
      appointmentForm.reportValidity();
      return;
    }

    const data = new FormData(appointmentForm);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const service = String(data.get("service") || "").trim();
    const date = String(data.get("date") || "").trim();
    const message = String(data.get("message") || "").trim();

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      if (note) note.textContent = "Please enter a valid phone number.";
      return;
    }

    const lines = [
      "Hello Vision Vistara Optics & Lasers Eye Care,",
      "",
      "I would like to request an appointment.",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Service: ${service}`,
      `Preferred date: ${date || "Please suggest"}`,
      `Message: ${message || "No additional message"}`
    ];

    const whatsappUrl = `https://wa.me/917842938316?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(whatsappUrl, "_blank", "noopener");

    if (note) {
      note.textContent = "Your WhatsApp appointment message is ready. Please send it to confirm your request.";
    }
  });
}

refreshIcons();
