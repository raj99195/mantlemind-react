const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', byreal: 'connected', timestamp: Date.now() });
});

// ===== BYREAL OVERVIEW =====
app.get('/api/byreal/overview', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli overview -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== TOP POOLS =====
app.get('/api/byreal/pools', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const sort = req.query.sort || 'apr24h';
    const { stdout } = await execAsync(`byreal-cli pools list --sort-field ${sort} -o json`);
    const parsed = JSON.parse(stdout);
    const pools = parsed.data || parsed.pools || parsed || [];
    const arr = Array.isArray(pools) ? pools : Object.values(pools);
    res.json({ success: true, data: arr.slice(0, Number(limit)) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== POOL ANALYZE =====
app.get('/api/byreal/pools/:poolId/analyze', async (req, res) => {
  try {
    const { stdout } = await execAsync(`byreal-cli pools analyze ${req.params.poolId} -o json`);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== WALLET BALANCE =====
app.get('/api/byreal/wallet', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli wallet balance -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SWAP PREVIEW (dry-run) =====
app.post('/api/byreal/swap/preview', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;
    const cmd = `byreal-cli swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SWAP EXECUTE =====
app.post('/api/byreal/swap/execute', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;
    const cmd = `byreal-cli swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP — OPEN POSITION (dry-run) =====
app.post('/api/byreal/lp/preview', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP — OPEN POSITION (execute) =====
app.post('/api/byreal/lp/open', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP — LIST POSITIONS =====
app.get('/api/byreal/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli positions list -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP — CLOSE POSITION =====
app.post('/api/byreal/lp/close', async (req, res) => {
  try {
    const { nftMint } = req.body;
    const cmd = `byreal-cli positions close --nft-mint ${nftMint} --auto-swap --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS — MARKET SCAN =====
app.get('/api/byreal/perps/scan', async (req, res) => {
  try {
    const risk = req.query.risk || 'conservative';
    const { stdout } = await execAsync(`byreal-perps-cli scan --risk ${risk} -o json`);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS — ACCOUNT INFO =====
app.get('/api/byreal/perps/account', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli account -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS — OPEN POSITION (dry-run) =====
app.post('/api/byreal/perps/preview', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const cmd = `byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS — OPEN POSITION (execute) =====
app.post('/api/byreal/perps/execute', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const cmd = `byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS — POSITIONS =====
app.get('/api/byreal/perps/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli positions -o json');
    const data = JSON.parse(stdout);
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MantleMind Backend running on http://localhost:${PORT}`);
  console.log(`Byreal CLI + Perps CLI connected!`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /api/byreal/overview`);
  console.log(`  GET  /api/byreal/pools`);
  console.log(`  GET  /api/byreal/wallet`);
  console.log(`  POST /api/byreal/swap/preview`);
  console.log(`  POST /api/byreal/swap/execute`);
  console.log(`  POST /api/byreal/lp/preview`);
  console.log(`  POST /api/byreal/lp/open`);
  console.log(`  GET  /api/byreal/positions`);
  console.log(`  GET  /api/byreal/perps/scan`);
  console.log(`  POST /api/byreal/perps/execute`);
});