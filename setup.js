"use strict";

const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
 const user = req.session.user;
//console.log(user);
 if(req.session.auth.view){
  res.status(500).end('Not Access.');
 }else{
  next();
 }
});

router.get('/' , function(req, res){
 const user = req.session.user;
 const uid = user.uid;
 const rtoken = user.rtoken;
 const wtoken = user.wtoken;
 const vtoken = user.vtoken;
 const secret = new Buffer(user.secret, 'utf8').toString('base64');
 const tag_opt = user.tag_opt;
 const secret_opt = user.secret_opt;
 const root_url = req.protocol + '://' + req.headers.host;
 const access_url = root_url + '/api';
 const view_url = root_url + '/login/' + vtoken;
 const login_url = root_url + '/login/' + rtoken;
 const token_src = {'url':access_url, 'token':wtoken};
 const access_token = new Buffer(JSON.stringify(token_src), 'utf8').toString('base64');
 DB.get_tag(uid).then((rows) => {
//console.log('tag:',rows);
  res.render('setup', {'login_url':login_url, 'view_url':view_url, 'access_token':access_token, 'secret_key':secret, 'tag_opt':tag_opt, 'secret_opt':secret_opt, 'tags':rows});
 }).catch((err) => {
  console.log(err);
  res.status(500).end();
 });
});

router.post('/tag' , function(req, res){
//console.log(req.body);
 const uid = req.session.user.uid;
 const tid = req.body.tid;
 const tag = req.body.tag;
 const tag_name = req.body.tag_name;
//console.log(uid,tid,tag,tag_name);
 update_tag({'uid': uid, 'tid': tid, 'tag': tag, 'tag_name': tag_name}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.put('/tag_order' , function(req, res){
//console.log(req.body);
 const tag_list = req.body.tag_list;
 update_tag_order(tag_list).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(500).json({'status':false});
 });
});

router.delete('/tag/:tid' , function(req, res){
 const uid = req.session.user.uid;
 const tid = req.params.tid || '';
 delete_tag({'tid': tid,'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
  //res.status(500).json({'status':false});
 });
});

router.post('/token' , function(req, res){
 const action = req.body.action;
 let token = randomStr();
 if(action == 'vtoken') token = randomStr(16);
 const user_data = req.session.user;
 user_data[action] = token;
 update_token(user_data).then((rows) => {
//console.log(rows);
  req.session.user = user_data;
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
  //res.status(500).end('DB Error');
 });
});

router.put('/opt' , function(req, res){
 const uid = req.session.user.uid;
 const action = req.body.action;
 const data = req.body.data;
 const params = {'uid':uid, 'action':action, 'data':data};
 update_opt(params).then((rows) => {
//console.log(rows);
  req.session.user[action] = data;
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
  //res.status(500).end('DB Error');
 });
});

router.post('/passwd' , function(req, res){
//console.log(req.body);
 const uid = req.session.user.uid;
 const passwd = req.body.passwd;
 update_passwd({'uid': uid, 'passwd': passwd}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.delete('/user' , function(req, res){
 const uid = req.session.user.uid;
 delete_id({'uid': uid}).then(() => {
  res.status(200).json({'status':true});
  req.session.destroy();
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

router.get('/log' , function(req, res){
 const uid = req.session.user.uid;
 get_log({'uid': uid}).then((data) => {
  const date = Object.values(getDate()).join('');
  const json2csv = require('json2csv').parse;
  const fields = ['rdate','tag','msg'];
  const opts = {fields, header:false, withBOM:true};
  const csv = json2csv(data, opts);
  res.setHeader('Content-disposition', 'attachment; filename=log_'+date+'.csv');
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.status(200).send(csv);
 }).catch((err) => {
  console.log(err);
  res.status(500).end('Error');
 });
});

router.delete('/log' , function(req, res){
 const uid = req.session.user.uid;
 delete_log({'uid': uid}).then(() => {
  res.status(200).json({'status':true});
 }).catch((err) => {
  console.log(err);
  res.status(200).json({'status':false});
 });
});

const update_tag = (params) => {
 const uid = params.uid;
 const tid = params.tid;
 const tag = params.tag;
 const tag_name = params.tag_name;
 let sql,query;
 if(tid){
  sql = `UPDATE tags SET (tag,tag_name) = (?,?) WHERE uid = ? AND tid = ?`;
  query = [tag,tag_name,uid,tid];
 }else{
  sql = `INSERT INTO tags (uid,tag,tag_name) VALUES (?,?,?)`;
  query = [uid,tag,tag_name];
 }
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

const update_tag_order = (tag_list) => {
 const sql = `UPDATE tags SET od = ? WHERE tid = ?`;
 return new Promise((resolve, reject) => {
  tag_list.forEach(function(tid, idx){
   let query = [idx,tid];
   db.run(sql, query, (error, rows) => {
    if(error){
     reject(error);
    }else{
     resolve(rows);
    }
   });
  });
 });
}

const delete_tag = (params) => {
 const uid = params.uid;
 const tid = params.tid;
 const sql = `DELETE FROM tags WHERE tid = ? AND uid = ?`;
 const query = [tid,uid];
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

const update_token = (params) => {
 const uid = params.uid;
 const rtoken = params.rtoken;
 const wtoken = params.wtoken;
 const vtoken = params.vtoken;
 const secret = params.secret;
 const sql = `UPDATE users SET (rtoken,wtoken,vtoken,secret) = (?,?,?,?) WHERE uid = ?`;
 const query = [rtoken,wtoken,vtoken,secret,uid];
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

const update_opt = (params) => {
 const uid = params.uid;
 const col = params.action;
 const data = params.data;
 const sql = `UPDATE users SET `+col+` = ? WHERE uid = ?`;
 const query = [data,uid];
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

const update_passwd = (params) => {
 const uid = params.uid;
 const passwd = params.passwd;
 const sql = `UPDATE users SET passwd = ? WHERE uid = ?`;
 const query = [passwd,uid];
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

const delete_id = (params) => {
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

const get_log = (params) => {
 const uid = params.uid;
 const sql = `SELECT rdate,tag,msg FROM logs_v WHERE uid = ?`;
 return new Promise((resolve, reject) => {
  db.all(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const delete_log = (params) => {
 const uid = params.uid;
 const sql = `DELETE FROM logs WHERE uid = ?`;
 return new Promise((resolve, reject) => {
  db.run(sql, [uid], (error, rows) => {
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const randomStr = (length) => {
 let s = '';
 length = length || 32;
 for (let i = 0; i < length; i++) {
  let random = Math.random() * 16 | 0;
  s += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
 }
 return s;
}

const getDate = (date) => {
 date = date || Date.now();
 const days = new Date(date);
 let datetime = {};
 datetime.Y = days.getFullYear();
 datetime.M = ('0' + (days.getMonth() + 1)).slice(-2);
 datetime.D = ('0' + days.getDate()).slice(-2);
 datetime.h = ('0' + days.getHours()).slice(-2);
 datetime.m = ('0' + days.getMinutes()).slice(-2);
 datetime.s = ('0' + days.getSeconds()).slice(-2);
 return datetime;
}

module.exports = router;
