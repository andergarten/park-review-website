const express    = require("express"),
      // mergeParam: merge rou tes from app.js 
      router     = express.Router({ mergeParams: true }),
      Park       = require("../models/park"),
      Comment    = require("../models/comment"),
      middleware = require("../middleware");

//Comments New
router.get("/new", middleware.isLoggedIn, function(req, res){
  // find campground by id
  console.log(req.params.id);
  Park.findById(req.params.id, function(err, park){
      if(err){
          console.log(err);
      } else {
           res.render("comments/new", {park: park});
      }
  })
});

// comments Create
router.post("/", middleware.isLoggedIn, (req, res) => {
  //lookup park using id
  Park.findById(req.params.id, (err, park) => {
    if (err) { 
      console.log(err);
      res.redirect("/parks");
    }
    else {
      //create new comment
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash("error", "Something went wrong.");
          console.log(err);
        } else {
          //add username and id to comments
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          //save comment
          comment.save();
          //connect new comment to park
          park.comments.push(comment);
          park.save();
          //redirect to park show page
          req.flash("success", "Successfully added comment");
          res.redirect("/parks/" + park._id);
        }
      });
    }
  });
});

// commnet Edit
router.put("/:comment_id/edit", middleware.checkCommentOwenership, (req, res) => {
  Comment.findById(req.params.comment_id, (err, comment) => {
    if (err) { res.redirect("back");}
    else { res.render("comments/edit", { park_id: req.params._id, comment: comment });}
  });
});

// commnet Update
router.put("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {
    if (err) { res.redirect("back"); }
    else { res.redirect("/parks/" + req.params.id); }
  });
});

// comment Destroy
router.delete("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  //findByIdAndRemove
  Comment.findByIdAndRemove(req.params.comment_id, err => {
    if (err) { res.redirect("back"); }
    else {
      req.flash("success", "Comment deleted");
      res.redirect("/parks/" + req.params.id);
    }
  });
});

module.exports = router;
