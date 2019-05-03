const express      = require("express"),
      router       = express.Router(),
      Park         = require("../models/park"),
      middleware   = require("../middleware"), // automatically looks for index.js
      NodeGeocoder = require("node-geocoder"),
      multer       = require('multer'),
      cloudinary   = require('cloudinary');

// =========== Image Upload Configuration =============
//multer config
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter});

// cloudinary config
cloudinary.config({ 
  cloud_name: 'parkreviewcloud', 
  api_key: 953268585754639, 
  api_secret: 'yTuQYa54KlryYfo4-yTBQBV2Xec'
});

// =========== Google map Configuration =============
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
var geocoder = NodeGeocoder(options);

// ============= ROUTES ==============
// Define escapeRegex function to avoid regex DDoS attack
const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

// INDEX -show all parks
router.get("/", (req, res) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Park.find({name: regex}, function(err, allParks) {
      if (err) { console.log(err); }
      else {
        if (allParks.length < 1) {
          noMatch = "No parks found, please try again.";
        }
        res.render("parks/index", { parks: allParks, page: "parks", noMatch: noMatch });  
      }
    });
  } else {
    // Get all camgrounds from DB
    Park.find({}, function(err, allParks) {
      if (err) { console.log(err); }
      else {
        res.render("parks/index", { parks: allParks, page: "parks", noMatch: noMatch });  
      }
    }); 
  }
});

// CREATE - add new park to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // cloudinary
  cloudinary.uploader.upload(req.file.path, (result) => {
     // get data from the form
    let { name, image, price, description, author } = { 
      name: req.body.name,
      image: {
        // add cloudinary public_id for the image to the park object under image property
        id: result.public_id,
        // add cloudinary url for the image to the park object under image property
        url: result.secure_url
      },
      price: req.body.price,
      description: req.body.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
  
    // geocoder for Google Maps
    geocoder.geocode(req.body.location, (err, data) => {
      // if (err || !data.length) {
      //   req.flash('error', 'Invalid address');
      //   return res.redirect('back');
      // }
      if (err) throw err;
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].formattedAddress;
      let newPark = { name, image, price, description, author, location, lat, lng };
    
      // create a new park and save to DB
      Park.create(newPark, (err, newlyCreated) => {
        if (err) { console.log(err); }
        else {
          // redirect back to park page
          res.redirect("/parks");
        }
      });
    });
  });
});

// NEW
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("parks/new"));

// SHOW - shows more info about one park
router.get("/:id", (req, res) => {
  //find the park with provided id in DB
  Park.findById(req.params.id).populate("comments").exec((err, foundPark) => {
    if (err || !foundPark) {
      req.flash("error", "Park not found");
      res.redirect("back");
    } else {
      //render show template with that park
      res.render("parks/show", { park: foundPark });
    }
  });
});

// edit park route
// store original image id and url
let imageId, imageUrl;
router.get("/:id/edit", middleware.checkParkOwenership, (req, res) => {
  Park.findById(req.params.id, (err, foundPark) => {
    imageId = foundPark.image.id;
    imageUrl = foundPark.image.url;
    if (err) { res.redirect("/parks") }
    else { res.render("parks/edit", { park: foundPark }); } 
  });
});

// update park route
router.put("/:id", middleware.checkParkOwenership, upload.single('image'), (req, res) => {
  // if no new image to upload
  if (!req.file) {
    let { name, image, price, description, author } = { 
      name: req.body.park.name,
      image: {
        // add cloudinary public_id for the image to the park object under image property
        id: imageId,
        // add cloudinary url for the image to the park object under image property
        url: imageUrl
      },
      price: req.body.park.price,
      description: req.body.park.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
    geocoder.geocode(req.body.park.location, (err, data) => {
      // if (err || !data.length) {
      //   req.flash('error', 'Invalid address');
      //   return res.redirect('back');
      // }
      if (err) throw err;
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].formattedAddress;
      let newData = { name, image, price, description, author, location, lat, lng };
      
      //find and update the correct park
      Park.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedPark) => {
        if (err) {
          req.flash("error", err.message);
          res.redirect("/parks");
        } else {
          //redirect somewhere(show page)
          req.flash("success","Park Updated!");
          res.redirect("/parks/" + req.params.id);
        }
      });
    });
  } else {
    // cloudinary
    cloudinary.uploader.upload(req.file.path, (result) => {
      let { name, image, price, description, author } = { 
        name: req.body.park.name,
        image: {
          // add cloudinary public_id for the image to the park object under image property
          id: result.public_id,
          // add cloudinary url for the image to the park object under image property
          url: result.secure_url
        },
        price: req.body.park.price,
        description: req.body.park.description,
        // get data from the currenly login user
        author: {
          id: req.user._id,
          username: req.user.username
        }
      };
      
      // remove original/old park image on cloudinary
      cloudinary.uploader.destroy(imageId, (result) => { console.log(result) });
      
      geocoder.geocode(req.body.park.location, (err, data) => {
        if (err) throw err;
        let lat = data[0].latitude,
            lng = data[0].longitude,
            location = data[0].formattedAddress;
        let newData = { name, image, price, description, author, location, lat, lng };
        
        //find and update the correct park
        Park.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedPark) => {
          if (err) {
            req.flash("error", err.message);
            res.redirect("/parks");
          } else {
            //redirect somewhere(show page)
            req.flash("success","Park Updated!");
            res.redirect("/parks/" + req.params.id);
          }
        });
      });
    });
  }
});

// destroy park route
router.delete("/:id", middleware.checkParkOwenership, (req, res) => {
  Park.findByIdAndRemove(req.params.id, err => {
    if (err) { res.redirect("/parks"); }
    else {
      req.flash("success", "Park removed!");
      res.redirect("/parks"); }
  });
});

module.exports = router;
