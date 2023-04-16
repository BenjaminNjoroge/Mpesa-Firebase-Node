var admin= require("firebase-admin");
var serviceAccount= require("../config/firebase-config.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    //databaseURL: "https://pastpaperskenya-default-rtdb.firebaseio.com"
  });

const moment= require("moment");
var date = moment();
var currentDate = date.format('MMMM Do YYYY, h:mm:ss a');

const db= admin.firestore();

const notification_options= {
    priority: "high",
    timeToLive : 60 * 60 *24
};


//send notification to a topic you have subscribed to
function sendHotNotification(title, body, topic, email, status, orderId, resultDesc, checkoutRequestID){

    const options= notification_options;
    const payload= {
        notification:{
            title: title,
            body: body
        },
        data:{
            email:email,
            status: status,
            orderId: orderId,
            resultDesc: resultDesc,
            checkoutRequestID: checkoutRequestID
        }
    };

    return admin.messaging().sendToTopic(topic, payload, options).then((response)=>{
        console.log("Successfully sent notification: ",response);
    }).catch((error)=>{
        console.log(" An error occured when sending notification: ", error)
    });


}

function getReason(checkoutRequestID){
    return db.collection("payments")
    .doc(checkoutRequestID)
    .get()
    .then(snapshot=>{
        return db.collection("payments")
        .doc(checkoutRequestID)
        .get()
        .then(() => snapshot.data().resultDesc); 
    });
}

function getPaymentStatus(checkoutRequestID){
    return db.collection("payments")
    .doc(checkoutRequestID)
    .get()
    .then(snapshot=>{
        return db.collection("payments")
        .doc(checkoutRequestID)
        .get()
        .then(() => snapshot.data().status); 
    });
}

function getDocumentId(checkoutRequestID){
    return db.collection("payments")
    .where("checkoutRequestID","==", checkoutRequestID)
    .limit(1)
    .get()
    .then(snapshot=> snapshot.docs[0].id);
}

function getUserEmail(checkoutRequestID){
    return db.collection("payments")
    .doc(checkoutRequestID)
    .get()
    .then(snapshot =>{
        return db.collection("payments")
        .doc(checkoutRequestID)
        .get()
        .then(() => snapshot.data().email);
    });
}

function setOrderToPaid(email, orderId){
    return db.collection("orders")
    .doc(email)
    .collection("orderId")
    .doc(orderId)
    .set({
        paymentStatus: "paid",
        orderId: orderId
    });
}

function setOrderToUnPaid(email, orderId){
    return db.collection("orders")
    .doc(email)
    .collection("orderId")
    .doc(orderId)
    .set({
        paymentStatus: "unpaid",
        orderId: orderId
    });
}

function savePaymentRequest( checkoutRequestID, merchantRequestID, orderId, email, customerId ){
    return db.collection("payments")
    .doc(checkoutRequestID)
    .set({
        checkoutRequestID : checkoutRequestID,
        merchantRequestID : merchantRequestID,
        orderId           : orderId,
        email             : email,
        customerId        : customerId 
    });
}

function savePaymentSuccessDetails(id, parsedData){
    return db.collection("payments")
    .doc(id)
    .get()
    .then(snapshot=>{
        return db.collection("payments")
        .doc(id)
        .update({
            checkoutRequestID: parsedData.checkoutRequestID,    
            merchantRequestID: parsedData.merchantRequestID,    
            resultCode: parsedData.resultCode,    
            resultDesc: parsedData.resultDesc,
            mpesaReceiptNumber: parsedData.mpesaReceiptNumber,
            amount: parsedData.amount,
            phoneNumber: parsedData.phoneNumber,
            transactionDate: parsedData.transactionDate,
            date: currentDate,
            status: "completed"
        })
        .then(()=> snapshot.data().orderId);
    });
    
}

function savePaymentFailedDetails(id, parsedData){
    return db.collection("payments")
    .doc(id)
    .get()
    .then(snapshot =>{
        return db.collection("payments")
        .doc(id)
        .update({
            merchantRequestID: parsedData.MerchantRequestID,    
            checkoutRequestID: parsedData.CheckoutRequestID,    
            resultCode: parsedData.ResultCode,    
            resultDesc: parsedData.ResultDesc,
            date: currentDate,
            status: "failed"
        })
        .then(()=> snapshot.data().orderId);
    });
    
}

module.exports= {
    getReason,
    getPaymentStatus,
    sendHotNotification,
    getDocumentId,
    savePaymentSuccessDetails,
    savePaymentFailedDetails,
    setOrderToPaid,
    setOrderToUnPaid,
    getUserEmail,
    savePaymentRequest
};