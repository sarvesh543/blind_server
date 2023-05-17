//basic express server that send a message to the client="hi"


// Path: socketIO.js

const express = require("express");
// const serverless = require("serverless-http");
// const socketIO = require("socket.io");
// const http = require("http");


const app = express();
const router = express.Router();



router.get("/", (req, res) => {
  res.json({
    hello: "hi5002!"
  });

});


// app.listen(5002, () => {
//     console.log("Listening on port 3000");
//     }
// );

