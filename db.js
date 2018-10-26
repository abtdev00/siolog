"use strict";

const fs = require('fs');
const sqlite3 = require('sqlite3');
const db_file = './db/app.db';

const db = new sqlite3.Database(db_file);

const init = () => {
 fs.stat(db_file, (e) => {if(!e) return;});
 db.serialize(function(){
  db.run(`
   CREATE TABLE IF NOT EXISTS system (
   passwd TEXT
   ,account_opt INTEGER
   ,log_opt TEXT
   )
  `);
  db.get(`SELECT * FROM system`, (err, row) => {
   if(!row){
    db.run(`INSERT INTO system VALUES ('',1,'{"days":"0","h":"0","m":"0"}')`);
   }
  });

  db.run(`
   CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT
   ,id TEXT
   ,passwd TEXT
   ,rtoken TEXT
   ,wtoken TEXT
   ,vtoken TEXT
   ,secret TEXT
   ,tag_opt INTEGER DEFAULT 1
   ,secret_opt INTEGER DEFAULT 1
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS tags (
    tid INTEGER PRIMARY KEY AUTOINCREMENT
   ,uid INTEGER
   ,tag TEXT
   ,tag_name TEXT
   ,od INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS logs (
    lid INTEGER PRIMARY KEY AUTOINCREMENT
   ,uid INTEGER
   ,tag TEXT
   ,msg TEXT
   ,rdate INTEGER
   )
  `);

  db.run(`
   CREATE TABLE IF NOT EXISTS access_log (
   id TEXT
   ,ip TEXT
   ,rdate DATETIME DEFAULT (DATETIME('now', 'localtime'))
   )
  `);

  db.run(`
   CREATE VIEW IF NOT EXISTS logs_v AS
    SELECT lid
          ,uid
          ,msg
          ,strftime('%Y/%m/%d %H:%M:%S',datetime(rdate/1000,'unixepoch','localtime')) AS rdate
          ,tag
          ,(SELECT tags.tag_name FROM tags WHERE tags.tag = logs.tag AND tags.uid = logs.uid) AS tag_name
          ,(SELECT tags.tid FROM tags WHERE tags.tag = logs.tag AND tags.uid = logs.uid) AS tid
    FROM logs
  `);
 });
};

const get_user = (params) => {
//console.log(params);
 return new Promise((resolve, reject) => {
  const sql = `SELECT uid,id,rtoken,wtoken,vtoken,secret,tag_opt,secret_opt FROM users WHERE `;
  let cond,param;
  let token_chk = false;
  if(params.uid){
   cond = `uid = ?`;
   param = [params.uid];
  }else if(params.wtoken){
   cond = `wtoken = ?`;
   param = [params.wtoken];
  }else if(params.rtoken){
   cond = `rtoken = ?`;
   param = [params.rtoken];
  }else if(params.vtoken){
   cond = `vtoken = ?`;
   param = [params.vtoken];
  }else{
   cond = `id = ? AND passwd = ?`;
   param = [params.id, params.passwd];
   token_chk = true;
  }
  db.get(sql+cond, param, (error, row) => {
   if(error || !row){
    reject(error);
   }else{
    if(token_chk){
     let update = false;
     if(!row.rtoken){
      row.rtoken = randomStr();
      update = true;
     }
     if(!row.wtoken){
      row.wtoken = randomStr();
      update = true;
     }
     if(!row.vtoken){
      row.vtoken = randomStr(16);
      update = true;
     }
     if(!row.secret){
      row.secret = randomStr();
      update = true;
     }
     if(update){
      const sql = `UPDATE users SET (rtoken,wtoken,vtoken,secret) = (?,?,?,?) WHERE uid = ?`;
      db.run(sql, [row.rtoken, row.wtoken, row.vtoken, row.secret, row.uid]);
     }
    }
    resolve(row);
   }
  });
 });
}

const get_tag = (uid) => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT tid,tag,tag_name FROM tags WHERE uid =? ORDER BY od isNull,od`;
  db.all(sql, [uid], (error, rows) => {
//console.log(rows);
   if(error){
    reject(error);
   }else{
    resolve(rows);
   }
  });
 });
}

const get_system = () => {
 return new Promise((resolve, reject) => {
  const sql = `SELECT * FROM system`;
  db.get(sql, (error, rows) => {
//console.log('res:',rows);
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

module.exports = {
 'db': db,
 'init': init,
 'get_user': get_user,
 'get_tag': get_tag,
 'get_system': get_system,
};
