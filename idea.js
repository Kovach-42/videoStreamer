const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb://fawad:Fawad123@ds155243.mlab.com:55243/imageupload';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname); 
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false });
    } else {
      files.map(file => {
        if ( file.contentType === 'video/mp4' || file.contentType === 'video/webm ') {
          file.isVideo = true;
        } else {
          file.isVideo = false;
        }
      });
      res.render('index', { files: files });
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/video/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'video/mp4' || file.contentType === 'video/webm') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});

const port = 9000;

app.listen(port, () => console.log(`Server started on port ${port}`));


/*

<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm"
    crossorigin="anonymous">
  <style>
    video {
      width: 100%;
    }
  </style>
  <title>Mongo File Uploads</title>
</head>

<body>
  <div class="container">
    <div class="row">
      <div class="col-md-6 m-auto">
        <h1 class="text-center display-4 my-4">Mongo File Uploads</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <div class="custom-file mb-3">
            <input type="file" name="file" id="file" class="custom-file-input">
            <label for="file" class="custom-file-label">Choose File</label>
          </div>
          <input type="submit" value="Submit" class="btn btn-primary btn-block">
        </form>
        <hr>
        <% if(files){ %>
          <% files.forEach(function(file) { %>
            <div class="card card-body mb-3">
              <% if(file.isVideo) { %>
                <video src="video/<%= file.filename %>" alt="">
                <% } else { %>
                  <%= file.filename %>
                    <% } %>
                      <form method="POST" action="/files/<%= file._id %>?_method=DELETE">
                        <button class="btn btn-danger btn-block mt-4">Delete</button>
                      </form>
            </div>
            <% }) %>
              <% } else { %>
                <p>No files to show</p>
                <% } %>
      </div>
    </div>
  </div>

  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN"
    crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q"
    crossorigin="anonymous"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl"
    crossorigin="anonymous"></script>
</body>

</html>
this code work for image..

*/

//Actually you don't save media(image or video) in DB, you store it in some storage 
//drive(locally or cloud) like s3 bucket, and then store its location url in your DB. and this code might be helpful.

saveImage(urlPath, folderPath, multiple) {
    return new Promise((resolve, reject) => {
        var timestamp = Date.now();
        var filepath = urlPath;
        var imageUrl;
        var ext = path.extname(filepath || '').split('.');
        var extension = ext[ext.length - 1];

        var tmp_path = filepath;
        imageUrl = folderPath + timestamp + '.' + extension;
        if (multiple != '' && multiple != undefined) { imageUrl = folderPath + timestamp + multiple + '.' + extension; }
        var target_path = __dirname + '/../' + imageUrl;//Change according to your location.
        console.log("target_path", target_path);
        mv(tmp_path, target_path, { mkdirp: true }, function (err) { })
        return resolve({ status: 1, url: imageUrl });
    })
}
//Now, urlPath is your media path, foldarPath is path where you want 
//to store your media and multiple is to give unique name. you can call this method like this.

var multiple = Number(0) + Number(10);
                console.log("multiple", multiple);
                var saveImage = await 'YOUR_FILE_NAME'.saveImage(files.photo[0].path, 'public/Image/', multiple);
console.log(saveImage);