import { auth } from "./firebase-config.js";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const finishMsg     = document.getElementById("finishMsg");
const successBlock  = document.getElementById("successBlock");
const fallbackBlock = document.getElementById("fallbackBlock");

const pwForm     = document.getElementById("pwForm");
const pw1        = document.getElementById("pw1");
const pw2        = document.getElementById("pw2");
const pwMsg      = document.getElementById("pwMsg");
const togglePw1  = document.getElementById("togglePw1");
const togglePw2  = document.getElementById("togglePw2");
const skipPw     = document.getElementById("skipPw");
const pwStrength = document.getElementById("pwStrength");
const pwHint     = document.getElementById("pwHint");

function toggle(el, btn) {
  const isPw = el.type === "password";
  el.type = isPw ? "text" : "password";
  btn.textContent = isPw ? "Hide" : "Show";
}

togglePw1?.addEventListener("click", () => toggle(pw1, togglePw1));
togglePw2?.addEventListener("click", () => toggle(pw2, togglePw2));

// Simple strength estimate
function estimateStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}

function updateStrengthUI(pw) {
  const score = estimateStrength(pw);
  const pct = (score / 4) * 100;
  pwStrength.style.width = pct + "%";
  let cls = "bg-danger";
  let txt = "Weak";
  if (score >= 3) { cls = "bg-warning"; txt = "Okay"; }
  if (score === 4) { cls = "bg-success"; txt = "Strong"; }
  pwStrength.className = "progress-bar " + cls;
  pwHint.textContent = pw ? `Strength: ${txt}` : "";
}

pw1?.addEventListener("input", (e) => updateStrengthUI(e.target.value));

// If user is already signed in (e.g., reopened link), just show success block.
onAuthStateChanged(auth, (user) => {
  if (user && !isSignInWithEmailLink(auth, window.location.href)) {
    finishMsg.textContent = "You’re signed in. Set a password or continue.";
    successBlock.style.display = "block";
  }
});

(async () => {
  try {
    // Validate link
    const url = window.location.href;
    const isLink = isSignInWithEmailLink(auth, url);
    if (!isLink) {
      // Could still be signed in (handled by onAuthStateChanged)
      if (!auth.currentUser) {
        finishMsg.textContent = "This sign-in link is invalid or expired.";
        fallbackBlock.style.display = "block";
      }
      return;
    }

    // Get email from localStorage, or ask the user (they may be on another device)
    let email = window.localStorage.getItem("inviteEmail");
    if (!email) {
      email = prompt("Confirm your email to finish sign-in:")?.trim();
      if (!email) {
        finishMsg.textContent = "Email is required to complete sign-in.";
        fallbackBlock.style.display = "block";
        return;
      }
    }

    // Complete the sign-in
    finishMsg.textContent = "Signing you in…";
    await signInWithEmailLink(auth, email, url);
    window.localStorage.removeItem("inviteEmail");

    finishMsg.textContent = "Signed in. You can set a password or skip.";
    successBlock.style.display = "block";
  } catch (err) {
    console.error(err);
    finishMsg.textContent = "Could not complete sign-in. The link may be expired.";
    fallbackBlock.style.display = "block";
  }
})();

// Save password → go to dashboard
pwForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  pwMsg.textContent = "";
  const a = pw1.value.trim();
  const b = pw2.value.trim();

  if (a.length < 8) {
    pwMsg.style.color = "#f87171";
    pwMsg.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (a !== b) {
    pwMsg.style.color = "#f87171";
    pwMsg.textContent = "Passwords do not match.";
    return;
  }

  try {
    await updatePassword(auth.currentUser, a);
    pwMsg.style.color = "#4ade80";
    pwMsg.textContent = "Password saved. Redirecting…";
    setTimeout(() => window.location.replace("dashboard.html"), 600);
  } catch (err) {
    console.error(err);
    // If link is too old or user reloaded much later, you might see requires-recent-login.
    pwMsg.style.color = "#f87171";
    pwMsg.textContent = err?.message || "Could not set password. Try again.";
  }
});

// Skip setting a password
skipPw?.addEventListener("click", () => {
  window.location.replace("dashboard.html");
});
