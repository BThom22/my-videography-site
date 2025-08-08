// admin.js — Admin Media Manager (gated)
// Features: admin gate, UID load, drag/drop upload, copy link, sorting, delete

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getStorage, ref, listAll, getDownloadURL,
  uploadBytesResumable, deleteObject, getMetadata
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

/* ========= CONFIG ========= */
const ADMIN_UIDS = ["fNJYFXAuphOr1d4ohcQWU10tOiC2"]; // <-- put your UID(s) here

/* ========= Firebase ========= */
const storage = getStorage();

/* ========= DOM grabs ========= */
const $ = (id) => document.getElementById(id);

const adminGate   = $("adminGate");     // "Checking admin access…"
const notAdmin    = $("notAdmin");       // error card with link to login
const adminApp    = $("adminApp");       // main admin UI

const uidInput    = $("uidInput");
const loadBtn     = $("loadBtn");
const currentPath = $("currentPath");

const dropZone    = $("dropZone");
const filePicker  = $("filePicker");
const queue       = $("queue");

const fileList    = $("fileList");
const listMsg     = $("listMsg");

const sortSelect  = $("sortSelect");     // <select> we added in the toolbar
const signOutBtn  = $("adminSignOut");

let activeUID = null;

/* ========= Utilities ========= */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy");
    ta.remove();
    return true;
  }
}

/* ========= Admin gate (wait for session hydrate) ========= */
onAuthStateChanged(auth, (user) => {
  // Hide the "checking…" message once we know
  if (adminGate) adminGate.style.display = "none";

  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);
  if (isAdmin) {
    adminApp.style.display = "block";
    notAdmin.style.display = "none";
  } else {
    adminApp.style.display = "none";
    notAdmin.style.display = "block";
  }
});

/* ========= Sorting ========= */
function sortFiles(files, mode) {
  if (mode === "name") {
    files.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === "oldest") {
    files.sort((a, b) => a.updated - b.updated);
  } else { // newest (default)
    files.sort((a, b) => b.updated - a.updated);
  }
}

/* ========= Render ========= */
function renderFileCards(files) {
  fileList.innerHTML = "";

  for (const f of files) {
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3";

    const isImg = /\.(jpg|jpeg|png|gif)$/i.test(f.name);
    const isVid = /\.(mp4|mov|webm)$/i.test(f.name);

    let media = `<div class="border rounded d-flex align-items-center justify-content-center" style="height:180px;">File</div>`;
    if (isImg) {
      media = `<img src="${f.url}" class="img-fluid rounded" style="object-fit:cover;height:180px;width:100%;">`;
    } else if (isVid) {
      media = `<video class="w-100 rounded" style="height:180px;object-fit:cover;" controls>
                 <source src="${f.url}">
               </video>`;
    }

    col.innerHTML = `
      <div class="card shadow-sm">
        ${media}
        <div class="card-body p-2 d-flex flex-wrap gap-2 justify-content-center">
          <a class="btn btn-sm btn-outline-light" href="${f.url}" target="_blank">Open</a>
          <button class="btn btn-sm btn-secondary" data-copy="${f.url}">Copy link</button>
          <button class="btn btn-sm btn-danger" data-path="${f.fullPath}">Delete</button>
        </div>
        <div class="text-center text-muted small pb-2">
          ${new Date(f.updated).toLocaleDateString()}
        </div>
      </div>
    `;
    fileList.appendChild(col);
  }

  // Wire delete buttons
  fileList.querySelectorAll("button[data-path]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const path = btn.getAttribute("data-path");
      if (!confirm(`Delete ${path}?`)) return;
      try {
        await deleteObject(ref(storage, path));
        listClientFiles(activeUID); // refresh
      } catch (e) {
        console.error(e);
        alert("Delete failed: " + (e?.message || e));
      }
    });
  });

  // Wire copy buttons
  fileList.querySelectorAll("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.getAttribute("data-copy");
      const ok = await copyText(url);
      if (ok) {
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 900);
      }
    });
  });
}

/* ========= List files ========= */
async function listClientFiles(uid) {
  fileList.innerHTML = "";
  listMsg.textContent = "Loading…";

  const baseRef = ref(storage, `clients/${uid}/`);
  try {
    const res = await listAll(baseRef);
    if (res.items.length === 0) {
      listMsg.textContent = "No files yet.";
      return;
    }

    // Fetch URL + metadata in parallel
    const files = await Promise.all(
      res.items.map(async (itemRef) => {
        const [url, meta] = await Promise.all([
          getDownloadURL(itemRef),
          getMetadata(itemRef),
        ]);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          updated: new Date(meta.updated).getTime(), // for sorting
        };
      })
    );

    // Sort then render
    const mode = sortSelect?.value || "newest";
    sortFiles(files, mode);
    listMsg.textContent = "";
    renderFileCards(files);
  } catch (e) {
    console.error(e);
    listMsg.textContent = "Failed to list files (check rules & path).";
  }
}

/* ========= Uploads ========= */
function startUploads(uid, files) {
  if (!uid || !files?.length) return;

  [...files].forEach((file) => {
    const item = document.createElement("div");
    item.className = "list-group-item";
    item.innerHTML = `
      <div class="d-flex justify-content-between">
        <div class="me-3 text-truncate">${file.name}</div>
        <div class="text-muted" data-pct>0%</div>
      </div>
      <div class="progress mt-2">
        <div class="progress-bar" role="progressbar" style="width:0%"></div>
      </div>
    `;
    queue.appendChild(item);

    const pctEl = item.querySelector("[data-pct]");
    const bar   = item.querySelector(".progress-bar");

    const fileRef = ref(storage, `clients/${uid}/${file.name}`);
    const task = uploadBytesResumable(fileRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        pctEl.textContent = `${pct}%`;
        bar.style.width = `${pct}%`;
      },
      (err) => {
        console.error(err);
        pctEl.textContent = "Error";
        item.classList.add("list-group-item-danger");
      },
      async () => {
        pctEl.textContent = "Done";
        item.classList.add("list-group-item-success");
        listClientFiles(uid); // refresh list after each file finishes
      }
    );
  });
}

/* ========= UI wiring ========= */
loadBtn?.addEventListener("click", () => {
  const uid = (uidInput.value || "").trim();
  if (!uid) return;
  activeUID = uid;
  currentPath.textContent = `clients/${uid}/`;
  listClientFiles(uid);
});

filePicker?.addEventListener("change", (e) => {
  if (!activeUID) return alert("Enter a client UID first.");
  startUploads(activeUID, e.target.files);
  filePicker.value = ""; // reset input
});

// Drag & drop
["dragenter", "dragover"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("border-primary");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("border-primary");
  })
);
dropZone.addEventListener("drop", (e) => {
  if (!activeUID) return alert("Enter a client UID first.");
  const files = e.dataTransfer.files;
  startUploads(activeUID, files);
});

// Re-sort current list
sortSelect?.addEventListener("change", () => {
  if (activeUID) listClientFiles(activeUID);
});

// Admin sign out
signOutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "login.html";
});
