const mongoose=require("mongoose");
const {Schema}=mongoose;

const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    profileImage: {
    type: String,
    default: "/images/default-profile.png"
},
      refCode: {
    type: String,
    unique: true,
     sparse: true 
  },

  referredBy: {
    type: String,
    default: null
  },
    phone:{
        type:String,
        required:false,
        sparse:true,
        default:null
    },
    gender: {
    type: String,
    enum: ["Male", "Female", "Other", "Prefer not to say", ""],
    default: ""
  },

    googleId:{
        type:String,
        unique:true,
        sparse:true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    cart:[{
        type:Schema.Types.ObjectId,
        ref:"Cart",
    }],
    
    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    // referalCode:{
    //     type:String
    // },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    SearchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }],
    wallet: {
  type: Number,
  default: 0,
},

walletTransactions: [{
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    default: "Wallet"
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },
  reason: String,
  date: {
    type: Date,
    default: Date.now
  }
}],
})

const User=mongoose.model("User",userSchema);
module.exports=User;