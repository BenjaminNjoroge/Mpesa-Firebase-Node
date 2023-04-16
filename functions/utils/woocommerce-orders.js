const WoocommerceApi= require("woocommerce-api");

const config= require("../woocommerce-config");

//congigure woocommerce api
const woocommerce= new WoocommerceApi({
    url: config.URL,
    consumerKey: config.CONSUMER_KEY,
    consumerSecret : config.CONSUMER_SECRET,
    wpAPI: true,
    version: 'wc/v3'
});


//update woocommerce order and set status to completed and set_paid to true
function updateOrder(endpoint){

    const data= {
        status: "completed",
        set_paid : true
    };
    
    woocommerce.putAsync(`orders/${endpoint}`, data)
    .then((response) =>{
        console.log(response.data);
    })
    .catch((error)=>{
        console.log(`An error occured `+ error.data);
    });
}

module.exports= {updateOrder};