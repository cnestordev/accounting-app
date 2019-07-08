//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
let totalBalance = [3, 4];
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//passport-local is a dependecy of passport-local-mongoose & doesn't need to be called
const weekArray = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthArray = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const app = express();

app.use(session({
  secret: "thisisoursecret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('useFindAndModify', false);
mongoose.connect('mongodb://localhost:27017/user2DB', {useNewUrlParser: true});

const userAccount = new Schema({
  type: String,
  memo: String,
  amount: Number,
  balance: Number,
  dateAdded: String
});

const messages = new Schema({
  from: {
    name: String,
    id: String
  },
  date: String,
  message: String,
  subject: String,
  isRead: Boolean,
  hasReplied: Boolean
});

const userSchema = new Schema({
  firstName: String,
  username: String,
  password: String,
  date: String,
  isAdmin: Boolean,
  question: String,
  answer: String,
  messages: [messages],
  account: [userAccount]
});

userSchema.plugin(passportLocalMongoose);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const user1 = new User({
  username: "Trumpifan",
  password: "redwhiteblue77"
});

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

function newDate() {
  const newDate = new Date();
  const newMonth = monthArray[newDate.getMonth()];
  const newDay = newDate.getDate();
  const newYear = newDate.getFullYear();
  const newFullYear = `${newMonth} ${newDay}, ${newYear}`;
  return newFullYear;
}

function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

//----------------------------------------------------------------------------------------------//


app.get("/", function(req, res){
  res.render("home", {failedAttempt: false});
});


app.post("/", nocache, function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(foundUser){
      //found user code
       const user = new User({
    username: req.body.username,
    password: req.body.password
  });
      passport.authenticate("local", function(err, user){
        if(err){
          console.log(err);
        } else {
          if(user){
            req.login(user, function(err){
            res.redirect("/user");
            });
          } else {
            res.render("home", {failedAttempt: true});
          }
        }
      })(req, res);
    } else {
      //user does not exists
      res.render("home", {failedAttempt: true})
    }
  });
});


app.get("/logout", nocache, function(req, res){
  req.logout();
  res.redirect("/");
});


app.get("/signup", nocache, function(req, res){
  res.render("signup", {exists: false, created: false});
});

app.get("/user", nocache, function(req, res){
  if(req.isAuthenticated()){
  const userId = req.user._id;
  User.findOne({_id: userId}, function(err, foundUser){
    const foundUserString = String(foundUser._id);
    const reqUserString = String(req.user._id);
    if(foundUserString === reqUserString){
      //found user here
      if(req.isAuthenticated()){
        if(foundUser.isAdmin === true){
          // send over userDB
          User.find({}, function(err, foundUsers){
            res.render("account", {messageArray: req.user.messages, foundItem: foundUser.account, foundName: foundUser.firstName, foundId: foundUser._id, foundAmin: foundUser.isAdmin, foundUsers: foundUsers, adminForm: false});
          });
        } else {
        res.render("account", {messageArray: req.user.messages, foundItem: foundUser.account, foundName: foundUser.firstName, foundId: foundUser._id, foundAmin: foundUser.isAdmin, adminForm: false});
        }
      } else {
      res.redirect("/");
      }
    } else{
      res.redirect("/");
    }
  });
  } else {
    res.redirect("/")
  }
});

app.post("/signup", nocache, function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(!foundUser){
      //creat new user
      const hash = bcrypt.hashSync(req.body.answer, 10);
      User.register({username: req.body.username, firstName: req.body.firstName, isAdmin: false, question: req.body.question, answer: hash}, req.body.password, function(err, user){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/user");
    });
  });
    } else {
      //user already exists
      res.render("signup", {exists: true, created: false});
    }
  });
});



app.post("/accountData", nocache, function(req, res){
  if(req.isAuthenticated() && req.user.isAdmin){
    const datePosted = newDate();
    const type = req.body.type;
    const memo = req.body.memo;
    const amount = req.body.amount;
    const userId = req.body.UserId;
    User.findOneAndUpdate({_id: userId}, {$push: {account: {type: type, memo: memo, amount: amount, dateAdded: newDate()}}}, {new: true}, function(err, foundUser){
      User.find({}, function(err, foundUsers){
      res.render("account", {messageArray: req.user.messages, foundItem: foundUser.account, foundName: foundUser.firstName, foundId: foundUser._id, foundAmin: foundUser.isAdmin, foundUsers: foundUsers, adminForm: true});
      });
  });
  } else {
    res.redirect("/user");
  }
});



app.post("/makeAdmin", nocache, function(req, res){
  if(req.isAuthenticated() && req.user.isAdmin){
    if(req.body.makeAdmin === "true"){
      User.findOneAndUpdate({_id: req.body.UserId}, {$set: {isAdmin: true}}, function(err, foundUser){
        res.redirect("/user");
      });
    } else {
      res.redirect("/user");
    }
  }
});

app.post("/deleteItem", nocache, function(req, res){
  if(req.isAuthenticated() && req.user.isAdmin){
    if(typeof(req.body.deleteItem) === "object"){
      for(var i = 0; i < req.body.deleteItem.length; i++){
        User.findOneAndUpdate({_id: req.body.name}, {$pull: {account: {_id: req.body.deleteItem[i]}}}, function(err){
          if(err){
            console.log(err);
          } else {
          }
        });
      }
    } else {
      User.findOneAndUpdate({_id: req.body.name}, {$pull: {account: {_id: req.body.deleteItem}}}, function(err){
      });
    }
    res.redirect("/user");
  }
});

