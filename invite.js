// invite.js (admin-only, supports Google or email/password sign-in)
// Requires: invite.html with #checking, #notAuth, #inviteCard, #inviteForm, #inviteEmail, #inviteMsg

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* =========================
   CONFIG — EDIT THESE
   ========================= */
const ADMIN_UIDS = [
  "fNJYFXAuphOr1d4ohcQWU10tOiC2" // add more UIDs if needed
];
// Optional: allow by email too (leave [] to disable)
const ADMIN_EMAILS = [
  // "bryant@truenmedia.com"
];

// Auto-pick redirect URL for the email link (local vs prod)
const ACTION_CODE_URL =
  (location.hostname === "127.0.0.1" || location.hostname === "localhost")
    ? "http://127.0.0.1:5500/finish.html"
    : "https://true-north.media/finish.html";

/* =========================
   DOM
   ========================= */
const el = (id) => document.getElementById(id);
const checking = el("checking");
const notAuth  = el("notAuth");
const card     = el("inviteCard");
const form     = el("inviteForm");
const input    = el("inviteEmail");
const msg      = el("inviteMsg");
const signOutBtn = el("adminSignOut"); // optional button if you add one

/* =========================
   ADMIN GATE
   ========================= */
onAuthStateChanged(auth, (user) => {
  // Hide "checking…" once we know
  if (checking) checking.style.display = "none";

  const isAdmin =
    !!user &&
    (ADMIN_UIDS.includes(user.uid) || ADMIN_EMAILS.includes(user.email || ""));

  if (isAdmin) {
    if (card) card.style.display = "block";
    if (notAuth) notAuth.style.display = "none";
  } else {
    if (card) card.style.display = "none";
    if (notAuth) notAuth.style.display = "block";
  }
});

/* =========================
   SEND MAGIC LINK INVITE
   ========================= */
const actionCodeSettings = {
  url: ACTION_CODE_URL,
  handleCodeInApp: true,
};

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (input?.value || "").trim();
  if (!email) return;

  if (msg) {
    msg.style.color = "white";
    msg.textContent = "Sending invite…";
  }

  try {
    // Store email so finish.js can complete sign-in without re-entering
    window.localStorage.setItem("inviteEmail", email);

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    if (msg) {
      msg.style.color = "#4ade80";
      msg.textContent = "Invite sent! Ask your client to check their email.";
    }
    form.reset();
  } catch (err) {
    console.error("Invite error:", err);
    if (msg) {
      msg.style.color = "#f87171";
      msg.textContent = err?.message || "Failed to send invite.";
    }
  }
});

/* =========================
   OPTIONAL: Admin sign out
   ========================= */
signOutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    location.href = "login.html";
  } catch (err) {
    console.error("Sign-out error:", err);
  }
});
