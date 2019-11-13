const functions = require('firebase-functions');

const admin = require('firebase-admin')

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

admin.initializeApp()
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello there");
});
 

exports.getScreams  =functions.https.onRequest((req,res)=>{
   admin.firestore().collection('minds').get()
   .then(data=>{
       let minds=[] 
       data.forEach(doc=>{
           minds.push(doc.data())
       })
       return res.json(minds)
   }).catch(err=> console.log(error))
})

exports.createScreams = functions.https.onRequest((req,res)=>{
    const newMinds = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    } 

    admin.firestore.collection('minds').add(newMinds).then(doc =>{
           res.json({messsage: `document ${doc.id} created `})
    }).catch(err=>{
        res.status(500).json({error: 'Server problem'})
    })

})