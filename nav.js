/* ============================================================
   nav.js — the drop-down menu in the header
   ============================================================
   The menu works with a click rather than a hover, because hover
   does not exist on a touchscreen. This one file is shared by
   every page, so the menu behaves identically everywhere.
   ============================================================ */

"use strict";

(function () {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("menuDropdown");

  // Not every page has the menu, so stop quietly if it's absent.
  if (!toggle || !menu) return;

  /* Open or close the menu.
     ------------------------------------------------------------
     aria-expanded tells screen readers whether the menu is open.
     Keeping it in step with the visible state is what makes the
     menu usable without a mouse.
     ------------------------------------------------------------ */
  function setOpen(open) {
    if (open) {
      menu.classList.remove("is-hidden");
    } else {
      menu.classList.add("is-hidden");
    }
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function isOpen() {
    return !menu.classList.contains("is-hidden");
  }

  // Clicking the button flips the menu open or shut.
  toggle.addEventListener("click", function (event) {
    // stopPropagation stops this click also reaching the document
    // listener below, which would immediately close the menu again.
    event.stopPropagation();
    setOpen(!isOpen());
  });

  // Clicking anywhere else on the page closes it.
  document.addEventListener("click", function (event) {
    if (!isOpen()) return;
    // .contains() asks "is the thing I clicked inside the menu?"
    if (!menu.contains(event.target) && event.target !== toggle) {
      setOpen(false);
    }
  });

  // The Escape key closes it and puts focus back on the button.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
