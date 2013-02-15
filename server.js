var express = require('express');

var connect = require('connect');
var csrf = require('./csrf');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'ffsffs',
  database: 'backbone'
});
connection.connect();
var app = express.createServer();

var allowCrossDomain = function(req, res, next) {
  // Added other domains you want the server to give access to
  // WARNING - Be careful with what origins you give access to
  var allowedHost = [
    'http://localhost'
  ];
  console.log(req.headers.origin);
  if(allowedHost.indexOf(req.headers.origin) !== -1) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    next();
  } else {
    res.send({auth: false});
  }
}

app.configure(function() {
    app.use(express.cookieParser());
    app.use(express.session({ secret: 'thomasdavislovessalmon' }));
    app.use(express.bodyParser());
    app.use(allowCrossDomain);
    app.use(csrf.check);
});

app.get('/session', function(req, res){
  // This checks the current users auth
 if(typeof req.session.username !== 'undefined'){
    res.send({auth: true, id: req.session.id, username: req.session.username, csrf: req.session.csrf});
  } else {
    res.send({auth: false, csrf: req.session.csrf});
  }
});
app.options('/*', function(req, res, next){
  res.send(200);
  next();
});

app.post('/user', function(req, res){
  // Login
  // Here you would pull down your user credentials and match them up
  // to the request
  var username = req.body.desired_username;
  var email = req.body.email;
  var password = req.body.password;
  var that = this;
  connection.query('INSERT INTO users (username,email,password) VALUES ("'+username+'","'+email+'","'+password+'")', function(err, rows, fields) {
  connection.query('SELECT id,username,email,location,description,name FROM users WHERE username = "'+username+'"', function(err, rows, fields) {
    
    req.session.username = req.body.desired_username;
    req.session.userid = rows[0].id;

    res.send({auth: true, id: req.session.id, username: req.session.username});
    });
  });
  
});
app.get('/user/:username', function(req, res){
  var username = req.params.username;
  connection.query('SELECT id,username,email,location,description,name FROM users WHERE username = "'+username+'"', function(err, rows, fields) {
    if(rows.length > 0) {
      res.send(rows[0]);
    } else {
      res.send(204)
    }
  });
  
});
app.get('/users', function(req, res){
  connection.query('SELECT id,username,email,location,name FROM users ', function(err, rows, fields) {
      res.send(rows);
  });
  
});
app.get('/:username/comments', function(req, res){
  connection.query('SELECT id,username,email,location,name FROM users where username="'+req.params.username+'" ', function(err, rows, fields) {
      var id = rows[0].id;
    connection.query('SELECT c.comment, u.username FROM comments as c, users as u where c.commenter = u.id AND c.user_id="'+id+'" ', function(err, rowsa, fields) {
      res.send(rowsa);
    });
  });
  
});
app.post('/:username/comments', function(req, res){
  connection.query('SELECT id,username,email,location,name FROM users where username="'+req.params.username+'" ', function(err, rows, fields) {
      var id = rows[0].id;
    connection.query('INSERT INTO comments (comment, user_id, commenter) VALUES ("'+req.body.comment+'", '+id+', '+req.session.userid+')', function(err, rowsa, fields) {
      res.send(rowsa);
    });
  });
  
});
app.put('/user/:username', function(req, res){
  var username = req.body.username;
  var location = req.body.location;
  var name = req.body.name;
  var description = req.body.description;
  connection.query('UPDATE users SET location="'+location+'", description="'+description+'", name="'+name+'" WHERE username = "'+username+'"', function(err, rows, fields) {
    if(rows.length > 0) {
      console.log(rows[0]);
      res.send(rows[0]);
    } else {
      res.send(204)
    }
  });
  
});
app.post('/session', function(req, res){
  // Login
  // Here you would pull down your user credentials and match them up
  // to the request
  connection.query('SELECT id,username,email, location, description,name FROM users where username = "'+req.body.username+'" AND password ="'+req.body.password+'"', function(err, rows, fields) {
    if(rows.length) {
      req.session.username = req.body.username;
      req.session.userid = rows[0].id;
      res.send({auth: true, id: req.session.id, username: req.body.username, csrf: req.session.csrf});
    } else {
      res.send({auth: false, csrf: req.session.csrf});

    }
  });
});

app.del('/session/:id', function(req, res, next){
  // Logout by clearing the session
  req.session.regenerate(function(err){
    // Generate a new csrf token so the user can login again
    // This is pretty hacky, connect.csrf isn't built for rest
    // I will probably release a restful csrf module
    csrf.generate(req, res, function () {
      res.send({auth: false, csrf: req.session.csrf});
    });
  });
});

app.listen(8080);