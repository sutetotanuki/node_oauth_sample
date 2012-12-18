
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;

mongoose.connect("mongodb://localhost/oauth_test");

var userSchema = new mongoose.Schema({
  uid: Number
});

userSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};

var User = mongoose.model('User', userSchema);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new TwitterStrategy({
  consumerKey: process.env.KEY,
  consumerSecret: process.env.SECRET,
  callbackURL: "http://localhost:3000/auth/twitter/callback"
}, function(token, tokenSecret, profile, done) {
  User.findAndModify({
    // Query
    uid: profile.id
  },
    // sort
    []
  ,{
    // Object
    $set: {
      uid: profile.id
    }
  }, {
    // Option
    upsert: true
  }, function(err, user) {
    if (err) {
      return done(err);
    }

    done(null, user._id);
  });
}));


var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  // -- 追加しところ --
  app.use(express.cookieParser()); // session使うためにパーサーを有効に
  app.use(express.session({secret: "hogesecret"})); // session有効
  app.use(passport.initialize()); // passportの初期化処理
  app.use(passport.session()); // passportのsessionを設定(中身はしらぬ)
  // -- 追加ココまで --
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/login', routes.login);
app.get('/users', user.list);

// -- 追加したルート --
// ユーザーからリクエストをもらうルート
app.get("/auth/twitter", passport.authenticate('twitter'));

// Twitterからcallbackうけるルート
app.get("/auth/twitter/callback", passport.authenticate('twitter', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
