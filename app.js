"use strict";

const path = require('path');

const DB = require('./db');
DB.init();

const express = require('express');
const session = require('express-session');
const app = express();

app.disable('x-powered-by');
app.set('views', path.join( __dirname, '/tpl'));
app.set('trust proxy', 'loopback');
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use('/', express.static(path.join(__dirname, '/pub')));

app.use(session({
 secret: 'ABT sio_svr',
 resave: false,
 saveUninitialized: true,
 name: 'ABT-siolog-sv',
}));


const sessionCheck = (req, res, next) => {
//console.log(req.session);
 if(req.session.auth){
  let uid = req.session.auth.uid;
  if(uid == 'admin'){
   next();
  }else{
   DB.get_user({'uid':uid}).then((data) => {
    req.session.user = data;
    next();
   }).catch((error) => {
    console.log('ss_chk:',error);
    const err = 'DBエラーが発生しました。';
    res.render('login', {'error': err});
   });
  }
 }else{
  res.redirect('/login');
 }
}

const logout = (req, res) => {
 req.session.destroy();
 res.redirect('/login');
}

app.use('/login', require('./login'));
app.use('/new', require('./new'));
app.use('/api', require('./api'));
app.use('/', sessionCheck, require('./router'));
app.use('/setup', require('./setup'));
app.use('/admin', require('./admin'));
app.use('/logout', logout);

const http = require('http').Server(app);
const io = require('socket.io')(http);
app.set('io', io);
io.on('connection',function(socket){
 let uid = socket.handshake.query.uid;
 socket.join(uid);
 console.log('Connect:',uid,socket.id);
 socket.on('disconnect',function(e){
  console.log('Disconnect:',socket.id);
 });
});

const PORT = process.env.PORT || 7100;
http.listen(PORT, function(){
    console.log('server listening. Port:' + PORT);
});

const getUniqueStr = (myStrong) => {
 let strong = 1000;
 if(myStrong) strong = myStrong;
 return new Date().getTime().toString(16) + Math.floor(strong*Math.random()).toString(16);
}

const logCheck = () => {
 DB.get_system().then((data) => {
  const opt = JSON.parse(data.log_opt);
//console.log('chk:',opt);
  if(opt.days != 0){
   const last_day = Date.now() - (86400000 * opt.days);
   const db = DB.db;
   const sql = `DELETE FROM logs WHERE rdate < ?`;
   db.run(sql,[last_day]);
  }
 }).catch((error) => {
  console.log('sys:',error);
 });
}

const cronJob = require('cron').CronJob;
DB.get_system().then((data) => {
 const opt = JSON.parse(data.log_opt);
 const cronTime = '0 '+opt.m+' '+opt.h+' * * *';
//console.log(cronTime);
 const job = new cronJob({
  cronTime: cronTime,
  onTick: () =>{
   logCheck();
  },
  start: false,
  timeZone: 'Asia/Tokyo'
 });
 app.set('job', job);
 if(opt.days != 0) job.start();
});

module.exports = app;
