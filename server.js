// const express = require('express');
// const multer = require('multer');
// const { google } = require('googleapis');
// const stream = require('stream');
// const path = require('path');
// const cors = require('cors');

// const app = express();
// app.use(cors());
// const upload = multer();

// // Google Drive setup
// const KEYFILEPATH = path.join(__dirname, 'credentials.json');
// const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// const auth = new google.auth.GoogleAuth({
//   keyFile: KEYFILEPATH,
//   scopes: SCOPES,
// });

// const driveService = google.drive({ version: 'v3', auth });

// app.post('/upload', upload.single('photo'), async (req, res) => {
//     try {
//       const { file } = req;
//       const bufferStream = new stream.PassThrough();
//       bufferStream.end(file.buffer);
  
//       const { data } = await driveService.files.create({
//         media: {
//           mimeType: file.mimetype,
//           body: bufferStream,
//         },
//         requestBody: {
//           name: file.originalname,
//           parents: ['1ak6yZuZCA6tJkffqbTgHg0ILQTIkQVaR'], // Replace with your Google Drive folder ID
//         },
//         fields: 'id,name,webViewLink',
//       });
  
//       console.log(`Uploaded file ${data.name} ${data.id}`);
//       res.json({
//         message: 'File uploaded successfully',
//         fileId: data.id,
//         fileName: data.name,
//         webViewLink: data.webViewLink
//       });
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       res.status(500).json({ message: 'Error uploading file', error: error.message });
//     }
//   });

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });



const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const stream = require('stream');
const cors = require('cors');
const { setTimeout } = require('timers/promises');

const app = express();
app.use(cors());
const upload = multer();

// Google Drive setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const driveService = google.drive({ version: 'v3', auth });

// Implement exponential backoff with jitter
const backoff = (attempt, max = 60000) => {
  const jitter = Math.random() * 1000;
  return Math.min(((2 ** attempt) * 1000) + jitter, max);
};

const uploadFileWithRetry = async (file, retries = 5) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      const { data } = await driveService.files.create({
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        requestBody: {
          name: file.originalname,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        fields: 'id,name,webViewLink',
      });

      console.log(`Uploaded file ${data.name} ${data.id}`);
      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.log(`Upload attempt ${attempt + 1} failed. Retrying...`);
      const delay = backoff(attempt);
      console.log(`Waiting for ${delay}ms before next attempt`);
      await setTimeout(delay);
    }
  }
};

app.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { file } = req;
    const data = await uploadFileWithRetry(file);

    res.json({
      message: 'File uploaded successfully',
      fileId: data.id,
      fileName: data.name,
      webViewLink: data.webViewLink
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file', error: error.toString() });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});