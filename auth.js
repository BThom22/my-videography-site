import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } 
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getStorage, ref, listAll, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
  const ADMIN_UIDS = ["fNJYFXAuphOr1d4ohcQWU10tOiC2"]

const storage = getStorage();

// LOGIN FORM HANDLER
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("loginMessage");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("loggedIn", "true");
    window.location.replace("dashboard.html");
  } catch (error) {
    message.style.color = "red";
    message.textContent = error.message;
    console.error("Login error:", error);
  }
});

// LOGOUT
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
});

// FILE LIST FUNCTION (Bootstrap cards without filenames)
function loadUserFiles(user) {
  const listEl = document.getElementById("fileList");
  listEl.innerHTML = "";
  listEl.className = "row g-3"; // Bootstrap row with spacing

  const userFolderRef = ref(storage, `clients/${user.uid}/`);
  listAll(userFolderRef)
    .then((res) => {
      if (res.items.length === 0) {
        listEl.innerHTML = "<p class='text-muted'>No files available.</p>";
      } else {
        res.items.forEach((itemRef) => {
          getDownloadURL(itemRef).then((url) => {
            const col = document.createElement("div");
            col.className = "col-sm-6 col-md-4 col-lg-3";

            // Image preview
            if (itemRef.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
              col.innerHTML = `
                <div class="card shadow-sm">
                  <img src="${url}" class="card-img-top" alt="" style="object-fit:cover; height:200px;">
                  <div class="card-body p-2 text-center">
                    <a href="${url}" target="_blank" class="btn btn-sm btn-primary">Download</a>
                  </div>
                </div>
              `;
            }
            // Video preview
            else if (itemRef.name.match(/\.(mp4|mov|webm)$/i)) {
              col.innerHTML = `
                <div class="card shadow-sm">
                  <video class="card-img-top" controls style="object-fit:cover; height:200px;">
                    <source src="${url}">
                  </video>
                  <div class="card-body p-2 text-center">
                    <a href="${url}" target="_blank" class="btn btn-sm btn-primary">Download</a>
                  </div>
                </div>
              `;
            }
            // Other file type
            else {
              col.innerHTML = `
                <div class="card shadow-sm text-center p-3">
                  <a href="${url}" target="_blank" class="btn btn-sm btn-primary">Download</a>
                </div>
              `;
            }

            listEl.appendChild(col);
          });
        });
      }
    })
    .catch((error) => {
      console.error("Error listing files:", error);
    });
}

// PAGE PROTECTION + FILE LOAD
onAuthStateChanged(auth, (user) => {
  if (!user && window.location.pathname.includes("dashboard.html")) {
    // Not logged in and trying to view dashboard → redirect
    window.location.href = "login.html";

  } else if (user && window.location.pathname.includes("dashboard.html")) {
    // Show UID for reference
    const uidElement = document.getElementById("userUID");
    if (uidElement) uidElement.textContent = user.uid;

    // Show Admin Portal link only if user UID is in the admin list
    const adminNavItem = document.getElementById("adminNavItem");
    if (adminNavItem && ADMIN_UIDS.includes(user.uid)) {
      adminNavItem.style.display = "block";
    }

    // Load client files
    loadUserFiles(user);
  }
});

// GOOGLE LOGIN (for admin or anyone with Google)
document.getElementById("googleBtn")?.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // If you want to only allow Google for admin, that’s fine too.
    window.location.replace("dashboard.html");
  } catch (err) {
    console.error("Google sign-in error:", err);
    const message = document.getElementById("loginMessage");
    if (message) {
      message.style.color = "red";
      message.textContent = err.message || "Google sign-in failed.";
    }
  }
});
