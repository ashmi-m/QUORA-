// const mongoose=require("mongoose");
// const {schema}=mongoose;

// const wishlistSchema=new Schema({
//     userId:{
//         type:Schema.Types.ObjectId,
//         ref:"User",
//         required:true,
//     },
//     products:[{
//         productId:{
//             type:Schema.Types.ObjectId,
//             ref:'Product',
//             required:true
//         },
//         addedOn:{
//             type:Date,
//             default:Date.now
//         }
//     }]
// })
// const wishlist=mongoose.model('wishlist',wishlistSchema);
// module.exports=wishlist;
const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    items: [   // renamed from products → items
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        addedOn: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);
