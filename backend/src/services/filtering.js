const SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const VIRUSTOTAL_ENDPOINT = "https://www.virustotal.com/api/v3/urls";

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function fetchWithTimeout(url, options, timeoutMs = 1500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

function matchDomain(pattern, hostname) {
  if (!hostname) {
    return false;
  }
  const cleanPattern = pattern.toLowerCase();
  const host = hostname.toLowerCase();
  return host === cleanPattern || host.endsWith(`.${cleanPattern}`);
}

function matchKeyword(pattern, url) {
  return url.toLowerCase().includes(pattern.toLowerCase());
}

function matchRegex(pattern, url) {
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(url);
  } catch (error) {
    return false;
  }
}

export function matchRule(rule, url, hostname) {
  if (!rule || !rule.pattern) {
    return false;
  }
  if (rule.rule_type === "domain") {
    return matchDomain(rule.pattern, hostname);
  }
  if (rule.rule_type === "keyword") {
    return matchKeyword(rule.pattern, url);
  }
  if (rule.rule_type === "regex") {
    return matchRegex(rule.pattern, url);
  }
  return false;
}

export async function checkSafeBrowsing(url) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    return null;
  }
  const payload = {
    client: {
      clientId: "kidsafe",
      clientVersion: "1.0.0"
    },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }]
    }
  };
  try {
    const response = await fetchWithTimeout(
      `${SAFE_BROWSING_ENDPOINT}?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      1800
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.matches && data.matches.length > 0) {
      const threat = data.matches[0];
      return {
        malicious: true,
        reason: `Safe Browsing: ${threat.threatType}`
      };
    }
    return { malicious: false };
  } catch (error) {
    return null;
  }
}

export async function checkVirusTotal(url) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return null;
  }
  const urlId = base64UrlEncode(url);
  try {
    const response = await fetchWithTimeout(
      `${VIRUSTOTAL_ENDPOINT}/${urlId}`,
      {
        method: "GET",
        headers: { "x-apikey": apiKey }
      },
      1800
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const stats = data?.data?.attributes?.last_analysis_stats;
    if (!stats) {
      return null;
    }
    const maliciousCount = Number(stats.malicious || 0);
    const suspiciousCount = Number(stats.suspicious || 0);
    if (maliciousCount > 0 || suspiciousCount > 0) {
      return {
        malicious: true,
        reason: "VirusTotal flagged the URL"
      };
    }
    return { malicious: false };
  } catch (error) {
    return null;
  }
}

export async function evaluateUrl({ url, hostname, rules, categoryMap }) {
  for (const rule of rules) {
    const categoryId = rule.category_id;
    if (categoryId && categoryMap && categoryMap.has(categoryId)) {
      const blocked = categoryMap.get(categoryId);
      if (!blocked) {
        continue;
      }
    }
    if (matchRule(rule, url, hostname)) {
      return {
        verdict: "blocked",
        reason: `Matched ${rule.rule_type} rule: ${rule.pattern}`,
        ruleId: rule.id,
        categoryId: rule.category_id || null
      };
    }
  }

  const safeBrowsing = await checkSafeBrowsing(url);
  if (safeBrowsing && safeBrowsing.malicious) {
    return {
      verdict: "malicious",
      reason: safeBrowsing.reason
    };
  }

  const virusTotal = await checkVirusTotal(url);
  if (virusTotal && virusTotal.malicious) {
    return {
      verdict: "malicious",
      reason: virusTotal.reason
    };
  }

  return {
    verdict: "allowed",
    reason: "No matches"
  };
}
