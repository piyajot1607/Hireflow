/**
 * Resume Parser Utility
 * Extracts text from uploaded PDF resumes using pdf-parse
 */

const fs = require('fs');

/**
 * Extract plain text from a PDF file path
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {string} Extracted text content
 */
async function extractTextFromPDF(filePath) {
    try {
        const pdfParseModule = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);

        // Older pdf-parse versions export a function; newer versions export PDFParse class.
        if (typeof pdfParseModule === 'function') {
            const data = await pdfParseModule(dataBuffer);
            return data?.text || '';
        }

        if (typeof pdfParseModule?.default === 'function') {
            const data = await pdfParseModule.default(dataBuffer);
            return data?.text || '';
        }

        if (typeof pdfParseModule?.PDFParse === 'function') {
            const parser = new pdfParseModule.PDFParse({ data: dataBuffer });
            try {
                const data = await parser.getText();
                return data?.text || '';
            } finally {
                await parser.destroy();
            }
        }

        throw new Error('Unsupported pdf-parse module export');
    } catch (err) {
        console.warn('PDF parse error (non-PDF or corrupt):', err.message);
        // Return empty string so AI still runs with just job description
        return '';
    }
}

/**
 * Extract text from a DOCX file (basic fallback — reads as utf8)
 */
async function extractTextFromFile(filePath, mimetype) {
    if (!filePath) return '';
    if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
        return extractTextFromPDF(filePath);
    }
    // For .doc/.docx — just return a notice (full docx parsing needs mammoth)
    return `[Resume file uploaded: ${filePath.split(/[\\/]/).pop()}. Text extraction not available for this format.]`;
}

module.exports = { extractTextFromPDF, extractTextFromFile };
