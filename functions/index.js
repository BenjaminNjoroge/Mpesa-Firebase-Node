const functions = require("firebase-functions");
const express= require("express");
const cors= require("cors");
const bodyParser = require('body-parser');

const axios= require("axios").default;

const app= express();
app.use(bodyParser.json());
app.use(cors({origin: true}));

const mpesaUtils= require("./utils/mpesa-utils");
const dbUtils= require("./utils/db-utils");
const woocommerceApi= require("./utils/woocommerce-orders");

const config= require("./mpesa-config");

const auth_token_url= config.SANDBOX_AUTH_URL;
const stkpush_url= config.SANDBOX_STKPUSH_URL;
const consumer_key= config.SANDBOX_CONSUMER_KEY;
const consumer_secret= config.SANDBOX_CONSUMER_SECRET;

const credentials= Buffer.from(consumer_key + ":" + consumer_secret).toString('base64');

// create auth token and stkpush
app.post("/request", async (req, res)=>{

    const { amount, phone, orderId, email, customerId }= await req.body;

    //Get access token
    try{
        const res1= await axios.get(
            auth_token_url,
            {
                headers: {
                    Authorization : `Basic ${credentials}`
                }
            }
        );
        console.log("Access token obtained");
        console.log(`You access token is ${res1.data.access_token}`);

        //make stkpush request
        const res2= await axios.post(
            stkpush_url,
            mpesaUtils.createStkBody(amount, phone, orderId),
            {
                headers: {
                    Authorization : `Bearer ${res1.data.access_token}`
                }
            }
        );
        console.log(`STK push sent`);

        //save request 
        await dbUtils.savePaymentRequest(
            res2.data.CheckoutRequestID,
            res2.data.MerchantRequestID,
            orderId,
            email,
            customerId
        );
        console.log("Saved payment request details");

        res.send("Request sent sucessfully, waiting for payments");
    } catch(e){
        console.log(e);
        res.status(500).send({message: "Failed!" + e.message});
    }

});

// process callbacks after user action upon receiving stkpush

app.post("/callback", async(req, res)=>{

    const responseData= await req.body.Body.stkCallback;

    console.log(responseData);

    const parsedData= mpesaUtils.callbackDataFunc(responseData);
 
    console.log(`The following is the callback data` +parsedData);
    if(parsedData.resultCode== 0){

        const docId1= await dbUtils.getDocumentId(parsedData.checkoutRequestID);
        console.log(`The document id is ${docId1}`);

        const email= await dbUtils.getUserEmail(docId1);
        console.log(email);

        try{
             
        const orderId =await dbUtils.savePaymentSuccessDetails(docId1, parsedData);

        console.log(orderId);

        const status= await dbUtils.getPaymentStatus(docId1);
        console.log(status);

        const reason= await dbUtils.getReason(docId1);
        
        await dbUtils.setOrderToPaid(email, orderId);

        woocommerceApi.updateOrder(orderId);


        await dbUtils.sendHotNotification(`Order ${orderId} Payment Sucess`,"Your pastpaper is ready to view",docId1, email, status, orderId, reason, docId1);

        res.status(200).send({
            status: "Success",
            message: `The request was successful. ${parsedData.resultDesc}`
        });

        
    } catch(error){
        console.log(error);
         res.send({
            status: "Unable to save successful payment",
            message: error
        });
    }
        
    } else {

        const docId2= await dbUtils.getDocumentId(responseData.CheckoutRequestID);
        console.log(`The document id is ${docId2}`);

        const email= await dbUtils.getUserEmail(docId2);
        console.log(email);

        try{
            
            const orderId =await dbUtils.savePaymentFailedDetails(docId2, responseData);

            await dbUtils.setOrderToUnPaid(email, orderId);

            const reason= await dbUtils.getReason(docId2);
            console.log(reason);
            
            const status= await dbUtils.getPaymentStatus(docId2);
            console.log(status);
            
            await dbUtils.sendHotNotification(`Order ${orderId} Failed`, "Sorry!. We could not complete your order", docId2, email, status, orderId, reason, docId2);


             res.status(200).send({
                status: "Response Success",
                message: `But the request for payment failed. Because ${responseData.ResultDesc}`
            });
        } catch(error){
            console.log(error);
             res.send({
                status: "Unable to save failed payment",
                message: error
            });
        }

    }
    
});


 exports.mpesa = functions.https.onRequest(app);