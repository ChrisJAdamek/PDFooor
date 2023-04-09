// Import required libraries
const axios = require('axios');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');
const multer = require('multer');
const express = require('express');

// Create an Express app
const app = express();

// Configure Multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Initialize the MarkdownIt converter
const md = new MarkdownIt();

// POST endpoint for the file conversion
app.post('/api/convert', upload.single('pdf'), async (req, res) => {
  // Retrieve the uploaded PDF file buffer
  const { buffer: pdfBuffer } = req.file;

  try {
    // Convert PDF to DOCX using Adobe API
    // Make a POST request with the PDF buffer and necessary headers
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

    // Retrieve the DOCX buffer from the Adobe API response
    const docxBuffer = Buffer.from(response.data);

    // Convert DOCX to Markdown using the Mammoth library
    const result = await mammoth.convertToMarkdown({ buffer: docxBuffer });
    const markdown = result.value;

    // Convert Markdown to HTML using the MarkdownIt library
    const html = md.render(markdown);

    // Send the resulting HTML back to the client
    res.send(html);
  } catch (error) {
    // Handle errors and send an error response to the client
    console.error(error);
    res.status(500).send('An error occurred during file conversion.');
  }
});

// Export the Express app as a Vercel serverless function
module.exports = app;
