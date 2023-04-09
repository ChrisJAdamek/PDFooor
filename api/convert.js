const axios = require('axios');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');
const multer = require('multer');
const express = require('express');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const md = new MarkdownIt();

app.post('/api/convert', upload.single('pdf'), async (req, res) => {
  const { buffer: pdfBuffer } = req.file;

  try {
    // Convert PDF to DOCX using Adobe API
    const response = await axios.post(
      'https://api.adobe.io/convert/pdf/export',
      pdfBuffer,
      {
        headers: {
          'Content-Type': 'application/pdf',
          'x-api-key': process.env.ADOBE_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    const docxBuffer = Buffer.from(response.data);

    // Convert DOCX to Markdown
    const result = await mammoth.convertToMarkdown({ buffer: docxBuffer });
    const markdown = result.value;

    // Convert Markdown to HTML
    const html = md.render(markdown);

    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred during file conversion.');
  }
});

module.exports = (req, res) => {
  app(req, res);
};
