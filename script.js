const CLINIC_WHATSAPP_NUMBER = "917842938316";

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const appointmentForm = document.querySelector("[data-appointment-form]");

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
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

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function buildWhatsAppUrl(text) {
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function setupNavigation() {
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") !== "true";
      setMenu(open);
    });
  }

  if (mobileMenu) {
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

function setupAppointmentForm() {
  if (!appointmentForm) return;

  const note = appointmentForm.querySelector("[data-form-note]");
  const dateInput = appointmentForm.querySelector('input[name="date"]');

  if (dateInput) {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().slice(0, 10);
  }

  appointmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!appointmentForm.checkValidity()) {
      appointmentForm.reportValidity();
      return;
    }

    const data = new FormData(appointmentForm);
    const name = String(data.get("name") || "").trim();
    const phone = normalizePhone(data.get("phone"));
    const service = String(data.get("service") || "").trim();
    const date = String(data.get("date") || "").trim();
    const time = String(data.get("time") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!isValidPhone(phone)) {
      if (note) note.textContent = "Please enter a valid phone number.";
      return;
    }

    const whatsappText = [
      "Hello Vision Vistara Optics & Lasers Eye Care,",
      "Request: Appointment request",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Service: ${service}`,
      date ? `Preferred date: ${date}` : "",
      time ? `Preferred time: ${time}` : "",
      message ? `Message: ${message}` : ""
    ].filter(Boolean).join("\n");

    if (note) note.textContent = "Saving request...";

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          source: "static_clinic_homepage",
          intent: "Appointment request",
          payload: { service, date, time, message }
        })
      });

      if (!response.ok) throw new Error("Lead API unavailable");
      const payload = await response.json();
      window.open(payload.whatsappUrl || buildWhatsAppUrl(whatsappText), "_blank", "noopener");
      if (note) note.textContent = "Request saved. WhatsApp opened for follow-up.";
    } catch {
      window.open(buildWhatsAppUrl(whatsappText), "_blank", "noopener");
      if (note) note.textContent = "Backend unavailable. WhatsApp fallback opened.";
    }
  });
}

setupNavigation();
setupAppointmentForm();
refreshIcons();
