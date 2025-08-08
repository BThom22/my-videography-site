import { auth } from "./firebase-config.js";
import { sendPasswordResetEmail } 
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form = document.getElementById("forgotForm");
const emailInput = document.getElementById("resetEmail");
const msg = document.getElementById("forgotMessage");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.color = "white";
  msg.textContent = "Sending reset email...";

  try {
    await sendPasswordResetEmail(auth, emailInput.value.trim());
    msg.style.color = "#4ade80"; // green-ish
    msg.textContent = "Check your inbox for the reset link.";
    form.reset();
  } catch (err) {
    console.error(err);
    msg.style.color = "#f87171"; // red-ish
    // Friendlier errors
    if (err.code === "auth/user-not-found") {
      msg.textContent = "No account found with that email.";
    } else if (err.code === "auth/invalid-email") {
      msg.textContent = "That email doesn’t look valid.";
    } else {
      msg.textContent = "Couldn’t send the email. Try again in a minute.";
    }
  }
});
