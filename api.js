"use strict";

const crypto = require('crypto');
const DB = require('./db');
const db = DB.db;
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
 const io = module.parent.exports.get('io');
 const now = Date.now();
 const date = convDate(now);
 const wtoken = req.body.wtoken || '';
 let tid = 0;
 let tag_name = '';
 let tag = req.body.tag || '';
 let msg = req.body.msg || '';
 let iv = req.body.iv || '';
//console.log(date+' ',req.body);
 DB.get_user({'wtoken':wtoken}).then((data) => {
//console.log(data);
  if(data.secret_opt == 0 && !iv) throw 'encrypto only';
  if(iv){
   let code = 'base64';
   let key = data.secret;
   let iv_b = new Buffer(iv, code);
   let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv_b);
   msg = decipher.update(msg, code, 'utf8')
   msg += decipher.final('utf8');
  }
  db.get('SELECT tid,tag_name FROM tags WHERE uid = ? AND tag = ?', [data.uid, tag],
   (error, row) => {
    if(!row){
     tag = '';
     tag_name = '';
    }else{
     tid = row.tid;
     tag_name = row.tag_name;
    }
    io.to(data.uid).emit('update', {
     'tid': tid,
     'tag': tag,
     'tag_name': tag_name,
     'msg': msg,
     'rdate': date
    });
    insert_log({'uid': data.uid, 'tid': tid, 'tag':tag, 'msg': msg, 'rdate': now});
    res.status(200).end('OK');
   });
 }).catch((error) => {
console.log(error);
  res.status(500).end('Error');
 });
});

const insert_log = function(params){
 db.serialize(function(){
  db.run('INSERT INTO logs (uid,tag,msg,rdate) VALUES ($uid,$tag,$msg,$rdate)',
   {$uid: params.uid, $tag: params.tag, $msg: params.msg, $rdate: params.rdate});
 });
};

const convDate = (date) => {
 let days = new Date(date);
 let year = days.getFullYear();
 let month = ('0' + (days.getMonth() + 1)).slice(-2);
 let day = ('0' + days.getDate()).slice(-2);
 let hour = ('0' + days.getHours()).slice(-2);
 let minute = ('0' + days.getMinutes()).slice(-2);
 let second = ('0' + days.getSeconds()).slice(-2);
 return year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;
}

module.exports = router;
