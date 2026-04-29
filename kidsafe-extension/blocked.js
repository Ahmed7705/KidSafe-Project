const blockedUrl = document.getElementById("blocked-url");
const backButton = document.getElementById("go-back");
const referrer = document.referrer || "";
const reasonEl = document.getElementById("block-reason");

if (backButton) {
  backButton.addEventListener("click", () => {
    window.history.back();
  });
}

// Check for screen time reason in URL params
const params = new URLSearchParams(window.location.search);
const reason = params.get("reason");

if (reasonEl && reason) {
  reasonEl.textContent = reason;
  reasonEl.style.display = "block";
}

const startedAtParam = params.get("startedAt");
const blockedAtParam = params.get("blockedAt");

if (startedAtParam && blockedAtParam && reasonEl) {
  const started = new Date(parseInt(startedAtParam)).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short' });
  const blocked = new Date(parseInt(blockedAtParam)).toLocaleString("en-US", { dateStyle: 'short', timeStyle: 'short' });

  const timesEl = document.createElement("div");
  timesEl.style.marginTop = "10px";
  timesEl.style.marginBottom = "15px";
  timesEl.style.fontSize = "0.9rem";
  timesEl.style.color = "#ff6b6b";
  timesEl.style.fontWeight = "600";
  timesEl.innerHTML = `
      <div style="margin-bottom: 6px;"><strong>Usage Started:</strong> <span style="color:#555;">${started}</span></div>
      <div><strong>Blocked At:</strong> <span style="color:#555;">${blocked}</span></div>
  `;
  reasonEl.parentNode.insertBefore(timesEl, reasonEl.nextSibling);
}

if (blockedUrl) {
  let display = "";
  if (reason) {
    display = reason;
  } else if (referrer && !referrer.startsWith("chrome-extension://")) {
    try {
      display = new URL(referrer).hostname;
    } catch (error) {
      display = referrer;
    }
  }
  blockedUrl.textContent = display ? `Blocked: ${display}` : "";
}
