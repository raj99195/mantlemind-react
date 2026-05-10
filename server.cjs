const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config();

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

// ===== SWAP PREVIEW =====
app.post('/api/byreal/swap/preview', async (req, res) => {
  try {
    const { inputMint, outputMint, amount } = req.body;
    const cmd = `byreal-cli swap execute --input-mint ${inputMint} --output-mint ${outputMint} --amount ${amount} --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
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
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP PREVIEW =====
app.post('/api/byreal/lp/preview', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --dry-run -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP OPEN =====
app.post('/api/byreal/lp/open', async (req, res) => {
  try {
    const { poolId, priceLower, priceUpper, amount } = req.body;
    const cmd = `byreal-cli positions open --pool ${poolId} --price-lower ${priceLower} --price-upper ${priceUpper} --base MintB --amount ${amount} --auto-swap --confirm -o json`;
    const { stdout } = await execAsync(cmd);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP LIST =====
app.get('/api/byreal/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-cli positions list -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== LP CLOSE =====
app.post('/api/byreal/lp/close', async (req, res) => {
  try {
    const { nftMint } = req.body;
    const { stdout } = await execAsync(`byreal-cli positions close --nft-mint ${nftMint} --auto-swap --confirm -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS SCAN =====
app.get('/api/byreal/perps/scan', async (req, res) => {
  try {
    const risk = req.query.risk || 'conservative';
    const { stdout } = await execAsync(`byreal-perps-cli scan --risk ${risk} -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS ACCOUNT =====
app.get('/api/byreal/perps/account', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli account -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS PREVIEW =====
app.post('/api/byreal/perps/preview', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const { stdout } = await execAsync(`byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --dry-run -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS EXECUTE =====
app.post('/api/byreal/perps/execute', async (req, res) => {
  try {
    const { coin, side, size, leverage } = req.body;
    const { stdout } = await execAsync(`byreal-perps-cli order --coin ${coin} --side ${side} --size ${size} --leverage ${leverage} --confirm -o json`);
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== PERPS POSITIONS =====
app.get('/api/byreal/perps/positions', async (req, res) => {
  try {
    const { stdout } = await execAsync('byreal-perps-cli positions -o json');
    res.json({ success: true, data: JSON.parse(stdout) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== TELEGRAM SEND =====
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { chatId, message } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN || !chatId) return res.json({ success: false, error: 'Missing credentials' });

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
    const data = await response.json();
    res.json({ success: data.ok, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== REALCLAW COMMAND =====
app.post('/api/realclaw/command', async (req, res) => {
  try {
    const { chatId, command } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: command, parse_mode: 'HTML' })
    });
    const data = await response.json();
    res.json({ success: data.ok, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SUPABASE — SAVE USER =====
app.post('/api/users/save', async (req, res) => {
  try {
    const { walletAddress, telegramChatId, telegramUsername } = req.body;
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('users')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        telegram_chat_id: String(telegramChatId),
        telegram_username: telegramUsername,
      }, { onConflict: 'wallet_address' });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ===== SUPABASE — GET USER =====
app.get('/api/users/:walletAddress', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', req.params.walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`MantleMind Backend running on http://localhost:${PORT}`);
  console.log(`Byreal CLI + Perps CLI + Telegram + Supabase connected!`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/byreal/overview`);
  console.log(`  GET  /api/byreal/pools`);
  console.log(`  POST /api/byreal/swap/preview`);
  console.log(`  POST /api/byreal/lp/preview`);
  console.log(`  GET  /api/byreal/perps/scan`);
  console.log(`  POST /api/telegram/send`);
  console.log(`  POST /api/realclaw/command`);
  console.log(`  POST /api/users/save`);
  console.log(`  GET  /api/users/:walletAddress`);
});
