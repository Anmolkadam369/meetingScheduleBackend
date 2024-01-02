let mongoose = require("mongoose");
const userModel = require("../models/userModel")
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const meetingModel = require("../models/meetingModel");

const validateEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};
const validatePassword = (password) => {
  return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{6,}/.test(password);
};
const validateName = (name) => {
  return /^[A-Za-z\s]+$/.test(name);
};

function convertMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const formattedHours = hours < 10 ? `0${hours}` : hours;
  const formattedMins = mins < 10 ? `0${mins}` : mins;
  return `${formattedHours}:${formattedMins}`;
}

const signup = async function (req, res) {
  try {
    console.log("some", req.body);
    let data = req.body;
    let { name, email, password } = data;

    name = data.name = name.trim();
    if (name === '') return res.status(400).send({ status: false, message: `empty name not possible` });
    if (!validateName(name)) {
      return res.status(400).send({ status: false, message: `invalid name format` });
    }
    email = data.email = email.trim().toLowerCase()
    if (email === "") return res.status(400).send({ status: false, message: `empty email not possible` });
    if (!validateEmail(email)) {
      return res.status(400).send({ status: false, message: `invalid email format` });
    }

    password = data.password = password.trim()
    if (password === "") return res.status(400).send({ status: false, message: `empty password not possible` });
    if (!validatePassword(password)) {
      return res.status(400).send({ status: false, message: `invalid password format` });
    }

    const foundEmail = await userModel.findOne({ email: email });
    if (foundEmail) return res.status(400).send({ status: false, message: `email already in use` });

    let hashing = bcrypt.hashSync(password, 10);
    data.password = hashing;

    let createdData = await userModel.create(data);
    return res.status(201).send({ status: true, data: createdData });
  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` })
  }
}

const signIn = async function (req, res) {

  try {
    console.log("some", req.body);
    let data = req.body;
    let { email, password } = data;

    email = data.email = email.trim().toLowerCase()
    if (email === "") return res.status(400).send({ status: false, message: `empty email not possible buddy` });
    if (!validateEmail(email)) {
      return res.status(400).send({ status: false, message: `invalid email format` });
    }
    password = data.password = password.trim()
    if (password === "") return res.status(400).send({ status: false, message: `empty password not possible buddy` });
    if (!validatePassword(password)) {
      return res.status(400).send({ status: false, message: `invalid password format` });
    }
    let foundUserName = await userModel.findOne({ email: email });
    if (!foundUserName) return res.status(400).send({ status: false, message: `${email} isn't available !!!` });
    console.log(foundUserName, password)

    let passwordCompare = await bcrypt.compare(password, foundUserName.password);
    if (!passwordCompare) return res.status(400).send({ status: false, message: "Please enter valid password" })

    let token = jwt.sign(
      { userId: foundUserName._id, exp: Math.floor(Date.now() / 1000) + 86400 },
      "project"
    );

    let tokenInfo = { userId: foundUserName._id, token: token };

    res.setHeader('x-api-key', token)
    return res.status(200).send({ status: true, data: foundUserName, tokenData: tokenInfo });
  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` })
  }
}
const getAllUser = async function (req, res) {
  try {
    let data = await userModel.find({ isDeleted: false });
    if (data.length == 0) return res.status(404).send({ status: false, message: "No Data found" });
    return res.status(200).send({ status: true, data: data });

  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` })
  }
}

