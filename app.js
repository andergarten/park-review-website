require('dotenv').config();

var   express        = require("express"),
      app            = express(),
      bodyParser     = require("body-parser"),
      mongoose       = require("mongoose"),
      methodOverride = require("method-override"),
      helmet         = require("helmet"),
      User           = require("./models/user"),
      passport       = require("passport"),
      flash          = require("connect-flash"),
      LocalStrategy  = require("passport-local"),
      moment         = require("moment");

// requiring routes     
var   indexRoute      = require("./routes/index"),
      parkRoute       = require("./routes/parks"),
      commentRoute    = require("./routes/comments"),
      userRoute       = require("./routes/user");
    //   passwordRoute   = require("./routes/password");

// connect to database
mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true, useCreateIndex: true});

app.set("view engine", "ejs");
// body parse the request
app.use(bodyParser.urlencoded({extended: true}));
// in order to use customed style sheet; safe way of accessing public folder
app.use(express.static(__dirname + "/public"));
// to use post or delete request
app.use(methodOverride("_method"));
app.use(flash());
app.use(helmet());

//passport configuration
app.use(require("express-session")({
    secret: "I will become a nice SDE!",
    resave: false,
    saveUninitialized: false
  }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// make currentUser in ejs file meaningful
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success"); 
    app.locals.moment = moment; // create local variable available for the application
    next();
})

// use routes
app.use("/", indexRoute);
app.use("/parks", parkRoute);
app.use("/parks/:id/comments", commentRoute);
app.use("/users", userRoute);
// app.use("/", passwordRoute);

// app.listen(process.env.PORT, process.env.IP, () => console.log("The YelpCamp Server Has Started!"));
app.listen(process.env.PORT, () => console.log("The Park Review Server Has Started!"));