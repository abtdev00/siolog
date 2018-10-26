"use strict";

const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();

router.get('/' , function(req, res){
 const user = req.session.user;
 const view = req.session.auth.view;
 const uid = user.uid;
 const tag_opt = user.tag_opt;
 DB.get_tag(uid).then((tag_list) => {
  get_log({'uid': uid, 'min_id':'all'}).then((rows) => {
//console.log('log:',rows);
   res.render('index', {'uid':uid, 'view':view, 'tag_opt':tag_opt, 'msgs':rows, 'tags':tag_list});
  }).catch((err) => {
   console.log(err);
   res.status(500).end();
  });
 });
});

router.get('/get_log/:min_id' , function(req, res){
 const uid = req.session.user.uid;
 let min_id = req.params.min_id;
//console.log(min_id);
 get_log({'uid': uid, 'min_id': min_id}).then((rows) => {
//console.log(rows);
  res.status(200).json(rows);
 }).catch((err) => {
  console.log(err);
  res.status(500).end();
 });
});

router.get('/get_log/:tid/:min_id' , function(req, res){
 const uid = req.session.user.uid;
 let tid = req.params.tid;
 let min_id = req.params.min_id;
//console.log(min_id);
 get_log({'uid': uid, 'tid': tid, 'min_id': min_id}).then((rows) => {
//console.log(rows);
  res.status(200).json(rows);
 }).catch((err) => {
  console.log(err);
  res.status(500).end();
 });
});

const get_log = (params) => {
//console.log('log_param:',params);
 return new Promise((resolve, reject) => {
  let query = [];
  let cond = [];
  let sql = `SELECT lid,tid,msg,rdate,tag,tag_name FROM logs_v`;
  let order = ' ORDER BY lid DESC LIMIT 30';
  if(params.uid){
   cond.push('uid = ?');
   query.push(params.uid);
  }
  if(params.tid){
   cond.push('tid = ?');
   query.push(params.tid);
  }
  if(params.tag){
   cond.push('tag = ?');
   query.push(params.tag);
  }
  if(params.min_id != 'all'){
   cond.push('lid < ?');
   query.push(params.min_id);
  }
  if(cond.length){
   sql += ' WHERE '+cond.join(' AND ');
  }
  sql += order;
//console.log('sql:',sql,'query:',query);
  db.all(sql, query, (error, rows) => {
//console.log(rows);
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

module.exports = router;
