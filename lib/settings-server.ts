import { readFileSync } from 'fs';
import { join } from 'path';

export async function getInitialSettings() {
  try {
    const settingsFile = join(process.cwd(), 'public', 'settings.json');
    const content = readFileSync(settingsFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('[settings-server] Failed to load initial settings:', error);
    return null;
  }
}