const scheduleMeeting = async function (req, res) {
  try {
    let userId = req.params.userId;
    let data = req.body;
    console.log(data);
    let { title, time, endTime, date, meetWith, conductedBy } = data;

    let userData = await userModel.findOne({ _id: userId });
    conductedBy = data.conductedBy = userData.email;

    const [hours, minutes] = data.time.split(':').map(Number);

    const timeInMinutes = hours * 60 + minutes;
    const endTimeInMinutes = hours * 60 + minutes + 60;
    const dateInMilliseconds = new Date(data.date).getTime();

    time = data.time = timeInMinutes;
    endTime = data.endTime = endTimeInMinutes;
    date = data.date = dateInMilliseconds;

    console.log('Time in minutes:', time);
    console.log('Endtime in minutes:', endTime);
    console.log('Date in milliseconds:', date);

    let overlappingMeetings = await meetingModel.find({
      date: date,
      $or: [
        {
          $and: [
            { time: { $lt: endTime } },
            { endTime: { $gt: time } },
          ],
        },
        {
          $and: [
            { meetWith: meetWith },
            { conductedBy: conductedBy },
          ],
        },
      ],
      isDeleted: false,
    });

    console.log("data", data, "overlappingMeeting", overlappingMeetings);

    if (overlappingMeetings.length !== 0) {
      return res.status(400).send({ status: false, message: "Overlapping meetings detected", data: overlappingMeetings });
    }


    let scheduleMeet = await meetingModel.create(data);
    return res.status(200).send({ status: true, data: scheduleMeet });

  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` });
  }
};

const getUserMeeting = async function (req, res) {
  try {
    let userId = req.params.userId;
    let userData = await userModel.findById(userId);
    let data = await meetingModel.find({ $or: [{ conductedBy: userData.email }, { meetWith: userData.email }], isDeleted: false }).sort({ date: 1, time: 1 });
    console.log("data", data)
    let newData = [];
    for (let i = 0; i < data.length; i++) {
      const formattedDate = new Date(data[i].date).toLocaleDateString();
      const formattedTime = convertMinutesToTime(data[i].time);
      const formattedEndTime = convertMinutesToTime(data[i].endTime);
      console.log(formattedDate, formattedTime, formattedEndTime)
      const updatedDate = formattedDate;
      const updatedStartTime = formattedTime;
      const updatedEndTime = formattedEndTime;

      const newObj = {
        _id: `${data[i]._id}`,
        title: `${data[i].title}`,
        time: updatedStartTime,
        date: updatedDate,
        endTime: updatedEndTime,
        meetWith: `${data[i].meetWith}`,
        conductedBy: `${data[i].conductedBy}`,
        isDeleted: `${data[i].isDeleted}`,
      }
      newData.push(newObj);
    }
    console.log("newData", newData)
    if (newData.length === 0) {
      console.log("no data found")
      return res.status(404).send({ status: false, message: "No Data found" });
    }
    return res.status(200).send({ status: true, data: newData });

  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` })
  }
}

const editUserMeeting = async function (req, res){
  let meetingId = req.params.meetingId;
  let userId = req.params.userId;
    let data = req.body;
    console.log(data)

    let { title, time, endTime, date, meetWith, conductedBy } = data;
    let userData = await userModel.findOne({ _id: userId });
    conductedBy = data.conductedBy = userData.email;

    const [hours, minutes] = data.time.split(':').map(Number);

    const timeInMinutes = hours * 60 + minutes;
    const endTimeInMinutes = hours * 60 + minutes + 60;
    const dateInMilliseconds = new Date(data.date).getTime();

    time = data.time = timeInMinutes;
    endTime = data.endTime = endTimeInMinutes;
    date = data.date = dateInMilliseconds;

    console.log('Time in minutes:', time);
    console.log('Endtime in minutes:', endTime);
    console.log('Date in milliseconds:', date);

    let overlappingMeetings = await meetingModel.find({
      date: date,
      $or: [
        {
          $and: [
            { time: { $lt: endTime } },
            { endTime: { $gt: time } },
          ],
        },
        {
          $and: [
            { meetWith: meetWith },
            { conductedBy: conductedBy },
          ],
        },
      ],
      isDeleted: false, 
    });

    console.log("data", data, "overlappingMeeting", overlappingMeetings)

    if (overlappingMeetings.length !== 0) return res.status(400).send({ status: false, message: "Overlapping meetings detected", data: overlappingMeetings });

    const updateData = await meetingModel.findOneAndUpdate({_id:meetingId}, {$set:{date:date, time:time, endTime:endTime}}, {new:true});
    console.log("updatedData",updateData)
    
      const formattedDate = new Date(updateData.date).toLocaleDateString();
      const formattedTime = convertMinutesToTime(updateData.time);
      const formattedEndTime = convertMinutesToTime(updateData.endTime);
      console.log(formattedDate, formattedTime, formattedEndTime)
      const updatedDate = formattedDate;
      const updatedStartTime = formattedTime;
      const updatedEndTime = formattedEndTime;

      console.log(updatedDate,updatedStartTime,updatedEndTime)

      const newObj = {
        _id:  `${updateData._id}`,
        title: `${updateData.title}`,
        conductedBy:`${updateData.conductedBy}`,
        meetWith:`${updateData.meetWith}`,
        time: updatedStartTime,
        date: updatedDate,
        endTime: updatedEndTime,
      }
    console.log("newObj", newObj)
      return res.status(200).send({status:true, data:newObj})

  }   

const deleteMeeting = async function (req, res) {
  try {
    let meetingId = req.params.meetingId;
    let meeting = await meetingModel.findOneAndUpdate({ _id: meetingId, isDeleted: false }, { $set: { isDeleted: true } }, { new: true });
    if (!meeting) return res.status(404).send({ status: false, message: "No Data found to delete" });

    return res.status(200).send({ status: true, message: "Meet deleted" });

  } catch (error) {
    return res.status(500).send({ status: false, message: `error ${error.message}` })

  }
}

module.exports = { signIn, signup, getAllUser, scheduleMeeting, getUserMeeting, deleteMeeting, editUserMeeting } 