const mongoose = require('mongoose');

const user = new mongoose.Schema({
    email:{
        type:String,
        required:true
      },
      password:{
        type:String,
        required:true
    
      },
      name:{
        type:String,
        required:true
    
      },
      isDeleted:{
        type:Boolean,
        default:false
      },
    },{timestamps:true});

module.exports  = mongoose.model('user', user);