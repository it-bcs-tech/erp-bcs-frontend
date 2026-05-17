import fs from 'fs';
import path from 'path';

/**
 * Server-Side Logger Utility
 * Menyimpan error log ke dalam folder /logs secara fisik di server
 * agar mudah dilacak ketika terjadi 500 Internal Server Error.
 */
export function logError(context: string, message: string, details?: any) {
    try {
        const logDir = path.resolve('logs');
        
        // Buat folder logs jika belum ada
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, 'erp-error.log');
        const timestamp = new Date().toISOString();
        
        let detailsStr = '';
        if (details) {
            try {
                detailsStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
            } catch (e) {
                detailsStr = String(details);
            }
        }
        
        const logMessage = `[${timestamp}] [${context}] ${message}\n${detailsStr ? `Details:\n${detailsStr}\n` : ''}---\n`;
        
        // Tulis log ke file (append)
        fs.appendFileSync(logFile, logMessage);
        
        // Tetap tampilkan di terminal console untuk development
        console.error(`\x1b[31m[ERROR] [${timestamp}] [${context}]\x1b[0m ${message}`);
        if (detailsStr) {
            console.error(`\x1b[33mDetails:\n${detailsStr}\x1b[0m`);
            console.error('\x1b[31m----------------------------------------\x1b[0m');
        }
    } catch (e) {
        console.error('Failed to write to error log file:', e);
    }
}
