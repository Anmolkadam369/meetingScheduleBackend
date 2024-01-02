const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose')
const app = express();
const route = require('./route/route');
const port = 3001;
mongoose.set("strictQuery", true);

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});
mongoose
  .connect(
    "mongodb+srv://nehajaiswal:neha123@nehadb.pcorgpc.mongodb.net/rentofly1",
    { useNewUrlParser: true }
  )
  .then(() => {
    console.log("mongoDB is connected");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.use('/', route);

app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
});
