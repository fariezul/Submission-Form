/* ============================================================
   nav.js — the drop-down menu in the header
   ============================================================
   The menu works with a click rather than a hover, because hover
   does not exist on a touchscreen. This one file is shared by
   every page, so the menu behaves identically everywhere.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   THE HERO PORTRAIT
   ------------------------------------------------------------
   The portrait starts hidden in the HTML. We only reveal it once
   the browser confirms the image actually loaded.

   Why bother? If the file is missing, a normal <img> shows a
   broken-image icon and an empty gap. Checking first means the
   page simply looks like it never had a portrait.

   img.complete is true if the image already finished loading
   before this script ran — which happens with cached images — so
   we check that as well as listening for the load event.
   ------------------------------------------------------------ */
(function () {
  const portrait = document.getElementById("heroPortrait");
  if (!portrait) return;

  function reveal() {
    portrait.classList.remove("is-hidden");
  }

  if (portrait.complete && portrait.naturalWidth > 0) {
    reveal();                                  // already loaded
  } else {
    portrait.addEventListener("load", reveal); // loaded just now
    // On error we do nothing, so it stays hidden.
  }
})();


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
