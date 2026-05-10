import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===== SAVE USER =====
export async function saveUser(walletAddress, telegramChatId, telegramUsername) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      wallet_address: walletAddress.toLowerCase(),
      telegram_chat_id: String(telegramChatId),
      telegram_username: telegramUsername,
    }, { onConflict: 'wallet_address' });

  if (error) throw error;
  return data;
}

// ===== GET USER =====
export async function getUser(walletAddress) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ===== SEND TELEGRAM MESSAGE =====
export async function sendTelegram(chatId, message) {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      })
    });
    return await res.json();
  } catch (err) {
    console.log('Telegram send failed:', err.message);
    return null;
  }
}

// ===== SEND REALCLAW COMMAND =====
export async function sendRealClawCommand(chatId, command) {
  return sendTelegram(chatId, command);
}

// ===== NOTIFY AGENT ACTIVITY =====
export async function notifyAgentActivity(walletAddress, message) {
  try {
    const user = await getUser(walletAddress);
    if (!user?.telegram_chat_id) return;
    await sendTelegram(user.telegram_chat_id, message);
  } catch (err) {
    console.log('Notify failed:', err.message);
  }
}