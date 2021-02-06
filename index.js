const MongoClient = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const bodyParser = require('body-parser');
const e = require('express');
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
const url = "mongodb://127.0.0.1:27017/";
const accessTokenSecret = 'accessTokenString';

//a function to return connection object to mongodb
function initiateConnection(){
    return new Promise((resolve,reject)=>{
        MongoClient.connect(url, function(err,db){
            if(err)throw err;
            let dbo = db.db("InfoDB");
            resolve(dbo);
        })
    });
}

function authenticate(username,password){
    return new Promise((resolve,reject)=>{
        let db = undefined;
        initiateConnection().then((databaseObject)=>{
            db = databaseObject;
            db.collection("Info").find({"username":username,"password":password}).toArray((err,result)=>{
                try{  
                    db.close();
                }catch(e){}
                if(err)reject();
                console.log( result.length);
                if(result && result.length==1){
                    const accessToken = jwt.sign(result[0], accessTokenSecret);
                    resolve(accessToken);
                }else{
                    reject();
                }
            })
        }).catch(e=>{
            try{
                db.close();
            }catch(e){}
            reject();
        });
    })
}

function verifyToken(token, accessTokenSecret){
    return new Promise((resolve,reject) =>{
        jwt.verify(token, accessTokenSecret, (err, user) => {
            if(err){
                reject();
            }
            resolve(user);
        });
    })
}


function createUser(_id,username, password){
    return new Promise((resolve,reject)=>{
        let db = undefined;
        initiateConnection().then((databaseObject)=>{
            db = databaseObject;
            db.collection("Info").insertOne({"_id":_id,"username":username,"password":password},function(err,result){
                try{
                    db.close();
                }catch(e){}
                if(err)reject();
                resolve(result);
            })
        }).catch(e=>{
            try{
                db.close();
            }catch(e){}
            reject();
        });
    })
}

function getName(_id){
    return new Promise((resolve,reject)=>{
        let db = undefined;
        initiateConnection().then((databaseObject)=>{
            db = databaseObject;
            db.collection("Info").find({},{"_id":_id}).toArray((err,result)=>{
                try{
                    db.close();
                }catch(e){}
                if(err)reject();
                resolve(result[0]["username"]);
            })
        }).catch(e=>{
            try{
                db.close();
            }catch(e){}
            reject();
        });
    })
}

function updateName(_id,username){
    return new Promise((resolve,reject)=>{
        let db = undefined;
        initiateConnection().then((databaseObject)=>{
            db = databaseObject;
            db.collection("Info").updateOne({"_id":_id},{"$set":{"username":username}},{"upsert":false},function(err,result){
                try{
                    db.close();
                }catch(e){}
                if(err)reject();
                resolve(result);
            })
        }).catch(e=>{
            try{
                db.close();
            }catch(e){}
            reject();
        });
    })
}

function deleteName(username){
    return new Promise((resolve,reject)=>{
        let db = undefined;
        initiateConnection().then((databaseObject)=>{
            db = databaseObject;
            db.collection("Info").remove({"username":username},function(err,result){
                try{
                    db.close();
                }catch(e){}
                if(err)reject();
                resolve(result);
            })
        }).catch(e=>{
            try{
                db.close();
            }catch(e){}
            reject();
        });
    })
}

app.post("/read",async(req,res,next)=>{
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        const user = await verifyToken(token, accessTokenSecret);
        try{
            const result = await getName(user["_id"]);
            res.send(JSON.stringify(result));
        }catch(e){
            next(e);
        }
    } else {
        next("Error");
    }
});

app.post('/login', async(req, res,next) => {
    const username = req.body.username;
    const password = req.body.password;
    try{
        const cryptoToken = await authenticate(username,password);
        res.json({accessToken:cryptoToken});
    }catch(e){
        next(e);
    }
});

app.post("/create",async(req,res,next)=>{
    const _id = Number(req.body._id);            
    const username = (req.body.username);
    const password = req.body.password;
    if(!_id || !username || !password)res.send(403);
    try{
        await createUser(_id,username,password)
        res.send(200);
    }catch(e){
        next(e);
    }
    
})

app.post("/update",async(req,res,next)=>{
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        const user = await verifyToken(token, accessTokenSecret);
        try{
            await updateName(user["_id"],user.username);
            res.send(200);
        }catch(e){
            next(e);
        }
    } else {
        next("Error");
    }

})

app.post("/delete", async(req,res,next)=>{
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        const user = await verifyToken(token, accessTokenSecret);
        try{
            await deleteName(user.username);
            res.send(200);
        }catch(e){
            next(e);
        }
    } else {
        next("Error");
    }
})

app.listen(3000,()=>{
    console.log("Server running on port 3000");
})
