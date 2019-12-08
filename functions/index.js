const functions = require("firebase-functions");
const express = require("express");
const app = express();
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
} = require("./handlers/users");

const fbAuth = require("./utils/fbAuth");

const { db } = require("./utils/admin");

const {
  getAllMinds,
  postOneMind,
  getMinds,
  commentOnMind,
  likeMind,
  unlikeMind,
  deleteMind
} = require("./handlers/minds");

app.get("/minds", getAllMinds);

app.post("/minds", fbAuth, postOneMind);
app.get("/minds/:mindId", getMinds);
app.post("/mind/:mindId/comment", fbAuth, commentOnMind);
app.get("/mind/:mindId/like", fbAuth, likeMind);
app.get("/mind/:mindId/unlike", fbAuth, unlikeMind);
app.delete("/mind/:mindId", fbAuth, deleteMind);

app.post("/signup", signup);

app.post("/login", login);

app.get("/user", fbAuth, getAuthenticatedUser);

app.post("/user", fbAuth, addUserDetails);

app.post("/user/image", fbAuth, uploadImage);

app.get("/user/:handle", getUserDetails);

app.post("/notifications", fbAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
  .region("us-central1")
  .firestore.document(`likes/{id}`)
  .onCreate(snapshot => {
    return db
      .doc(`/minds/${snapshot.data().mindId}`)
      .get()
      .then(doc => {
        if (doc.exists && doc.data.userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            mindId: doc.id
          });
        }
      })
      .catch(error => {
        console.error(error);
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region("us-central1")
  .firestore.document(`likes/{id}`)
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch(error => {
        console.error(error);
      });
  });

exports.createNotificationOnComment = functions
  .region("us-central1")
  .firestore.document(`comments/{id}`)
  .onCreate(snapshot => {
    return db
      .doc(`/minds/${snapshot.data().mindId}`)
      .get()
      .then(doc => {
        if (doc.exists && doc.data.userHandle !== snapshot.data().userHandle)
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            mindId: doc.id
          });
      })
      .catch(error => {
        console.error(error);
      });
  });

exports.onUserImageChange = functions
  .region("us-central1")
  .firestore.document(`/users/{useriId}`)
  .onUpdate(change => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log(`image has changed`);
      const batch = db.batch();
      return db
        .collection("minds")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const mind = db.doc(`/minds/${doc.id}`);
            batch.update(mind, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    }else return true
  });

exports.onMindDelete = functions
  .region("us-central1")
  .firestore.document(`/minds/{mindId}`)
  .onDelete((snapshot, context) => {
    const mindId = context.params.mindId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("mindId", "==", mindId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });

        return db
          .collection("likes")
          .where("mindId", "==", mindId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("mindId", "==", mindId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      }).catch(error=>{
          console.error(error)
      })
  });
