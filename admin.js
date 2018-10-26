"use strict";

const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();
let system;

router.use((req, res, next) => {
 const auth = req.session.auth;
//console.log(auth);
 if(auth.uid != 'admin'){
  res.status(500).end('Not Access.');
 }else{
  DB.get_system().then((data) => {
   system = data;
   next();
  }).catch((error) => {
console.log('sys:',error);
   const err = 'サーバーエラー';
   res.render('login', {'acc_opt':system.account_opt, 'error': err});
  });
 }
});

router.get('/' , function(req, res){
 get_users().then((rows) => {
//console.log(rows);
  res.render('admin', {'sys':system,'users':rows});
 }).catch((err) => {
  console.log(err);
  res.status(500).end();
 });
});

router.get('/passwd' , function(req, res){
 res.render('adm_pw');
});

router.post('/passwd' , function(req, res){
 const passwd = req.body.passwd || '';
 update_system({'action': 'passwd', 'data': passwd}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.put('/opt' , function(req, res){
 const action = req.body.action;
 const data = req.body.data;
 update_system({'action': action, 'data': data}).then(() => {
  res.status(200).json({'status':true});
  if(action == 'log_opt'){
   const CronTime = require('cron').CronTime;
   const job = module.parent.exports.get('job');
   const opt = JSON.parse(data);
   const cronTime = '0 '+opt.m+' '+opt.h+' * * *';
   job.stop();
   if(opt.days != 0){
    job.setTime(new CronTime(cronTime));
    job.start();
   }
  }
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.post('/user' , function(req, res){
//console.log(req.body);
 const id = req.body.id;
 const pw = req.body.pw;
console.log(id,pw);
 add_user({'id': id, 'pw': pw}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.delete('/user/:uid' , function(req, res){
 const uid = req.params.uid;
 delete_user({'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
  //res.status(500).json({'status':false});
 });
});

const update_system = (params) => {
 const action = params.action;
 const data = params.data;
 const sql = `UPDATE system SET `+action+` = ?`;
 const query = [data];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const update_pw = (params) => {
 const pw = params.pw;
 const sql = `UPDATE system SET (passwd) = (?)`;
 const query = [pw];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_users = () => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT uid,id,(SELECT MAX(rdate) FROM logs_v WHERE logs_v.uid = users.uid) AS last_date FROM users`;
  db.all(sql, (error, rows) => {
//console.log('users:',rows);
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const add_user = (params) => {
 const id = params.id;
 const pw = params.pw;
 const sql = `INSERT INTO users (id,passwd) VALUES (?,?)`;
 const query = [id,pw];
 return new Promise((resolve, reject) => {
  db.run(sql, query, (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const delete_user = (params) => {
 const uid = params.uid;
 const tables = ['users','tags','logs'];
 const query = [uid];
 let sql;
 return new Promise((resolve, reject) => {
  db.serialize(() => {
   for(let table of tables){
    sql = `DELETE FROM `+table+` WHERE uid = ?`;
    db.run(sql, query, (error, rows) => {
     if(error){
      reject(error);
     }else{
      resolve(rows);
     }
    });
   }
  });
 });
}

module.exports = router;
