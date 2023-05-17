//config environment variables

require("dotenv").config({
  path: "./config.env",
});



const net = require("net"); // Import network library (built-in with Node)

const server = net.createServer();
// const singleConnection = require("./single_connection.js");

const {brailleAlphabet, brailleAlphabetReverse} = require("./conversion.js");

var android_socket_global=null //global variable to store state of pico


let allPico1Sockets = []; //haptic devices
let allPico2Sockets = []; //keyboard
let allConnections = []; //all connections



server.on("connection", (socket) => {
  // console.log("net connected0", socket);
  bedeckAnEventEmitterWithDebuggingOutpour(socket, '→ser');
  socket.on("data", (data) => {
    //print type of data
    // console.log("type of data: ", typeof data);
    console.log("pico send", data.toString());
    console.log("on data", socket.remoteAddress);

    var data_obj = JSON.parse(data.toString());

    // console.log("data_obj: ", data_obj);
    //if device id start with 1 then it is haptic device store in pico1_socket

    const ID = data_obj.deviceId;
    console.log("ID", ID);
    const obj = {
      _id: ID,
      IP: socket.remoteAddress,
      socket: socket,
    };
    //if this object is already present in the array then remove it
    allPico1Sockets = allPico1Sockets.filter((obj) => {
      return obj._id != ID;
    });

    allPico2Sockets = allPico2Sockets.filter((obj) => {
      return obj._id != ID;
    });


    if (ID.startsWith("1")) {
      allPico1Sockets.push(obj);
    } else if (ID.startsWith("2")) {
      allPico2Sockets.push(obj);
      sendDataToMobile(data_obj.message,ID);
    }

    // if (data_obj.deviceId == "1111") {
    //   console.log("haptic device");
    //   pico1_socket = socket;
    // } else if (data_obj.deviceId == "2222") {
    //   console.log("keyboard");
    //   // pico2_socket = socket;
    //   var txt=data_obj.message;
    //   // console.log("type of txt",typeof txt);

    //   console.log("txt",txt);
    //   var converted=brailleAlphabetReverse[txt]?brailleAlphabetReverse[txt]:"not exist";
    // //  console.log("converted",converted);

    //   sendDataToMobile(converted);
    // }

    //sending data to mobile
  });
  socket.on("end", () => {
    // IsPicodisconnected=true
    
    //we have to tell mobile that pico got disconnected.
    console.log("client disconnected");
    //we have to remove the socket from the array
    console.log("on disconnect", socket.remoteAddress);
    //we have to remove the socket from the array by comparing IP address

    allPico1Sockets = allPico1Sockets.filter((obj) => {
      return obj.IP != socket.remoteAddress;
    });

    allPico2Sockets = allPico2Sockets.filter((obj) => {
      return obj.IP != socket.remoteAddress;
    });
  });
  // socket.connecting = false;
  socket.on("error", (err) => {
    console.log("net socket error:", err);
    //try to reconnect
    socket.connecting = true;
  }
  );

  socket.on("close", () => {
    console.log("net socket closed");
    allPico1Sockets = allPico1Sockets.filter((obj) => {
      return obj.IP != socket.remoteAddress;
    });

    allPico2Sockets = allPico2Sockets.filter((obj) => {
      return obj.IP != socket.remoteAddress;
    });
    if(android_socket_global!=null){
     console.log("android_socket_global",android_socket_global.id);
      android_socket_global.emit("picoDisconnect","whoops!");
    }
   
  });

  // socket.on("end", () => {

});

// Catch errors as they arise
server.on("error", (err) => {
  console.log("server error:", err);
});




//socket.io server

const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { log } = require("console");

app.use(cors());

const io_server = http.createServer(app);

const io = new Server(io_server, {
  cors: {},
});

