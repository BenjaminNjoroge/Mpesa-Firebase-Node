const config= require("../config/mpesa-config");

const moment= require("moment");

const shortcode= config.SANDBOX_BUSINESS_SHORTCODE;
const passkey= config.SANDBOX_PASSKEY;
const functionsUrl= config.FUNCTIONS_URL;

const now= moment();
const timestamp= now.format("YYYYMMDDHHmmss");
const password= Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

//Handle callbacks from mpesa api
function callbackDataFunc(callbackData){

    const data= {};

    if(callbackData.ResultCode== 0){

        data.merchantRequestID= callbackData.MerchantRequestID;
        data.checkoutRequestID= callbackData.CheckoutRequestID;
        data.resultCode= callbackData.ResultCode;
        data.resultDesc= callbackData.ResultDesc;

        callbackData.CallbackMetadata.Item.forEach(element => {
            switch(element.Name){
                case "Amount":
                    data.amount= element.Value;
                    break;
                case "MpesaReceiptNumber":
                    data.mpesaReceiptNumber= element.Value;
                    break;
                case "TransactionDate":
                    data.transactionDate= element.Value;
                    break;
                case "PhoneNumber":
                    data.phoneNumber= element.Value;
                    break;
            }
        });
    }
    return data;
}

// stk push body, this will be sent as body to mpesa api
function createStkBody(amount, phone, orderId) {
  
    return {
      AccountReference: orderId,
      Amount: amount,
      BusinessShortCode: shortcode,
      CallBackURL: `${functionsUrl}/callback`,
      PartyA: phone,
      PartyB: shortcode,
      Password: password,
      PhoneNumber: phone,
      Timestamp: timestamp,
      TransactionDesc: `Payment for ${orderId}`,
      TransactionType: "CustomerPayBillOnline"
    };
  }

module.exports= {
    callbackDataFunc,
    createStkBody
};