//jshint esversion:6
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const mongoose = require("mongoose");

app = express();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// URI
const mongoURI = "mongodb://localhost:27017/movies";

// connect to DB
const conn = mongoose.createConnection(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
conn.set('useCreateIndex', true);

// init GridFsStream
let gfs;
conn.once("open", function(){
	gfs = Grid(conn.db, mongoose.mongo); // init stream
	gfs.collection("videos");
});

// create storage engine
const storage = new GridFsStorage({
	url: mongoURI,
	file: (req, file) =>{
		return new Promise(function (resolve, reject) {
			crypto.randomBytes(16, (err, buf) => {
				if(err){
					return reject(err);
				} // if not create file name with an extention
				const filename = buf.toString("hex") + path.extname(file.originalname);
				const fileInfo = {
					filename: filename,
					bucketName: "videos"
				};
				resolve(fileInfo);
			});
		});
	}
});

// set upload var
const upload = multer({storage});


app.get("/", function(req, res) {
	gfs.files.find().toArray(function(err, files){

		// check if files exist
		if(!files || files.length === 0){

			res.render("home", {files: false});

		}else {// else map through array and check which a videos and which arent
			files.map(function(file){
				if(file.contentType === "video/mp4" || file.contentType === "video/mkv" || file.contentType === "video/ts") {
					file.isVideo = true;
				} else {
					file.isVideo = false;
				}
			});

			res.render("home", {files: files});
		}
	}); 
});

app.post("/upload", upload.single("file"), function(req, res){
	res.send("file uploaded");
});

// Get files from DB and show in movies page
app.post("/movies", function(req, res) {
	const videoFile = req.body.file;

	gfs.file.findOne(/*find a movie with this id*/)
	//then call movies page with found results
});


app.listen("3000", function(req, res) {
    console.log("Sever running on port 3000...");
});