io.on("connection", (socket) => {
  console.log(`mobile User Connected: ${socket.id}`);
  

  socket.on("handshake", (data) => {
    android_socket_global=socket; //global socket variable
    console.log("handshake data: ", data);
    const { hapticId, keyboardId } = data;
    console.log("hapticId", hapticId);
    console.log("keyboardId", keyboardId);

    //we will get hapticId and keyboardId from mobile and store it in allConnections
    //allConnections will have socketid,hapticId and keyboardId

    let obj = {
      socketId: socket.id,
      hapticId: hapticId,
      keyboardId: keyboardId,
      AndroidSocket: socket,
    };

    //if this object is already present in the array then remove it

    allConnections = allConnections.filter((obj) => {
      return obj.socketId != socket.id;
    });

  

    let pico1 = allPico1Sockets.find((obj) => obj._id == hapticId);
    // let pico2=allPico2Sockets.find((obj)=>obj._id==keyboardId);

    //if any of the socket is null then send error to mobile

    // if (1>2) {
    //   //
    //   console.log("error in connection");
    //   socket.emit("notconn", "error in connection");
    // } else {
      // allConnections.push(obj);
      // console.log("allConnections", allConnections);

      console.log("connection established");
      socket.emit("success", "connection established");
    // }
  });

  //for getting data from mobile
  socket.on("gotoserver", (data) => {
    try {
      console.log("data received from mobile: ", data);

      //now message is send from moble to server
      //from socket.id we have to find hapticId and keyboardId in connections array

      //now we have to find hapticId and keyboardId from socket.id

      // const obj=allConnections.find((obj)=>obj.socketId==socket.id);

      const socketId = socket.id;
      // console.log("socketId", socketId);
      // console.log("allConnections", allConnections);
      const obj = allConnections.find((obj) => obj.socketId == socketId);
      // console.log("objgotopicolo", obj);

      const hapticId = obj.hapticId;
      const keyboardId = obj.keyboardId;

      //now we have to find socket with hapticId and keyboardId

      // // let pico2_socket=allPico2Sockets.find((obj)=>obj._id==keyboardId);

      sendDataToPico1(hapticId, data);
    } catch (error) {
      console.log("error in gotoserver", error);
    }
  });

  socket.on("disconnect", () => {
    android_socket_global=null;
    console.log("mobile user disconnected");
    //we have to remove connection from allConnections
    //we have to remove socket from allPico1Sockets and allPico2Sockets

    //first we have to find socketId from socket.id
    const socketId = socket.id;
    const obj = allConnections.find((obj) => obj.socketId == socketId);
    const hapticId = obj.hapticId;
    const keyboardId = obj.keyboardId;

    //now we have to remove socket from allPico1Sockets and allPico2Sockets

    allPico1Sockets = allPico1Sockets.filter((obj) => obj._id != hapticId);
    allPico2Sockets = allPico2Sockets.filter((obj) => obj._id != keyboardId);

    //now we have to remove connection from allConnections

    allConnections = allConnections.filter((obj) => obj.socketId != socketId);
  });

  socket.on("error", (err) => {
    console.log("error: ", err);
  });

  socket._onerror = (err) => {
    console.log("socket error: ", err);
  }

  socket._onclose = (err) => {
    android_socket_global=null;
    console.log("socket close: ", err);
    const socketId = socket.id;
    const obj = allConnections.find((obj) => obj.socketId == socketId);
    const hapticId = obj.hapticId;
    const keyboardId = obj.keyboardId;

    //now we have to remove socket from allPico1Sockets and allPico2Sockets

    allPico1Sockets = allPico1Sockets.filter((obj) => obj._id != hapticId);
    allPico2Sockets = allPico2Sockets.filter((obj) => obj._id != keyboardId);

    //now we have to remove connection from allConnections

    allConnections = allConnections.filter((obj) => obj.socketId != socketId);
  }

  


});

//helper function

function sendDataToPico1(hapticId, data) {
  try {
    let pico11_obj = allPico1Sockets.find((obj) => obj._id == hapticId);
    let pico11 = pico11_obj.socket;

    console.log("pico11", pico11.remoteAddress);
    console.log("data", data);

    // if (pico11 != null) {
    //i want to write data to pico1 one character at a time with a delay of 1 second
    //so i am using setInterval

    // var i = 0;
    // var interval = setInterval(function () {
    //   braille_str = brailleAlphabet[data[i]];
    //   pico11.write(braille_str);
    //   i++;
    //   if (i == data.length) {
    //     clearInterval(interval);
    //   }
    // }, 2000);

    // braille_str = brailleAlphabet[data[i]];
    pico11.write(data);
  } catch (error) {
    console.log("error in sendDataToPico1", error);
  }
}
//function to send data to mobile

function sendDataToMobile(data,keyboardId) {
  try {
  

    var obj = allConnections.find((obj) => {
      return obj.keyboardId == keyboardId;
    });

    var android = obj.AndroidSocket;

    // console.log("android",android);

    if (android != null) {
      console.log("sending data to mobile client");
      android.emit("goToMobile", data);
    } else {
      console.log("android is null");
    }


    
  } catch (error) {
    console.log("error in sending data to mobile", error);
  }
  
}


const bedeckAnEventEmitterWithDebuggingOutpour = (emitter, name) => {
  const oldEmit = emitter.emit;
  emitter.emit = (...args) => {
    console.log('[%s] %s', name, args[0]);
    oldEmit.apply(emitter, args);
  };
};

//socket.io server

io_server.listen(process.env.PORT, () => {
  console.log(" socket IO Server listening on port 4010");
});

// net socket server
server.listen(4005, () => {
  console.log("net socket Server listening on port 4005");
});


process.on("uncaughtException", (err) => {
  console.log("uncaughtException", err);
}
);
