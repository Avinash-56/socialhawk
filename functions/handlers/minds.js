const { db } = require("../utils/admin");

exports.getAllMinds = (req, res) => {
  db.collection("minds")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let minds = [];
      data.forEach(doc => {
        minds.push({
          mindsId: doc.id,
          ...doc.data()
        });
      });
      return res.json(minds);
    })
    .catch(error => console.log(error));
};

exports.postOneMind = (req, res) => {
  let newMinds = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };
  newMinds = JSON.parse(JSON.stringify(newMinds));

  db.collection("minds")
    .add(newMinds)
    .then(doc => {
      const resMind = newMinds;
      resMind.mindId = doc.id;
      return res.json(resMind);
    })
    .catch(error => {
      res.status(500).json({ error: "Server problem" });
    });
};

exports.getMinds = (req, res) => {
  let mindData = {};
  db.doc(`/minds/${req.params.mindId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Mind not found" });
      }
      mindData = doc.data();
      mindData.mindId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("mindId", "==", req.params.mindId)
        .get();
    })
    .then(data => {
      mindData.comments = [];
      data.forEach(doc => {
        mindData.comments.push(doc.data());
      });
      return res.json(mindData);
    })
    .catch(error => {
      console.error(error);
      return res.status(500).json({ error: error.code });
    });
};

exports.commentOnMind = (req, res) => {
  if (req.body.body.trim() == "")
    return res.status(400).json({ comment: "Should not  be empty" });
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    mindId: req.params.mindId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };

  db.doc(`/minds/${req.params.mindId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(400).json({ error: "Mind not found" });
      }

      return doc.ref.update({commentCount: doc.data().commentCount+1})
        }).then(()=>{
            return db.collection('comments').add(newComment)
        }).then(()=>{
            res.json(newComment)
        })
        .catch(error => {
          console.log(error);
          res.status(500).json({ error: `Something went wrong` });
        });
    }

exports.likeMind = (req, res) => {
  const likeDocument = db.collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("mindId", "==", req.params.mindId)
    .limit(1);
    // console.log(likeDocument)

  const mindDocument = db.doc(`/minds/${req.params.mindId}`);
  let mindData ={};
  mindDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        mindData = doc.data();
        mindData.minId = doc.id;
        return likeDocument.get();
    } else return res.status(403).json({error: `Mind already liked`})
    }).then(data => {
      if (data.empty) {
        return db.collection("likes").add({
          mindId: req.params.mindId,
          userHandle: req.user.handle
        }).then(()=>{
            mindData.likeCount++
            return mindDocument.update({likeCount: mindData.likeCount})
        }).then(()=>{
            return res.json(mindData)
        })
      }else{
          return res.status(400).json({error:`mind already liked`})
      }
    }).catch(error=>{
        console.error(error)
        res.status(500).json({error:error.code})
    })
};

exports.unlikeMind = (req,res)=>{
    const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("mindId", "==", req.params.mindId)
    .limit(1);

  const mindDocument = db.doc(`/minds/${req.params.mindId}`);
  let mindData;
  mindDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        mindData = doc.data();
        mindData.minId = doc.id;
        return likeDocument.get();
      } else return res.status(404).json({ error: `Mind not found` });
    })
    .then(data => {
      if (data.empty) {
        return res.status(400).json({error:`mind not liked`})
        
      }else{
         return db.doc(`/likes/${data.docs[0].id}`).delete().then(()=>{
             mindData.likeCount--
             return mindDocument.update({likeCount: mindData.likeCount})
         }).then(()=>{
             return res.json(mindData)
         })
      }
    }).catch(error=>{
        console.error(error)
        res.status(500).json({error:error.code})
    }) 
}


exports.deleteMind = (req,res)=>{
    const document = db.doc(`/minds/${req.params.mindId}`)
    document.get().then(doc=>{
        if(!doc.exists){
            return res.status(404).json({error: `Mind Not Found`})
        }
        if(doc.data().userHandle !== req.user.handle) return res.status(403).json({error: 'Unauthorized'})
        else document.delete()
    }).then(()=>{
        res.json({message: `Mind deleted sucessfully`})
    }).catch((error)=>{
        console.error(error)
        return res.status(500).json({error: error.code})
    })
}