/* ============================================================
   nav.js — the drop-down menu in the header
   ============================================================
   The menu works with a click rather than a hover, because hover
   does not exist on a touchscreen. This one file is shared by
   every page, so the menu behaves identically everywhere.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   ORGANISATION LOGOS IN THE EXPERIENCE LIST
   ------------------------------------------------------------
   Each logo square contains a picture and a pair of initials. The
   picture starts hidden. Only when the browser confirms it really
   loaded do we show it and hide the initials.

   That way a missing logo file leaves neat initials behind rather
   than a broken-image icon.
   ------------------------------------------------------------ */
(function () {
  const logos = document.querySelectorAll(".xp-logo-img");

  logos.forEach(function (img) {
    function swapIn() {
      img.classList.remove("is-hidden");

      // The initials sit next to the image inside the same square.
      const initials = img.parentElement.querySelector(".xp-initials");
      if (initials) initials.classList.add("is-hidden");
    }

    // A cached image may already be loaded before this code runs.
    if (img.complete && img.naturalWidth > 0) {
      swapIn();
    } else {
      img.addEventListener("load", swapIn);
      // On error we do nothing, so the initials simply stay.
    }
  });
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
