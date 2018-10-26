"use strict";

const db = require('./db').db;
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
 res.render('new');
});

router.post('/', (req, res) => {
 const id = req.body.id || '';
 const passwd = req.body.passwd || '';
 add_user({'id':id, 'passwd':passwd}).then((data) => {
  res.status(200).json({'status':true});
 }).catch((error) => {
  //console.log(error);
  res.status(200).json({'status':false});
 });
});

const add_user = (params) => {
//console.log(params);
 return new Promise((resolve, reject) => {
  let sql = `SELECT uid FROM users WHERE id = ? AND passwd = ?`;
  let param = [params.id, params.passwd];
  db.get(sql, param, (error, row) => {
   if(error || row){
    reject(error);
   }else{
    sql = `INSERT INTO users (id,passwd) VALUES (?,?)`;
    db.run(sql, param);
   }
   resolve(row);
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

module.exports = router;
