const axios = require('axios');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');
const multer = require('multer');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const md = new MarkdownIt();

const generateJwtToken = () => {
  const privateKey = Buffer.from(
    process.env.ADOBE_PRIVATE_KEY_BASE64,
    'base64'
  ).toString();
  const publicCert = Buffer.from(
    process.env.ADOBE_PUBLIC_CERT_BASE64,
    'base64'
  ).toString();

  const payload = {
    iss: process.env.ADOBE_CLIENT_ID, // Use the Client ID here
    sub: process.env.ADOBE_CLIENT_ID,
    aud: 'https://ims-na1.adobelogin.com/c/',
    exp: Math.round(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      'x5c': [publicCert],
    },
  });

  return token;
};


app.post('/api/convert', upload.single('pdf'), async (req, res) => {
  const { buffer: pdfBuffer } = req.file;

  try {
    const jwtToken = generateJwtToken();

    // Convert PDF to DOCX using Adobe API
    const response = await axios.post(
      'https://api.adobe.io/convert/pdf/export',
      pdfBuffer,
      {
        headers: {
          'Content-Type': 'application/pdf',
          'x-api-key': process.env.ADOBE_API_KEY,
          'Authorization': `Bearer ${jwtToken}`,
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