app.post("/deleteAccount", nocache, function(req, res){
  if(req.isAuthenticated() && req.user.isAdmin){
    const userId = req.body.delete;
    User.findByIdAndRemove(userId, function(err){
    res.redirect("/user");
  });
  } else {
    res.redirect("/user");
  }
});

app.post("/adminUser", nocache, function(req, res){
  if(req.isAuthenticated() && req.user.isAdmin){
  const userId = req.body.Accounts;
  User.findOne({_id: userId}, function(err, foundUser){
    User.find({}, function(err, foundUsers){
      res.render("account", {messageArray: req.user.messages, foundItem: foundUser.account, foundName: foundUser.firstName, foundId: foundUser._id, foundAmin: foundUser.isAdmin, foundUsers: foundUsers, adminForm: true});
    });
  });
} else {
  res.redirect("/");
}
});

//////////////////////////////////////EXPERIMENTAL MESSAGES///////////////////////////////////////////


app.get("/messages", nocache, function(req, res){
  if(req.isAuthenticated()){
    User.find({isAdmin: true}, function(err, users){
      User.find({}, function(err, allUsers){
        res.render("messages", {username: req.user.username, userId: req.user._id, messages: req.user.messages, sentStatus: false, foundUsers: users, allUsers: allUsers, isAdmin: req.user.isAdmin});
      });
    });
  } else {
    res.redirect("/");
  }
});

app.post("/messages", function(req, res){
  if(req.isAuthenticated()){
    User.findOneAndUpdate({_id: req.body.sendTo}, {$push: {messages: {from: {name: req.body.senderName, id: req.body.senderId}, subject: req.body.subject, message: req.body.message, date: newDate(), isRead: false, hasReplied: false}, $slice: -15}}, function(err, user){
      User.findOneAndUpdate({"messages._id": req.body.markRead}, {"$set": {"messages.$.isRead": true, "messages.$.hasReplied": true}}, function(err, user){
        User.find({isAdmin: true}, function(err, users){
          User.find({}, function(err, allUsers){
            res.render("messages", {username: req.user.username, userId: req.user._id, messages: req.user.messages, sentStatus: true, foundUsers: users, isAdmin: req.user.isAdmin, allUsers: allUsers});
          });
        });
      });
    }); 
  } else {
    res.redirect("/");
  }
}); 


app.post("/markAsRead", nocache, function(req, res){
  if(req.isAuthenticated()){
    User.findOneAndUpdate({"messages._id": req.body.markRead}, {"$set": {"messages.$.isRead": true}}, function(err){
      res.redirect(req.get('referer'));
    });
  } else {
    res.redirect("/");
  }
});


app.post("/deleteMessages", nocache, function(req, res){
  if(req.isAuthenticated()){
    User.findOneAndUpdate({_id: req.user._id}, {$pull: {messages: {_id: req.body.messageId}}}, function(err){
      if(err){
        console.log(err);
      } else {
        res.redirect("/messages");
      }
      });
  } else {
    res.redirect("/");
  }
});




////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/change-password", nocache, function(req, res){
  if(req.isAuthenticated()){
  res.render("change-password", {changedPassword: false, failedAttempt: false});
  } else {
    res.redirect("/");
  }
});

app.post('/changepassword', nocache, function(req, res) {
if(req.isAuthenticated()){
  User.findOne({_id: req.user._id },(err, user) => {
  // Check if error connecting
  if (err) {
    res.json({ success: false, message: err }); // Return error
  } else {
    // Check if user was found in database
    if (!user) {
      res.json({ success: false, message: 'User not found' }); // Return error, user was not found in db
    } else {
      user.changePassword(req.body.oldpassword, req.body.newpassword, function(err,user){
if (err) {
    res.render("change-password", {failedAttempt: true, changedPassword: false});
} else { 
  user.save()
  res.render("change-password", {changedPassword: true, failedAttempt: false});
             }
             });
    }
  }
}); 
} else {
  res.redirect("/");
} 
});



app.get("/verify-user", nocache, function(req, res){
  res.render("verifyUser", {error: false});
});


app.post("/verify-user", nocache, function(req, res){
  User.findOne({username: req.body.username}, function(err, user){
    if(!user){
      //user was not found
      res.render("verifyUser", {verifiedUser: false, error: "1"});
    } else {
      //user was found, check if security question matches
      if(req.body.question === user.question){
        //quesiton matches, check password
        if(bcrypt.compareSync(req.body.answer, user.answer)){
          //answers matched
          req.login(user, function(err){
            console.log("404 " + req.isAuthenticated());
            res.redirect("/reset-password");
          });
        } else {
          //answers didn't match
          console.log("answers didn't match");
          res.render("verifyUser", {verifiedUser: false, error: "2"});
        }
      } else {
        //question didn't match
        console.log("question didn't match");
        res.render("verifyUser", {verifiedUser: false, error: "2"});
      }
    }
  });
});

app.get("/reset-password", nocache, function(req, res){
  if(req.isAuthenticated()){
    res.render("reset-password", {error: false, userId: req.user._id})
  } else {
    res.redirect("/");
  }
});

app.post("/new-password", nocache, function(req, res){
  if(req.isAuthenticated()){
    User.findOne({_id: req.body.userId}, function(err, user){
      if(!user){
      } else {
        user.setPassword(req.body.password, function(err, user){
          if(err){
            res.send("error, please go back" + err);
          } else {
            user.save();
            req.logout();
            res.render("success");
          }
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

app.get("/myprofile", nocache, function(req, res){
  if(req.isAuthenticated()){
    res.render("profile", {user: req.user});
  } else {
    res.redirect("/");
  }
});


app.get("*", function(req, res){
  res.render("404");
});


//--------------------------------------------------------------------------------------------------------------------------------------------------//
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
