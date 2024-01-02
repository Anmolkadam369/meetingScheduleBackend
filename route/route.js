const express = require('express');
const router = express.Router();
const userController = require("../controller/controller");
const auth = require('../middlewares/auth')



router.post("/signup", userController.signup);
router.post('/signIn', userController.signIn);
router.get('/users/:userId', auth.authentication, auth.authorization, userController.getAllUser);
router.post('/scheduleMeeting/:userId', auth.authentication, auth.authorization, userController.scheduleMeeting);
router.get("/meetings/:userId", auth.authentication, auth.authorization, userController.getUserMeeting);
router.delete("/meetings/:userId/:meetingId", auth.authentication, auth.authorization, userController.deleteMeeting);
router.put("/updateMeet/:userId/:meetingId", auth.authentication, auth.authorization, userController.editUserMeeting);


router.all("/*", function(req,res){
    res.status(400).send({status:false, message:"invalid http request"});
})

module.exports = router;