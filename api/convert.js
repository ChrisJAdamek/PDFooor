const axios = require('axios');
const mammoth = require('mammoth');
const MarkdownIt = require('markdown-it');
const multer = require('multer');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const qs = require('querystring');

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
    exp: 1681104068,
    iss: 'A59B2A0664310CA80A495E6D@AdobeOrg',
    sub: 'B7F632436432234B0A495E4C@techacct.adobe.com',
    'https://ims-na1.adobelogin.com/s/example_sdk': true,
    aud: 'https://ims-na1.adobelogin.com/c/032f50479e344564a8d1e75f9a1bb77f',
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      'x5c': [publicCert],
    },
  });

  return token;
};

const getAccessToken = async (jwtToken) => {
  try {
    const requestBody = qs.stringify({
      client_id: process.env.ADOBE_CLIENT_ID,
      client_secret: process.env.ADOBE_CLIENT_SECRET,
      jwt_token: jwtToken,
    });

    const response = await axios.post(
      'https://ims-na1.adobelogin.com/ims/exchange/jwt',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Error obtaining access token:', error);
    return null;
  }
};

app.post('/api/convert', upload.single('pdf'), async (req, res) => {
  const { buffer: pdfBuffer } = req.file;

  try {
    const jwtToken = generateJwtToken();
    const accessToken = await getAccessToken(jwtToken);

    if (!accessToken) {
      res.status(500).send('An error occurred while obtaining the access token.');
      return;
    }

    const response = await axios.post(
      'https://api.adobe.io/pdf/convert/export',
      pdfBuffer,
      {
        headers: {
          'Content-Type': 'application/pdf',
          'x-api-key': process.env.ADOBE_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
      }
    );

    const docxBuffer = Buffer.from(response.data);

    const result = await mammoth.convertToMarkdown({ buffer: docxBuffer });
    const markdown = result.value;

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
