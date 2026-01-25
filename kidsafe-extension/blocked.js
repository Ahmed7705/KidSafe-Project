const blockedUrl = document.getElementById("blocked-url");
const backButton = document.getElementById("go-back");
const referrer = document.referrer || "";

if (backButton) {
  backButton.addEventListener("click", () => {
    window.history.back();
  });
}

if (blockedUrl) {
  let display = "";
  if (referrer && !referrer.startsWith("chrome-extension://")) {
    try {
      display = new URL(referrer).hostname;
    } catch (error) {
      display = referrer;
    }
  }
  blockedUrl.textContent = display ? `Blocked: ${display}` : "";
}
