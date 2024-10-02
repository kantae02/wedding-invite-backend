const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer();

// Google Drive setup
const KEYFILEPATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const driveService = google.drive({ version: 'v3', auth });

app.post('/upload', upload.single('photo'), async (req, res) => {
    try {
      const { file } = req;
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
  
      const { data } = await driveService.files.create({
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        requestBody: {
          name: file.originalname,
          parents: ['1ak6yZuZCA6tJkffqbTgHg0ILQTIkQVaR'], // Replace with your Google Drive folder ID
        },
        fields: 'id,name,webViewLink',
      });
  
      console.log(`Uploaded file ${data.name} ${data.id}`);
      res.json({
        message: 'File uploaded successfully',
        fileId: data.id,
        fileName: data.name,
        webViewLink: data.webViewLink
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});