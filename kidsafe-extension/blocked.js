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
