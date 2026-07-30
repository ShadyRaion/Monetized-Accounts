import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_FILE = join(process.cwd(), 'public', 'settings.json');

export const writeSettingsToFile = async (settings: any): Promise<void> => {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('[settings-file] Settings written to disk');
  } catch (error) {
    console.error('[settings-file] Failed to write settings to file:', error);
    throw error;
  }
};

export const readSettingsFromFile = (): any | null => {
  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('[settings-file] Failed to read settings from file:', error);
    return null;
  }
};
