import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { toInt, toBool } from "../utils/validation.js";

const router = express.Router();

router.use(authRequired);

async function verifyChildAccess(childId, user) {
  if (user.isAdmin) return true;
  const [rows] = await pool.query(
    `SELECT c.id FROM children c
     LEFT JOIN child_guardians cg ON c.id = cg.child_id AND cg.user_id = ?
     WHERE c.id = ? AND (c.user_id = ? OR cg.user_id = ?)`,
    [user.id, childId, user.id, user.id]
  );
  return rows.length > 0;
}

// GET /api/apps/recommendations — age-based app recommendations
router.get("/recommendations", async (req, res) => {
  const age = toInt(req.query.age, null);
  const category = req.query.category || null;

  let query = "SELECT * FROM app_recommendations WHERE 1=1";
  const params = [];

  if (age !== null) {
    query += " AND min_age <= ? AND max_age >= ?";
    params.push(age, age);
  }
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  query += " ORDER BY name ASC";

  const [rows] = await pool.query(query, params);
  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      description: row.description,
      minAge: row.min_age,
      maxAge: row.max_age,
      category: row.category
    }))
  );
});

// GET /api/apps/:childId/settings — get child's app management settings
router.get("/:childId/settings", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const [rows] = await pool.query(
    "SELECT * FROM child_app_settings WHERE child_id = ?",
    [childId]
  );
  const settings = rows[0];

  return res.json({
    blockGamingSites: settings ? toBool(settings.block_gaming_sites) : false,
    blockAppStores: settings ? toBool(settings.block_app_stores) : false,
    blockInAppPurchases: settings ? toBool(settings.block_in_app_purchases) : true,
    maxGameTimeMinutes: settings?.max_game_time_minutes || null
  });
});

// PUT /api/apps/:childId/settings — update app management settings
router.put("/:childId/settings", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const { blockGamingSites, blockAppStores, blockInAppPurchases, maxGameTimeMinutes } = req.body || {};

  const gamingVal = toBool(blockGamingSites) ? 1 : 0;
  const storesVal = toBool(blockAppStores) ? 1 : 0;
  const purchasesVal = blockInAppPurchases === undefined ? 1 : toBool(blockInAppPurchases) ? 1 : 0;
  const gameTimeVal = toInt(maxGameTimeMinutes, null);

  await pool.query(
    `INSERT INTO child_app_settings (child_id, block_gaming_sites, block_app_stores, block_in_app_purchases, max_game_time_minutes)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       block_gaming_sites = VALUES(block_gaming_sites),
       block_app_stores = VALUES(block_app_stores),
       block_in_app_purchases = VALUES(block_in_app_purchases),
       max_game_time_minutes = VALUES(max_game_time_minutes)`,
    [childId, gamingVal, storesVal, purchasesVal, gameTimeVal]
  );

  return res.json({
    blockGamingSites: toBool(gamingVal),
    blockAppStores: toBool(storesVal),
    blockInAppPurchases: toBool(purchasesVal),
    maxGameTimeMinutes: gameTimeVal
  });
});

// GET /api/apps/:childId/safesearch — get safe search settings
router.get("/:childId/safesearch", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const [rows] = await pool.query(
    "SELECT * FROM safe_search_settings WHERE child_id = ?",
    [childId]
  );
  const settings = rows[0];

  return res.json({
    googleSafeSearch: settings ? toBool(settings.google_safe_search) : true,
    youtubeRestricted: settings ? toBool(settings.youtube_restricted) : true,
    bingSafeSearch: settings ? toBool(settings.bing_safe_search) : true
  });
});

// PUT /api/apps/:childId/safesearch — update safe search settings
router.put("/:childId/safesearch", async (req, res) => {
  const childId = toInt(req.params.childId);
  if (!childId) {
    return res.status(400).json({ error: "Invalid child id" });
  }
  const hasAccess = await verifyChildAccess(childId, req.user);
  if (!hasAccess) {
    return res.status(404).json({ error: "Child not found" });
  }

  const { googleSafeSearch, youtubeRestricted, bingSafeSearch } = req.body || {};

  const googleVal = googleSafeSearch === undefined ? 1 : toBool(googleSafeSearch) ? 1 : 0;
  const youtubeVal = youtubeRestricted === undefined ? 1 : toBool(youtubeRestricted) ? 1 : 0;
  const bingVal = bingSafeSearch === undefined ? 1 : toBool(bingSafeSearch) ? 1 : 0;

  await pool.query(
    `INSERT INTO safe_search_settings (child_id, google_safe_search, youtube_restricted, bing_safe_search)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       google_safe_search = VALUES(google_safe_search),
       youtube_restricted = VALUES(youtube_restricted),
       bing_safe_search = VALUES(bing_safe_search)`,
    [childId, googleVal, youtubeVal, bingVal]
  );

  return res.json({
    googleSafeSearch: toBool(googleVal),
    youtubeRestricted: toBool(youtubeVal),
    bingSafeSearch: toBool(bingVal)
  });
});

export default router;
