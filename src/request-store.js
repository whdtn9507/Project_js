import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export function createRequestStore(path = fileURLToPath(new URL('../data/requests.json', import.meta.url))) {
  return {
    load() {
      try {
        const requests = JSON.parse(readFileSync(path, 'utf8'));
        if (!Array.isArray(requests)) throw new Error('Invalid request store');
        return requests;
      } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
      }
    },
    save(requests) {
      try {
        mkdirSync(dirname(path), { recursive: true });
        const temporary = path + '.tmp';
        writeFileSync(temporary, JSON.stringify(requests), 'utf8');
        renameSync(temporary, path);
      } catch (error) {
        throw new Error('신청곡 목록을 저장하지 못했습니다.', { cause: error });
      }
    }
  };
}
